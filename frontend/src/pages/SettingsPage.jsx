import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Globe, Palette, Bell, Volume2, Monitor, Moon, Sun } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { id: 'light', icon: Sun, label: t('settings.lightMode') },
    { id: 'dark', icon: Moon, label: t('settings.darkMode') },
    { id: 'system', icon: Monitor, label: t('settings.systemMode') }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="p-3 rounded-xl"
            style={{ backgroundColor: 'var(--color-accent-light)' }}
          >
            <Settings size={28} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <h1 
              className="text-2xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('settings.title')}
            </h1>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {t('settings.general')}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Language Section */}
        <section 
          className="p-6 rounded-2xl border"
          style={{ 
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)'
          }}
        >
          <LanguageSelector variant="full" showLabel={true} />
        </section>

        {/* Theme Section */}
        <section 
          className="p-6 rounded-2xl border"
          style={{ 
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Palette size={20} style={{ color: 'var(--color-accent)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('settings.appearance')}
            </h3>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setTheme(option.id)}
                  className={`
                    flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200
                    ${isActive ? 'scale-[1.02] shadow-lg' : ''}
                  `}
                  style={{ 
                    backgroundColor: isActive 
                      ? 'var(--color-accent-light)' 
                      : 'var(--color-bg-secondary)',
                    borderColor: isActive 
                      ? 'var(--color-accent)' 
                      : 'transparent'
                  }}
                >
                  <Icon 
                    size={24} 
                    style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                  />
                  <span 
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Notifications Section */}
        <section 
          className="p-6 rounded-2xl border"
          style={{ 
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell size={20} style={{ color: 'var(--color-accent)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('settings.notifications')}
            </h3>
          </div>
          
          <div className="space-y-4">
            <ToggleSetting 
              label={t('settings.enableNotifications')}
              description={t('settings.notificationsDescription')}
            />
            <ToggleSetting 
              label={t('settings.enableSound')}
              description={t('settings.soundDescription')}
              icon={Volume2}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// Toggle Setting Component
function ToggleSetting({ label, description, icon: Icon = Bell, defaultChecked = true }) {
  const [checked, setChecked] = useState(defaultChecked);
  
  return (
    <div 
      className="flex items-center justify-between p-4 rounded-xl"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} style={{ color: 'var(--color-text-muted)' }} />
        <div>
          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {label}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`
          relative w-12 h-6 rounded-full transition-colors duration-200
        `}
        style={{ 
          backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-bg-tertiary)' 
        }}
      >
        <span
          className={`
            absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
            ${checked ? 'translate-x-7' : 'translate-x-1'}
          `}
          style={{ 
            transform: `translateX(${checked ? '1.75rem' : '0.25rem'})` 
          }}
        />
      </button>
    </div>
  );
}
