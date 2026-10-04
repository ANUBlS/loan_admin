import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/az';
import { dictionaries, type Key, type Lang } from './dict';

const LANG_KEY = 'loan_admin_lang';

function initialLang(): Lang {
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    if (v === 'az' || v === 'en') return v;
  } catch { /* ignore */ }
  return 'az';
}

type T = (key: Key | string, vars?: Record<string, string | number>) => string;
interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: T }

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  dayjs.locale(lang === 'az' ? 'az' : 'en');
  // Uppercase labels follow the page language (Azerbaijani i → İ only in AZ).
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  }, []);
  const t = useCallback<T>((key, vars) => {
    let s = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}
