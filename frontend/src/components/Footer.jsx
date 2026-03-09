import { useTranslation } from 'react-i18next';

// Tunisian Flag SVG Component - Larger and more visible
const TunisianFlag = ({ size = 32 }) => (
  <svg 
    width={size} 
    height={size * 0.67} 
    viewBox="0 0 360 240" 
    className="inline-block rounded shadow-sm"
    style={{ verticalAlign: 'middle' }}
    aria-label="Tunisia Flag"
  >
    {/* Red background */}
    <rect width="360" height="240" fill="#E70013"/>
    {/* White circle */}
    <circle cx="180" cy="120" r="60" fill="#FFFFFF"/>
    {/* Red crescent - opens to the right */}
    <circle cx="174" cy="120" r="45" fill="#E70013"/>
    <circle cx="185" cy="120" r="36" fill="#FFFFFF"/>
    {/* Red star */}
    <polygon 
      points="180,85 186.9,106.9 210,106.9 191.5,120.6 198.5,142.5 180,128.8 161.5,142.5 168.5,120.6 150,106.9 173.1,106.9" 
      fill="#E70013"
    />
  </svg>
);

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
        {/* Copyright with personal touch */}
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <span>© {currentYear} Api-Track.</span>
          <span className="text-xl" role="img" aria-label="rock on">🤟</span>
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Azizi Mounir
          </span>
          <span className="mx-1">→</span>
          <TunisianFlag size={28} />
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
          v3.0.0
        </div>
      </div>
    </footer>
  );
}
