import { useState } from "react";
import { useMessageContext, MessageSimple } from "stream-chat-react";
import { Languages, LoaderIcon, ChevronDown } from "lucide-react";
import { translateMessage } from "../lib/api";
import toast from "react-hot-toast";
import { LANGUAGES } from "../constants";

const TranslatableMessage = (props) => {
  const { message } = useMessageContext();
  const [translatedText, setTranslatedText] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // Default to English for translation
  const targetLanguage = selectedLanguage || "English";

  const handleTranslate = async (e) => {
    e.stopPropagation();
    if (!message.text) return;

    if (translatedText && showTranslation) {
      // Toggle translation visibility
      setShowTranslation(false);
      return;
    }

    // If language changed, reset translation
    if (translatedText && selectedLanguage !== targetLanguage) {
      setTranslatedText(null);
      setShowTranslation(false);
    }

    if (translatedText && selectedLanguage === targetLanguage) {
      // Show already translated text
      setShowTranslation(true);
      return;
    }

    setIsTranslating(true);
    try {
      if (!message.text || !targetLanguage) {
        throw new Error("Missing text or target language");
      }

      const result = await translateMessage(message.text, targetLanguage);
      if (result.translatedText) {
        setTranslatedText(result.translatedText);
        setShowTranslation(true);
      } else {
        throw new Error("No translation received");
      }
    } catch (error) {
      console.error("Translation error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to translate message";
      toast.error(errorMessage);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    setShowLanguageSelector(false);
    // Reset translation when language changes
    setTranslatedText(null);
    setShowTranslation(false);
  };

  // Show translate button on all text messages with text content
  const shouldShowButton = message?.text && message.text.trim().length > 0;

  // Render default message with translation UI
  return (
    <>
      <MessageSimple {...props} />
      {/* Translation UI - show on all messages with text */}
      {shouldShowButton && (
        <div
          style={{
            padding: "4px 12px",
            marginTop: "2px",
            fontSize: "12px",
            position: "relative",
          }}
        >
          {/* Language selector and translate button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* Language selector dropdown */}
            <div style={{ position: "relative", display: "inline-block" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLanguageSelector(!showLanguageSelector);
                }}
                className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                style={{
                  background: "none",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "11px",
                }}
                title="Select target language"
              >
                <Languages className="size-3" />
                <span>{selectedLanguage}</span>
                <ChevronDown className="size-3" />
              </button>

              {/* Language dropdown menu */}
              {showLanguageSelector && (
                <>
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 1000,
                    }}
                    onClick={() => setShowLanguageSelector(false)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "4px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                      maxHeight: "200px",
                      overflowY: "auto",
                      zIndex: 1001,
                      minWidth: "150px",
                      maxWidth: "200px",
                    }}
                  >
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLanguageChange(lang);
                        }}
                        style={{
                          width: "100%",
                          padding: "6px 12px",
                          textAlign: "left",
                          background:
                            selectedLanguage === lang ? "#eff6ff" : "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                          color:
                            selectedLanguage === lang ? "#2563eb" : "#1e293b",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedLanguage !== lang) {
                            e.target.style.backgroundColor = "#f3f4f6";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedLanguage !== lang) {
                            e.target.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Translate button */}
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
              title={
                showTranslation
                  ? "Hide translation"
                  : `Translate to ${targetLanguage}`
              }
              style={{
                background: "none",
                border: "none",
                padding: "4px 0",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {isTranslating ? (
                <>
                  <LoaderIcon className="size-3 animate-spin" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <span>{showTranslation ? "Hide" : "Translate"}</span>
                </>
              )}
            </button>
          </div>

          {/* Translated text */}
          {showTranslation && translatedText && (
            <div
              style={{
                marginTop: "8px",
                padding: "8px",
                backgroundColor: "#eff6ff",
                borderRadius: "4px",
                border: "1px solid #bfdbfe",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#2563eb",
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Languages style={{ width: "12px", height: "12px" }} />
                Translated to {targetLanguage}:
              </div>
              <div style={{ fontSize: "13px", color: "#1e293b" }}>
                {translatedText}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TranslatableMessage;

