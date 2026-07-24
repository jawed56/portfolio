// --- CONFIGURATION DE L'AGENT IA ET DU MICRO ---

// 1. Gestion du Micro (Reconnaissance Vocale)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let estEnTrainDÉcouter = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR'; // Langue française
    recognition.interimResults = false; // Attendre la fin de la phrase
    recognition.maxAlternatives = 1;

    // Quand l'utilisateur a fini de parler
    recognition.onresult = (event) => {
        const texteReconnu = event.results[0][0].transcript;
        console.log("Texte capté à la voix :", texteReconnu);
        
        // On affiche le texte dans l'interface et on l'envoie à l'IA
        ajouterMessageInterface(texteReconnu, 'utilisateur');
        envoyerAIA(texteReconnu);
    };

    recognition.onend = () => {
        estEnTrainDÉcouter = false;
        majBoutonMicro(false);
    };

    recognition.onerror = (event) => {
        console.error("Erreur micro :", event.error);
        estEnTrainDÉcouter = false;
        majBoutonMicro(false);
    };
} else {
    console.log("La reconnaissance vocale n'est pas supportée par ce navigateur.");
}

// Fonction pour activer/désactiver le micro au clic
function basculerMicro() {
    if (!recognition) {
        alert("La reconnaissance vocale n'est pas disponible sur votre navigateur (Privilégiez Chrome ou Safari).");
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

// 2. Communication avec la fonction Netlify (Groq)
async function envoyerAIA(messageUtilisateur) {
    afficherIndicateurChargement(true);
    
    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageUtilisateur }),
        });

        const data = await response.json();
        afficherIndicateurChargement(false);

        if (data.reply) {
            ajouterMessageInterface(data.reply, 'ia');
            // Optionnel : ajouter ici la synthèse vocale pour faire parler l'IA
        } else {
            ajouterMessageInterface("Désolé, j'ai rencontré un problème avec mon API.", 'ia');
        }
    } catch (error) {
        console.error("Erreur serveur :", error);
        afficherIndicateurChargement(false);
        ajouterMessageInterface("Impossible de joindre l'agent IA pour le moment.", 'ia');
    }
}

// --- FONCTIONS UTILITAIRES POUR L'INTERFACE ---
// (À adapter selon les identifiants HTML de votre portfolio)

function ajouterMessageInterface(texte, auteur) {
    const zoneChat = document.getElementById('chat-box'); // Votre conteneur de messages
    if(!zoneChat) return;

    const bulle = document.createElement('div');
    bulle.className = `message ${auteur}`; // Classes CSS pour le style (ex: message-user, message-ia)
    bulle.textContent = texte;
    zoneChat.appendChild(bulle);
    zoneChat.scrollTop = zoneChat.scrollHeight; // Défilement automatique vers le bas
}

function majBoutonMicro(ecouteEnCours) {
    const boutonMicro = document.getElementById('btn-micro');
    if (!boutonMicro) return;
    
    if (ecouteEnCours) {
        boutonMicro.classList.add('recording');
        boutonMicro.textContent = "🎙️ Écoute en cours...";
    } else {
        boutonMicro.classList.remove('recording');
        boutonMicro.textContent = "🎤 Parler à l'IA";
    }
}

function afficherIndicateurChargement(enCours) {
    const loader = document.getElementById('chat-loader');
    if (loader) {
        loader.style.display = enCours ? 'block' : 'none';
    }
}
