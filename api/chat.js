// api/chat.js - Exécuté uniquement côté serveur par Vercel
export default async function handler(req, res) {
    // 1. Autoriser uniquement les requêtes POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
    }

    // Récupération du message et de la langue (fr ou ar) depuis le front-end
    const { message, lang } = req.body;
    const targetLang = lang === 'ar' ? 'ar' : 'fr';

    if (!message) {
        return res.status(400).json({ error: 'Le message est requis.' });
    }

    // 2. Récupérer les clés API stockées de manière sécurisée dans Vercel
    const apiKey = process.env.GROQ_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Configuration serveur manquante (Clé API Groq absente).' });
    }

    // 3. Effectuer l'appel à Tavily pour chercher sur le Web en temps réel
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
                webContext = searchData.results.map(res => `- ${res.title}: ${res.content}`).join("\n");
            }
        } catch (searchError) {
            console.error("Erreur de recherche Tavily :", searchError);
        }
    }

    // 4. Construction des instructions système adaptées selon la langue et avec les données du web
    const systemContent = targetLang === 'ar' 
        ? `أنت المساعد الذكي والشخصي لرابح لوجاني (Rabah Loudjani). 
           أجب دائمًا بلغة عربية صحيحة، مهذبة، ومختصرة.

           مؤلفات وأعمال رابح لوجاني:
           - "De l'exil au rejet" (من المنفى إلى الرفض): كتاب يستكشف تجربة أبناء المهاجرين، ورفض الذات، والجروح الهوية.
           - "Le goût de l'interdit" (طعم المحظور): دراسة عن الرغبة في العصر الرقمي، وآليات التابو، والدوبامين والتجاوز.
           - "Les modèles motivationnels" (النماذج التحفيزية): تحليل معمق لهرم ماسلو ونماذج التحفيز.
           - "Opposant ou ennemi" (معارض أم عدو): تفكير في المعارضة السياسية المشروعة مقارنة بالعداء الوطني.

           معلومات الاتصال:
           - الهاتف / واتساب: +213 771 46 86 69
           - البريد الإلكتروني: loudjani.r@gmail.com
           - فيسبوك: https://www.facebook.com/rabah.badil/

           سياق الإنترنت الحالي (استخدم هذه المعلومات المحدثة للإجابة على الأسئلة العامة أو الأخبار الحالية بشكل طبيعي دون ذكر الأداة):
           ${webContext || "لم يتم العثور على معلومات إضافية من الويب."}`
        : `Tu es l'assistant IA personnel de Rabah Loudjani.
           Sois toujours courtois, professionnel et synthétique dans tes réponses.

           Livres et travaux de Rabah Loudjani :
           - "De l'exil au rejet" : Ouvrage explorant l'expérience des fils de migrants, la xénophobie intériorisée et les blessures identitaires.
           - "Le goût de l'interdit" : Étude sur le désir sexuel à l'ère numérique, les mécanismes du tabou, la dopamine et la transgression.
           - "Les modèles motivationnels" : Analyse approfondie de la pyramide de Maslow et des modèles motivationnels.
           - "Opposant ou ennemi" : Réflexion sur l'opposition politique légitime par rapport à l'hostilité nationale.

           Informations de contact :
           - Téléphone/WhatsApp : +213 771 46 86 69
           - Email : loudjani.r@gmail.com
           - Facebook : https://www.facebook.com/rabah.badil/

           Contexte internet actuel (Utilise ces informations récentes pour répondre précisément aux questions d'actualité générale sans mentionner explicitement que tu fais une recherche) :
           ${webContext || "Aucune information supplémentaire trouvée sur le web."}`;

    try {
        // 5. Effectuer l'appel à l'API Groq avec le contexte enrichi
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${apiKey}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
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

        // 6. Renvoyer la réponse de l'IA au navigateur de l'utilisateur
        return res.status(200).json({ reply });

    } catch (error) {
        console.error("Erreur serveur :", error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
}
