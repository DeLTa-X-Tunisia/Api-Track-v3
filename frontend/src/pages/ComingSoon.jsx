import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function ComingSoon() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Get translated page name based on path
  const getPageName = () => {
    const paths = {
      '/workflow': t('navigation.workflow'),
      '/reporting': t('navigation.reporting'),
      '/suivi': t('navigation.tracking'),
      '/produits': t('navigation.products'),
      '/documents': t('navigation.documents'),
      '/aide': t('navigation.help'),
    };
    return paths[location.pathname] || t('comingSoon.title');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div 
        className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 gradient-primary shadow-lg"
      >
        <Construction size={48} className="text-white" />
      </div>
      
      <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        <span className="gradient-text">{getPageName()}</span> - {t('comingSoon.title')}
      </h1>
      
      <p 
        className="text-lg max-w-md mb-8"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {t('comingSoon.message')}
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-opacity shadow-md"
        >
          <ArrowLeft size={18} />
          {t('comingSoon.backToDashboard')}
        </button>
        
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium border hover:bg-[var(--color-bg-secondary)] transition-colors"
          style={{ 
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)'
          }}
        >
          {t('common.previous')}
        </button>
      </div>

      {/* Decorative Elements */}
      <div className="mt-16 grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-16 h-16 rounded-2xl animate-pulse"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              animationDelay: `${i * 200}ms`
            }}
          />
        ))}
      </div>
    </div>
  );
}
