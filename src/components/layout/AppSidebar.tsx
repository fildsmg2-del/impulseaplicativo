import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import logoImpulse from '@/assets/logo-impulse.png';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Minha Área', href: '/my-area', icon: Briefcase },
  { title: 'Calculadora', href: '/calculator', icon: Calculator },
  { title: 'Clientes', href: '/clients', icon: Users },
  { title: 'Orçamentos', href: '/quotes', icon: FileText },
  { title: 'Funil', href: '/funnel', icon: Filter },
  { title: 'Projetos', href: '/projects', icon: FolderKanban },
  { title: 'Vendas', href: '/sales', icon: ShoppingCart, roles: ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'FINANCEIRO', 'COMPRAS'] },
  { title: 'OS', href: '/service-orders', icon: ClipboardList },
  { title: 'Agenda', href: '/agenda', icon: Calendar },
  { title: 'Fornecedores', href: '/suppliers', icon: Building2, roles: ['MASTER', 'DEV'] },
  { title: 'Estoque', href: '/inventory', icon: Package, roles: ['MASTER', 'DEV', 'COMPRAS'] },
  { title: 'Financeiro', href: '/financial', icon: DollarSign, roles: ['MASTER', 'DEV', 'FINANCEIRO'] },
  { title: 'Funcionários', href: '/employees', icon: Users, roles: ['MASTER', 'DEV'] },
  { title: 'Meu Perfil', href: '/my-profile', icon: User },
  { title: 'Configurações', href: '/settings', icon: Settings, roles: ['MASTER', 'DEV'] },
  { title: 'Área DEV', href: '/dev', icon: Code, roles: ['DEV'] },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || hasRole(item.roles as any)
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
          const isActive = location.pathname.startsWith(item.href);
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
      <div className="p-4 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.name}
            </p>
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
