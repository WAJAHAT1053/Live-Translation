// Simple translation API endpoint
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, sourceLanguage, targetLanguage } = req.body;

    if (!text || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Simple mock translation based on target language
    let translatedText = text;
    
    // Add language-specific transformations
    switch (targetLanguage) {
      case 'es':
        translatedText = `[ES] ${text}`;
        break;
      case 'fr':
        translatedText = `[FR] ${text}`;
        break;
      case 'de':
        translatedText = `[DE] ${text}`;
        break;
      case 'ja':
        translatedText = `[JA] ${text}`;
        break;
      case 'zh':
        translatedText = `[ZH] ${text}`;
        break;
      case 'ko':
        translatedText = `[KO] ${text}`;
        break;
      case 'ru':
        translatedText = `[RU] ${text}`;
        break;
      case 'ar':
        translatedText = `[AR] ${text}`;
        break;
      default:
        translatedText = `[${targetLanguage.toUpperCase()}] ${text}`;
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return res.status(200).json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: 'Translation failed' });
  }
} 