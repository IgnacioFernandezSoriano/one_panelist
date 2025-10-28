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
  const [userLanguageLoaded, setUserLanguageLoaded] = useState(false);
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
    enabled: !!currentLanguage,
    staleTime: 0, // Always fetch fresh data when language changes
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

  const changeLanguage = async (lang: string) => {
    setCurrentLanguage(lang);
    localStorage.setItem('app_language', lang);
    
    // Update user's preferred language in database if authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('usuarios')
        .update({ idioma_preferido: lang })
        .eq('email', session.user.email);
    }
  };

  // Load user's preferred language on mount
  useEffect(() => {
    const loadUserLanguage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('idioma_preferido')
          .eq('email', session.user.email)
          .single();
        
        if (usuario?.idioma_preferido) {
          setCurrentLanguage(usuario.idioma_preferido);
          localStorage.setItem('app_language', usuario.idioma_preferido);
        }
      }
      setUserLanguageLoaded(true);
    };
    
    loadUserLanguage();
  }, []);

  useEffect(() => {
    if (userLanguageLoaded) {
      localStorage.setItem('app_language', currentLanguage);
    }
  }, [currentLanguage, userLanguageLoaded]);

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
