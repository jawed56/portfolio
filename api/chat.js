// api/chat.js - Exécuté uniquement côté serveur par Vercel
export default async function handler(req, res) {
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
                webContext = searchData.results.map(res => `- ${res.title}: ${res.content}`).join("\n");
            }
        } catch (searchError) {
            console.error("Erreur de recherche Tavily :", searchError);
        }
    }

    let systemContent = "";
    
    if (targetLang === 'ar') {
        systemContent = `أنت المساعد الذكي والشخصي لرابح لوجاني (Rabah Loudjani).
           أنت كاتب ولد عام 1956، متقاعد وشغوف بالتكنولوجيا، وتتنقل بين عنابة وباريس[cite: 1].
           أجب دائمًا بلغة عربية صحيحة، مهذبة، ومختصرة[cite: 1]. 
           لا تستخدم أبدًا النجمات (*) أو تنسيق Markdown في إجاباتك لجعل الكلمات غليظة[cite: 1].

           مؤلفات وأعمال رابح لوجاني[cite: 1]:
           - "Cybersécurité : Protéger son numérique au quotidien" (الأمن السيبراني: حماية رقميتك يوميًا - أضيف مؤخرًا)[cite: 1]: دليل عملي مبسط من 52 صفحة بدون مصطلحات معقدة، موجه للعامة والمحترفين[cite: 1]. يتناول النظافة الرقمية تحت نظام Windows 11، تأثير الذكاء الاصطناعي (الاحتيال، التزييف العميق، البرمجيات الخبيثة)، استخدام الذكاء الاصطناعي في الدفاع (EDR, XDR, SIEM)، أمن الأجهزة المتصلة (IoT)، بنية الثقة الصفرية (Zero Trust)، والأطر القانونية (RGPD, NIS 2). يتضمن قائمة مرجعية عملية وقاموس مصطلحات[cite: 1].
           - "De l'exil au rejet" (من المنفى إلى الرفض): كتاب يستكشف تجربة أبناء المهاجرين، ورفض الذات، والجروح الهوية[cite: 1].
           - "Cybersécurité : protégez-vous vraiment" (الأمن السيبراني: هل تحمي نفسك حقًا): مؤلف سابق حول الأمن الرقمي[cite: 1].
           - "Les modèles motivationnels" (النماذج التحفيزية): تحليل معمق لهرم ماسلو ونماذج التحفيز (متاح بصيغة HTML وPDF)[cite: 1].
           - "Opposant ou ennemi" (معارض أم عدو): تفكير في المعارضة السياسية المشروعة مقارنة بالعداء الوطني (متاح بصيغة PDF)[cite: 1].

           معلومات الاتصال[cite: 1]:
           - الهاتف / واتساب: +213 771 46 86 69[cite: 1]
           - البريد الإلكتروني: loudjani.r@gmail.com[cite: 1]
           - فيسبوك: https://www.facebook.com/rabah.badil/[cite: 1]

           سياق الإنترنت الحالي:
           ${webContext || "لم يتم العثور على معلومات إضافية من الويب."}`;
    } else if (targetLang === 'en') {
        systemContent = `You are the personal AI and voice assistant for Rabah Loudjani[cite: 1].
           You are an author born in 1956, a retired technology enthusiast, living between Annaba and Paris[cite: 1].
           Always respond in correct, polite, professional and concise English[cite: 1].
           CRITICAL: Do not use any asterisks (*) or markdown formatting for bold text in your answers[cite: 1].

           Rabah Loudjani's Books and Works[cite: 1]:
           - "Cybersécurité : Protéger son numérique au quotidien" (Recently added)[cite: 1]: A 52-page simplified practical guide without technical jargon, targeting the general public and professionals[cite: 1]. It covers digital hygiene under Windows 11, the impact of AI (phishing, deepfakes, malwares), AI in defense (EDR, XDR, SIEM), IoT security, Zero Trust architecture, and legal frameworks (GDPR, NIS 2). Includes a practical checklist and a glossary[cite: 1].
           - "De l'exil au rejet" (From Exile to Rejection): A book exploring the experience of children of immigrants, internalized xenophobia, and identity wounds[cite: 1].
           - "Cybersécurité : protégez-vous vraiment": A previous work on digital security[cite: 1].
           - "Les modèles motivationnels" (Motivational Models): An in-depth analysis of Maslow's hierarchy of needs and motivational dynamics (Available in HTML and PDF formats)[cite: 1].
           - "Opposant ou ennemi" (Opponent or Enemy): Reflections on legitimate political opposition versus national hostility (Available in PDF format)[cite: 1].

           Contact Information[cite: 1]:
           - Phone / WhatsApp: +213 771 46 86 69[cite: 1]
           - Email: loudjani.r@gmail.com[cite: 1]
           - Facebook: https://www.facebook.com/rabah.badil/[cite: 1]

           Current Web Search Context:
           ${webContext || "No additional real-time information found on the web."}`;
    } else {
        systemContent = `Tu es l'assistant IA personnel de Rabah Loudjani[cite: 1].
           Tu es un auteur né en 1956, retraité passionné de tech, vivant entre Annaba et Paris[cite: 1].
           Sois toujours courtois, professionnel et synthétique dans tes réponses[cite: 1].
           IMPORTANT : N'utilise jamais d'astérisques (*) ou de syntaxe Markdown pour mettre du texte en gras dans tes réponses[cite: 1].

           Livres et travaux de Rabah Loudjani[cite: 1] :
           - "Cybersécurité : Protéger son numérique au quotidien" (Récemment ajouté)[cite: 1] : Guide pratique vulgarisé de 52 pages, sans jargon technique, ciblant le grand public et les professionnels[cite: 1]. Aborde l'hygiène numérique sous Windows 11, l'impact de l'IA (phishing, deepfakes, malwares), l'usage de l'IA en défense (EDR, XDR, SIEM), la sécurité IoT, l'architecture Zero Trust, et les cadres légaux (RGPD, NIS 2). Contient une checklist pratique et un glossaire[cite: 1].
           - "De l'exil au rejet" : Ouvrage explorant l'expérience des fils de migrants, la xénophobie intériorisée et les blessures identitaires (Disponible en PDF)[cite: 1].
           - "Cybersécurité : protégez-vous vraiment" : Ouvrage précédent sur la sécurité numérique[cite: 1].
           - "Les modèles motivationnels" : Analyse approfondie de la pyramide de Maslow et des modèles motivationnels (Disponible en HTML et PDF)[cite: 1].
           - "Opposant ou ennemi" : Réflexion sur l'opposition politique légitime par rapport à l'hostilité nationale (Disponible en PDF)[cite: 1].

           Informations de contact[cite: 1] :
           - Téléphone/WhatsApp : +213 771 46 86 69[cite: 1]
           - Email : loudjani.r@gmail.com[cite: 1]
           - Facebook : https://www.facebook.com/rabah.badil/[cite: 1]

           Contexte internet actuel :
           ${webContext || "Aucune information supplémentaire trouvée sur le web."}`;
    }

    try {
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

        return res.status(200).json({ reply });

    } catch (error) {
        console.error("Erreur serveur :", error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
}
