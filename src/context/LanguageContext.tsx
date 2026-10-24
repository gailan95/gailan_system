import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Language, translations } from '../utils/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Helper function to find a translation for any string
export function translateText(text: string, lang: Language): string {
  if (!text || lang === 'ku') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  // Direct match
  const direct = translations[trimmed];
  if (direct && direct[lang]) {
    return text.replace(trimmed, direct[lang]);
  }

  // Exact match without punctuation
  const cleanTrimmed = trimmed.replace(/[:...؟!]/g, '').trim();
  const cleanDirect = translations[cleanTrimmed];
  if (cleanDirect && cleanDirect[lang]) {
    return text.replace(cleanTrimmed, cleanDirect[lang]);
  }

  return text;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = (localStorage.getItem('selectedLang') || localStorage.getItem('app_language')) as Language;
    return saved && ['ku', 'ar', 'en'].includes(saved) ? saved : 'ku';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('selectedLang', lang);
    localStorage.setItem('app_language', lang);
  };

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'selectedLang' || e.key === 'app_language') {
        const lang = e.newValue as Language;
        if (lang && ['ku', 'ar', 'en'].includes(lang)) {
          setLanguageState(lang);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isRtl = language === 'ku' || language === 'ar';
  const dir: 'rtl' | 'ltr' = isRtl ? 'rtl' : 'ltr';

  // Update root HTML element direction and language code
  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', language === 'ku' ? 'ckb' : language);
    if (dir === 'ltr') {
      document.body.classList.remove('dir-rtl');
      document.body.classList.add('dir-ltr');
    } else {
      document.body.classList.remove('dir-ltr');
      document.body.classList.add('dir-rtl');
    }
  }, [dir, language]);

  // Translation function with smart fallback
  const t = (key: string, fallback?: string): string => {
    if (!key && !fallback) return '';
    const cleanKey = (key || '').trim();
    const cleanFallback = (fallback || '').trim();

    // 1. Direct key match
    let item = translations[cleanKey];

    // 2. Direct fallback match
    if (!item && cleanFallback) {
      item = translations[cleanFallback];
    }

    // 3. Punctuation-stripped match
    if (!item) {
      const strippedKey = cleanKey.replace(/[:...؟!]/g, '').trim();
      item = translations[strippedKey];
    }

    if (item && item[language]) {
      return item[language];
    }

    if (language === 'ku') {
      return fallback || key;
    }

    // Check if target is en or ar
    if (item && language === 'en' && item['en']) return item['en'];
    if (item && language === 'ar' && item['ar']) return item['ar'];

    return fallback || key;
  };

  // DOM-level synchronization: automatically translates any static or dynamic text nodes
  // across every component, modal, input placeholder, and button
  useEffect(() => {
    const originalTextMap = new WeakMap<Node, string>();
    const originalAttrMap = new WeakMap<Element, Record<string, string>>();

    const translateDOM = () => {
      // 1. Translate Text Nodes
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'code') {
              return NodeFilter.FILTER_REJECT;
            }
            if (node.nodeValue && node.nodeValue.trim().length > 0) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          },
        }
      );

      let currentNode: Node | null = walker.nextNode();
      while (currentNode) {
        if (!originalTextMap.has(currentNode)) {
          originalTextMap.set(currentNode, currentNode.nodeValue || '');
        }

        const originalText = originalTextMap.get(currentNode) || '';
        if (originalText.trim()) {
          if (language === 'ku') {
            if (currentNode.nodeValue !== originalText) {
              currentNode.nodeValue = originalText;
            }
          } else {
            const translated = translateText(originalText, language);
            if (translated !== currentNode.nodeValue) {
              currentNode.nodeValue = translated;
            }
          }
        }
        currentNode = walker.nextNode();
      }

      // 2. Translate Input Placeholders and Titles
      const inputs = document.querySelectorAll('input[placeholder], button[title], div[title]');
      inputs.forEach((el) => {
        const ph = el.getAttribute('placeholder');
        if (ph) {
          if (!originalAttrMap.has(el)) {
            originalAttrMap.set(el, {});
          }
          const savedAttrs = originalAttrMap.get(el)!;
          if (!savedAttrs.placeholder) {
            savedAttrs.placeholder = ph;
          }

          if (language === 'ku') {
            el.setAttribute('placeholder', savedAttrs.placeholder);
          } else {
            const trans = translateText(savedAttrs.placeholder, language);
            el.setAttribute('placeholder', trans);
          }
        }
      });
    };

    // Run initial translation
    translateDOM();

    // Observe subsequent DOM updates
    const observer = new MutationObserver(() => {
      translateDOM();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, isRtl }}>
      <div dir={dir} className={isRtl ? 'dir-rtl' : 'dir-ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
