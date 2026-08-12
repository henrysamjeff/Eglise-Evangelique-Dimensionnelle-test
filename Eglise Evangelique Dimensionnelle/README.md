# ÉglisAven — Plateforme Web Numérique Professionnelle pour Église

Une plateforme web moderne, sécurisée, responsive et complète développée en **Node.js**, **Express.js**, **SQLite (`better-sqlite3`)**, **HTML5/CSS3** et **Socket.IO** pour la gestion d'une église et la messagerie en temps réel.

---

## 1. Présentation

ÉglisAven est une solution logicielle numérique clé en main permettant à une église de :
- Gérer son image publique et sa communauté.
- Offrir une bibliothèque de prédications vidéo et audio.
- Diffuser ses événements et cultes.
- Proposer des formations bibliques réservées aux membres et gérées par l'équipe pastorale.
- Soumettre et modérer les témoignages des membres.
- Proposer une messagerie privée en temps réel moderne avec recherche par `@username`, envoi de médias et enregistrement de notes vocales au micro.
- Faciliter le soutien financier avec une page de dons claire et sécurisée (Zelle, Cash App, Interac, MonCash).
- Administrer les utilisateurs et les autorisations grâce à un système complet de rôles **RBAC**.

---

## 2. Prérequis

- **Node.js** version 18.0.0 ou supérieure.
- **npm** (inclus avec Node.js).
- Système d'exploitation : Windows, macOS ou Linux.

---

## 3. Installation de Node.js

