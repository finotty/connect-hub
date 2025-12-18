import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingBag, Briefcase, Store, Wrench, ChevronRight } from 'lucide-react';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';

type Step = 'role' | 'vendor-type';

interface Option {
  value: UserRole | 'vendor';
  icon: React.ElementType;
  title: string;
  description: string;
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { setUserRole } = useAuth();
  const navigate = useNavigate();

  const roleOptions: Option[] = [
    {
      value: 'customer',
      icon: ShoppingBag,
      title: 'Quero Comprar',
      description: 'Encontrar lojas e serviços no meu bairro'
    },
    {
      value: 'vendor',
      icon: Briefcase,
      title: 'Quero Vender',
      description: 'Cadastrar meu negócio ou serviço'
    }
  ];

  const vendorOptions: Option[] = [
    {
      value: 'vendor_product',
      icon: Store,
      title: 'Vender Produtos',
      description: 'Mercado, padaria, lanchonete, etc.'
    },
    {
      value: 'vendor_service',
      icon: Wrench,
      title: 'Oferecer Serviços',
      description: 'Eletricista, manicure, faxina, etc.'
    }
  ];

  const handleSelect = async (value: string) => {
    if (step === 'role') {
      if (value === 'customer') {
        setLoading(true);
        await setUserRole('customer');
        navigate('/');
      } else {
        setSelectedRole(value);
        setStep('vendor-type');
      }
    } else {
      setLoading(true);
      await setUserRole(value as UserRole);
      navigate('/partner');
    }
  };

  const options = step === 'role' ? roleOptions : vendorOptions;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-primary/5 to-background">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">
            {step === 'role' ? 'Como quer usar o app?' : 'O que você vende?'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {step === 'role' 
              ? 'Você pode mudar isso depois nas configurações' 
              : 'Escolha a categoria do seu negócio'}
          </p>
        </div>

        <div className="space-y-3">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <Card 
                key={option.value}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:border-primary/50",
                  selectedRole === option.value && "border-primary bg-primary/5"
                )}
                onClick={() => !loading && handleSelect(option.value)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{option.title}</h3>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {step === 'vendor-type' && (
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => setStep('role')}
            disabled={loading}
          >
            Voltar
          </Button>
        )}
      </div>
    </div>
  );
}
