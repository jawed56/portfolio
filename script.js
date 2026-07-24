// ==========================================
// CONFIGURATION DE L'AGENT IA (FRONT-END)
// ==========================================

// 1. GESTION DE LA RECONNAISSANCE VOCALE (MICRO)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let estEnTrainDÉcouter = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR'; // Configuration en français
    recognition.interimResults = false; // Attendre que l'utilisateur ait fini sa phrase
    recognition.maxAlternatives = 1;

    // Déclenché lorsque le micro a capté et traduit la voix en texte
    recognition.onresult = (event) => {
        const texteReconnu = event.results[0][0].transcript;
        
        // 1. On affiche immédiatement ce que l'utilisateur a dit dans le chat
        ajouterMessageInterface(texteReconnu, 'utilisateur');
        
        // 2. On l'envoie à la fonction Netlify qui interroge Groq
        envoyerAIA(texteReconnu);
    };

    // Gestion de la fin de l'écoute
    recognition.onend = () => {
        estEnTrainDÉcouter = false;
        majBoutonMicro(false);
    };

    // Gestion des erreurs éventuelles du micro
    recognition.onerror = (event) => {
        console.error("Erreur de reconnaissance vocale :", event.error);
        estEnTrainDÉcouter = false;
        majBoutonMicro(false);
    };
} else {
    console.warn("La reconnaissance vocale n'est pas supportée par ce navigateur.");
}

// Fonction reliée au clic sur le bouton HTML
function basculerMicro() {
    if (!recognition) {
        alert("La reconnaissance vocale n'est pas supportée par votre navigateur actuel. Privilégiez Google Chrome ou Safari.");
        return;
    }

    if (estEnTrainDÉcouter) {
        recognition.stop();
    } else {
        estEnTrainDÉcouter = true;
        majBoutonMicro(true);
        recognition.start();
    }
}

// ==========================================
// 2. COMMUNICATION AVEC LE BACK-END (NETLIFY & GROQ)
// ==========================================
async function envoyerAIA(messageUtilisateur) {
    afficherIndicateurChargement(true);
    
    try {
        // Appel de votre fonction Netlify sécurisée (qui masque votre clé GROQ_API_KEY)
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageUtilisateur }),
        });

        const data = await response.json();
        afficherIndicateurChargement(false);

        if (data.reply) {
            // 1. Afficher la réponse textuelle de Groq
            ajouterMessageInterface(data.reply, 'ia');
            
            // 2. Faire parler l'IA à haute voix
            faireParlerIA(data.reply);
        } else {
            ajouterMessageInterface("Désolé, j'ai rencontré un problème pour obtenir une réponse.", 'ia');
        }
    } catch (error) {
        console.error("Erreur lors de la communication avec la fonction Netlify :", error);
        afficherIndicateurChargement(false);
        ajouterMessageInterface("Impossible de joindre l'agent IA pour le moment. Vérifiez votre connexion.", 'ia');
    }
}

// ==========================================
// 3. SYNTHÈSE VOCALE (FAIRE PARLER L'IA)
// ==========================================
function faireParlerIA(texte) {
    if ('speechSynthesis' in window) {
        // Arrêter toute lecture en cours pour éviter les chevauchements
        window.speechSynthesis.cancel();

        // Nettoyer grossièrement le texte des émojis pour une lecture plus fluide
        const texteNettoye = texte.replace(/[\u{1F600}-\u{1F9FF}]/gu, '');

        const enonce = new SpeechSynthesisUtterance(texteNettoye);
        enonce.lang = 'fr-FR';
        enonce.rate = 1.0;  // Vitesse normale
        enonce.pitch = 1.0; // Tonalité standard

        // Recherche d'une voix française disponible sur le système du visiteur
        const voixDisponibles = window.speechSynthesis.getVoices();
        const voixFrancaise = voixDisponibles.find(v => v.lang.startsWith('fr'));
        if (voixFrancaise) {
            enonce.voice = voixFrancaise;
        }

        window.speechSynthesis.speak(enonce);
    } else {
        console.warn("La synthèse vocale n'est pas supportée par ce navigateur.");
    }
}

// ==========================================
// 4. FONCTIONS DE MISE À JOUR DE L'INTERFACE
// ==========================================

function ajouterMessageInterface(texte, auteur) {
    const zoneChat = document.getElementById('chat-box');
    if (!zoneChat) return;

    const bulle = document.createElement('div');
    bulle.className = `message ${auteur}`;
    bulle.textContent = texte;

    // Styles dynamiques appliqués selon l'auteur (IA ou Utilisateur)
    if (auteur === 'ia') {
        bulle.style.alignSelf = 'flex-start';
        bulle.style.background = 'rgba(255, 255, 255, 0.06)';
        bulle.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        bulle.style.color = 'rgba(255, 255, 255, 0.9)';
        bulle.style.borderRadius = '16px 16px 16px 4px';
    } else {
        bulle.style.alignSelf = 'flex-end';
        bulle.style.background = '#ffffff';
        bulle.style.color = '#0b0f19';
        bulle.style.borderRadius = '16px 16px 4px 16px';
    }

    // Styles de base communs aux bulles
    bulle.style.padding = '12px 16px';
    bulle.style.fontSize = '14px';
    bulle.style.maxWidth = '80%';
    bulle.style.lineHeight = '1.5';
    bulle.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';

    zoneChat.appendChild(bulle);
    
    // Défilement automatique vers le bas pour voir le dernier message
    zoneChat.scrollTop = zoneChat.scrollHeight;
}

function majBoutonMicro(ecouteEnCours) {
    const boutonMicro = document.getElementById('btn-micro');
    if (!boutonMicro) return;
    
    if (ecouteEnCours) {
        boutonMicro.style.background = '#ef4444'; // Rouge pendant l'écoute
        boutonMicro.style.color = '#ffffff';
        boutonMicro.textContent = "🛑 Écoute en cours... Parlez maintenant";
    } else {
        boutonMicro.style.background = '#ffffff'; // Retour au blanc initial
        boutonMicro.style.color = '#0b0f19';
        boutonMicro.textContent = "🎤 Parler à l'IA";
    }
}

function afficherIndicateurChargement(enCours) {
    const loader = document.getElementById('chat-loader');
    if (loader) {
        loader.style.display = enCours ? 'block' : 'none';
    }
}

// Optionnel : s'assurer que les voix de la synthèse vocale sont chargées par le navigateur
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}
