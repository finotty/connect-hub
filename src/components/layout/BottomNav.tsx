import { Home, Search, ClipboardList, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';

const navItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Search, label: 'Buscar', path: '/search' },
  { icon: ClipboardList, label: 'Pedidos', path: '/orders' },
  { icon: User, label: 'Perfil', path: '/profile' },
];

export function BottomNav() {
  const location = useLocation();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || 
            (path === '/' && location.pathname === '/');
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-lg transition-all duration-200",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
