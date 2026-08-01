// api/chat.js - Exécuté uniquement côté serveur par Vercel
export default async function handler(req, res) {
    // 1. Autoriser uniquement les requêtes POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
    }

    const { message, lang } = req.body;
    
    let targetLang = 'fr';
    if (lang === 'ar') targetLang = 'ar';
    if (lang === 'en') targetLang = 'en';

    if (!message) {
        return res.status(400).json({ error: 'Le message est requis.' });
    }

    // 2. Récupérer les clés API stockées dans Vercel
    const apiKey = process.env.GROQ_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Configuration serveur manquante (Clé API Groq absente).' });
    }

    // 3. Effectuer la recherche sur le Web en temps réel via Tavily
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

    // 4. Construction du Prompt Système Trilingue (interdiction des astérisques)
    let systemContent = "";
    
    if (targetLang === 'ar') {
        systemContent = `أنت المساعد الذكي والشخصي لرابح لوجاني (Rabah Loudjani).
           أجب دائمًا بلغة عربية صحيحة، مهذبة، ومختصرة. 
           لا تستخدم أبدًا النجمات (*) أو تنسيق Markdown في إجاباتك لجعل الكلمات غليظة.

           مؤلفات وأعمال رابح لوجاني[cite: 1]:
           - "De l'exil au rejet" (من المنفى إلى الرفض): كتاب يستكشف تجربة أبناء المهاجرين، ورفض الذات، والجروح الهوية[cite: 1].
           - "Le goût de l'interdit" (طعم المحظور): دراسة عن الرغبة في العصر الرقمي، وآليات التابو، والدوبامين والتجاوز[cite: 1].
           - "Les modèles motivationnels" (النماذج التحفيزية): تحليل معمق لهرم ماسلو ونماذج التحفيز[cite: 1].
           - "Opposant ou ennemi" (معارض أم عدو): تفكير في المعارضة السياسية المشروعة مقارنة بالعداء الوطني[cite: 1].

           معلومات الاتصال[cite: 1]:
           - الهاتف / واتساب: +213 771 46 86 69[cite: 1]
           - البريد الإلكتروني: loudjani.r@gmail.com[cite: 1]
           - فيسبوك: https://www.facebook.com/rabah.badil/[cite: 1]

           سياق الإنترنت الحالي (استخدم هذه المعلومات المحدثة للإجابة بدقة):
           ${webContext || "لم يتم العثور على معلومات إضافية من الويب."}`;
    } else if (targetLang === 'en') {
        systemContent = `You are the personal AI and voice assistant for Rabah Loudjani.
           Always respond in correct, polite, professional and concise English.
           CRITICAL: Do not use any asterisks (*) or markdown formatting for bold text in your answers.

           Rabah Loudjani's Books and Works[cite: 1]:
           - "De l'exil au rejet" (From Exile to Rejection): A book exploring the experience of children of immigrants, internalized xenophobia, and identity wounds[cite: 1].
           - "Le goût de l'interdit" (The Taste of the Forbidden): A study on sexual desire in the digital age, taboos, dopamine, and transgression[cite: 1].
           - "Les modèles motivationnels" (Motivational Models): An in-depth analysis of Maslow's hierarchy of needs and motivational dynamics[cite: 1].
           - "Opposant ou ennemi" (Opponent or Enemy): Reflections on legitimate political opposition versus national hostility[cite: 1].

           Contact Information[cite: 1]:
           - Phone / WhatsApp: +213 771 46 86 69[cite: 1]
           - Email: loudjani.r@gmail.com[cite: 1]
           - Facebook: https://www.facebook.com/rabah.badil/[cite: 1]

           Current Web Search Context (Use this real-time data to construct your response):
           ${webContext || "No additional real-time information found on the web."}`;
    } else {
        systemContent = `Tu es l'assistant IA personnel de Rabah Loudjani[cite: 1].
           Sois toujours courtois, professionnel et synthétique dans tes réponses[cite: 1].
           IMPORTANT : N'utilise jamais d'astérisques (*) ou de syntaxe Markdown pour mettre du texte en gras dans tes réponses.

           Livres et travaux de Rabah Loudjani[cite: 1] :
           - "De l'exil au rejet" : Ouvrage explorant l'expérience des fils de migrants, la xénophobie intériorisée et les blessures identitaires[cite: 1].
           - "Le goût de l'interdit" : Étude sur le désir sexuel à l'ère numérique, les mécanismes du tabou, la dopamine et la transgression[cite: 1].
           - "Les modèles motivationnels" : Analyse approfondie de la pyramide de Maslow et des modèles motivationnels[cite: 1].
           - "Opposant ou ennemi" : Réflexion sur l'opposition politique légitime par rapport à l'hostilité nationale[cite: 1].

           Informations de contact[cite: 1] :
           - Téléphone/WhatsApp : +213 771 46 86 69[cite: 1]
           - Email : loudjani.r@gmail.com[cite: 1]
           - Facebook : https://www.facebook.com/rabah.badil/[cite: 1]

           Contexte internet actuel (pour répondre aux questions d'actualité) :
           ${webContext || "Aucune information supplémentaire trouvée sur le web."}`;
    }

    try {
        // 5. Effectuer l'appel à l'API Groq
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

        // 6. Renvoyer la réponse de l'IA au navigateur
        return res.status(200).json({ reply });

    } catch (error) {
        console.error("Erreur serveur :", error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
}
