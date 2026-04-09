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

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'GERAL',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'UTILIDADES',
    items: [
      { title: 'Calculadora', href: '/calculator', icon: Calculator, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'], flag: 'MODULE_CALCULATOR_ENABLED' },
      { title: 'Drone', href: '/drone', icon: Plane, roles: ['DEV'], flag: 'MODULE_DRONE_ENABLED' },
    ]
  },
  {
    label: 'MEU ESPAÇO',
    items: [
      { title: 'Meu Perfil', href: '/my-profile', icon: User },
      { title: 'Minha Área', href: '/my-area', icon: Briefcase },
      { title: 'Agenda', href: '/agenda', icon: Calendar, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'], flag: 'MODULE_AGENDA_ENABLED' },
    ]
  },
  {
    label: 'VENDAS & CLIENTES',
    items: [
      { title: 'Clientes', href: '/clients', icon: Users, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'], flag: 'MODULE_CLIENTS_ENABLED' },
      { title: 'Funil', href: '/funnel', icon: Filter, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'], flag: 'MODULE_FUNNEL_ENABLED' },
      { title: 'Orçamentos', href: '/quotes', icon: FileText, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'], flag: 'MODULE_QUOTES_ENABLED' },
      { title: 'Projetos', href: '/projects', icon: FolderKanban, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'DEV', 'FINANCEIRO', 'POS_VENDA', 'COMPRAS'], flag: 'MODULE_PROJECTS_ENABLED' },
      { title: 'OS', href: '/service-orders', icon: ClipboardList, flag: 'MODULE_SERVICE_ORDERS_ENABLED' },
      { title: 'Vendas', href: '/sales', icon: ShoppingCart, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'FINANCEIRO', 'COMPRAS'], flag: 'MODULE_SALES_ENABLED' },
    ]
  },
  {
    label: 'FINANÇAS & PRODUTOS',
    items: [
      {
        title: 'Financeiro',
        href: '/financial',
        icon: DollarSign,
        roles: ['MASTER', 'DEV', 'FINANCEIRO'],
        flag: 'MODULE_FINANCIAL_ENABLED',
        children: [
          { title: 'Contas a Receber', href: '/financial/receivables' },
          { title: 'Contas a Pagar', href: '/financial/payables' },
        ]
      },
      { title: 'Fornecedores', href: '/suppliers', icon: Building2, roles: ['MASTER', 'DEV', 'ENGENHEIRO'], flag: 'MODULE_SUPPLIERS_ENABLED' },
      { title: 'Estoque', href: '/inventory', icon: Package, roles: ['MASTER', 'DEV', 'COMPRAS', 'ENGENHEIRO'], flag: 'MODULE_INVENTORY_ENABLED' },
    ]
  },
  {
    label: 'GESTÃO & DADOS',
    items: [
      { title: 'Configurações', href: '/settings', icon: Settings, roles: ['MASTER', 'DEV'], flag: 'MODULE_SETTINGS_ENABLED' },
      { title: 'Funcionários', href: '/employees', icon: Users, roles: ['MASTER', 'DEV'], flag: 'MODULE_EMPLOYEES_ENABLED' },
      { title: 'Área DEV', href: '/dev', icon: Code, roles: ['DEV'] },
    ]
  }
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


  const filteredGroups = navGroups.map(group => {
    return {
      ...group,
      items: group.items.filter((item) => {
        const roleAllowed = !item.roles || hasRole(item.roles);
        const flagAllowed = !item.flag || flags[item.flag] !== false; // Default to true if flag not found yet
        return roleAllowed && flagAllowed;
      })
    };
  }).filter(group => group.items.length > 0);

  return (
    <aside
      className={cn(
        'gradient-impulse flex flex-col h-screen transition-all duration-500 relative sticky top-0 shrink-0 z-50',
        collapsed ? 'w-24' : 'w-72'
      )}
    >
      {/* Decorative Blur Background clamped inside the sidebar */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-32 h-32 bg-impulse-gold/10 blur-3xl rounded-full -translate-y-16 translate-x-16 pointer-events-none" />
      </div>

      {/* Logo Section */}
      <div className="flex items-center justify-center p-8 border-b border-white/5 relative z-10">
        {collapsed ? (
          <div className="h-10 w-10 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 hover-lift active:scale-95 transition-all">
            <Sun className="h-6 w-6 text-impulse-gold" />
          </div>
        ) : (
          <img src={logoImpulse} alt="Impulse" className="h-14 object-contain animate-float" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-8 px-5 space-y-1 overflow-y-auto scrollbar-none relative z-10 w-full flex flex-col gap-1">
        {filteredGroups.map((group, groupIdx) => (
          <div key={group.label} className={cn("flex flex-col gap-1 w-full", groupIdx > 0 && "mt-6")}>
            {!collapsed && (
              <h4 className="px-5 mb-1 text-[10px] font-black tracking-widest text-white/30 uppercase">
                {group.label}
              </h4>
            )}

            {group.items.map((item) => {
              const isActive = location.pathname === item.href || (item.children && location.pathname.startsWith(item.href));

              if (item.children && !collapsed) {
                return (
                  <div key={item.href} className="space-y-1">
                    <NavLink
                      to={item.href}
                      className={cn(
                        'flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden',
                        isActive
                          ? 'bg-impulse-gold text-impulse-dark font-semibold shadow-gold'
                          : 'text-sidebar-foreground hover:bg-white/5 hover-lift'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110',
                          isActive ? 'text-impulse-dark' : 'text-impulse-gold'
                        )}
                      />
                      <span className="text-sm tracking-tight">{item.title}</span>
                    </NavLink>

                    <div className="pl-14 space-y-1 border-l border-white/5 ml-7">
                      {item.children.map((child) => {
                        const isChildActive = location.pathname === child.href;
                        return (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            className={cn(
                              'block py-2 text-[13px] transition-all duration-300 hover:translate-x-1',
                              isChildActive
                                ? 'text-impulse-gold font-semibold'
                                : 'text-sidebar-foreground/50 hover:text-impulse-gold'
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
                    'flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group relative',
                    isActive
                      ? 'bg-impulse-gold text-impulse-dark font-semibold shadow-gold'
                      : 'text-sidebar-foreground hover:bg-white/5 hover-lift'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110',
                      isActive ? 'text-impulse-dark' : 'text-impulse-gold'
                    )}
                  />
                  {!collapsed && (
                    <span className="text-sm tracking-tight">{item.title}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="absolute right-4 w-1.5 h-1.5 bg-impulse-dark rounded-full" />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-md relative z-10">
        {isImpersonating && !collapsed && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500 text-[10px] text-center">
            <p className="font-bold tracking-widest">MODO SIMULAÇÃO</p>
            <p className="mt-1 opacity-80">Como {user?.name}</p>
            <button
              onClick={stopImpersonating}
              className="mt-2 text-[9px] uppercase tracking-tighter hover:underline font-bold"
            >
              Encerrar
            </button>
          </div>
        )}
        {!collapsed && user && (
          <div className="mb-5 px-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-impulse-gold" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate leading-tight">
                {user.name}
              </p>
              <p className="text-[11px] text-impulse-gold/70 font-medium tracking-wide">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-sidebar-foreground hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group"
        >
          <LogOut className="h-5 w-5 text-impulse-gold group-hover:text-red-400 transition-colors" />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-4 top-24 bg-impulse-gold text-impulse-dark p-2 rounded-xl shadow-gold hover:scale-110 active:scale-95 transition-all z-50 border-2 border-impulse-dark"
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
