/* ==========================================================================
   ÉglisAven - Frontend Common Logic, Auth & Socket Manager
   ========================================================================== */

let currentUser = null;
let churchConfig = null;
let socket = null;

document.addEventListener('DOMContentLoaded', async () => {
    initSplashIntro();
    await loadChurchConfig();
    await checkAuth();
    initMobileNav();
    initSocketConnection();
});

/* --------------------------------------------------------------------------
   1. Introduction Splash Screen (Section 3)
   -------------------------------------------------------------------------- */
function initSplashIntro() {
    const splash = document.getElementById('splash-intro');
    if (!splash) return;

    // Ne pas afficher à chaque navigation entre pages (Utilisation de sessionStorage)
    const introSeen = sessionStorage.getItem('eglisaven_intro_seen');
    if (introSeen) {
        splash.style.display = 'none';
        return;
    }

    // Bouton passer
    const btnSkip = document.getElementById('btn-skip-splash');
    if (btnSkip) {
        btnSkip.addEventListener('click', closeSplash);
    }

    // Fermeture automatique après 3.2 secondes
    setTimeout(() => {
        closeSplash();
    }, 3200);

    function closeSplash() {
        splash.classList.add('hidden');
        sessionStorage.setItem('eglisaven_intro_seen', 'true');
        setTimeout(() => {
            splash.style.display = 'none';
        }, 800);
    }
}

/* --------------------------------------------------------------------------
   2. Chargement de la Configuration Centralisée (Section 30)
   -------------------------------------------------------------------------- */
async function loadChurchConfig() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            churchConfig = await res.json();

            // Mettre à jour la marque si présent dans la page
            document.querySelectorAll('.church-name-text').forEach(el => el.textContent = churchConfig.church.name);
            document.querySelectorAll('.church-slogan-text').forEach(el => el.textContent = churchConfig.church.slogan);
            document.querySelectorAll('.church-logo-img').forEach(el => el.src = churchConfig.church.logoUrl);
        }
    } catch (err) {
        console.error('Erreur chargement config église :', err);
    }
}

/* --------------------------------------------------------------------------
   3. Authentification & Navigation Dynamique par Rôle (Section 10 & 12)
   -------------------------------------------------------------------------- */
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            renderAuthUI(true);
            loadNotificationBadge();
        } else {
            currentUser = null;
            renderAuthUI(false);
        }
    } catch (err) {
        currentUser = null;
        renderAuthUI(false);
    }
}

function renderAuthUI(isLoggedIn) {
    const authActions = document.getElementById('nav-auth-actions');
    if (!authActions) return;

    if (isLoggedIn && currentUser) {
        let staffLinks = '';

        if (['admin', 'pastor', 'moderator'].includes(currentUser.role)) {
            staffLinks += `<a href="/admin.html" class="nav-item">Tableau Admin</a>`;
        }

        if (['pastor', 'admin'].includes(currentUser.role)) {
            staffLinks += `<a href="/pastor.html" class="nav-item">Tableau Pasteur</a>`;
        }

        authActions.innerHTML = `
            <button class="notif-bell-btn" onclick="toggleNotifPanel()" title="Notifications">
                🔔 <span class="notif-badge" id="notif-count" style="display:none;">0</span>
            </button>
            <div class="user-menu" onclick="toggleUserDropdown(event)">
                <img src="${currentUser.avatar_url}" class="user-avatar" alt="Avatar">
                <div style="display: flex; flex-direction: column; text-align: left;">
                    <span style="font-weight:600; font-size:0.9rem;">${currentUser.first_name}</span>
                    <span class="user-role-tag">${currentUser.role}</span>
                </div>
                <div class="dropdown-menu" id="user-dropdown">
                    <a href="/profile.html">Mon Profil (${currentUser.username})</a>
                    <a href="/chat.html">Messagerie / Chat</a>
                    ${staffLinks}
                    <button onclick="handleLogout()" style="color:var(--danger);">Déconnexion</button>
                </div>
            </div>
        `;
    } else {
        authActions.innerHTML = `
            <button class="btn btn-secondary btn-sm" onclick="openModal('modal-login')">Connexion</button>
            <button class="btn btn-primary btn-sm" onclick="openModal('modal-register')">Nous rejoindre</button>
        `;
    }
}

function toggleUserDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

document.addEventListener('click', () => {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.remove('show');
});

async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        showToast('Déconnexion réussie', 'info');
        setTimeout(() => window.location.href = '/', 800);
    } catch (err) {
        showToast('Erreur déconnexion', 'error');
    }
}

/* --------------------------------------------------------------------------
   4. Connexion Socket.IO et Notifications Temps Réel (Section 21)
   -------------------------------------------------------------------------- */
function initSocketConnection() {
    if (typeof io === 'undefined') return;

    socket = io({
        auth: { token: getCookie('token') },
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('⚡ Connecté au serveur Socket.IO !');
    });

    socket.on('new_notification', (notif) => {
        showToast(`🔔 ${notif.title} : ${notif.message}`, 'info');
        loadNotificationBadge();
    });
}

async function loadNotificationBadge() {
    try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
            const data = await res.json();
            const badge = document.getElementById('notif-count');
            if (badge) {
                if (data.unreadCount > 0) {
                    badge.textContent = data.unreadCount;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (err) {}
}

/* --------------------------------------------------------------------------
   5. Mobile Navigation
   -------------------------------------------------------------------------- */
function initMobileNav() {
    const hamburger = document.getElementById('hamburger-btn');
    const navLinks = document.getElementById('nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
    }
}

/* --------------------------------------------------------------------------
   6. Modales & System Toasts
   -------------------------------------------------------------------------- */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}
