import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Settings, User, Mail, Phone, Bell, Moon, Sun, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUserProfile({
        name: formData.name,
        phone: formData.phone,
      });
      toast({ title: "Perfil atualizado com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o perfil.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b p-4">
        <h1 className="font-bold text-lg">Configurações</h1>
      </header>

      <main className="p-4 space-y-6">
        {/* Perfil */}
        <section>
          <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase">
            Perfil
          </h2>
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Seu nome"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4" />
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O e-mail não pode ser alterado
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="(00) 00000-0000"
                    maxLength={11}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Preferências */}
        <section>
          <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase">
            Preferências
          </h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Notificações</p>
                    <p className="text-sm text-muted-foreground">
                      Receber notificações sobre pedidos
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {darkMode ? (
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Modo escuro</p>
                    <p className="text-sm text-muted-foreground">
                      Alternar tema do aplicativo
                    </p>
                  </div>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Conta */}
        <section>
          <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase">
            Conta
          </h2>
          <Card>
            <CardContent className="p-4">
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair da Conta
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Sobre */}
        <section>
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">App do Bairro</p>
              <p className="text-xs mt-1">Versão 1.0.0</p>
            </CardContent>
          </Card>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

