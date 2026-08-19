// api/chat.js - Compatible Vercel Serverless Functions
module.exports = async (req, res) => {
    // Configuration CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
    }

    // Gestion du corps de requête (objet direct ou texte à parser)
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            body = {};
        }
    }
    body = body || {};

    const message = body.message;
    const lang = body.lang;

    let targetLang = 'fr';
    if (lang === 'ar') targetLang = 'ar';
    if (lang === 'en') targetLang = 'en';

    if (!message) {
        return res.status(400).json({ error: 'Le message est requis.' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Configuration serveur manquante (Clé API Groq absente).' });
    }

    // Recherche web facultative (Tavily)
    let webContext = "";
    if (tavilyKey) {
        try {
            const searchResponse = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: tavilyKey,
                    query: message,
                    search_depth: "basic",
                    max_results: 3
                })
            });
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                webContext = searchData.results.map(r => `- ${r.title}: ${r.content}`).join("\n");
            }
        } catch (searchError) {
            console.error("Erreur Tavily :", searchError);
        }
    }

    let systemContent = "";
    if (targetLang === 'ar') {
        systemContent = `أنت المساعد الذكي والشخصي لرابح لوجاني (Rabah Loudjani). كاتب ولد عام 1956، متقاعد وشغوف بالتكنولوجيا[cite: 1]. أجب بلغة عربية صحيحة ومهذبة بدون نجوم (*)[cite: 1].
           المشاريع: "Cyber-Trap Simulator" (https://jawed56.github.io/phishing-simulator/) وآلة حاسبة علمية.
           المؤلفات: Cyber-Résistance (2026)، Guide Technique de Cybersécurité Défensive (2026)، Cybersécurité au quotidien، De l'exil au rejet، Les modèles motivationnels، Opposant ou ennemi[cite: 1].
           الاتصال: +213 771 46 86 69 | loudjani.r@gmail.com[cite: 1]`;
    } else if (targetLang === 'en') {
        systemContent = `You are the personal AI assistant for Rabah Loudjani[cite: 1]. Retired author born in 1956 passionate about tech[cite: 1]. Respond concisely and politely without asterisks (*)[cite: 1].
           Projects: "Cyber-Trap Simulator" (https://jawed56.github.io/phishing-simulator/) and Scientific Calculator.
           Books: Cyber-Résistance (2026), Defensive Cybersecurity Technical Guide (2026), Everyday Cybersecurity, From exile to rejection, Motivational Models, Opponent or Enemy[cite: 1].
           Contact: +213 771 46 86 69 | loudjani.r@gmail.com[cite: 1]`;
    } else {
        systemContent = `Tu es l'assistant IA personnel de Rabah Loudjani[cite: 1]. Auteur né en 1956, retraité passionné de tech[cite: 1]. Sois courtois et professionnel, sans utiliser d'astérisques (*)[cite: 1].
           Projets : "Cyber-Trap Simulator" (https://jawed56.github.io/phishing-simulator/) et Calculatrice Scientifique.
           Livres : Cyber-Résistance : L'Art du Piège Numérique (2026), Guide Technique de Cybersécurité Défensive (2026), Cybersécurité au quotidien, De l'exil au rejet, Les modèles motivationnels, Opposant ou ennemi[cite: 1].
           Contact : +213 771 46 86 69 | loudjani.r@gmail.com[cite: 1]
           Contexte web : ${webContext || "Aucun"}`;
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemContent },
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

        return res.status(200).json({ reply });
    } catch (error) {
        console.error("Erreur serveur :", error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
};
