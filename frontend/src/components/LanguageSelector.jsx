import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { languages, getFlagUrl } from '../i18n';

// Flag component for consistent rendering
const Flag = ({ flagCode, size = 'md', className = '' }) => {
  const sizes = {
    sm: { width: 24, imgSize: 40 },
    md: { width: 32, imgSize: 40 },
    lg: { width: 48, imgSize: 80 },
    xl: { width: 64, imgSize: 80 }
  };
  const { width, imgSize } = sizes[size] || sizes.md;
  
  return (
    <img 
      src={getFlagUrl(flagCode, imgSize)}
      alt={`${flagCode} flag`}
      className={`rounded-sm shadow-sm object-cover ${className}`}
      style={{ width: `${width}px`, height: `${Math.round(width * 0.67)}px` }}
      loading="lazy"
    />
  );
};

export default function LanguageSelector({ variant = 'default', showLabel = true }) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isRTL = i18n.dir() === 'rtl';
  
  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  // Compact variant for header
  if (variant === 'compact') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-xl
            transition-all duration-200 border
            hover:shadow-md active:scale-95
          `}
          style={{ 
            backgroundColor: isOpen ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
            borderColor: isOpen ? 'var(--color-accent)' : 'var(--color-border)',
            color: 'var(--color-text-primary)'
          }}
          title={t('settings.selectLanguage')}
        >
          <Flag flagCode={currentLanguage.flagCode} size="sm" />
          <span className="hidden sm:inline font-medium text-sm">{currentLanguage.shortCode}</span>
          <ChevronDown 
            size={14} 
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--color-text-muted)' }}
          />
        </button>

        {isOpen && (
          <div 
            className={`
              absolute top-full mt-2 py-2 rounded-xl shadow-2xl border z-50 min-w-[200px]
              animate-in fade-in slide-in-from-top-2 duration-200
            `}
            style={{ 
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              right: isRTL ? 'auto' : '0',
              left: isRTL ? '0' : 'auto'
            }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {t('settings.selectLanguage')}
              </p>
            </div>
            <div className="py-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 transition-all duration-150
                    ${lang.code === currentLanguage.code ? 'bg-gradient-to-r from-[var(--color-accent-light)] to-transparent' : ''}
                    hover:bg-[var(--color-bg-secondary)]
                  `}
                  style={{ 
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <Flag flagCode={lang.flagCode} size="md" />
                  <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className="font-medium block">{lang.name}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{lang.shortCode}</span>
                  </div>
                  {lang.code === currentLanguage.code && (
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    >
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full variant for settings page
  return (
    <div className="space-y-4">
      {showLabel && (
        <div className={`flex items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-accent-light)' }}
          >
            <Globe size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {t('settings.languageSettings')}
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {t('settings.selectLanguage')}
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {languages.map((lang) => {
          const isSelected = lang.code === currentLanguage.code;
          return (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`
                relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 
                transition-all duration-300 group
                hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                ${isSelected ? 'shadow-lg' : ''}
              `}
              style={{ 
                backgroundColor: isSelected 
                  ? 'var(--color-accent-light)' 
                  : 'var(--color-bg-secondary)',
                borderColor: isSelected 
                  ? 'var(--color-accent)' 
                  : 'var(--color-border)',
              }}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div 
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <Check size={14} className="text-white" strokeWidth={3} />
                </div>
              )}
              
              {/* Flag with background */}
              <div 
                className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center text-4xl
                  transition-transform duration-300 group-hover:scale-110
                  ${isSelected ? 'shadow-md' : ''}
                `}
                style={{ 
                  backgroundColor: isSelected 
                    ? 'var(--color-bg-primary)' 
                    : 'var(--color-bg-tertiary)',
                }}
              >
                <Flag flagCode={lang.flagCode} size="xl" />
              </div>
              
              {/* Language name */}
              <span 
                className="font-bold text-base"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {lang.name}
              </span>
              
              {/* Country code badge */}
              <span 
                className={`
                  text-xs font-semibold px-3 py-1 rounded-full
                  ${isSelected ? '' : 'opacity-70'}
                `}
                style={{ 
                  backgroundColor: isSelected 
                    ? 'var(--color-accent)' 
                    : 'var(--color-bg-tertiary)',
                  color: isSelected 
                    ? 'white' 
                    : 'var(--color-text-muted)'
                }}
              >
                {lang.shortCode}
              </span>
              
              {/* RTL indicator */}
              {lang.dir === 'rtl' && (
                <span 
                  className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={{ 
                    backgroundColor: 'var(--color-warning-light)',
                    color: 'var(--color-warning)'
                  }}
                >
                  RTL
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Current language info */}
      <div 
        className={`flex items-center gap-3 mt-6 p-4 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <Flag flagCode={currentLanguage.flagCode} size="lg" />
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.currentLanguage')}
          </p>
          <p className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
            {currentLanguage.name}
          </p>
        </div>
        <span 
          className="px-3 py-1 rounded-lg text-sm font-semibold"
          style={{ 
            backgroundColor: 'var(--color-accent-light)',
            color: 'var(--color-accent)'
          }}
        >
          {currentLanguage.shortCode}
        </span>
      </div>
    </div>
  );
}
