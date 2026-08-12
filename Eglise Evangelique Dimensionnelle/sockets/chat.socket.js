const jwt = require('jsonwebtoken');
const db = require('../../database/db');
const { JWT_SECRET } = require('../middleware/auth');

// Map pour suivre la présence des utilisateurs (userId -> socketId)
const userSockets = new Map();

function initChatSockets(io) {
    // Authentification de la socket via JWT Cookie ou auth header
    io.use((socket, next) => {
        try {
            let token = socket.handshake.auth.token || socket.handshake.query.token;

            if (!token && socket.handshake.headers.cookie) {
                const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, c) => {
                    const [k, v] = c.trim().split('=');
                    acc[k] = v;
                    return acc;
                }, {});
                token = cookies.token;
            }

            if (!token) {
                return next(new Error('Authentification Socket refusée. Token manquant.'));
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            const user = db.prepare(`
                SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url, r.name as role
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.id = ?
            `).get(decoded.userId);

            if (!user) {
                return next(new Error('Utilisateur non trouvé.'));
            }

            socket.user = user;
            next();
        } catch (err) {
            return next(new Error('Token Socket invalide.'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user.id;
        userSockets.set(userId, socket.id);
        socket.join(`user_${userId}`);

        console.log(`🔌 Client connecté Socket.IO : ${socket.user.username} (${socket.id})`);

        // Rejoindre une chambre de conversation
        socket.on('join_conversation', ({ conversation_id }) => {
            if (!conversation_id) return;
            const isMember = db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(conversation_id, userId);
            if (isMember) {
                socket.join(`conversation_${conversation_id}`);
            }
        });

        // Quitter une chambre de conversation
        socket.on('leave_conversation', ({ conversation_id }) => {
            if (conversation_id) {
                socket.leave(`conversation_${conversation_id}`);
            }
        });

        // Envoi d'un message texte ou multimédia en temps réel
        socket.on('send_message', (data) => {
            try {
                const { conversation_id, text_content, reply_to_id, attachments } = data;

                if (!conversation_id) return;

                // Vérifier l'appartenance
                const isMember = db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(conversation_id, userId);
                if (!isMember) return;

                // Insérer le message dans SQLite
                const stmt = db.prepare(`
                    INSERT INTO messages (conversation_id, sender_id, text_content, reply_to_id, status)
                    VALUES (?, ?, ?, ?, 'sent')
                `);
                const result = stmt.run(conversation_id, userId, text_content || '', reply_to_id || null);
                const messageId = result.lastInsertRowid;

                // Sauvegarder les pièces jointes si présentes
                let savedAttachments = [];
                if (attachments && Array.isArray(attachments) && attachments.length > 0) {
                    const insertAtt = db.prepare(`
                        INSERT INTO message_attachments (message_id, file_name, file_path, file_type, file_size, mime_type)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `);
                    attachments.forEach(att => {
                        const attResult = insertAtt.run(messageId, att.file_name, att.file_path, att.file_type, att.file_size, att.mime_type);
                        savedAttachments.push({
                            id: attResult.lastInsertRowid,
                            message_id: messageId,
                            ...att
                        });
                    });
                }

                // Charger le message complet inséré
                const fullMessage = db.prepare(`
                    SELECT 
                        m.id, m.conversation_id, m.sender_id, m.text_content, m.reply_to_id, m.status, m.is_deleted, m.created_at,
                        u.first_name as sender_first_name, u.last_name as sender_last_name, u.username as sender_username, u.avatar_url as sender_avatar
                    FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE m.id = ?
                `).get(messageId);

                fullMessage.attachments = savedAttachments;
                fullMessage.reactions = [];

                if (reply_to_id) {
                    fullMessage.replyTo = db.prepare(`
                        SELECT m.id, m.text_content, u.username as sender_username
                        FROM messages m
                        JOIN users u ON m.sender_id = u.id
                        WHERE m.id = ?
                    `).get(reply_to_id);
                } else {
                    fullMessage.replyTo = null;
                }

                // Récupérer le destinataire de la conversation
                const members = db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?').all(conversation_id, userId);

                // Émettre en temps réel dans la conversation
                io.to(`conversation_${conversation_id}`).emit('new_message', fullMessage);

                // Émettre aux chambres personnelles des destinataires et générer une notification
                members.forEach(m => {
                    io.to(`user_${m.user_id}`).emit('new_message_notification', fullMessage);

                    // Créer la notification en base de données
                    db.prepare(`
                        INSERT INTO notifications (user_id, type, title, message, target_url)
                        VALUES (?, 'message', 'Nouveau message de ' || ?, ?, '/chat.html?conv=' || ?)
                    `).run(m.user_id, socket.user.username, text_content ? text_content.substring(0, 50) : '[Média reçu]', conversation_id);

                    // Signaler la nouvelle notification via Socket.IO
                    io.to(`user_${m.user_id}`).emit('new_notification', {
                        title: `Nouveau message de ${socket.user.username}`,
                        message: text_content ? text_content.substring(0, 50) : '[Média reçu]',
                        target_url: `/chat.html?conv=${conversation_id}`
                    });
                });
            } catch (err) {
                console.error('Erreur Socket send_message :', err);
                socket.emit('error_message', { error: 'Erreur lors de l\'envoi du message.' });
            }
        });

        // Indicateur de frappe (typing)
        socket.on('typing', ({ conversation_id, is_typing }) => {
            socket.to(`conversation_${conversation_id}`).emit('user_typing', {
                conversation_id,
                user_id: userId,
                username: socket.user.username,
                is_typing
            });
        });

        // Marquer les messages comme lus
        socket.on('mark_read', ({ conversation_id }) => {
            try {
                db.prepare(`
                    UPDATE messages
                    SET status = 'read'
                    WHERE conversation_id = ? AND sender_id != ? AND status != 'read'
                `).run(conversation_id, userId);

                io.to(`conversation_${conversation_id}`).emit('messages_read_update', {
                    conversation_id,
                    read_by: userId
                });
            } catch (err) {
                console.error('Erreur mark_read :', err);
            }
        });

        // Réaction à un message
        socket.on('react_message', ({ message_id, emoji }) => {
            try {
                const existing = db.prepare('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?').get(message_id, userId, emoji);

                if (existing) {
                    db.prepare('DELETE FROM message_reactions WHERE id = ?').run(existing.id);
                } else {
                    db.prepare('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)').run(message_id, userId, emoji);
                }

                const reactions = db.prepare(`
                    SELECT r.*, u.username, u.first_name 
                    FROM message_reactions r 
                    JOIN users u ON r.user_id = u.id 
                    WHERE r.message_id = ?
                `).all(message_id);

                const msg = db.prepare('SELECT conversation_id FROM messages WHERE id = ?').get(message_id);
                if (msg) {
                    io.to(`conversation_${msg.conversation_id}`).emit('message_reaction_updated', {
                        message_id,
                        reactions
                    });
                }
            } catch (err) {
                console.error('Erreur reaction :', err);
            }
        });

        // Déconnexion
        socket.on('disconnect', () => {
            userSockets.delete(userId);
            console.log(`🔌 Client déconnecté Socket.IO : ${socket.user.username}`);
        });
    });
}

module.exports = initChatSockets;
