import { useState, useRef, useEffect } from 'react';
import { KeyRound, Loader2, AlertCircle, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { usersAPI } from '../services/api';
import LanguageSelector from '../components/LanguageSelector';

export default function LoginPage({ onLogin }) {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (value && index === 5 && newCode.every(digit => digit !== '')) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace - move to previous input
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < 6; i++) {
        newCode[i] = pastedData[i] || '';
      }
      setCode(newCode);
      setError('');
      
      // Focus last filled input or submit if complete
      const lastIndex = Math.min(pastedData.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();
      
      if (pastedData.length === 6) {
        handleSubmit(pastedData);
      }
    }
  };

  const handleSubmit = async (codeString) => {
    if (!codeString || codeString.length !== 6) {
      setError(t('errors.required'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await usersAPI.login(codeString);
      
      if (response.success && response.user) {
        onLogin(response.user);
      } else {
        setError(response.error || t('auth.connectionError'));
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || t('auth.connectionError'));
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit(code.join(''));
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSelector variant="compact" />
        <button
          onClick={toggleTheme}
          className="p-3 rounded-xl hover:bg-[var(--color-bg-primary)] transition-colors focus-ring"
          aria-label={isDark ? t('settings.lightMode') : t('settings.darkMode')}
        >
          {isDark ? (
            <Sun size={22} style={{ color: 'var(--color-warning)' }} />
          ) : (
            <Moon size={22} style={{ color: 'var(--color-accent)' }} />
          )}
        </button>
      </div>

      {/* Login Card */}
      <div 
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'var(--color-bg-primary)',
          boxShadow: isDark 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
            : '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Header */}
        <div className="p-8 gradient-primary text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="Api-Track" 
              className="h-16 w-auto object-contain filter brightness-0 invert"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Api-Track
          </h1>
          <p className="text-white/80 text-sm">
            Production Workflow Management
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-8">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <KeyRound size={32} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h2 
              className="text-xl font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('auth.accessTitle')}
            </h2>
            <p 
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('auth.accessSubtitle')}
            </p>
          </div>

          <form onSubmit={handleFormSubmit}>
            {/* Code Input */}
            <div className="flex justify-center gap-2 sm:gap-3 mb-6">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => inputRefs.current[index] = el}
                  type={showCode ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={loading}
                  className="w-11 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 focus-ring transition-all duration-200 disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: error ? 'var(--color-error)' : digit ? 'var(--color-accent)' : 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              ))}
            </div>

            {/* Show/Hide Code Toggle */}
            <div className="flex justify-center mb-6">
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
                {showCode ? t('common.close') : t('common.view')}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div 
                className="flex items-center gap-2 p-4 rounded-xl mb-6"
                style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--color-error)'
                }}
              >
                <AlertCircle size={18} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || code.some(d => d === '')}
              className="w-full py-4 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {t('auth.connecting')}
                </>
              ) : (
                t('auth.login')
              )}
            </button>
          </form>

          {/* Help Text */}
          <p 
            className="text-center text-xs mt-6"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('navigation.help')}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        <span>© {new Date().getFullYear()} Api-Track.</span>
        <span className="text-lg" role="img" aria-label="rock on">🤟</span>
        <span>Azizi Mounir →</span>
        <svg 
          width="24" 
          height="16" 
          viewBox="0 0 360 240" 
          className="inline-block rounded shadow-sm"
          style={{ verticalAlign: 'middle' }}
          aria-label="Tunisia Flag"
        >
          <rect width="360" height="240" fill="#E70013"/>
          <circle cx="180" cy="120" r="60" fill="#FFFFFF"/>
          <circle cx="174" cy="120" r="45" fill="#E70013"/>
          <circle cx="185" cy="120" r="36" fill="#FFFFFF"/>
          <polygon 
            points="180,85 186.9,106.9 210,106.9 191.5,120.6 198.5,142.5 180,128.8 161.5,142.5 168.5,120.6 150,106.9 173.1,106.9" 
            fill="#E70013"
          />
        </svg>
      </div>
    </div>
  );
}
