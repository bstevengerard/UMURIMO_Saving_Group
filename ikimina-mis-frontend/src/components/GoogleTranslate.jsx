import React, { useEffect } from "react";
import { Globe } from "lucide-react";

export default function GoogleTranslate() {
  useEffect(() => {
    // 1. Establish the global callback for Google Translate initialization
    window.googleTranslateElementInit = () => {
      const container = document.getElementById("google_translate_element");
      if (!container) return;

      try {
        if (window.google && window.google.translate && window.google.translate.TranslateElement) {
          // Initialize Google Translate Element inside our designated DOM target
          new window.google.translate.TranslateElement(
            { 
              pageLanguage: "en",
              includedLanguages: "en,rw,fr,sw"
            }, 
            "google_translate_element"
          );
        }
      } catch (err) {
        console.warn("Google Translate initialization error:", err);
      }
    };

    // 2. Load the loader script dynamically if it doesn't already exist in the document
    const scriptId = "google-translate-loader-script";
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "text/javascript";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.onerror = () => {
        console.warn("Failed to retrieve Google translation loader script.");
      };
      document.body.appendChild(script);
    } else {
      // If the script is already loaded, invoke the global initializer safely on render mount
      if (window.google && window.google.translate) {
        setTimeout(() => {
          if (window.googleTranslateElementInit) {
            window.googleTranslateElementInit();
          }
        }, 100);
      }
    }

    // 3. Actively fix any body positioning or layout shift applied by Google Translate styles
    const checkAndFixStyle = () => {
      if (document.body.style.top && document.body.style.top !== "0px") {
        document.body.style.setProperty("top", "0px", "important");
      }
      if (document.documentElement.style.top && document.documentElement.style.top !== "0px") {
        document.documentElement.style.setProperty("top", "0px", "important");
      }

      // Dynamically target Select Language option label inside google translation dropdown
      const combo = document.querySelector(".goog-te-combo");
      if (combo && combo.options && combo.options.length > 0) {
        const firstOption = combo.options[0];
        if (firstOption && firstOption.value === "" && firstOption.text !== "Select") {
          firstOption.text = "Select";
        }
      }
    };
    
    const interval = setInterval(checkAndFixStyle, 450);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200/90 border border-slate-200 rounded-xl px-1.5 py-0.5 sm:px-2.5 sm:py-1 transition duration-200 shrink-0 h-[28px] sm:h-[32px] select-none shadow-sm cursor-pointer">
      <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-600 shrink-0" />
      <div 
        id="google_translate_element" 
        className="google-translate-container text-xs font-mono"
      ></div>
    </div>
  );
}

