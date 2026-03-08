import { 
  Menu, 
  Bell, 
  Search, 
  Sun, 
  Moon, 
  User,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import ConnectionIndicator from './ConnectionIndicator';
import LanguageSelector from './LanguageSelector';

export default function Header() {
  const { isDark, toggleTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const { currentUser, logout } = useAuth();
  const { t } = useTranslation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 h-16 px-4 lg:px-6 flex items-center justify-between border-b transition-colors duration-300"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors focus-ring"
          aria-label="Toggle menu"
        >
          <Menu size={22} style={{ color: 'var(--color-text-primary)' }} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Api-Track Logo" 
            className="h-10 w-auto object-contain"
          />
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold gradient-text">Api-Track</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Production Workflow
            </p>
          </div>
        </div>
      </div>

      {/* Center Section - Search (Hidden on mobile) */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div 
          className="relative w-full"
        >
          <Search 
            size={18} 
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            placeholder={t('common.search') + '...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus-ring transition-all duration-200"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection Indicator */}
        <div className="hidden sm:flex items-center px-2">
          <ConnectionIndicator showLabel={false} size="small" />
        </div>

        {/* Mobile Search Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors focus-ring"
          aria-label="Search"
        >
          <Search size={20} style={{ color: 'var(--color-text-secondary)' }} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors focus-ring"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <Sun size={20} style={{ color: 'var(--color-warning)' }} />
          ) : (
            <Moon size={20} style={{ color: 'var(--color-accent)' }} />
          )}
        </button>

        {/* Language Selector */}
        <LanguageSelector variant="compact" />

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors focus-ring"
            aria-label="Notifications"
          >
            <Bell size={20} style={{ color: 'var(--color-text-secondary)' }} />
            {/* Notification Badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-error)] rounded-full"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div 
              className="absolute right-0 mt-2 w-80 rounded-xl border shadow-lg overflow-hidden"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Notifications
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i}
                    className="p-4 border-b last:border-0 hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                        <Bell size={16} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {t('common.info')}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {t('time.minutesAgo', { count: i * 5 })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button className="w-full text-center text-sm font-medium py-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t('common.showMore')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-[var(--color-bg-secondary)] transition-colors focus-ring"
          >
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              {currentUser ? (
                <span className="text-white text-xs font-semibold">
                  {currentUser.prenom[0]}{currentUser.nom[0]}
                </span>
              ) : (
                <User size={16} className="text-white" />
              )}
            </div>
            <span className="hidden sm:block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {currentUser ? `${currentUser.prenom} ${currentUser.nom}` : t('connection.disconnected')}
            </span>
            <ChevronDown 
              size={16} 
              className={`hidden sm:block transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
              style={{ color: 'var(--color-text-muted)' }}
            />
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div 
              className="absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {currentUser ? `${currentUser.prenom} ${currentUser.nom}` : t('connection.disconnected')}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {currentUser ? `${currentUser.matricule} • ${getRoleLabel(currentUser.role, t)}` : ''}
                </p>
              </div>
              <div className="py-2">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-bg-secondary)] transition-colors text-left">
                  <User size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('users.details')}</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-bg-secondary)] transition-colors text-left">
                  <Settings size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('navigation.settings')}</span>
                </button>
              </div>
              <div className="border-t py-2" style={{ borderColor: 'var(--color-border)' }}>
                <button 
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
                >
                  <LogOut size={18} style={{ color: 'var(--color-error)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-error)' }}>{t('navigation.logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function getRoleLabel(role, t) {
  const labels = {
    admin_systeme: t('users.adminSystem'),
    admin_limite: t('users.adminLimited'),
    superviseur_limite: t('users.supervisorLimited'),
    observateur_limite: t('users.observerLimited'),
  };
  return labels[role] || role;
}
