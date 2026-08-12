const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken, checkRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// 1. Obtenir les annonces récentes
router.get('/', (req, res) => {
    try {
        const announcements = db.prepare(`
            SELECT a.*, u.first_name || ' ' || u.last_name as author_name
            FROM announcements a
            JOIN users u ON a.created_by = u.id
            ORDER BY a.created_at DESC
            LIMIT 10
        `).all();

        res.json({ announcements });
    } catch (err) {
        console.error('Erreur annonces :', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des annonces.' });
    }
});

// 2. Créer une annonce (pastor, admin)
router.post('/', authenticateToken, checkRole(['pastor', 'admin']), upload.single('image'), (req, res) => {
    try {
        const { title, message } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Le titre et le message de l\'annonce sont requis.' });
        }

        const imageUrl = req.file ? `/uploads/events/${req.file.filename}` : null;

        const stmt = db.prepare(`
            INSERT INTO announcements (title, message, image_url, created_by)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(title, message, imageUrl, req.user.id);

        // Diffuser une notification à tous les utilisateurs
        const users = db.prepare('SELECT id FROM users').all();
        const insertNotif = db.prepare(`
            INSERT INTO notifications (user_id, type, title, message, target_url)
            VALUES (?, 'announcement_new', ?, ?, '/index.html#announcements')
        `);

        users.forEach(u => {
            insertNotif.run(u.id, `Annonce : ${title}`, message.substring(0, 100) + '...');
        });

        const newAnnouncement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ message: 'Annonce publiée et diffusée !', announcement: newAnnouncement });
    } catch (err) {
        console.error('Erreur création annonce :', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// 3. Supprimer une annonce (pastor, admin)
router.delete('/:id', authenticateToken, checkRole(['pastor', 'admin']), (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
        res.json({ message: 'Annonce supprimée.' });
    } catch (err) {
        console.error('Erreur suppression annonce :', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

module.exports = router;
