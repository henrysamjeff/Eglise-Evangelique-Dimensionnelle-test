const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Assurer l'existence des répertoires d'upload
const baseUploadDir = path.join(__dirname, '../../public/uploads');
const subDirs = ['avatars', 'testimonials', 'sermons', 'trainings', 'events', 'chat', 'documents'];

subDirs.forEach(sub => {
    const dir = path.join(baseUploadDir, sub);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configuration du stockage Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'chat';
        if (req.baseUrl.includes('users') || req.path.includes('avatar')) folder = 'avatars';
        else if (req.baseUrl.includes('testimonials')) folder = 'testimonials';
        else if (req.baseUrl.includes('sermons')) folder = 'sermons';
        else if (req.baseUrl.includes('trainings')) folder = 'trainings';
        else if (req.baseUrl.includes('events')) folder = 'events';
        else if (req.baseUrl.includes('documents')) folder = 'documents';

        cb(null, path.join(baseUploadDir, folder));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// Extensions et types MIME autorisés
const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    // Vidéos
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    // Audios
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/x-wav', 'audio/aac',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'
];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg', '.aac', '.pdf', '.doc', '.docx', '.txt'].includes(ext);
    const isAllowedMime = allowedMimeTypes.includes(file.mimetype);

    if (isAllowedExt && isAllowedMime) {
        cb(null, true);
    } else {
        cb(new Error(`Type de fichier non autorisé : ${file.originalname} (${file.mimetype})`), false);
    }
};

// Limite de taille : 50 Mo max par fichier
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});

module.exports = upload;
