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
  Eye,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';

// Icon color palette - Material Design inspired
const iconColors = {
  dashboard: { color: '#3B82F6', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-500/10', hover: 'group-hover:bg-blue-500/20' },
  lots: { color: '#8B5CF6', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-500/10', hover: 'group-hover:bg-violet-500/20' },
  tubes: { color: '#06B6D4', gradient: 'from-cyan-500 to-teal-600', bg: 'bg-cyan-500/10', hover: 'group-hover:bg-cyan-500/20' },
  workflow: { color: '#F59E0B', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10', hover: 'group-hover:bg-amber-500/20' },
  reporting: { color: '#10B981', gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10', hover: 'group-hover:bg-emerald-500/20' },
  tracking: { color: '#EC4899', gradient: 'from-pink-500 to-rose-600', bg: 'bg-pink-500/10', hover: 'group-hover:bg-pink-500/20' },
  bobines: { color: '#F97316', gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-500/10', hover: 'group-hover:bg-orange-500/20' },
  users: { color: '#6366F1', gradient: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-500/10', hover: 'group-hover:bg-indigo-500/20' },
  products: { color: '#14B8A6', gradient: 'from-teal-500 to-cyan-600', bg: 'bg-teal-500/10', hover: 'group-hover:bg-teal-500/20' },
  documents: { color: '#8B5CF6', gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-500/10', hover: 'group-hover:bg-purple-500/20' },
  supervision: { color: '#EF4444', gradient: 'from-red-500 to-rose-600', bg: 'bg-red-500/10', hover: 'group-hover:bg-red-500/20' },
  settings: { color: '#64748B', gradient: 'from-slate-500 to-gray-600', bg: 'bg-slate-500/10', hover: 'group-hover:bg-slate-500/20' },
  help: { color: '#22C55E', gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-500/10', hover: 'group-hover:bg-green-500/20' },
};

// Menu items with translation keys and colors
const getMenuItems = (t, isAdmin) => [
  { 
    title: t('navigation.dashboard'),
    titleKey: 'main',
    titleIcon: Sparkles,
    titleColor: '#3B82F6',
    items: [
      { icon: LayoutDashboard, labelKey: 'navigation.dashboard', path: '/', colorKey: 'dashboard' },
      { icon: Layers, labelKey: 'navigation.lots', path: '/lots', colorKey: 'lots' },
      { icon: Cylinder, labelKey: 'navigation.tubes', path: '/tubes', colorKey: 'tubes' },
      { icon: Workflow, labelKey: 'navigation.workflow', path: '/workflow', badgeKey: 'comingSoon.title', colorKey: 'workflow' },
      { icon: BarChart3, labelKey: 'navigation.reporting', path: '/reporting', badgeKey: 'comingSoon.title', colorKey: 'reporting' },
      { icon: ClipboardList, labelKey: 'navigation.tracking', path: '/suivi', badgeKey: 'comingSoon.title', colorKey: 'tracking' },
    ]
  },
  {
    title: t('common.actions'),
    titleKey: 'management',
    titleColor: '#F59E0B',
    items: [
      { icon: CircleDot, labelKey: 'navigation.bobines', path: '/bobines', colorKey: 'bobines' },
      { icon: Users, labelKey: 'navigation.users', path: '/utilisateurs', colorKey: 'users' },
      { icon: Package, labelKey: 'navigation.products', path: '/produits', badgeKey: 'comingSoon.title', colorKey: 'products' },
      { icon: FileText, labelKey: 'navigation.documents', path: '/documents', badgeKey: 'comingSoon.title', colorKey: 'documents' },
    ]
  },
  {
    title: t('settings.general'),
    titleKey: 'system',
    titleColor: '#64748B',
    items: [
      ...(isAdmin ? [{ icon: Eye, labelKey: 'navigation.supervision', path: '/supervision', colorKey: 'supervision' }] : []),
      { icon: Settings, labelKey: 'navigation.settings', path: '/parametres', colorKey: 'settings' },
      { icon: HelpCircle, labelKey: 'navigation.help', path: '/aide', colorKey: 'help' },
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
          className={`lg:hidden absolute top-4 p-2.5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/30 dark:hover:to-red-800/30 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md group ${isRTL ? 'left-4' : 'right-4'}`}
          aria-label="Close menu"
        >
          <X size={18} className="text-slate-500 group-hover:text-red-500 transition-colors duration-300" />
        </button>

        {/* Desktop Collapse Button */}
        <button
          onClick={toggleCollapse}
          className={`hidden lg:flex absolute top-6 w-7 h-7 rounded-full border-2 items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group ${isRTL ? '-left-3.5' : '-right-3.5'}`}
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-accent)',
          }}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft 
            size={14} 
            className={`transition-all duration-300 group-hover:text-[var(--color-accent)] ${isCollapsed ? (isRTL ? '' : 'rotate-180') : (isRTL ? 'rotate-180' : '')}`}
            style={{ color: 'var(--color-text-secondary)' }}
          />
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 sidebar-nav">
          {menuItems.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-6">
              {/* Section Title */}
              {!isCollapsed && (
                <div className={`flex items-center gap-2 px-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div 
                    className="w-1 h-4 rounded-full"
                    style={{ background: `linear-gradient(to bottom, ${section.titleColor}, ${section.titleColor}80)` }}
                  />
                  <h3 
                    className={`text-xs font-bold uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}
                    style={{ color: section.titleColor }}
                  >
                    {section.title}
                  </h3>
                </div>
              )}

              {/* Collapsed mode - colored dot indicator */}
              {isCollapsed && (
                <div className="flex justify-center mb-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: section.titleColor }}
                  />
                </div>
              )}

              {/* Section Items */}
              <ul className="space-y-1.5">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const label = t(item.labelKey);
                  const badge = item.badgeKey ? t(item.badgeKey) : null;
                  const colors = iconColors[item.colorKey] || iconColors.dashboard;
                  
                  return (
                    <li key={itemIndex} className="sidebar-item">
                      <NavLink
                        to={item.path}
                        onClick={closeSidebar}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-xl
                          transition-all duration-300 ease-out group relative
                          hover:scale-[1.02] active:scale-[0.98]
                          ${isActive 
                            ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg shadow-${item.colorKey}/25` 
                            : `${colors.bg} ${colors.hover} hover:shadow-md`
                          }
                          ${isCollapsed ? 'justify-center' : ''}
                        `}
                        title={isCollapsed ? label : undefined}
                      >
                        {/* Icon with glow effect */}
                        <div className={`
                          relative flex items-center justify-center
                          ${isCollapsed ? '' : 'mr-0'}
                        `}>
                          <Icon 
                            size={20} 
                            className={`
                              flex-shrink-0 transition-all duration-300
                              ${isActive ? 'text-white drop-shadow-sm' : ''}
                              group-hover:scale-110
                            `}
                            style={{ color: isActive ? 'white' : colors.color }}
                          />
                          {/* Subtle glow on hover */}
                          {!isActive && (
                            <div 
                              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300"
                              style={{ backgroundColor: colors.color }}
                            />
                          )}
                        </div>
                        
                        {!isCollapsed && (
                          <>
                            <span 
                              className={`
                                flex-1 text-sm font-medium transition-all duration-300
                                ${isActive ? '' : 'group-hover:translate-x-0.5'}
                              `}
                              style={{ color: isActive ? 'white' : 'var(--color-text-primary)' }}
                            >
                              {label}
                            </span>
                            
                            {badge && (
                              <span 
                                className={`
                                  text-xs px-2 py-0.5 rounded-full font-medium
                                  transition-all duration-300
                                  ${isActive 
                                    ? 'bg-white/20 text-white' 
                                    : ''
                                  }
                                `}
                                style={{ 
                                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${colors.color}15`,
                                  color: isActive ? 'white' : colors.color
                                }}
                              >
                                {badge}
                              </span>
                            )}
                          </>
                        )}

                        {/* Active indicator line */}
                        {isActive && !isCollapsed && (
                          <div 
                            className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-white/50`}
                          />
                        )}

                        {/* Tooltip for collapsed mode */}
                        {isCollapsed && (
                          <div className={`
                            absolute ${isRTL ? 'right-full mr-3' : 'left-full ml-3'} px-3 py-2 rounded-xl
                            opacity-0 invisible group-hover:opacity-100 group-hover:visible
                            transition-all duration-300 whitespace-nowrap z-50
                            border shadow-xl
                          `}
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            borderColor: colors.color + '30',
                            boxShadow: `0 10px 25px -5px ${colors.color}20`,
                          }}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: colors.color }}
                              />
                              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                {label}
                              </span>
                            </div>
                            {badge && (
                              <span 
                                className="mt-1 block text-xs px-2 py-0.5 rounded-full text-center"
                                style={{ 
                                  backgroundColor: `${colors.color}15`,
                                  color: colors.color
                                }}
                              >
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

        {/* Bottom Section - Help Card */}
        {!isCollapsed && (
          <div 
            className="flex-shrink-0 p-4 border-t"
            style={{ 
              backgroundColor: 'var(--color-sidebar)',
              borderColor: 'var(--color-border)' 
            }}
          >
            <div 
              className="p-4 rounded-2xl relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg"
              style={{ 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}
            >
              {/* Decorative gradient blob */}
              <div 
                className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
              />
              
              <div className="relative z-10">
                <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <HelpCircle size={18} className="text-indigo-500" />
                  <p className={`text-sm font-semibold ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: 'var(--color-text-primary)' }}>
                    {t('common.needHelp')}
                  </p>
                </div>
                <p className={`text-xs mb-3 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: 'var(--color-text-muted)' }}>
                  {t('common.checkDocumentation')}
                </p>
                <button className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 hover:shadow-md hover:shadow-indigo-500/25 active:scale-[0.98]">
                  {t('common.documentation')}
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
