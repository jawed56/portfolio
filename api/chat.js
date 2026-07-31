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

    // 2. Récupérer les clés API stockées de manière sécurisée dans Vercel
    const groqKey = process.env.GROQ_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!groqKey || !tavilyKey) {
        return res.status(500).json({ error: 'Configuration serveur manquante (Clé API absente).' });
    }

    try {
        // 3. Appel à Tavily pour enrichir la requête avec des infos récentes
        const tavilyResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${tavilyKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: message,
                search_depth: "advanced"
            })
        });

        let tavilyData = {};
        if (tavilyResponse.ok) {
            tavilyData = await tavilyResponse.json();
        }

        // 4. Appel à Groq pour générer la réponse IA
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${groqKey}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { 
                        role: "system", 
                        content: `Tu es l'assistant IA personnel de Rabah Loudjani.
                        Utilise les résultats Tavily pour enrichir tes réponses si disponibles.
                        Sois toujours courtois, professionnel et synthétique.` 
                    },
                    { role: "user", content: message },
                    { role: "assistant", content: `Résultats Tavily: ${JSON.stringify(tavilyData)}` }
                ],
                temperature: 0.65,
                max_tokens: 600
            })
        });

        if (!groqResponse.ok) {
            const errorData = await groqResponse.text();
            console.error("Erreur Groq:", errorData);
            return res.status(groqResponse.status).json({ error: "Erreur lors de la communication avec Groq." });
        }

        const data = await groqResponse.json();
        const reply = data.choices[0].message.content;

        // 5. Renvoyer la réponse finale au navigateur
        return res.status(200).json({ reply, tavily: tavilyData });

    } catch (error) {
        console.error("Erreur serveur :", error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
}
