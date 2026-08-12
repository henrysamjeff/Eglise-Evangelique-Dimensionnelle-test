require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const db = require('../database/db');
const churchConfig = require('./config/church.config.js');
const initChatSockets = require('./sockets/chat.socket');
const { authenticateToken } = require('./middleware/auth');

// Import des routes API
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const eventsRoutes = require('./routes/events.routes');
const sermonsRoutes = require('./routes/sermons.routes');
const testimonialsRoutes = require('./routes/testimonials.routes');
const trainingsRoutes = require('./routes/trainings.routes');
const announcementsRoutes = require('./routes/announcements.routes');
const chatRoutes = require('./routes/chat.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const server = http.createServer(app);

// Configuration Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialiser les WebSockets du Chat
initChatSockets(io);

// Middlewares de sécurité et de parsing
app.use(helmet({
    contentSecurityPolicy: false, // Désactivé en local pour autoriser l'intégration d'iframes Google Maps et vidéos YouTube
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiter pour la protection contre les tentatives brutes de connexion/inscription
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limite à 20 requêtes par 15 min
    message: { error: 'Trop de tentatives de connexion/inscription. Veuillez réessayer dans 15 minutes.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Service des fichiers statiques frontend
app.use(express.static(path.join(__dirname, '../public')));

// API Endpoint pour la configuration générale de l'église (nom, logo, dons, contacts)
app.get('/api/config', (req, res) => {
    res.json(churchConfig);
});

// API Notifications utilisateur
app.get('/api/notifications', authenticateToken, (req, res) => {
    try {
        const notifications = db.prepare(`
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        `).all(req.user.id);

        const unreadCount = db.prepare(`
            SELECT COUNT(*) as count FROM notifications
            WHERE user_id = ? AND is_read = 0
        `).get(req.user.id).count;

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error('Erreur notifications :', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des notifications.' });
    }
});

app.patch('/api/notifications/read', authenticateToken, (req, res) => {
    try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
        res.json({ message: 'Notifications marquées comme lues.' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// Montage des routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/sermons', sermonsRoutes);
app.use('/api/testimonials', testimonialsRoutes);
app.use('/api/trainings', trainingsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Fallback SPA / HTML
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Démarrage du serveur Express
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Serveur ÉglisAven démarré avec succès sur le port ${PORT}`);
    console.log(`🌐 Accessible sur : http://localhost:${PORT}`);
    console.log(`⚡ Mode : ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
});
