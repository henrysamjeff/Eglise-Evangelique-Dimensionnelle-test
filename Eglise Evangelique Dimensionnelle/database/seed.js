require('dotenv').config();
require('./generate_placeholders');
const db = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log("🌱 Démarrage de l'initialisation de la base de données (Seed)...");

    // 1. Rôles
    const insertRole = db.prepare('INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)');
    insertRole.run(1, 'visitor', 'Visiteur public');
    insertRole.run(2, 'member', 'Membre enregistré');
    insertRole.run(3, 'moderator', 'Modérateur de contenu et témoignages');
    insertRole.run(4, 'pastor', 'Pasteur créateur de formations et enseignements');
    insertRole.run(5, 'admin', 'Administrateur avec contrôle total');

    // 2. Utilisateurs initiaux
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@eglisaven.org';
    const adminPass = process.env.ADMIN_PASSWORD || 'AdminPassword2026!';
    const adminHash = await bcrypt.hash(adminPass, 10);
    const pastorHash = await bcrypt.hash('Pastor2026!', 10);
    const memberHash = await bcrypt.hash('Member2026!', 10);

    const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (first_name, last_name, username, email, phone, password_hash, avatar_url, bio, role_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Compte Admin
    insertUser.run(
        'Administrateur',
        'Système',
        '@admin',
        adminEmail,
        '+1 514 555 0100',
        adminHash,
        '/images/default-avatar.png',
        "Compte administrateur principal de la plateforme ÉglisAven.",
        5 // admin
    );

    // Compte Pasteur
    insertUser.run(
        'David',
        'Kouamé',
        '@pasteurdavid',
        'pastor@eglisaven.org',
        '+1 514 555 0101',
        pastorHash,
        '/images/pastor-photo.jpg',
        "Pasteur principal de ÉglisAven. Passionné par l'enseignement biblique et la grâce de Dieu.",
        4 // pastor
    );

    // Compte Membre de démonstration
    insertUser.run(
        'Henry',
        'Miracle',
        '@henrysam',
        'member@eglisaven.org',
        '+1 514 555 0102',
        memberHash,
        '/images/default-avatar.png',
        "Fidèle membre engagé au sein du ministère de louange.",
        2 // member
    );

    // Récupérer les ID
    const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('@admin');
    const pastorUser = db.prepare('SELECT id FROM users WHERE username = ?').get('@pasteurdavid');
    const memberUser = db.prepare('SELECT id FROM users WHERE username = ?').get('@henrysam');

    // 3. Événements initiaux
    const insertEvent = db.prepare(`
        INSERT INTO events (title, description, image_url, event_date, event_time, location, category, is_published, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertEvent.run(
        'Grand Culte de Célébration & Action de Grâces',
        "Venez célébrer le Seigneur dans la louange, l'adoration et la parole révélée avec le Pasteur David Kouamé.",
        '/images/event-culte.jpg',
        '2026-08-16',
        '10:00:00',
        'Secteur A, Auditorium Principal ÉglisAven',
        'Cultes',
        1,
        pastorUser.id
    );

    insertEvent.run(
        "Campagne d'Évangélisation et de Guérison",
        "Une grande soirée d'impact spirituel et d'évangélisation en plein air pour la communauté.",
        '/images/event-evangelisation.jpg',
        '2026-08-22',
        '18:00:00',
        'Place de la Paix & En direct sur la plateforme',
        'Évangélisation',
        1,
        adminUser.id
    );

    insertEvent.run(
        'Conférence des Jeunes Impact 2026',
        'Rassemblement annuel des jeunes passionnés pour Christ. Thème : Bâtir son avenir sur la foi.',
        '/images/event-jeunesse.jpg',
        '2026-09-05',
        '15:00:00',
        'Salle polyvalente ÉglisAven',
        'Jeunesse',
        1,
        pastorUser.id
    );

    // 4. Prédications initiales
    const insertSermon = db.prepare(`
        INSERT INTO sermons (title, description, thumbnail_url, media_url, media_type, preacher_name, sermon_date, category, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSermon.run(
        'Marcher dans la Révélation de la Grâce',
        "Un enseignement profond sur la pleine dimension de la grâce de Dieu dans notre quotidien.",
        '/images/sermon-grace.jpg',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'video',
        'Pasteur David Kouamé',
        '2026-08-09',
        'Vidéos',
        pastorUser.id
    );

    insertSermon.run(
        'La Puissance de la Prière Persévérante',
        'Découvrez comment maintenir une vie de prière ardente qui brise les blocages.',
        '/images/sermon-priere.jpg',
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        'audio',
        'Pasteur David Kouamé',
        '2026-08-02',
        'Enseignements',
        pastorUser.id
    );

    // 5. Formations initiales
    const insertTraining = db.prepare(`
        INSERT INTO trainings (title, description, thumbnail_url, media_url, media_type, pdf_document_url, category, author_name, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTraining.run(
        'Fondements de la Foi et du Discipulat',
        'Module complet de formation pour affermir sa marche avec Christ et comprendre la Bible.',
        '/images/training-discipulat.jpg',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'video',
        '/uploads/documents/guide_discipulat_2026.pdf',
        'Discipulat',
        'Pasteur David Kouamé',
        pastorUser.id
    );

    insertTraining.run(
        'Leadership Chrétien et Servitude',
        'Les principes bibliques essentiels pour diriger avec humilité, sagesse et intégrité.',
        '/images/training-leadership.jpg',
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        'audio',
        '/uploads/documents/manuel_leadership_eglisaven.pdf',
        'Leadership',
        'Pasteur David Kouamé',
        pastorUser.id
    );

    // 6. Témoignages initiaux
    const insertTestimonial = db.prepare(`
        INSERT INTO testimonials (user_id, title, description, media_type, status, approved_by, approved_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    insertTestimonial.run(
        memberUser.id,
        'Guérison divine miraculeuse lors du culte de dimanche',
        "Je rends gloire à Dieu car lors du dernier culte d'intercession, le Seigneur m'a complètement délivré d'une douleur chronique.",
        'text',
        'approved',
        pastorUser.id
    );

    const insertPendingTestimonial = db.prepare(`
        INSERT INTO testimonials (user_id, title, description, media_type, status)
        VALUES (?, ?, ?, ?, ?)
    `);

    insertPendingTestimonial.run(
        memberUser.id,
        'Restauration financière et nouvel emploi',
        "Après 6 mois de recherche, le Seigneur a ouvert une porte extraordinaire au-delà de mes attentes. Merci pour les prières !",
        'text',
        'pending'
    );

    // 7. Annonces initiales
    const insertAnnouncement = db.prepare(`
        INSERT INTO announcements (title, message, image_url, created_by)
        VALUES (?, ?, ?, ?)
    `);

    insertAnnouncement.run(
        'Avis important — Horaire du Culte de Dimanche',
        "Chers frères et sœurs, le culte de ce dimanche commencera exceptionnellement à 10h00 au lieu de 09h30.",
        '/images/announcement-banner.jpg',
        pastorUser.id
    );

    // 8. Notifications de bienvenue
    const insertNotification = db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, target_url)
        VALUES (?, ?, ?, ?, ?)
    `);

    insertNotification.run(
        memberUser.id,
        'announcement_new',
        'Bienvenue sur ÉglisAven !',
        "Votre compte membre est actif. Découvrez les prédications et échangez en direct dans l'espace Chat.",
        '/chat.html'
    );

    console.log('🎉 Seed SQLite exécuté avec succès !');
    console.log('----------------------------------------------------');
    console.log(`Compte Admin créé  : ${adminEmail} (Mot de passe: ${adminPass})`);
    console.log(`Compte Pasteur créé: pastor@eglisaven.org (Mot de passe: Pastor2026!)`);
    console.log(`Compte Membre créé : member@eglisaven.org / @henrysam (Mot de passe: Member2026!)`);
    console.log('----------------------------------------------------');
}

seed().catch((err) => {
    console.error('❌ Erreur lors du seed :', err);
    process.exit(1);
});
