const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken, optionalAuthToken, checkRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// 1. Obtenir les témoignages
// Pour le public : uniquement les 'approved'
// Pour moderator/pastor/admin : possibilité de voir les 'pending' ou 'rejected'
router.get('/', optionalAuthToken, (req, res) => {
    try {
        const { status } = req.query;
        const isStaff = req.user && ['moderator', 'pastor', 'admin'].includes(req.user.role);

        let sql = `
            SELECT t.*, u.first_name, u.last_name, u.username, u.avatar_url
            FROM testimonials t
            JOIN users u ON t.user_id = u.id
        `;
        const params = [];

        if (isStaff && status) {
            sql += ' WHERE t.status = ?';
            params.push(status);
        } else if (isStaff) {
            // Staff peut tout voir ou filtrer par défaut par approved + pending
            sql += ' WHERE t.status IN (\'approved\', \'pending\')';
        } else {
            // Public : uniquement les témoignages approuvés
            sql += ' WHERE t.status = \'approved\'';
        }

        sql += ' ORDER BY t.created_at DESC';

        const testimonials = db.prepare(sql).all(...params);
        res.json({ testimonials });
    } catch (err) {
        console.error('Erreur témoins :', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des témoignages.' });
    }
});

// 2. Soumettre un témoignage (Réservé aux membres connectés)
// Statut initial = 'pending' (NE PAS AFFICHER DIRECTEMENT EN PUBLIC)
router.post('/', authenticateToken, upload.single('media'), (req, res) => {
    try {
        const { title, description, media_type } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'Le titre et la description du témoignage sont obligatoires.' });
        }

        let mediaUrl = null;
        if (req.file) {
            mediaUrl = `/uploads/testimonials/${req.file.filename}`;
        }

        const stmt = db.prepare(`
            INSERT INTO testimonials (user_id, title, description, media_type, media_url, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        `);

        const result = stmt.run(req.user.id, title, description, media_type || 'text', mediaUrl);

        res.status(201).json({
            message: 'Votre témoignage a été soumis avec succès ! Il sera révisé par notre équipe pastorale avant publication publique.',
            id: result.lastInsertRowid,
            status: 'pending'
        });
    } catch (err) {
        console.error('Erreur soumission témoignage :', err);
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement du témoignage.' });
    }
});

// 3. Modération du statut d'un témoignage (moderator, pastor, admin)
router.patch('/:id/status', authenticateToken, checkRole(['moderator', 'pastor', 'admin']), (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' ou 'rejected'

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Statut invalide.' });
        }

        const testimonial = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(id);
        if (!testimonial) {
            return res.status(404).json({ error: 'Témoignage non trouvé.' });
        }

        db.prepare(`
            UPDATE testimonials
            SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(status, req.user.id, id);

        // Envoyer une notification au membre si approuvé
        if (status === 'approved') {
            db.prepare(`
                INSERT INTO notifications (user_id, type, title, message, target_url)
                VALUES (?, 'testimonial_approved', 'Témoignage Publié !', 'Glorifiez Dieu ! Votre témoignage a été relu et publié publiquement sur le site.', '/testimonials.html')
            `).run(testimonial.user_id);
        }

        res.json({ message: `Témoignage mis à jour avec le statut : ${status}` });
    } catch (err) {
        console.error('Erreur modération témoignage :', err);
        res.status(500).json({ error: 'Erreur lors de la modération.' });
    }
});

// 4. Supprimer un témoignage (moderator, pastor, admin ou auteur)
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const testimonial = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(id);

        if (!testimonial) {
            return res.status(404).json({ error: 'Témoignage non trouvé.' });
        }

        const isOwner = testimonial.user_id === req.user.id;
        const isStaff = ['moderator', 'pastor', 'admin'].includes(req.user.role);

        if (!isOwner && !isStaff) {
            return res.status(403).json({ error: 'Vous n\'avez pas la permission de supprimer ce témoignage.' });
        }

        db.prepare('DELETE FROM testimonials WHERE id = ?').run(id);
        res.json({ message: 'Témoignage supprimé avec succès.' });
    } catch (err) {
        console.error('Erreur suppression témoignage :', err);
        res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
});

module.exports = router;
