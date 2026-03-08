import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Workflow, 
  BarChart3, 
  ClipboardList,
  Settings,
  Users,
  Package,
  FileText,
  HelpCircle,
  ChevronLeft,
  X,
  CircleDot,
  Layers,
  Cylinder,
  Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';

// Menu items with translation keys
const getMenuItems = (t, isAdmin) => [
  { 
    title: t('navigation.dashboard'),
    titleKey: 'main',
    items: [
      { icon: LayoutDashboard, labelKey: 'navigation.dashboard', path: '/' },
      { icon: Layers, labelKey: 'navigation.lots', path: '/lots' },
      { icon: Cylinder, labelKey: 'navigation.tubes', path: '/tubes' },
      { icon: Workflow, labelKey: 'navigation.workflow', path: '/workflow', badgeKey: 'comingSoon.title' },
      { icon: BarChart3, labelKey: 'navigation.reporting', path: '/reporting', badgeKey: 'comingSoon.title' },
      { icon: ClipboardList, labelKey: 'navigation.tracking', path: '/suivi', badgeKey: 'comingSoon.title' },
    ]
  },
  {
    title: t('common.actions'),
    titleKey: 'management',
    items: [
      { icon: CircleDot, labelKey: 'navigation.bobines', path: '/bobines' },
      { icon: Users, labelKey: 'navigation.users', path: '/utilisateurs' },
      { icon: Package, labelKey: 'navigation.products', path: '/produits', badgeKey: 'comingSoon.title' },
      { icon: FileText, labelKey: 'navigation.documents', path: '/documents', badgeKey: 'comingSoon.title' },
    ]
  },
  {
    title: t('settings.general'),
    titleKey: 'system',
    items: [
      ...(isAdmin ? [{ icon: Eye, labelKey: 'navigation.supervision', path: '/supervision' }] : []),
      { icon: Settings, labelKey: 'navigation.settings', path: '/parametres' },
      { icon: HelpCircle, labelKey: 'navigation.help', path: '/aide' },
    ]
  }
];

export default function Sidebar() {
  const { isOpen, isCollapsed, closeSidebar, toggleCollapse } = useSidebar();
  const { currentUser } = useAuth();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'admin_systeme';
  const menuItems = getMenuItems(t, isAdmin);
  const isRTL = i18n.dir() === 'rtl';

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden mobile-overlay"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 z-40 h-[calc(100vh-4rem)]
          transition-all duration-300 ease-in-out
          flex flex-col
          ${isRTL ? 'right-0 border-l' : 'left-0 border-r'}
          ${isOpen 
            ? 'translate-x-0' 
            : isRTL 
              ? 'translate-x-full lg:translate-x-0' 
              : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          w-72
        `}
        style={{
          backgroundColor: 'var(--color-sidebar)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Mobile Close Button */}
        <button
          onClick={closeSidebar}
          className={`lg:hidden absolute top-4 p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors ${isRTL ? 'left-4' : 'right-4'}`}
          aria-label="Close menu"
        >
          <X size={20} style={{ color: 'var(--color-text-secondary)' }} />
        </button>

        {/* Desktop Collapse Button */}
        <button
          onClick={toggleCollapse}
          className={`hidden lg:flex absolute top-6 w-6 h-6 rounded-full border items-center justify-center shadow-sm hover:bg-[var(--color-bg-tertiary)] transition-colors ${isRTL ? '-left-3' : '-right-3'}`}
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft 
            size={14} 
            className={`transition-transform duration-300 ${isCollapsed ? (isRTL ? '' : 'rotate-180') : (isRTL ? 'rotate-180' : '')}`}
            style={{ color: 'var(--color-text-secondary)' }}
          />
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
          {menuItems.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-6">
              {/* Section Title */}
              {!isCollapsed && (
                <h3 
                  className={`px-3 mb-2 text-xs font-semibold uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {section.title}
                </h3>
              )}

              {/* Section Items */}
              <ul className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const label = t(item.labelKey);
                  const badge = item.badgeKey ? t(item.badgeKey) : null;
                  
                  return (
                    <li key={itemIndex}>
                      <NavLink
                        to={item.path}
                        onClick={closeSidebar}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-xl
                          transition-all duration-200 group relative
                          ${isActive 
                            ? 'bg-[var(--color-accent)] text-white shadow-md' 
                            : 'hover:bg-[var(--color-bg-tertiary)]'
                          }
                          ${isCollapsed ? 'justify-center' : ''}
                        `}
                        title={isCollapsed ? label : undefined}
                      >
                        <Icon 
                          size={20} 
                          className={`flex-shrink-0 ${isActive ? 'text-white' : ''}`}
                          style={{ color: isActive ? 'white' : 'var(--color-text-secondary)' }}
                        />
                        
                        {!isCollapsed && (
                          <>
                            <span 
                              className="flex-1 text-sm font-medium"
                              style={{ color: isActive ? 'white' : 'var(--color-text-primary)' }}
                            >
                              {label}
                            </span>
                            
                            {badge && (
                              <span 
                                className={`
                                  text-xs px-2 py-0.5 rounded-full font-medium
                                  ${isActive 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                                  }
                                `}
                              >
                                {badge}
                              </span>
                            )}
                          </>
                        )}

                        {/* Tooltip for collapsed mode */}
                        {isCollapsed && (
                          <div className={`
                            absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-3 py-2 rounded-lg
                            opacity-0 invisible group-hover:opacity-100 group-hover:visible
                            transition-all duration-200 whitespace-nowrap z-50
                          `}
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            boxShadow: 'var(--shadow-lg)',
                          }}
                          >
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {label}
                            </span>
                            {badge && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                                {badge}
                              </span>
                            )}
                          </div>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        {!isCollapsed && (
          <div 
            className="flex-shrink-0 p-4 border-t"
            style={{ 
              backgroundColor: 'var(--color-sidebar)',
              borderColor: 'var(--color-border)' 
            }}
          >
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <p className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: 'var(--color-text-primary)' }}>
                {t('common.needHelp')}
              </p>
              <p className={`text-xs mt-1 mb-3 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: 'var(--color-text-muted)' }}>
                {t('common.checkDocumentation')}
              </p>
              <button className="w-full py-2 px-4 rounded-lg text-sm font-medium text-white gradient-primary hover:opacity-90 transition-opacity">
                {t('common.documentation')}
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
