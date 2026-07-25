// api/chat.js - Exécuté uniquement côté serveur par Vercel
export default async function handler(req, res) {
    // 1. Autoriser uniquement les requêtes POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
    }

    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Le message est requis.' });
    }

    // 2. Récupérer la clé API stockée de manière sécurisée dans Vercel
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Configuration serveur manquante (Clé API absente).' });
    }

    try {
        // 3. Effectuer l'appel à l'API Groq depuis le serveur
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${apiKey}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { 
                        role: "system", 
                        content: `Tu es l'assistant IA personnel de Rabah Loudjani.

                        Livres et travaux :
                        - "De l'exil au rejet" : Ouvrage explorant l'expérience des fils de migrants, la xénophobie intériorisée et les blessures identitaires.
                        - "Le goût de l'interdit" : Étude sur le désir sexuel à l'ère numérique, les mécanismes du tabou, la dopamine et la transgression.
                        - "Les modèles motivationnels" : Analyse approfondie de la pyramide de Maslow et des modèles motivationnels.
                        - "Opposant ou ennemi" : Réflexion sur l'opposition politique légitime par rapport à l'hostilité nationale.

                        Informations de contact :
                        - Téléphone/WhatsApp : +213 771 46 86 69
                        - Email : loudjani.r@gmail.com
                        - Facebook : https://www.facebook.com/rabah.badil/

                        Sois toujours courtois, professionnel et synthétique dans tes réponses.` 
                    },
                    { role: "user", content: message }
                ],
                temperature: 0.65,
                max_tokens: 600
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Erreur Groq:", errorData);
            return res.status(response.status).json({ error: "Erreur lors de la communication avec l'IA." });
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        // 4. Renvoyer la réponse de l'IA au navigateur de l'utilisateur
        return res.status(200).json({ reply });

    } catch (error) {
        console.error("Erreur serveur :", error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
}
