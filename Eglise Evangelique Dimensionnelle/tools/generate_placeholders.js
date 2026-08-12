const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, '../public/images');
if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
}

function makeSVG(title, subtitle, color1 = '#1a365d', color2 = '#2b6cb0', icon = '⛪') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#grad)"/>
  <circle cx="400" cy="200" r="80" fill="rgba(255,255,255,0.1)"/>
  <text x="400" y="215" font-family="'Segoe UI', sans-serif" font-size="60" text-anchor="middle" fill="#ffffff">${icon}</text>
  <text x="400" y="320" font-family="'Segoe UI', sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="#ffffff">${title}</text>
  <text x="400" y="360" font-family="'Segoe UI', sans-serif" font-size="20" text-anchor="middle" fill="#d6bcfa">${subtitle}</text>
</svg>`;
}

function makeAvatarSVG(name, initials, bg = '#4c51bf') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <rect width="300" height="300" rx="150" fill="${bg}"/>
  <text x="150" y="175" font-family="'Segoe UI', sans-serif" font-size="100" font-weight="bold" text-anchor="middle" fill="#ffffff">${initials}</text>
</svg>`;
}

const files = {
    'church-logo.png': makeSVG('ÉglisAven', 'Communauté de Foi & d\'Espoir', '#0f172a', '#1e293b', '✝️'),
    'default-avatar.png': makeAvatarSVG('Membre', '✝️', '#3b82f6'),
    'pastor-photo.jpg': makeAvatarSVG('Pasteur David Kouamé', 'DK', '#1e3a8a'),
    'leader-sarah.jpg': makeAvatarSVG('Sarah Kouamé', 'SK', '#7c3aed'),
    'leader-marc.jpg': makeAvatarSVG('Marc Antoine', 'MA', '#0284c7'),
    'leader-helene.jpg': makeAvatarSVG('Hélène Dubois', 'HD', '#0d9488'),
    'hero-church.jpg': makeSVG('ÉglisAven Auditorium', 'Bienvenue dans la maison du Seigneur', '#090d16', '#1e1b4b', '✨'),
    'default-event.jpg': makeSVG('Événement ÉglisAven', 'Rassemblement & Célébration', '#1e293b', '#334155', '📅'),
    'event-culte.jpg': makeSVG('Grand Culte de Célébration', 'Louange, Adoration & Parole', '#1e3a8a', '#3b82f6', '🙌'),
    'event-evangelisation.jpg': makeSVG('Campagne d\'Évangélisation', 'Impact spirituel en plein air', '#701a75', '#c026d3', '🔥'),
    'event-jeunesse.jpg': makeSVG('Conférence Jeunesse Impact', 'Bâtir son avenir sur la foi', '#065f46', '#10b981', '🚀'),
    'default-sermon.jpg': makeSVG('Prédication Biblique', 'Enseignement de la Parole', '#312e81', '#6366f1', '📖'),
    'sermon-grace.jpg': makeSVG('La Révélation de la Grâce', 'Pasteur David Kouamé', '#1e3a8a', '#60a5fa', '🕊️'),
    'sermon-priere.jpg': makeSVG('La Prière Persévérante', 'Enseignement spirituel', '#581c87', '#a855f7', '🙏'),
    'default-training.jpg': makeSVG('Formation Biblique', 'Discipulat et Édification', '#064e3b', '#059669', '🎓'),
    'training-discipulat.jpg': makeSVG('Fondements du Discipulat', 'Module de formation pour tous', '#0f766e', '#14b8a6', '📜'),
    'training-leadership.jpg': makeSVG('Leadership Chrétien', 'Servir avec intégrité', '#854d0e', '#eab308', '👑'),
    'announcement-banner.jpg': makeSVG('Annonce Officielle ÉglisAven', 'Information importante de la communauté', '#881337', '#e11d48', '📢')
};

Object.entries(files).forEach(([filename, content]) => {
    fs.writeFileSync(path.join(imgDir, filename), content);
});

console.log('✅ 18 images SVG de démonstration générées dans public/images/');
