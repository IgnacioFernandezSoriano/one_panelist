import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Translation {
  clave: string;
  texto: string;
}

interface Language {
  codigo: string;
  nombre_nativo: string;
  nombre_ingles: string;
  bandera_emoji: string;
  es_default: boolean;
  activo: boolean;
}

interface TranslationContextType {
  t: (key: string, params?: Record<string, string>) => string;
  currentLanguage: string;
  changeLanguage: (lang: string) => void;
  availableLanguages: Language[];
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const getDefaultLanguage = (): string => {
  const stored = localStorage.getItem('app_language');
  if (stored) return stored;
  
  const browserLang = navigator.language.split('-')[0];
  return ['es', 'en', 'pt'].includes(browserLang) ? browserLang : 'es';
};

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<string>(getDefaultLanguage());
  const queryClient = useQueryClient();

  // Fetch available languages
  const { data: languages = [] } = useQuery({
    queryKey: ['languages'],
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
    queryKey: ['translations', currentLanguage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traducciones')
        .select('clave, texto')
        .eq('idioma', currentLanguage);
      
      if (error) throw error;
      return data as Translation[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Convert translations array to map for faster lookup
  const translationMap = new Map<string, string>();
  translations.forEach(t => translationMap.set(t.clave, t.texto));

  const t = (key: string, params?: Record<string, string>): string => {
    let text = translationMap.get(key);
    
    if (!text) {
      if (import.meta.env.DEV) {
        console.warn(`Translation missing for key: ${key} (language: ${currentLanguage})`);
      }
      return key;
    }

    // Simple interpolation: replace {{variable}} with params
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text!.replace(new RegExp(`{{${paramKey}}}`, 'g'), value);
      });
    }

    return text;
  };

  const changeLanguage = (lang: string) => {
    setCurrentLanguage(lang);
    localStorage.setItem('app_language', lang);
    queryClient.invalidateQueries({ queryKey: ['translations', lang] });
  };

  useEffect(() => {
    localStorage.setItem('app_language', currentLanguage);
  }, [currentLanguage]);

  return (
    <TranslationContext.Provider 
      value={{ 
        t, 
        currentLanguage, 
        changeLanguage, 
        availableLanguages: languages,
        isLoading 
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
}
