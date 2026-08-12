const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken, checkRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// 1. Galerie des prédications avec filtres, recherche et pagination
router.get('/', (req, res) => {
    try {
        const { search, category, media_type, page = 1, limit = 12 } = req.query;
        let sql = `
            SELECT s.*, u.first_name || ' ' || u.last_name as uploader_name
            FROM sermons s
            JOIN users u ON s.created_by = u.id
        `;
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push('(s.title LIKE ? OR s.description LIKE ? OR s.preacher_name LIKE ?)');
            const wildcard = `%${search.trim()}%`;
            params.push(wildcard, wildcard, wildcard);
        }

        if (category && category !== 'Toutes') {
            conditions.push('s.category = ?');
            params.push(category);
        }

        if (media_type) {
            conditions.push('s.media_type = ?');
            params.push(media_type);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY s.sermon_date DESC, s.created_at DESC';

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        sql += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const sermons = db.prepare(sql).all(...params);

        // Nombre total pour pagination
        let countSql = `SELECT COUNT(*) as total FROM sermons s`;
        if (conditions.length > 0) {
            countSql += ' WHERE ' + conditions.join(' AND ');
        }
        const totalResult = db.prepare(countSql).get(...params.slice(0, params.length - 2));

        res.json({
            sermons,
            total: totalResult ? totalResult.total : 0,
            page: parseInt(page),
            totalPages: Math.ceil((totalResult ? totalResult.total : 0) / parseInt(limit))
        });
    } catch (err) {
        console.error('Erreur prédications :', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des prédications.' });
    }
});

// 2. Dernière prédication (pour l'accueil)
router.get('/latest', (req, res) => {
    try {
        const latest = db.prepare(`
            SELECT s.*, u.first_name || ' ' || u.last_name as uploader_name
            FROM sermons s
            JOIN users u ON s.created_by = u.id
            ORDER BY s.sermon_date DESC, s.created_at DESC
            LIMIT 1
        `).get();

        res.json({ sermon: latest || null });
    } catch (err) {
        console.error('Erreur dernière prédication :', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// 3. Créer une prédication (admin, pastor)
router.post('/', authenticateToken, checkRole(['admin', 'pastor']), upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'media_file', maxCount: 1 }
]), (req, res) => {
    try {
        const { title, description, media_url, media_type, preacher_name, sermon_date, category } = req.body;

        if (!title || !description || !preacher_name || !sermon_date || !category) {
            return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires.' });
        }

        let thumbnailUrl = '/images/default-sermon.jpg';
        if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
            thumbnailUrl = `/uploads/sermons/${req.files.thumbnail[0].filename}`;
        }

        let finalMediaUrl = media_url || '';
        if (req.files && req.files.media_file && req.files.media_file[0]) {
            finalMediaUrl = `/uploads/sermons/${req.files.media_file[0].filename}`;
        }

        if (!finalMediaUrl) {
            return res.status(400).json({ error: 'Veuillez fournir un fichier média ou une URL vidéo.' });
        }

        const stmt = db.prepare(`
            INSERT INTO sermons (title, description, thumbnail_url, media_url, media_type, preacher_name, sermon_date, category, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(title, description, thumbnailUrl, finalMediaUrl, media_type || 'video', preacher_name, sermon_date, category, req.user.id);

        const newSermon = db.prepare('SELECT * FROM sermons WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ message: 'Prédication publiée avec succès !', sermon: newSermon });
    } catch (err) {
        console.error('Erreur ajout prédication :', err);
        res.status(500).json({ error: 'Erreur lors du traitement.' });
    }
});

// 4. Modifier une prédication (admin, pastor)
router.put('/:id', authenticateToken, checkRole(['admin', 'pastor']), upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'media_file', maxCount: 1 }
]), (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, media_url, media_type, preacher_name, sermon_date, category } = req.body;

        const existing = db.prepare('SELECT * FROM sermons WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Prédication introuvable.' });
        }

        let thumbnailUrl = existing.thumbnail_url;
        if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
            thumbnailUrl = `/uploads/sermons/${req.files.thumbnail[0].filename}`;
        }

        let finalMediaUrl = media_url || existing.media_url;
        if (req.files && req.files.media_file && req.files.media_file[0]) {
            finalMediaUrl = `/uploads/sermons/${req.files.media_file[0].filename}`;
        }

        db.prepare(`
            UPDATE sermons
            SET title = ?, description = ?, thumbnail_url = ?, media_url = ?, media_type = ?, preacher_name = ?, sermon_date = ?, category = ?
            WHERE id = ?
        `).run(title || existing.title, description || existing.description, thumbnailUrl, finalMediaUrl, media_type || existing.media_type, preacher_name || existing.preacher_name, sermon_date || existing.sermon_date, category || existing.category, id);

        const updated = db.prepare('SELECT * FROM sermons WHERE id = ?').get(id);
        res.json({ message: 'Prédication mise à jour.', sermon: updated });
    } catch (err) {
        console.error('Erreur modification prédication :', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// 5. Supprimer une prédication (admin, pastor)
router.delete('/:id', authenticateToken, checkRole(['admin', 'pastor']), (req, res) => {
    try {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM sermons WHERE id = ?').run(id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Prédication non trouvée.' });
        }
        res.json({ message: 'Prédication supprimée avec succès.' });
    } catch (err) {
        console.error('Erreur suppression prédication :', err);
        res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
});

module.exports = router;
