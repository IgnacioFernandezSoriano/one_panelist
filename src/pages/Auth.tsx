import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthTranslation } from "@/hooks/useAuthTranslation";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useAuthTranslation();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log("Attempting to sign in with:", email);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        toast({
          title: t("auth.error"),
          description: t("auth.invalid_credentials"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log("Sign in successful, navigating to dashboard");
      navigate("/");
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast({
        title: t("auth.error"),
        description: error.message || t("auth.unexpected_error"),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title={t("auth.welcome")} 
      subtitle={t("auth.sign_in_subtitle")}
    >
      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t("auth.email_placeholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t("auth.password_placeholder")}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? t("auth.loading") : t("auth.sign_in")}
        </Button>
      </form>
    </AuthLayout>
  );
}
