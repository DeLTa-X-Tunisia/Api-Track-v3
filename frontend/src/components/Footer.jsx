import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  return (
    <footer 
      className="py-4 px-6 border-t"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Copyright */}
        <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <span>© {currentYear} Api-Track. {t('footer.madeWith')}</span>
          <Heart size={14} className="text-red-500 fill-red-500" />
          <span>{t('footer.inFrance')}</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          <a 
            href="#" 
            className="text-sm hover:underline transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('footer.privacyPolicy')}
          </a>
          <a 
            href="#" 
            className="text-sm hover:underline transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('footer.termsOfUse')}
          </a>
        </div>

        {/* Version */}
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          v1.0.0
        </div>
      </div>
    </footer>
  );
}
