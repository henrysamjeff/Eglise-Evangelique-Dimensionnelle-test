const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../database/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Normaliser le nom d'utilisateur (commence toujours par @)
function formatUsername(input) {
    if (!input) return '';
    let cleaned = input.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    return cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
}

// 1. Inscription
router.post('/register', upload.single('avatar'), async (req, res) => {
    try {
        const { first_name, last_name, username, email, phone, password, confirm_password } = req.body;

        if (!first_name || !last_name || !username || !email || !password) {
            return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis.' });
        }

        if (password !== confirm_password) {
            return res.status(400).json({ error: 'Les mots de passe ne correspondent pas.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
        }

        const handle = formatUsername(username);

        // Vérifier l'unicité de l'email et du nom d'utilisateur
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email.toLowerCase(), handle);
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email ou nom d\'utilisateur est déjà utilisé.' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const avatar_url = req.file ? `/uploads/avatars/${req.file.filename}` : '/images/default-avatar.png';

        // Role 2 = member par défaut
        const stmt = db.prepare(`
            INSERT INTO users (first_name, last_name, username, email, phone, password_hash, avatar_url, role_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, 2)
        `);
        const result = stmt.run(first_name, last_name, handle, email.toLowerCase(), phone || '', password_hash, avatar_url);

        const newUser = db.prepare(`
            SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.phone, u.avatar_url, u.bio, r.name as role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `).get(result.lastInsertRowid);

        // Générer Token JWT
        const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
        });

        res.status(201).json({
            message: 'Inscription réussie ! Bienvenue sur ÉglisAven.',
            user: newUser,
            token
        });
    } catch (err) {
        console.error('Erreur inscription :', err);
        res.status(500).json({ error: 'Erreur serveur lors de l\'inscription.' });
    }
});

// 2. Connexion (avec email OU nom d'utilisateur)
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Veuillez saisir votre email/nom d\'utilisateur et votre mot de passe.' });
        }

        let searchInput = identifier.trim().toLowerCase();
        let handleSearch = searchInput.startsWith('@') ? searchInput : `@${searchInput}`;

        const user = db.prepare(`
            SELECT u.*, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = ? OR u.username = ? OR u.username = ?
        `).get(searchInput, searchInput, handleSearch);

        if (!user) {
            return res.status(401).json({ error: 'Identifiants incorrects.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Identifiants incorrects.' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const userData = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            email: user.email,
            phone: user.phone,
            avatar_url: user.avatar_url,
            bio: user.bio,
            role: user.role_name
        };

        res.json({
            message: 'Connexion réussie !',
            user: userData,
            token
        });
    } catch (err) {
        console.error('Erreur connexion :', err);
        res.status(500).json({ error: 'Erreur serveur lors de la connexion.' });
    }
});

// 3. Déconnexion
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Déconnexion réussie.' });
});

// 4. Utilisateur actuel (Session active)
router.get('/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// 5. Modification du mot de passe
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;

        if (!current_password || !new_password || !confirm_password) {
            return res.status(400).json({ error: 'Tous les champs sont requis.' });
        }

        if (new_password !== confirm_password) {
            return res.status(400).json({ error: 'Le nouveau mot de passe et sa confirmation ne correspondent pas.' });
        }

        const dbUser = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
        const validCurrent = await bcrypt.compare(current_password, dbUser.password_hash);
        if (!validCurrent) {
            return res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' });
        }

        const newHash = await bcrypt.hash(new_password, 10);
        db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.user.id);

        res.json({ message: 'Mot de passe mis à jour avec succès.' });
    } catch (err) {
        console.error('Erreur changement mot de passe :', err);
        res.status(500).json({ error: 'Erreur lors du changement de mot de passe.' });
    }
});

module.exports = router;
