import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { AuthTranslationProvider, useAuthTranslation } from "@/hooks/useAuthTranslation";

function AuthContent() {
  const { t } = useAuthTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: t('auth.welcome'),
        description: t('auth.signin_success'),
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: t('auth.error_signin'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      toast({
        title: t('auth.account_created'),
        description: t('auth.can_signin'),
      });
      
      // Auto sign-in after signup since email confirmation is disabled
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError) {
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: t('auth.error_creating_account'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: t('auth.reset_email_sent'),
        description: t('auth.reset_email_sent_description'),
      });
      
      setShowForgotPassword(false);
      setEmail("");
    } catch (error: any) {
      toast({
        title: t('auth.error_reset_password'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <AuthLayout
        title={t('auth.forgot_password_title')}
        subtitle={t('auth.forgot_password_description')}
      >
        <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">{t('label.email')}</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('auth.send_reset_link')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setShowForgotPassword(false);
              setEmail("");
            }}
            disabled={loading}
          >
            {t('auth.back_to_signin')}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.title')}
      subtitle={t('auth.subtitle')}
    >
      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">{t('auth.sign_in')}</TabsTrigger>
          <TabsTrigger value="signup">{t('auth.sign_up')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="signin">
          <form onSubmit={handleSignIn} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">{t('label.email')}</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signin-password">{t('label.password')}</Label>
              <Input
                id="signin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.sign_in')}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full text-sm"
              onClick={() => setShowForgotPassword(true)}
              disabled={loading}
            >
              {t('auth.forgot_password')}
            </Button>
          </form>
        </TabsContent>
        
        <TabsContent value="signup">
          <form onSubmit={handleSignUp} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email">{t('label.email')}</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">{t('label.password')}</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                {t('auth.password_min_length')}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.create_account')}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </AuthLayout>
  );
}

export default function Auth() {
  return (
    <AuthTranslationProvider>
      <AuthContent />
    </AuthTranslationProvider>
  );
}