Si Node.js n'est pas encore installé sur votre système Windows :
1. Rendez-vous sur le site officiel [Node.js Official Website](https://nodejs.org/).
2. Téléchargez la version LTS (Long Term Support).
3. Exécutez le fichier d'installation `.msi` et suivez les instructions à l'écran.

---

## 4. Installation des Dépendances

Dans le dossier du projet, ouvrez votre terminal (PowerShell ou CMD) et lancez :

```bash
npm install
```

Cette commande installera toutes les dépendances requises (`express`, `better-sqlite3`, `socket.io`, `bcryptjs`, `jsonwebtoken`, `multer`, `helmet`, `express-rate-limit`, etc.).

---

## 5. Configuration `.env`

Le projet inclut un fichier `.env.example`. Un fichier `.env` a été généré pour le développement local.

Exemple de contenu du fichier `.env` :

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=church_super_secret_jwt_key_2026_antigravity_safe
ADMIN_EMAIL=admin@eglisaven.org
ADMIN_PASSWORD=AdminPassword2026!
```

---

## 6 & 7. Création et Initialisation de la Base SQLite

La base de données utilise **SQLite** avec `better-sqlite3` et le mode WAL (`journal_mode = WAL`) avec les clés étrangères activées (`PRAGMA foreign_keys = ON`).

Le fichier de base de données est automatiquement créé à l'emplacement :
`database/church.db` lors de l'exécution du schéma `database/schema.sql`.

---

## 8. Création du Compte Admin et Seed Initial

Pour initialiser les rôles par défaut, créer le premier compte administrateur, le compte pasteur, le membre de démonstration et les données initiales, exécutez :

```bash
npm run seed
```

### Comptes de démonstration générés :
- **Administrateur** : `admin@eglisaven.org` / Mot de passe : `AdminPassword2026!` (Handle: `@admin`)
- **Pasteur** : `pastor@eglisaven.org` / Mot de passe : `Pastor2026!` (Handle: `@pasteurdavid`)
- **Membre** : `member@eglisaven.org` / Mot de passe : `Member2026!` (Handle: `@henrysam`)

---

## 9. Lancement du Serveur

Pour démarrer l'application en mode production :

```bash
npm start
```

Pour démarrer en mode développement avec redémarrage automatique (Nodemon) :

```bash
npm run dev
```

L'application est ensuite accessible sur : **`http://localhost:3000`**

---

## 10. Structure du Projet

```
church_platform/
│
├── server/
│   ├── server.js                      # Serveur principal Express, Helmet, CORS, Socket.IO
│   ├── config/
│   │   └── church.config.js           # Fichier central de configuration de l'église
│   ├── middleware/
│   │   ├── auth.js                    # Middlewares d'authentification JWT & contrôle RBAC
│   │   └── upload.js                  # Middleware Multer pour téléversements sécurisés
│   ├── routes/
│   │   ├── auth.routes.js             # Connexion, inscription, profil, mot de passe
│   │   ├── users.routes.js            # Recherche par @handle, profil, blocage
│   │   ├── events.routes.js           # CRUD événements & cultes
│   │   ├── sermons.routes.js          # Prédications vidéos & audios
│   │   ├── testimonials.routes.js     # Témoignages & modération
│   │   ├── trainings.routes.js        # Formations bibliques (Pasteur/Admin)
│   │   ├── announcements.routes.js    # Annonces d'église
│   │   ├── chat.routes.js             # API Chat & pièces jointes
│   │   └── admin.routes.js            # Stats admin, rôles & signalements
│   └── sockets/
│       └── chat.socket.js             # WebSockets Socket.IO temps réel
│
├── database/
│   ├── db.js                          # Connexion singleton SQLite better-sqlite3
│   ├── schema.sql                     # Schéma SQL des tables et index
│   ├── generate_placeholders.js       # Générateur d'images SVG de démonstration
│   └── seed.js                        # Script d'initialisation des rôles & comptes
│
├── public/
│   ├── css/
│   │   └── style.css                  # Système de design CSS3 (Glassmorphism & Thème d'église)
│   ├── js/
│   │   └── main.js                    # Logique frontend, Intro Splash, Socket.IO, Notifs
│   ├── uploads/                       # Dossier de stockage des médias téléversés
│   ├── images/                        # Images statiques et logos
│   ├── index.html                     # Page d'accueil & Intro animée
│   ├── about.html                     # Page À propos (Histoire, Pasteur, Équipe, Maps)
│   ├── events.html                    # Page Événements avec filtres
│   ├── sermons.html                   # Galerie des Prédications & Lecteur
│   ├── trainings.html                 # Formations Bibliques Pastorales
│   ├── testimonials.html              # Témoignages & Soumission Membre
│   ├── donations.html                 # Page Faire un don (Zelle, Cash App, Interac, MonCash)
│   ├── contact.html                   # Page Nous trouver & Accès direct
│   ├── chat.html                      # Messagerie privée temps réel & Notes vocales
│   ├── profile.html                   # Gestion du Profil Membre
│   ├── admin.html                     # Tableau de bord Administrateur
│   └── pastor.html                    # Tableau de bord Pasteur
│
├── .env.example
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

## 11. Explication des Rôles (RBAC)

1. **`visitor`** : Peut consulter les pages publiques, prédications et événements publics, et lire les témoignages approuvés.
2. **`member`** : Peut accéder au chat temps réel, échanger des messages privés, soumettre des témoignages (en attente de modération) et recevoir des notifications.
3. **`moderator`** : Peut réviser, approuver ou rejeter les témoignages, et traiter les signalements.
4. **`pastor`** : Peut créer et publier des formations bibliques, ajouter des prédications, créer des annonces et modérer du contenu.
5. **`admin`** : Contrôle total sur la gestion des utilisateurs, l'attribution des rôles RBAC, les événements, prédications, formations et paramètres du site.

---

## 12. Explication du Chat Temps Réel

- **Technologie** : Socket.IO avec authentification via Token JWT.
- **Recherche Utilisateur** : Saisissez un `@username` (ex: `@david` ou `@henrysam`) dans la barre de recherche du chat pour démarrer un échange instantané. Aucune démarche préalable d'ajout d'amis n'est requise.
- **Fonctionnalités** : Messages texte, emojis, réactions (❤️), réponses contextuelles, suppression.
- **Notes Vocales (Section 16)** : Cliquez sur l'icône de microphone 🎙️ pour enregistrer directement votre message vocal via l'API navigateur `MediaRecorder`. L'enregistrement est automatiquement téléversé dans `/uploads/chat/` et diffusé en temps réel.
- **Médias** : Prise en charge des images, vidéos MP4, audios et documents PDF.

---

## 13. Explication des Uploads

Les fichiers médias téléversés sont gérés par **Multer** dans `server/middleware/upload.js`.
- **Validation** : Strict contrôle des extensions (`.jpg`, `.png`, `.mp4`, `.mp3`, `.wav`, `.pdf`) ET validation des types MIME.
- **Emplacement** : Stockés sous `public/uploads/` dans des sous-dossiers spécifiques (`avatars`, `testimonials`, `sermons`, `trainings`, `events`, `chat`, `documents`).
- Les métadonnées (nom, chemin, type, taille, propriétaire) sont enregistrées en base SQLite.

---

## 14 & 15. Instructions pour Modifier le Logo et les Informations de l'Église

Toutes les données de l'église sont centralisées dans le fichier :
**`server/config/church.config.js`**

Pour changer le nom, le slogan, le logo ou l'histoire de l'église, modifiez simplement les propriétés du bloc `church` :

```javascript
module.exports = {
    church: {
        name: "Votre Nom d'Église",
        slogan: "Votre slogan ici",
        logoUrl: "/images/votre-logo.png",
        // ...
    }
};
```

---

## 16. Instructions pour Modifier la Vidéo de Direction

Dans `server/config/church.config.js`, modifiez la clé `directionVideoUrl` sous le bloc `contact` :

```javascript
contact: {
    // ...
    directionVideoUrl: "https://www.youtube.com/embed/VOTRE_CODE_VIDEO_ICI"
}
```

---

## 17. Instructions pour Ajouter/Modifier les Moyens de Paiement

Dans `server/config/church.config.js`, modifiez le tableau `methods` sous le bloc `donations` :

```javascript
donations: {
    warningNotice: "Votre message de sécurité...",
    methods: [
        {
            name: "Zelle",
            account: "votre-email-zelle@eglisaven.org",
            recipient: "Nom du compte officiel",
            instructions: "Instructions d'envoi"
        },
        // Ajoutez ou modifiez vos comptes Zelle, Cash App, Interac, MonCash...
    ]
}
```
