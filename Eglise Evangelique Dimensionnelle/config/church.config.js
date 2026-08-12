// Configuration centralisée de l'église ÉglisAven
module.exports = {
    church: {
        name: "Église Évangelique Dimensionnelle",
        slogan: "Une communauté d'amour, de foi, d'espoir et de transformation spirituelle",
        logoUrl: "/images/church-logo.png",
        welcomeTitle: "Bienvenue à l'Église Évangelique Dimensionnelle",
        welcomeSubtitle: "Un lieu de refuge, de prière, de célébration et de fraternité en Jésus-Christ",
        pastorName: "Pasteur Roody Fevry",
        pastorTitle: "Pasteur Principal & Fondateur",
        pastorBio: "Le Pasteur Roody Fevry œuvre avec passion depuis plus de 15 ans pour l'édification du corps de Christ et l'épanouissement spirituel des familles.",
        pastorPhoto: "/images/pastor-photo.jpg",
        history: "Fondée en 2012, Église Évangelique Dimensionnelle est née de la vision de rassembler des personnes de toutes origines pour vivre la vérité de l'Évangile et servir la communauté localement et internationalement.",
        vision: "Bâtir une génération forte en Christ, ancrée dans la Parole de Dieu, le service et l'amour du prochain.",
        mission: "Évangéliser, former des disciples engagés, soutenir les familles et manifester la compassion de Christ par des actions concrètes."
    },

    contact: {
        address: "1250 Avenue de la Foi, Montréal, QC H2X 1Y4, Canada",
        phone: "+1 (514) 555-0199",
        whatsapp: "+15145550199",
        whatsappFormatted: "+1 514 555-0199",
        email: "contact@eglisaven.org",
        googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d89399.78913988647!2d-73.66699663914569!3d45.55811059756191!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4cc91a541c64b70d%3A0x654e3138211fefef!2sMontreal%2C%20QC!5e0!3m2!1sfr!2sca!4v1700000000000!5m2!1sfr!2sca",
        googleMapsDirectLink: "https://maps.google.com/?q=1250+Avenue+de+la+Foi+Montreal+QC",
        directionVideoUrl: "public/videos/direction.mp4"
    },

    donations: {
        warningNotice: "⚠️ AVERTISSEMENT DE SÉCURITÉ : Assurez-vous d'utiliser uniquement les coordonnées officielles ci-dessous avant d'effectuer un transfert. L'église ÉglisAven ne vous demandera jamais d'envoyer des fonds sur des comptes personnels non vérifiés.",
        methods: [
            {
                name: "Zelle",
                Number: "+15145550199"
            },
            {
                name: "Cash App",
                Number: "+15145550199"
            },
            {
                name: "Interac (Canada)",
                Number: "+1 514 555 0199",
            },
            {
                name: "MonCash",
                Number: "+509 3700-1234",
                recipient: "Église Évangelique Dimensionnelle Haïti",
                instructions: "Envoyez votre don via le menu MonCash en indiquant le numéro officiel."
            }
        ]
    },

    leadership: [
        {
            name: "Pasteur Roody Fevry",
            role: "Pasteur Principal",
            photo: "/images/pastor-photo.jpg",
            description: "Direction spirituelle et prédication principale."
        },
        {
            name: "Sarah Kouamé",
            role: "Responsable du Ministère des Femmes & Enseignement",
            photo: "/images/leader-sarah.jpg",
            description: "Coordination des programmes féminins et encadrement des couples."
        },
        {
            name: "Marc Antoine",
            role: "Directeur de Louange & Jeunesse",
            photo: "/images/leader-marc.jpg",
            description: "Direction de la louange et responsable des projets jeunesse."
        },
        {
            name: "Hélène Dubois",
            role: "Responsable de l'Accueil et des Actions Sociales",
            photo: "/images/leader-helene.jpg",
            description: "Organisation de l'accueil communautaire et des aides sociales."
        }
    ]
};
