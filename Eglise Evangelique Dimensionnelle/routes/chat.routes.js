const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// 1. Obtenir la liste des conversations de l'utilisateur avec dernier message et compteur non-lus
router.get('/conversations', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;

        const conversations = db.prepare(`
            SELECT 
                c.id as conversation_id,
                u.id as peer_id,
                u.first_name as peer_first_name,
                u.last_name as peer_last_name,
                u.username as peer_username,
                u.avatar_url as peer_avatar,
                (
                    SELECT text_content FROM messages 
                    WHERE conversation_id = c.id AND is_deleted = 0 
                    ORDER BY created_at DESC LIMIT 1
                ) as last_message,
                (
                    SELECT created_at FROM messages 
                    WHERE conversation_id = c.id 
                    ORDER BY created_at DESC LIMIT 1
                ) as last_message_at,
                (
                    SELECT COUNT(*) FROM messages 
                    WHERE conversation_id = c.id AND sender_id != ? AND status != 'read' AND is_deleted = 0
                ) as unread_count
            FROM conversations c
            JOIN conversation_members cm1 ON c.id = cm1.conversation_id
            JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id != cm1.user_id
            JOIN users u ON cm2.user_id = u.id
            WHERE cm1.user_id = ?
            ORDER BY last_message_at DESC, c.updated_at DESC
        `).all(userId, userId);

        res.json({ conversations });
    } catch (err) {
        console.error('Erreur récupération conversations :', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des conversations.' });
    }
});

// 2. Démarrer ou obtenir une conversation directe par @username ou user_id
router.post('/start', authenticateToken, (req, res) => {
    try {
        const { target_username, target_user_id } = req.body;
        let peer = null;

        if (target_user_id) {
            peer = db.prepare('SELECT id, first_name, last_name, username, avatar_url FROM users WHERE id = ?').get(target_user_id);
        } else if (target_username) {
            let handle = target_username.trim().toLowerCase();
            if (!handle.startsWith('@')) handle = `@${handle}`;
            peer = db.prepare('SELECT id, first_name, last_name, username, avatar_url FROM users WHERE username = ?').get(handle);
        }

        if (!peer) {
            return res.status(404).json({ error: 'Utilisateur introuvable.' });
        }

        if (peer.id === req.user.id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas démarrer une discussion avec vous-même.' });
        }

        // Vérifier si une conversation existe déjà entre les 2 utilisateurs
        let existingConv = db.prepare(`
            SELECT cm1.conversation_id
            FROM conversation_members cm1
            JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
            WHERE cm1.user_id = ? AND cm2.user_id = ?
        `).get(req.user.id, peer.id);

        let conversationId;
        if (existingConv) {
            conversationId = existingConv.conversation_id;
        } else {
            // Créer une nouvelle conversation
            const info = db.prepare('INSERT INTO conversations (type) VALUES (\'direct\')').run();
            conversationId = info.lastInsertRowid;

            const insertMember = db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)');
            insertMember.run(conversationId, req.user.id);
            insertMember.run(conversationId, peer.id);
        }

        res.json({
            conversation_id: conversationId,
            peer
        });
    } catch (err) {
        console.error('Erreur démarrage discussion :', err);
        res.status(500).json({ error: 'Erreur lors de l\'initialisation de la discussion.' });
    }
});

// 3. Obtenir l'historique des messages d'une conversation
router.get('/messages/:conversationId', authenticateToken, (req, res) => {
    try {
        const { conversationId } = req.params;

        // Vérifier l'appartenance à la conversation
        const isMember = db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(conversationId, req.user.id);
        if (!isMember) {
            return res.status(403).json({ error: 'Accès non autorisé à cette conversation.' });
        }

        const messages = db.prepare(`
            SELECT 
                m.id, m.conversation_id, m.sender_id, m.text_content, m.reply_to_id, m.status, m.is_deleted, m.created_at,
                u.first_name as sender_first_name, u.last_name as sender_last_name, u.username as sender_username, u.avatar_url as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        `).all(conversationId);

        // Attacher les pièces jointes et réactions pour chaque message
        const getAttachments = db.prepare('SELECT * FROM message_attachments WHERE message_id = ?');
        const getReactions = db.prepare(`
            SELECT r.*, u.username, u.first_name 
            FROM message_reactions r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.message_id = ?
        `);
        const getReplyTarget = db.prepare(`
            SELECT m.id, m.text_content, u.username as sender_username
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
        `);

        const formattedMessages = messages.map(msg => {
            const attachments = getAttachments.all(msg.id);
            const reactions = getReactions.all(msg.id);
            const replyTo = msg.reply_to_id ? getReplyTarget.get(msg.reply_to_id) : null;

            return {
                ...msg,
                attachments,
                reactions,
                replyTo
            };
        });

        // Marquer les messages reçus comme lus
        db.prepare(`
            UPDATE messages
            SET status = 'read'
            WHERE conversation_id = ? AND sender_id != ? AND status != 'read'
        `).run(conversationId, req.user.id);

        res.json({ messages: formattedMessages });
    } catch (err) {
        console.error('Erreur historique messages :', err);
        res.status(500).json({ error: 'Erreur lors du chargement des messages.' });
    }
});

// 4. Téléverser un média pour le chat (Image, Vidéo, Audio vocal, Document)
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni.' });
        }

        const ext = req.file.filename.split('.').pop().toLowerCase();
        let fileType = 'document';
        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) fileType = 'image';
        else if (['mp4', 'webm', 'mov'].includes(ext)) fileType = 'video';
        else if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) fileType = 'audio';

        const fileInfo = {
            file_name: req.file.originalname,
            file_path: `/uploads/chat/${req.file.filename}`,
            file_type: fileType,
            file_size: req.file.size,
            mime_type: req.file.mimetype
        };

        res.json({
            message: 'Fichier téléversé avec succès.',
            attachment: fileInfo
        });
    } catch (err) {
        console.error('Erreur upload chat :', err);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du fichier.' });
    }
});

// 5. Supprimer un message (Auteur ou Staff)
router.delete('/messages/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);

        if (!msg) {
            return res.status(404).json({ error: 'Message non trouvé.' });
        }

        const isOwner = msg.sender_id === req.user.id;
        const isStaff = ['moderator', 'pastor', 'admin'].includes(req.user.role);

        if (!isOwner && !isStaff) {
            return res.status(403).json({ error: 'Vous ne pouvez pas supprimer ce message.' });
        }

        db.prepare('UPDATE messages SET is_deleted = 1, text_content = \'Ce message a été supprimé\' WHERE id = ?').run(id);

        res.json({ message: 'Message supprimé.' });
    } catch (err) {
        console.error('Erreur suppression message :', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// 6. Signaler un message ou un contenu inapproprié
router.post('/report', authenticateToken, (req, res) => {
    try {
        const { message_id, testimonial_id, reported_user_id, reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Le motif du signalement est obligatoire.' });
        }

        db.prepare(`
            INSERT INTO reports (reporter_id, reported_user_id, message_id, testimonial_id, reason)
            VALUES (?, ?, ?, ?, ?)
        `).run(req.user.id, reported_user_id || null, message_id || null, testimonial_id || null, reason);

        res.json({ message: 'Signalement transmis aux modérateurs avec succès.' });
    } catch (err) {
        console.error('Erreur signalement :', err);
        res.status(500).json({ error: 'Erreur lors du signalement.' });
    }
});

module.exports = router;
