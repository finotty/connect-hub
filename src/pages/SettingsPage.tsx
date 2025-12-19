import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Settings, User, Mail, Phone, Bell, Moon, Sun, LogOut, Store, Wrench, Briefcase } from 'lucide-react';
import { UserRole } from '@/types';

export default function SettingsPage() {
  const { user, logout, updateUserProfile, setUserRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Inicializar darkMode do localStorage ou preferência do sistema
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Aplicar tema quando darkMode mudar
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

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

  const handleChangeToVendor = async (vendorType: 'vendor_product' | 'vendor_service') => {
    if (!user) return;
    
    setChangingRole(true);
    try {
      await setUserRole(vendorType);
      setRoleDialogOpen(false);
      toast({
        title: "Perfil atualizado!",
        description: "Agora você é um vendedor. Redirecionando...",
      });
      setTimeout(() => {
        navigate('/partner');
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar o perfil.",
        variant: "destructive"
      });
    } finally {
      setChangingRole(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b p-4">
        <h1 className="font-bold text-lg">Configurações</h1>
      </header>

      <main className="p-4 space-y-6 max-w-6xl mx-auto">
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

        {/* Tipo de Conta - Apenas para clientes */}
        {user?.role === 'customer' && (
          <section>
            <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase">
              Tipo de Conta
            </h2>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-medium mb-1">Você é um cliente</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Quer começar a vender? Escolha o tipo de vendedor que deseja ser.
                    </p>
                  </div>
                  <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Briefcase className="h-4 w-4 mr-2" />
                        Tornar-se Vendedor
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Escolha o tipo de vendedor</DialogTitle>
                        <DialogDescription>
                          Selecione se você quer vender produtos ou oferecer serviços.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 mt-4">
                        <Button
                          variant="outline"
                          className="w-full h-auto p-4 flex flex-col items-start"
                          onClick={() => handleChangeToVendor('vendor_product')}
                          disabled={changingRole}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <Store className="h-5 w-5 text-primary" />
                            <div className="flex-1 text-left">
                              <p className="font-semibold">Vender Produtos</p>
                              <p className="text-sm text-muted-foreground">
                                Mercado, padaria, lanchonete, etc.
                              </p>
                            </div>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full h-auto p-4 flex flex-col items-start"
                          onClick={() => handleChangeToVendor('vendor_service')}
                          disabled={changingRole}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <Wrench className="h-5 w-5 text-primary" />
                            <div className="flex-1 text-left">
                              <p className="font-semibold">Oferecer Serviços</p>
                              <p className="text-sm text-muted-foreground">
                                Eletricista, manicure, faxina, etc.
                              </p>
                            </div>
                          </div>
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

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

