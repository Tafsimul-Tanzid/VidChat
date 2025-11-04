import { translate } from "@vitalets/google-translate-api";

// Map language names to Google Translate language codes
const languageCodeMap = {
  english: "en",
  spanish: "es",
  french: "fr",
  german: "de",
  mandarin: "zh-CN",
  chinese: "zh-CN",
  japanese: "ja",
  korean: "ko",
  hindi: "hi",
  russian: "ru",
  portuguese: "pt",
  arabic: "ar",
  italian: "it",
  turkish: "tr",
  dutch: "nl",
  banglish: "en", // Banglish uses English as base
  bengali: "bn",
  urdu: "ur",
  punjabi: "pa",
  tamil: "ta",
  telugu: "te",
  malayalam: "ml",
  kannada: "kn",
  gujarati: "gu",
  marathi: "mr",
  polish: "pl",
  czech: "cs",
  greek: "el",
  hebrew: "he",
  thai: "th",
  vietnamese: "vi",
  indonesian: "id",
  malay: "ms",
  tagalog: "tl",
  swedish: "sv",
  norwegian: "no",
  danish: "da",
  finnish: "fi",
  romanian: "ro",
  hungarian: "hu",
  ukrainian: "uk",
  bulgarian: "bg",
  croatian: "hr",
  serbian: "sr",
  slovak: "sk",
  slovenian: "sl",
  lithuanian: "lt",
  latvian: "lv",
  estonian: "et",
  swahili: "sw",
  afrikaans: "af",
  persian: "fa",
  nepali: "ne",
  sinhala: "si",
  myanmar: "my",
  khmer: "km",
  lao: "lo",
  mongolian: "mn",
  georgian: "ka",
  armenian: "hy",
  azerbaijani: "az",
  kazakh: "kk",
  uzbek: "uz",
  filipino: "tl",
  catalan: "ca",
  basque: "eu",
  galician: "gl",
};

export async function translateMessage(req, res) {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;

    console.log("Translation request:", { 
      text: text?.substring(0, 50), 
      targetLanguage, 
      sourceLanguage,
      hasText: !!text,
      hasTarget: !!targetLanguage 
    });

    if (!text || !targetLanguage) {
      return res.status(400).json({
        error: "Text and target language are required",
        received: { 
          hasText: !!text, 
          hasTarget: !!targetLanguage, 
          text: text?.substring(0, 50), 
          targetLanguage 
        }
      });
    }

    // Normalize language names to lowercase for lookup
    const normalizedTarget = targetLanguage.toLowerCase().trim();
    const normalizedSource = sourceLanguage?.toLowerCase().trim();
    
    // Get language codes
    const targetLang = languageCodeMap[normalizedTarget] || normalizedTarget;
    const sourceLang = normalizedSource 
      ? (languageCodeMap[normalizedSource] || normalizedSource)
      : null; // Auto-detect if not provided

    console.log("Language mapping:", { 
      targetLanguage, 
      normalizedTarget, 
      targetLang, 
      sourceLang 
    });

    // Validate that source and target are different
    if (sourceLang && sourceLang === targetLang) {
      return res.status(400).json({
        error: "Source and target languages must be different",
        message: `Cannot translate from ${targetLanguage} to ${targetLanguage}. Please select different languages.`
      });
    }

    try {
      // Use Google Translate API
      const options = {
        to: targetLang,
      };

      // Only specify source language if provided
      if (sourceLang) {
        options.from = sourceLang;
      }

      console.log(`Translating with options:`, options);
      
      const result = await translate(text, options);

      console.log("Google Translate response:", {
        text: result.text?.substring(0, 50),
        raw: result.raw
      });

      // Extract detected source language from raw response if available
      let detectedSourceLang = sourceLang || "auto";
      if (result.raw?.src && result.raw.src !== "auto") {
        detectedSourceLang = result.raw.src;
      }

      // Check if translation is meaningful (not identical to source)
      if (result.text && result.text.toLowerCase().trim() !== text.toLowerCase().trim()) {
        return res.json({
          translatedText: result.text,
          sourceLanguage: detectedSourceLang,
          targetLanguage: targetLang,
        });
      } else {
        return res.status(400).json({
          error: "Translation result is identical to source",
          message: "The message might already be in the target language."
        });
      }
    } catch (translateError) {
      console.error("Google Translate API error:", translateError);
      
      // Handle specific error cases
      if (translateError.message?.includes("rate limit") || translateError.code === 429) {
        return res.status(429).json({
          error: "Translation API rate limit exceeded",
          message: "Please try again later."
        });
      }

      if (translateError.message?.includes("invalid language")) {
        return res.status(400).json({
          error: "Invalid language code",
          message: translateError.message
        });
      }

      throw new Error(`Translation failed: ${translateError.message || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Error translating message:", error);
    res.status(500).json({
      error: "Failed to translate message",
      message: error.message,
    });
  }
}

