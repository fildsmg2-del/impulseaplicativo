import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  FolderKanban, 
  MoreHorizontal,
  Calendar,
  Calculator,
  Filter,
  FileText,
  ClipboardList,
  Package,
  Building2,
  ShoppingCart,
  Plane,
  Settings,
  Code,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";

const mainItems = [
  { title: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Clientes', href: '/clients', icon: Users },
  { title: 'Financeiro', href: '/financial', icon: DollarSign },
  { title: 'Projetos', href: '/projects', icon: FolderKanban },
];

const allOtherItems = [
  { title: 'Agenda', href: '/agenda', icon: Calendar },
  { title: 'Calculadora', href: '/calculator', icon: Calculator },
  { title: 'Funil', href: '/funnel', icon: Filter },
  { title: 'Orçamentos', href: '/quotes', icon: FileText },
  { title: 'OS', href: '/service-orders', icon: ClipboardList },
  { title: 'Estoque', href: '/inventory', icon: Package },
  { title: 'Fornecedores', href: '/suppliers', icon: Building2 },
  { title: 'Vendas', href: '/sales', icon: ShoppingCart },
  { title: 'Drone', href: '/drone', icon: Plane },
  { title: 'Perfil', href: '/my-profile', icon: User },
  { title: 'Configurações', href: '/settings', icon: Settings },
  { title: 'Área DEV', href: '/dev', icon: Code, role: 'DEV' },
];

export function BottomNav() {
  const location = useLocation();
  const { user, hasRole } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 gradient-impulse border-t border-white/10 z-50 flex items-center justify-around px-2 md:hidden safe-area-bottom shadow-[0_-4px_10px_rgba(0,0,0,0.15)]">
      {mainItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-300",
              isActive ? "text-impulse-gold scale-110" : "text-white/60"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-gold")} />
            <span className="text-[10px] font-medium">{item.title}</span>
            {isActive && <div className="absolute bottom-1 w-1 h-1 bg-impulse-gold rounded-full" />}
          </NavLink>
        );
      })}

      <Sheet>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center gap-1 w-16 h-full text-white/60">
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl gradient-impulse border-t border-white/10 outline-none p-6">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-white">Navegação Completa</SheetTitle>
            <SheetDescription className="text-white/60">
              Acesse todos os módulos do sistema
            </SheetDescription>
          </SheetHeader>
          
          <div className="grid grid-cols-4 gap-y-8 gap-x-4 max-h-[60vh] overflow-y-auto pb-8 pt-2">
            {allOtherItems.filter(item => !item.role || hasRole([item.role as any])).map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => {
                  // Sheet will close on click because it's in a drawer
                }}
                className={cn(
                  "flex flex-col items-center gap-2 group transition-all",
                  location.pathname === item.href ? "text-impulse-gold" : "text-white/70"
                )}
              >
                <div className={cn(
                  "p-3 rounded-2xl bg-white/5 border border-white/10 group-active:scale-95 transition-transform",
                  location.pathname === item.href && "bg-impulse-gold/20 border-impulse-gold/40"
                )}>
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-medium text-center leading-tight">{item.title}</span>
              </NavLink>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
