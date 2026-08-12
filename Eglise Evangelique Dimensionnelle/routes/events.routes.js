const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken, checkRole, optionalAuthToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// 1. Lister les événements (Filtrage par catégorie & statut de publication)
router.get('/', optionalAuthToken, (req, res) => {
    try {
        const { category, filter } = req.query;
        let sql = `
            SELECT e.*, u.first_name || ' ' || u.last_name as author_name
            FROM events e
            JOIN users u ON e.created_by = u.id
        `;
        const params = [];
        const conditions = [];

        // Les visiteurs ne voient que les événements publiés
        const isAdminOrPastor = req.user && ['admin', 'pastor'].includes(req.user.role);
        if (!isAdminOrPastor) {
            conditions.push('e.is_published = 1');
        }

        if (category && category !== 'Toutes') {
            conditions.push('e.category = ?');
            params.push(category);
        }

        if (filter === 'upcoming') {
            conditions.push('e.event_date >= DATE(\'now\')');
        } else if (filter === 'past') {
            conditions.push('e.event_date < DATE(\'now\')');
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY e.event_date ASC, e.event_time ASC';

        const events = db.prepare(sql).all(...params);
        res.json({ events });
    } catch (err) {
        console.error('Erreur récupération événements :', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des événements.' });
    }
});

// 2. Récupérer le prochain événement majeur
router.get('/next', (req, res) => {
    try {
        const nextEvent = db.prepare(`
            SELECT e.*, u.first_name || ' ' || u.last_name as author_name
            FROM events e
            JOIN users u ON e.created_by = u.id
            WHERE e.is_published = 1 AND e.event_date >= DATE('now')
            ORDER BY e.event_date ASC, e.event_time ASC
            LIMIT 1
        `).get();

        res.json({ event: nextEvent || null });
    } catch (err) {
        console.error('Erreur prochain événement :', err);
        res.status(500).json({ error: 'Erreur lors de la récupération du prochain événement.' });
    }
});

// 3. Créer un événement (Réservé admin et pastor)
router.post('/', authenticateToken, checkRole(['admin', 'pastor']), upload.single('image'), (req, res) => {
    try {
        const { title, description, event_date, event_time, location, category, is_published } = req.body;

        if (!title || !description || !event_date || !event_time || !location || !category) {
            return res.status(400).json({ error: 'Tous les champs requis doivent être renseignés.' });
        }

        const imageUrl = req.file ? `/uploads/events/${req.file.filename}` : '/images/default-event.jpg';
        const publishedState = is_published !== undefined ? parseInt(is_published) : 1;

        const stmt = db.prepare(`
            INSERT INTO events (title, description, image_url, event_date, event_time, location, category, is_published, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(title, description, imageUrl, event_date, event_time, location, category, publishedState, req.user.id);

        const newEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({ message: 'Événement créé avec succès !', event: newEvent });
    } catch (err) {
        console.error('Erreur création événement :', err);
        res.status(500).json({ error: 'Erreur serveur lors de la création.' });
    }
});

// 4. Modifier un événement (admin, pastor)
router.put('/:id', authenticateToken, checkRole(['admin', 'pastor']), upload.single('image'), (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, event_date, event_time, location, category, is_published } = req.body;

        const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Événement non trouvé.' });
        }

        const imageUrl = req.file ? `/uploads/events/${req.file.filename}` : existing.image_url;
        const publishedState = is_published !== undefined ? parseInt(is_published) : existing.is_published;

        db.prepare(`
            UPDATE events
            SET title = ?, description = ?, image_url = ?, event_date = ?, event_time = ?, location = ?, category = ?, is_published = ?
            WHERE id = ?
        `).run(title || existing.title, description || existing.description, imageUrl, event_date || existing.event_date, event_time || existing.event_time, location || existing.location, category || existing.category, publishedState, id);

        const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
        res.json({ message: 'Événement mis à jour avec succès.', event: updated });
    } catch (err) {
        console.error('Erreur modification événement :', err);
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
});

// 5. Basculer l'état publié/masqué
router.patch('/:id/toggle-publish', authenticateToken, checkRole(['admin', 'pastor']), (req, res) => {
    try {
        const { id } = req.params;
        const event = db.prepare('SELECT is_published FROM events WHERE id = ?').get(id);
        if (!event) {
            return res.status(404).json({ error: 'Événement non trouvé.' });
        }

        const newStatus = event.is_published === 1 ? 0 : 1;
        db.prepare('UPDATE events SET is_published = ? WHERE id = ?').run(newStatus, id);

        res.json({ message: `Événement ${newStatus === 1 ? 'publié' : 'masqué'}.`, is_published: newStatus });
    } catch (err) {
        console.error('Erreur toggle publish :', err);
        res.status(500).json({ error: 'Erreur lors du changement de statut.' });
    }
});

// 6. Supprimer un événement (admin, pastor)
router.delete('/:id', authenticateToken, checkRole(['admin', 'pastor']), (req, res) => {
    try {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM events WHERE id = ?').run(id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Événement non trouvé.' });
        }
        res.json({ message: 'Événement supprimé avec succès.' });
    } catch (err) {
        console.error('Erreur suppression événement :', err);
        res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
});

module.exports = router;
