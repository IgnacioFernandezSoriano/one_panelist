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

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<string>('es'); // Temporary initial value
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
    staleTime: 5 * 60 * 1000, // Cache translations for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in garbage collection for 10 minutes
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
    
    // Update user's preferred language in database if authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('usuarios')
        .update({ idioma_preferido: lang })
        .eq('email', session.user.email);
    }
  };

  // Load user's preferred language or default language from DB on mount
  useEffect(() => {
    const loadUserLanguage = async () => {
      try {
        // First, get the default language from DB
        const { data: defaultLang } = await supabase
          .from('idiomas_disponibles')
          .select('codigo')
          .eq('es_default', true)
          .eq('activo', true)
          .single();

        const defaultLanguageCode = defaultLang?.codigo || 'es';

        // Then check if user is authenticated and has a preferred language
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: usuario } = await supabase
            .from('usuarios')
            .select('idioma_preferido')
            .eq('email', session.user.email)
            .single();
          
          // Use user's preferred language if set, otherwise use default from DB
          const languageToUse = usuario?.idioma_preferido || defaultLanguageCode;
          setCurrentLanguage(languageToUse);
        } else {
          // Not authenticated, use default language
          setCurrentLanguage(defaultLanguageCode);
        }
      } catch (error) {
        console.error('Error loading language:', error);
        setCurrentLanguage('es'); // Fallback
      }
      
      setUserLanguageLoaded(true);
    };
    
    loadUserLanguage();
  }, []);

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
