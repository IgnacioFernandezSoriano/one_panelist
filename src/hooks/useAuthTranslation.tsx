import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Translation {
  clave: string;
  texto: string;
  idioma: string;
}

interface Language {
  id: number;
  codigo: string;
  nombre_nativo: string;
  nombre_ingles: string;
  bandera_emoji: string;
  activo: boolean;
}

interface AuthTranslationContextType {
  t: (key: string, params?: Record<string, string>) => string;
  currentLanguage: string;
  changeLanguage: (languageCode: string) => void;
  availableLanguages: Language[];
  isLoading: boolean;
}

const AuthTranslationContext = createContext<AuthTranslationContextType | undefined>(undefined);

const AUTH_LANGUAGE_KEY = 'auth_language';
const DEFAULT_LANGUAGE = 'en';

export const AuthTranslationProvider = ({ children }: { children: ReactNode }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    return localStorage.getItem(AUTH_LANGUAGE_KEY) || DEFAULT_LANGUAGE;
  });

  // Fetch available languages
  const { data: availableLanguages = [] } = useQuery({
    queryKey: ['auth-available-languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('idiomas_disponibles')
        .select('*')
        .eq('activo', true)
        .order('es_default', { ascending: false });

      if (error) throw error;
      return data as Language[];
    },
  });

  // Fetch translations for current language
  const { data: translations = [], isLoading } = useQuery({
    queryKey: ['auth-translations', currentLanguage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traducciones')
        .select('clave, texto, idioma')
        .eq('idioma', currentLanguage);

      if (error) throw error;
      return data as Translation[];
    },
    enabled: !!currentLanguage,
  });

  // Build translations map
  const translationsMap = translations.reduce((acc, t) => {
    acc[t.clave] = t.texto;
    return acc;
  }, {} as Record<string, string>);

  // Translation function with interpolation
  const t = (key: string, params?: Record<string, string>): string => {
    let text = translationsMap[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(`{{${paramKey}}}`, paramValue);
      });
    }
    
    return text;
  };

  // Change language function
  const changeLanguage = (languageCode: string) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem(AUTH_LANGUAGE_KEY, languageCode);
  };

  // Set default language if not set
  useEffect(() => {
    if (!localStorage.getItem(AUTH_LANGUAGE_KEY)) {
      localStorage.setItem(AUTH_LANGUAGE_KEY, DEFAULT_LANGUAGE);
    }
  }, []);

  return (
    <AuthTranslationContext.Provider
      value={{
        t,
        currentLanguage,
        changeLanguage,
        availableLanguages,
        isLoading,
      }}
    >
      {children}
    </AuthTranslationContext.Provider>
  );
};

export const useAuthTranslation = () => {
  const context = useContext(AuthTranslationContext);
  if (!context) {
    throw new Error('useAuthTranslation must be used within AuthTranslationProvider');
  }
  return context;
};
