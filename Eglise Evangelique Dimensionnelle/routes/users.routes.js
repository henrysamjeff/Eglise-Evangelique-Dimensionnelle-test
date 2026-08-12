const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Recherche d'utilisateur par nom d'utilisateur (@handle) ou nom/prénom
router.get('/search', authenticateToken, (req, res) => {
    try {
        const query = req.query.q ? req.query.q.trim() : '';

        if (!query || query.length < 2) {
            return res.json({ users: [] });
        }

        const cleanQuery = query.startsWith('@') ? query : `@${query}`;
        const wildcard = `%${query.replace(/^@/, '')}%`;

        const users = db.prepare(`
            SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url, u.bio, r.name as role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE (u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)
              AND u.id != ?
            LIMIT 15
        `).all(`%${cleanQuery.replace(/^@/, '')}%`, wildcard, wildcard, req.user.id);

        res.json({ users });
    } catch (err) {
        console.error('Erreur recherche utilisateur :', err);
        res.status(500).json({ error: 'Erreur lors de la recherche.' });
    }
});

// Modification de profil (Nom, Prénom, Handle, Bio, Photo)
router.put('/profile', authenticateToken, upload.single('avatar'), (req, res) => {
    try {
        const { first_name, last_name, username, bio, phone } = req.body;

        if (!first_name || !last_name || !username) {
            return res.status(400).json({ error: 'Le prénom, le nom et le nom d\'utilisateur sont requis.' });
        }

        let handle = username.trim().toLowerCase();
        if (!handle.startsWith('@')) {
            handle = `@${handle}`;
        }

        // Vérifier si le handle est pris par un autre utilisateur
        const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(handle, req.user.id);
        if (existing) {
            return res.status(400).json({ error: 'Ce nom d\'utilisateur est déjà attribué.' });
        }

        let avatarUrl = req.user.avatar_url;
        if (req.file) {
            avatarUrl = `/uploads/avatars/${req.file.filename}`;
        }

        db.prepare(`
            UPDATE users
            SET first_name = ?, last_name = ?, username = ?, bio = ?, phone = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(first_name, last_name, handle, bio || '', phone || '', avatarUrl, req.user.id);

        const updatedUser = db.prepare(`
            SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.phone, u.avatar_url, u.bio, r.name as role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `).get(req.user.id);

        res.json({ message: 'Profil mis à jour avec succès.', user: updatedUser });
    } catch (err) {
        console.error('Erreur profil :', err);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du profil.' });
    }
});

// Bloquer / Débloquer un utilisateur
router.post('/block', authenticateToken, (req, res) => {
    try {
        const { target_user_id } = req.body;

        if (!target_user_id || target_user_id === req.user.id) {
            return res.status(400).json({ error: 'Action invalide.' });
        }

        const isBlocked = db.prepare('SELECT 1 FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?').get(req.user.id, target_user_id);

        if (isBlocked) {
            db.prepare('DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?').run(req.user.id, target_user_id);
            res.json({ message: 'Utilisateur débloqué.', isBlocked: false });
        } else {
            db.prepare('INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)').run(req.user.id, target_user_id);
            res.json({ message: 'Utilisateur bloqué.', isBlocked: true });
        }
    } catch (err) {
        console.error('Erreur blocage :', err);
        res.status(500).json({ error: 'Erreur lors de l\'opération de blocage.' });
    }
});

module.exports = router;
