const jwt = require('jsonwebtoken');
const db = require('../../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'church_super_secret_jwt_key_2026_antigravity_safe';

// Middleware de vérification du Token JWT
function authenticateToken(req, res, next) {
    let token = req.cookies.token;

    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Accès refusé. Veuillez vous connecter.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Charger les informations à jour de l'utilisateur avec son rôle
        const user = db.prepare(`
            SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.phone, u.avatar_url, u.bio, r.name as role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `).get(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouvé ou compte désactivé.' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Session expirée ou invalide. Veuillez vous reconnecter.' });
    }
}

// Middleware optionnel (ne bloque pas si non connecté)
function optionalAuthToken(req, res, next) {
    let token = req.cookies.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.substring(7);
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = db.prepare(`
                SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.phone, u.avatar_url, u.bio, r.name as role
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.id = ?
            `).get(decoded.userId);

            if (user) {
                req.user = user;
            }
        } catch (err) {
            // Ignorer l'erreur pour optionalAuth
        }
    }
    next();
}

// Middleware de vérification RBAC des rôles
function checkRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Accès non autorisé. Rôle requis: [${allowedRoles.join(', ')}]. Votre rôle: [${req.user.role}]`
            });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    optionalAuthToken,
    checkRole,
    JWT_SECRET
};
