const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken, checkRole } = require('../middleware/auth');

// 1. Obtenir les métriques et statistiques globales du tableau de bord Admin
router.get('/stats', authenticateToken, checkRole(['admin', 'pastor', 'moderator']), (req, res) => {
    try {
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const totalMembers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role_id = 2').get().count;
        const pendingTestimonials = db.prepare('SELECT COUNT(*) as count FROM testimonials WHERE status = \'pending\'').get().count;
        const approvedTestimonials = db.prepare('SELECT COUNT(*) as count FROM testimonials WHERE status = \'approved\'').get().count;
        const totalSermons = db.prepare('SELECT COUNT(*) as count FROM sermons').get().count;
        const totalTrainings = db.prepare('SELECT COUNT(*) as count FROM trainings').get().count;
        const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
        const pendingReports = db.prepare('SELECT COUNT(*) as count FROM reports WHERE status = \'pending\'').get().count;

        res.json({
            stats: {
                totalUsers,
                totalMembers,
                pendingTestimonials,
                approvedTestimonials,
                totalSermons,
                totalTrainings,
                totalEvents,
                pendingReports
            }
        });
    } catch (err) {
        console.error('Erreur stats admin :', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques.' });
    }
});

// 2. Gestion des utilisateurs : Liste complète (Admin uniquement)
router.get('/users', authenticateToken, checkRole(['admin']), (req, res) => {
    try {
        const users = db.prepare(`
            SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.phone, u.avatar_url, u.created_at, r.name as role_name, r.id as role_id
            FROM users u
            JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        `).all();

        const roles = db.prepare('SELECT * FROM roles').all();

        res.json({ users, roles });
    } catch (err) {
        console.error('Erreur utilisateurs admin :', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
    }
});

// 3. Modifier le rôle d'un utilisateur (Admin uniquement)
router.patch('/users/:id/role', authenticateToken, checkRole(['admin']), (req, res) => {
    try {
        const { id } = req.params;
        const { role_id } = req.body;

        if (!role_id) {
            return res.status(400).json({ error: 'Le rôle est requis.' });
        }

        const roleExists = db.prepare('SELECT 1 FROM roles WHERE id = ?').get(role_id);
        if (!roleExists) {
            return res.status(400).json({ error: 'Rôle invalide.' });
        }

        // Empêcher de modifier son propre rôle admin si c'est le dernier
        if (parseInt(id) === req.user.id && parseInt(role_id) !== 5) {
            return res.status(400).json({ error: 'Vous ne pouvez pas rétrograder votre propre compte administrateur.' });
        }

        db.prepare('UPDATE users SET role_id = ? WHERE id = ?').run(role_id, id);

        res.json({ message: 'Rôle utilisateur mis à jour avec succès.' });
    } catch (err) {
        console.error('Erreur modification rôle :', err);
        res.status(500).json({ error: 'Erreur lors du changement de rôle.' });
    }
});

// 4. Liste des signalements de contenu (Moderator, Pastor, Admin)
router.get('/reports', authenticateToken, checkRole(['moderator', 'pastor', 'admin']), (req, res) => {
    try {
        const reports = db.prepare(`
            SELECT 
                r.id, r.reason, r.status, r.created_at,
                rep.username as reporter_username,
                target.username as reported_username,
                m.text_content as message_text,
                t.title as testimonial_title
            FROM reports r
            JOIN users rep ON r.reporter_id = rep.id
            LEFT JOIN users target ON r.reported_user_id = target.id
            LEFT JOIN messages m ON r.message_id = m.id
            LEFT JOIN testimonials t ON r.testimonial_id = t.id
            ORDER BY r.created_at DESC
        `).all();

        res.json({ reports });
    } catch (err) {
        console.error('Erreur signalements :', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// 5. Résoudre ou ignorer un signalement
router.patch('/reports/:id', authenticateToken, checkRole(['moderator', 'pastor', 'admin']), (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'reviewed' ou 'dismissed'

        db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status || 'reviewed', id);

        res.json({ message: 'Signalement mis à jour.' });
    } catch (err) {
        console.error('Erreur update signalement :', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

module.exports = router;
