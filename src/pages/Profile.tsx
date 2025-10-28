import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { Loader2, Upload, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Profile() {
  const { t, currentLanguage, changeLanguage, availableLanguages } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Fetch current user data
  const { data: usuario, isLoading } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch user role
  const { data: userRoles } = useQuery({
    queryKey: ['current-user-roles', usuario?.id],
    queryFn: async () => {
      if (!usuario?.id) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', usuario.id);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Priority order: superadmin > admin > manager > coordinator
        const rolePriority: Record<string, number> = {
          'superadmin': 4,
          'admin': 3,
          'manager': 2,
          'coordinator': 1
        };
        
        const highestRole = data.reduce((highest, current) => {
          return (rolePriority[current.role] || 0) > (rolePriority[highest.role] || 0)
            ? current
            : highest;
        });
        
        return highestRole.role;
      }
      
      return null;
    },
    enabled: !!usuario?.id,
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('profile.error_file_size'),
        description: t('profile.error_file_size_desc'),
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: t('profile.error_file_type'),
        description: t('profile.error_file_type_desc'),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update usuario with avatar URL
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ avatar_url: publicUrl })
        .eq('email', user.email);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['current-user-profile'] });

      toast({
        title: t('profile.avatar_updated'),
        description: t('profile.avatar_updated_desc'),
      });
    } catch (error: any) {
      toast({
        title: t('profile.error_uploading'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: t('profile.error_password_match'),
        description: t('profile.error_password_match_desc'),
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t('profile.error_password_length'),
        description: t('auth.password_min_length'),
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: t('profile.password_changed'),
        description: t('profile.password_changed_desc'),
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: t('profile.error_changing_password'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      
      toast({
        title: t('profile.language_changed'),
        description: t('profile.language_changed_desc'),
      });
    } catch (error: any) {
      toast({
        title: t('profile.error_changing_language'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const initials = usuario?.nombre_completo
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
          <p className="text-muted-foreground">{t('profile.subtitle')}</p>
        </div>

        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.avatar')}</CardTitle>
            <CardDescription>{t('profile.avatar_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={usuario?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <Input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
                id="avatar-upload"
              />
              <Label htmlFor="avatar-upload">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  asChild
                >
                  <span className="cursor-pointer">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {t('profile.upload_avatar')}
                  </span>
                </Button>
              </Label>
              <p className="text-xs text-muted-foreground mt-2">
                {t('profile.avatar_requirements')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.personal_info')}</CardTitle>
            <CardDescription>{t('profile.personal_info_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('label.name')}</Label>
              <Input value={usuario?.nombre_completo || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t('label.email')}</Label>
              <Input value={usuario?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.role')}</Label>
              <Input 
                value={userRoles ? t(`role.${userRoles}`) : '-'} 
                disabled 
                className="font-medium"
              />
              <p className="text-xs text-muted-foreground">
                {t('profile.your_role')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Language Preference */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.language')}</CardTitle>
            <CardDescription>{t('profile.language_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{t('profile.preferred_language')}</Label>
              <Select value={currentLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map((lang) => (
                    <SelectItem key={lang.codigo} value={lang.codigo}>
                      {lang.bandera_emoji} {lang.nombre_nativo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.change_password')}</CardTitle>
            <CardDescription>{t('profile.change_password_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('profile.new_password')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={changingPassword}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('profile.confirm_password')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={changingPassword}
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={changingPassword || !newPassword || !confirmPassword}>
                {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('profile.update_password')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
