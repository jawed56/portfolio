const fetch = require('node-fetch'); // Si besoin, ou utilisez le fetch natif de Node.js

exports.handler = async (event, context) => {
    // Autoriser uniquement les requêtes POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Méthode non autorisée" };
    }

    try {
        const { message } = JSON.parse(event.body);
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "La clé API Groq est manquante dans la configuration." })
            };
        }

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
                        Sois toujours courtois, professionnel et synthétique dans tes réponses.
                        Tu présentes ses ouvrages ("De l'exil au rejet", "Le goût de l'interdit", "Les modèles motivationnels", "Opposant ou ennemi") et donnes ses contacts (Email: loudjani.r@gmail.com, WhatsApp: +213 771 46 86 69).` 
                    },
                    { role: "user", content: message }
                ],
                temperature: 0.65,
                max_tokens: 600
            })
        });

        if (!response.ok) {
            return { statusCode: response.status, body: "Erreur de l'API Groq" };
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reply })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Erreur interne du serveur" })
        };
    }
};
