import { useState } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAddresses } from '@/contexts/AddressesContext';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Plus, Edit, Trash2, Check, Home, Briefcase, MapPin as MapPinIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Address } from '@/types';

export default function AddressesPage() {
  const { addresses, loading, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useAddresses();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    isDefault: false,
  });

  const resetForm = () => {
    setFormData({
      label: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      isDefault: false,
    });
    setEditingAddress(null);
  };

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        label: address.label,
        street: address.street,
        number: address.number,
        complement: address.complement || '',
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        isDefault: address.isDefault,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, formData);
        toast({ title: "Endereço atualizado com sucesso!" });
      } else {
        await addAddress(formData);
        toast({ title: "Endereço adicionado com sucesso!" });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o endereço.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (addressId: string) => {
    if (confirm('Tem certeza que deseja excluir este endereço?')) {
      try {
        await deleteAddress(addressId);
        toast({ title: "Endereço excluído com sucesso!" });
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Não foi possível excluir o endereço.",
          variant: "destructive"
        });
      }
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultAddress(addressId);
      toast({ title: "Endereço padrão atualizado!" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o endereço padrão.",
        variant: "destructive"
      });
    }
  };

  const getLabelIcon = (label: string) => {
    if (label.toLowerCase().includes('casa') || label.toLowerCase().includes('home')) {
      return Home;
    }
    if (label.toLowerCase().includes('trabalho') || label.toLowerCase().includes('work')) {
      return Briefcase;
    }
    return MapPinIcon;
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <header className="sticky top-0 z-40 bg-card border-b p-4">
          <h1 className="font-bold text-lg">Endereços</h1>
        </header>
        <main className="p-4 space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b p-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">Endereços</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAddress ? 'Editar Endereço' : 'Novo Endereço'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="label">Rótulo (ex: Casa, Trabalho)</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Casa"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Rua das Flores"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="number">Nº</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="123"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="complement">Complemento (opcional)</Label>
                <Input
                  id="complement"
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  placeholder="Apto 101"
                />
              </div>

              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Centro"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="São Paulo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value.replace(/\D/g, '') })}
                  placeholder="00000-000"
                  maxLength={8}
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  Definir como endereço padrão
                </Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingAddress ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <main className="p-4 space-y-3">
        {addresses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="font-semibold text-lg mb-1">Nenhum endereço cadastrado</h2>
              <p className="text-sm mb-4">
                Adicione endereços para facilitar na hora de fazer pedidos.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Endereço
              </Button>
            </CardContent>
          </Card>
        ) : (
          addresses.map(address => {
            const LabelIcon = getLabelIcon(address.label);
            const fullAddress = `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}, ${address.neighborhood}, ${address.city} - ${address.state}`;

            return (
              <Card key={address.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <LabelIcon className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{address.label}</h3>
                      {address.isDefault && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Padrão
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(address)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(address.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{fullAddress}</p>
                  {!address.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(address.id)}
                      className="w-full"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Definir como padrão
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </main>

      <BottomNav />
    </div>
  );
}

