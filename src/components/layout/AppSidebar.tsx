import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderKanban,
  Settings,
  LogOut,
  Sun,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Building2,
  Package,
  DollarSign,
  User,
  ShoppingCart,
  Calendar,
  Code,
  Briefcase,
  ClipboardList,
  Filter,
  ChevronDown,
  Plane,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import logoImpulse from '@/assets/logo-impulse.png';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRole[];
  flag?: string;
  children?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Minha Área', href: '/my-area', icon: Briefcase },
  { title: 'Agenda', href: '/agenda', icon: Calendar, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'] },
  { title: 'Calculadora', href: '/calculator', icon: Calculator, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'] },
  { title: 'Funil', href: '/funnel', icon: Filter, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'] },
  { title: 'Clientes', href: '/clients', icon: Users, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'] },
  { title: 'Orçamentos', href: '/quotes', icon: FileText, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'] },
  { title: 'Projetos', href: '/projects', icon: FolderKanban, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'] },
  { title: 'OS', href: '/service-orders', icon: ClipboardList },
  { title: 'Fornecedores', href: '/suppliers', icon: Building2, roles: ['MASTER', 'DEV'] },
  { title: 'Estoque', href: '/inventory', icon: Package, roles: ['MASTER', 'DEV', 'COMPRAS'] },
  { 
    title: 'Financeiro', 
    href: '/financial', 
    icon: DollarSign, 
    roles: ['MASTER', 'DEV', 'FINANCEIRO'],
    children: [
      { title: 'Contas a Receber', href: '/financial/receivables' },
      { title: 'Contas a Pagar', href: '/financial/payables' },
    ]
  },
  { title: 'Vendas', href: '/sales', icon: ShoppingCart, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'FINANCEIRO', 'COMPRAS'] },
  { title: 'Drone', href: '/drone', icon: Plane, roles: ['DEV'], flag: 'MODULE_DRONE_ENABLED' },
  { title: 'Meu Perfil', href: '/my-profile', icon: User },
  { title: 'Funcionários', href: '/employees', icon: Users, roles: ['MASTER', 'DEV'] },
  { title: 'Configurações', href: '/settings', icon: Settings, roles: ['MASTER', 'DEV'] },
  { title: 'Área DEV', href: '/dev', icon: Code, roles: ['DEV'] },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const { user, realUser, logout, hasRole, stopImpersonating } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Load flags once
    const loadFlags = async () => {
      const { data } = await supabase.from('api_settings').select('key, value').eq('category', 'feature_flag');
      if (data) {
        const flagMap = data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value === 'true' }), {});
        setFlags(flagMap);
      }
    };
    loadFlags();
  }, []);

  const isImpersonating = user?.id !== realUser?.id;


  const filteredNavItems = navItems.filter(
    (item) => {
      const roleAllowed = !item.roles || hasRole(item.roles);
      const flagAllowed = !item.flag || flags[item.flag] !== false; // Default to true if flag not found yet
      return roleAllowed && flagAllowed;
    }
  );

  return (
    <aside
      className={cn(
        'gradient-impulse flex flex-col h-screen transition-all duration-300 relative sticky top-0 shrink-0',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-center p-4 border-b border-sidebar-border">
        {collapsed ? (
          <Sun className="h-8 w-8 text-impulse-gold" />
        ) : (
          <img src={logoImpulse} alt="Impulse" className="h-12 object-contain" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href || (item.children && location.pathname.startsWith(item.href));
          
          if (item.children && !collapsed) {
            return (
              <div key={item.href} className="space-y-1">
                <NavLink
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group',
                    isActive
                      ? 'bg-impulse-gold text-impulse-dark font-medium shadow-gold'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110',
                      isActive ? 'text-impulse-dark' : 'text-impulse-gold'
                    )}
                  />
                  <span className="animate-fade-in">{item.title}</span>
                </NavLink>
                
                <div className="pl-12 space-y-1 animate-slide-down">
                  {item.children.map((child) => {
                    const isChildActive = location.pathname === child.href;
                    return (
                      <NavLink
                        key={child.href}
                        to={child.href}
                        className={cn(
                          'block py-2 text-sm transition-colors',
                          isChildActive 
                            ? 'text-impulse-gold font-medium' 
                            : 'text-sidebar-foreground/70 hover:text-impulse-gold'
                        )}
                      >
                        {child.title}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-impulse-gold text-impulse-dark font-medium shadow-gold'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110',
                  isActive ? 'text-impulse-dark' : 'text-impulse-gold'
                )}
              />
              {!collapsed && (
                <span className="animate-fade-in">{item.title}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border bg-black/20">
        {isImpersonating && !collapsed && (
          <div className="mb-4 p-2 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-500 text-xs text-center animate-pulse">
            <p className="font-bold">MODO SIMULAÇÃO</p>
            <p className="mt-1">Logado como {user?.name}</p>
            <button 
              onClick={stopImpersonating}
              className="mt-2 text-[10px] underline hover:no-underline font-bold"
            >
              Parar Simulação
            </button>
          </div>
        )}
        {!collapsed && user && (
          <div className="mb-3 px-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.name}
              </p>
              {isImpersonating && <Target className="h-3 w-3 text-amber-500" />}
            </div>
            <p className="text-xs text-impulse-gold">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-5 w-5 text-impulse-gold" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-impulse-gold text-impulse-dark p-1.5 rounded-full shadow-gold hover:scale-110 transition-transform"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
