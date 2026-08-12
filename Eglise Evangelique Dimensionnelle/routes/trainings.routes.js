const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken, checkRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// 1. Lister toutes les formations pastorales (Membres connectés ou public)
router.get('/', (req, res) => {
    try {
        const { category } = req.query;
        let sql = `
            SELECT t.*, u.first_name || ' ' || u.last_name as creator_name
            FROM trainings t
            JOIN users u ON t.created_by = u.id
        `;
        const params = [];

        if (category && category !== 'Toutes') {
            sql += ' WHERE t.category = ?';
            params.push(category);
        }

        sql += ' ORDER BY t.created_at DESC';

        const trainings = db.prepare(sql).all(...params);
        res.json({ trainings });
    } catch (err) {
        console.error('Erreur formations :', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des formations.' });
    }
});

// 2. Créer une nouvelle formation (Rôles pastor et admin UNIQUEMENT)
router.post('/', authenticateToken, checkRole(['pastor', 'admin']), upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'media_file', maxCount: 1 },
    { name: 'pdf_document', maxCount: 1 }
]), (req, res) => {
    try {
        const { title, description, media_url, media_type, category, author_name } = req.body;

        if (!title || !description || !author_name) {
            return res.status(400).json({ error: 'Le titre, la description et l\'auteur sont requis.' });
        }

        let thumbnailUrl = '/images/default-training.jpg';
        if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
            thumbnailUrl = `/uploads/trainings/${req.files.thumbnail[0].filename}`;
        }

        let finalMediaUrl = media_url || null;
        if (req.files && req.files.media_file && req.files.media_file[0]) {
            finalMediaUrl = `/uploads/trainings/${req.files.media_file[0].filename}`;
        }

        let pdfDocumentUrl = null;
        if (req.files && req.files.pdf_document && req.files.pdf_document[0]) {
            pdfDocumentUrl = `/uploads/documents/${req.files.pdf_document[0].filename}`;
        }

        const stmt = db.prepare(`
            INSERT INTO trainings (title, description, thumbnail_url, media_url, media_type, pdf_document_url, category, author_name, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(title, description, thumbnailUrl, finalMediaUrl, media_type || 'video', pdfDocumentUrl, category || 'Discipulat', author_name, req.user.id);

        const newTraining = db.prepare('SELECT * FROM trainings WHERE id = ?').get(result.lastInsertRowid);

        // Envoyer une notification générale aux membres
        const members = db.prepare('SELECT id FROM users WHERE role_id = 2').all();
        const insertNotif = db.prepare(`
            INSERT INTO notifications (user_id, type, title, message, target_url)
            VALUES (?, 'training_new', 'Nouvelle Formation Biblique', ?, '/trainings.html')
        `);
        members.forEach(m => {
            insertNotif.run(m.id, `Nouvelle formation disponible : "${title}" par ${author_name}`);
        });

        res.status(201).json({ message: 'Formation publiée avec succès !', training: newTraining });
    } catch (err) {
        console.error('Erreur création formation :', err);
        res.status(500).json({ error: 'Erreur lors de la création de la formation.' });
    }
});

// 3. Modifier une formation (pastor, admin)
router.put('/:id', authenticateToken, checkRole(['pastor', 'admin']), upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'media_file', maxCount: 1 },
    { name: 'pdf_document', maxCount: 1 }
]), (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, media_url, media_type, category, author_name } = req.body;

        const existing = db.prepare('SELECT * FROM trainings WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Formation non trouvée.' });
        }

        let thumbnailUrl = existing.thumbnail_url;
        if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
            thumbnailUrl = `/uploads/trainings/${req.files.thumbnail[0].filename}`;
        }

        let finalMediaUrl = media_url || existing.media_url;
        if (req.files && req.files.media_file && req.files.media_file[0]) {
            finalMediaUrl = `/uploads/trainings/${req.files.media_file[0].filename}`;
        }

        let pdfDocumentUrl = existing.pdf_document_url;
        if (req.files && req.files.pdf_document && req.files.pdf_document[0]) {
            pdfDocumentUrl = `/uploads/documents/${req.files.pdf_document[0].filename}`;
        }

        db.prepare(`
            UPDATE trainings
            SET title = ?, description = ?, thumbnail_url = ?, media_url = ?, media_type = ?, pdf_document_url = ?, category = ?, author_name = ?
            WHERE id = ?
        `).run(title || existing.title, description || existing.description, thumbnailUrl, finalMediaUrl, media_type || existing.media_type, pdfDocumentUrl, category || existing.category, author_name || existing.author_name, id);

        const updated = db.prepare('SELECT * FROM trainings WHERE id = ?').get(id);
        res.json({ message: 'Formation mise à jour avec succès.', training: updated });
    } catch (err) {
        console.error('Erreur modification formation :', err);
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
});

// 4. Supprimer une formation (pastor, admin)
router.delete('/:id', authenticateToken, checkRole(['pastor', 'admin']), (req, res) => {
    try {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM trainings WHERE id = ?').run(id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Formation introuvable.' });
        }
        res.json({ message: 'Formation supprimée avec succès.' });
    } catch (err) {
        console.error('Erreur suppression formation :', err);
        res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
});

module.exports = router;
