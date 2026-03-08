import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Package, 
  Cylinder,
  Clock,
  ArrowRight,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  Award,
  Medal,
  Ban,
  ArrowDownCircle,
  Wrench,
  Link2,
  Loader2,
  Calendar,
  AlertCircle,
  Eye,
  Flame,
  Droplet,
  Radio,
  Ruler,
  Scissors,
  Search,
  ShieldCheck,
  ScanLine,
  Microscope,
  BarChart3,
  PieChart,
  Disc,
  Users,
  Target,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  Factory,
  Gauge,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

// Status configuration with colors and icons
const STATUS_CONFIG = {
  'En attente': { icon: Clock, color: '#f59e0b', bgLight: 'rgba(245, 158, 11, 0.1)', priority: 1 },
  'En cours': { icon: RefreshCw, color: '#3b82f6', bgLight: 'rgba(59, 130, 246, 0.1)', priority: 2 },
  'Terminé': { icon: CheckCircle, color: '#22c55e', bgLight: 'rgba(34, 197, 94, 0.1)', priority: 3 },
  'Annulé': { icon: XCircle, color: '#ef4444', bgLight: 'rgba(239, 68, 68, 0.1)', priority: 8 },
  'Interrompu': { icon: XCircle, color: '#dc2626', bgLight: 'rgba(220, 38, 38, 0.1)', priority: 7 },
  'Certifié Hydraulique': { icon: Award, color: '#06b6d4', bgLight: 'rgba(6, 182, 212, 0.1)', priority: 4 },
  'Certifié API 5L': { icon: Medal, color: '#a855f7', bgLight: 'rgba(168, 85, 247, 0.1)', priority: 5 },
  'Rebuté': { icon: Ban, color: '#9f1239', bgLight: 'rgba(159, 18, 57, 0.1)', priority: 9 },
  'Déclassé': { icon: ArrowDownCircle, color: '#b45309', bgLight: 'rgba(180, 83, 9, 0.1)', priority: 10 },
  'En réparation': { icon: Wrench, color: '#0284c7', bgLight: 'rgba(2, 132, 199, 0.1)', priority: 6 },
};

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { key: 'formage', label: 'Formage', icon: Cylinder },
  { key: 'pointage', label: 'Pointage', icon: Flame },
  { key: 'cv_pointage', label: 'CV Pointage', icon: Eye },
  { key: 'saw', label: 'SAW', icon: Zap },
  { key: 'cv_cordon', label: 'CV Cordon', icon: Search },
  { key: 'macro', label: 'Macro', icon: Microscope },
  { key: 'chanfrein', label: 'Chanfrein', icon: Scissors },
  { key: 'hydrotest', label: 'Hydrotest', icon: Droplet },
  { key: 'cv_fuite', label: 'CV Fuite', icon: ShieldCheck },
  { key: 'ut', label: 'UT', icon: Radio },
  { key: 'radio', label: 'Radio', icon: ScanLine },
  { key: 'controle_dim', label: 'Ctrl Dim', icon: Ruler },
];

// Tube Hero Stat Component - Compact for mobile
function TubeHeroStat({ icon: Icon, label, value, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-2.5 sm:p-3 rounded-xl transition-all hover:scale-105 hover:shadow-md"
      style={{ backgroundColor: `${color}12` }}
    >
      <div 
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-1.5"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={18} className="sm:hidden" style={{ color }} />
        <Icon size={20} className="hidden sm:block" style={{ color }} />
      </div>
      <span className="text-xl sm:text-2xl font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </span>
      <span className="text-[10px] sm:text-xs font-medium" style={{ color }}>{label}</span>
    </button>
  );
}

// Status Card Component - Compact for mobile
function StatusCard({ status, count, crossWelding, onClick, large = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['En attente'];
  const Icon = config.icon;
  
  if (large) {
    return (
      <button
        onClick={onClick}
        className="relative flex flex-col p-2.5 sm:p-3 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-[1.02] w-full text-center group"
        style={{
          backgroundColor: config.bgLight,
          borderColor: config.color + '40',
        }}
      >
        <div 
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mx-auto mb-1.5"
          style={{ backgroundColor: config.color + '20' }}
        >
          <Icon size={18} style={{ color: config.color }} className="sm:hidden" />
          <Icon size={20} style={{ color: config.color }} className="hidden sm:block" />
        </div>
        <p className="text-xl sm:text-2xl font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
          {count}
        </p>
        <p className="text-[10px] sm:text-xs font-semibold mt-0.5 truncate max-w-full px-1" style={{ color: config.color }}>
          {status}
        </p>
        {crossWelding > 0 && (
          <div 
            className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)' }}
          >
            <Link2 size={10} className="text-pink-500" />
            <span className="text-pink-600 dark:text-pink-400 font-medium">{crossWelding}</span>
          </div>
        )}
      </button>
    );
  }
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg border transition-all duration-200 hover:shadow-sm hover:scale-[1.01] w-full text-left"
      style={{
        backgroundColor: config.bgLight,
        borderColor: config.color + '30',
      }}
    >
      <div 
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: config.color + '20' }}
      >
        <Icon size={16} style={{ color: config.color }} className="sm:hidden" />
        <Icon size={18} style={{ color: config.color }} className="hidden sm:block" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs font-medium truncate" style={{ color: config.color }}>
          {status}
        </p>
        <p className="text-base sm:text-lg font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
          {count}
        </p>
      </div>
      {crossWelding > 0 && (
        <div 
          className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)' }}
        >
          <Link2 size={10} className="text-pink-500" />
          <span className="text-pink-600 dark:text-pink-400 font-medium">{crossWelding}</span>
        </div>
      )}
    </button>
  );
}

// Compact Stat Card for secondary items
function CompactStatCard({ icon: Icon, title, value, subtitle, gradient, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border transition-all duration-200 hover:shadow-sm hover:scale-[1.01] w-full text-left"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${gradient}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{title}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
          {subtitle && (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>
          )}
        </div>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
    </button>
  );
}

// Pipeline Progress Card - Compact
function PipelineProgress({ pipeline, total }) {
  const { t } = useTranslation();
  return (
    <div 
      className="p-4 sm:p-5 rounded-xl border"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('dashboard.pipelineProgress')}
        </h3>
        <span className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          {total} {t('dashboard.tubes').toLowerCase()}
        </span>
      </div>
      <div className="space-y-2 sm:space-y-2.5">
        {PIPELINE_STAGES.map((stage) => {
          const count = parseInt(pipeline[stage.key] || 0);
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          const Icon = stage.icon;
          
          return (
            <div key={stage.key} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-[var(--color-bg-secondary)] flex-shrink-0">
                <Icon size={12} style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] sm:text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {stage.label}
                  </span>
                  <span className="text-[10px] font-medium ml-1" style={{ color: 'var(--color-text-muted)' }}>
                    {count} ({percentage}%)
                  </span>
                </div>
                <div 
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${percentage}%`,
                      background: percentage === 100 
                        ? 'linear-gradient(90deg, #22c55e, #10b981)' 
                        : 'linear-gradient(90deg, #3b82f6, #6366f1)'
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Activity Item Component - Compact
function ActivityItem({ title, time, type, user }) {
  const { t } = useTranslation();
  const typeConfig = {
    success: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    warning: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    info: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    error: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  };
  const config = typeConfig[type] || typeConfig.info;
  
  // Format time to relative
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    return t('time.daysAgo', { count: diffDays });
  };

  return (
    <div className="flex items-start gap-2 py-2">
      <div 
        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
        style={{ backgroundColor: config.color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {formatTime(time)}
          </span>
          {user && (
            <>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>•</span>
              <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {user}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Quick Action Button - Compact
function QuickAction({ icon: Icon, label, gradient, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-lg border transition-all duration-200 hover:shadow-sm hover:scale-105 group"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center ${gradient} transition-transform group-hover:scale-110`}>
        <Icon size={16} className="text-white sm:hidden" />
        <Icon size={18} className="text-white hidden sm:block" />
      </div>
      <span className="text-[10px] sm:text-xs font-medium text-center leading-tight" style={{ color: 'var(--color-text-primary)' }}>
        {label}
      </span>
    </button>
  );
}

// Weekly Chart Component - Compact
function WeeklyChart({ data, title }) {
  const { i18n } = useTranslation();
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  // Localized day names
  const getDayName = (date) => {
    const locale = i18n.language === 'ar' ? 'ar-SA' : 
                   i18n.language === 'it' ? 'it-IT' : 
                   i18n.language === 'en' ? 'en-US' : 'fr-FR';
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  };
  
  // Fill missing days with 0
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const found = data.find(d => d.date === dateStr);
    last7Days.push({
      date: dateStr,
      day: getDayName(date),
      count: found?.count || 0
    });
  }
  
  return (
    <div 
      className="p-4 sm:p-5 rounded-xl border"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        <BarChart3 size={16} style={{ color: 'var(--color-text-muted)' }} />
      </div>
      <div className="flex items-end justify-between gap-1.5 h-24 sm:h-28">
        {last7Days.map((item, index) => {
          const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          const isToday = index === last7Days.length - 1;
          
          return (
            <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {item.count}
              </span>
              <div 
                className="w-full rounded-t transition-all duration-500 ease-out"
                style={{ 
                  height: `${Math.max(height, 4)}%`,
                  background: isToday 
                    ? 'linear-gradient(180deg, #6366f1, #8b5cf6)' 
                    : 'linear-gradient(180deg, #3b82f6, #60a5fa)',
                  minHeight: '3px'
                }}
              />
              <span 
                className={`text-[10px] font-medium ${isToday ? 'text-violet-600 dark:text-violet-400' : ''}`}
                style={{ color: isToday ? undefined : 'var(--color-text-muted)' }}
              >
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      loadStats();
    };

    socket.on('tube:created', handleUpdate);
    socket.on('tube:updated', handleUpdate);
    socket.on('lot:created', handleUpdate);
    socket.on('lot:updated', handleUpdate);

    return () => {
      socket.off('tube:created', handleUpdate);
      socket.off('tube:updated', handleUpdate);
      socket.off('lot:created', handleUpdate);
      socket.off('lot:updated', handleUpdate);
    };
  }, [socket, loadStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  // Calculate totals from status breakdown
  const getTotalByStatuses = (statuses) => {
    if (!stats?.tubes?.byStatus) return 0;
    return statuses.reduce((sum, status) => {
      return sum + (stats.tubes.byStatus[status]?.count || 0);
    }, 0);
  };

  const inProduction = getTotalByStatuses(['En cours', 'En attente']);
  const completed = getTotalByStatuses(['Terminé', 'Certifié Hydraulique', 'Certifié API 5L']);
  const issues = getTotalByStatuses(['Rebuté', 'Déclassé', 'En réparation', 'Interrompu', 'Annulé']);

  // Get primary statuses (most important for production)
  const primaryStatuses = ['En attente', 'En cours', 'Terminé', 'Certifié Hydraulique', 'Certifié API 5L'];
  const secondaryStatuses = ['En réparation', 'Rebuté', 'Déclassé', 'Interrompu', 'Annulé'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  // Get localized date string
  const getLocalizedDate = () => {
    const locale = i18n.language === 'ar' ? 'ar-SA' : 
                   i18n.language === 'it' ? 'it-IT' : 
                   i18n.language === 'en' ? 'en-US' : 'fr-FR';
    return new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Factory size={22} className="text-blue-500 sm:hidden" />
            <Factory size={26} className="text-blue-500 hidden sm:block" />
            {t('dashboard.title')}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('dashboard.subtitle')} • {getLocalizedDate()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/tubes?action=new')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium text-xs sm:text-sm transition-all hover:shadow-md hover:scale-[1.02]"
          >
            <Cylinder size={16} />
            <span>{t('dashboard.newTube')}</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all hover:shadow-sm disabled:opacity-50"
            style={{ 
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
            }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* ========== TUBES HERO SECTION ========== */}
      <div 
        className="relative overflow-hidden p-4 sm:p-5 rounded-2xl border"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(99, 102, 241, 0.06) 50%, rgba(139, 92, 246, 0.06) 100%)',
          borderColor: 'rgba(99, 102, 241, 0.15)',
        }}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 sm:w-48 sm:h-48 opacity-[0.06]">
          <Cylinder size={192} style={{ color: 'var(--color-accent)' }} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Cylinder size={18} className="text-white sm:hidden" />
              <Cylinder size={20} className="text-white hidden sm:block" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {t('dashboard.tubesProduction')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {t('dashboard.tubesOverview')}
              </p>
            </div>
            <button 
              onClick={() => navigate('/tubes')}
              className="ml-auto flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-md hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('dashboard.viewAll')}
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Main Tube Stats */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-3">
            <TubeHeroStat 
              icon={Gauge} 
              label={t('common.total')} 
              value={stats?.tubes?.total || 0} 
              color="#6366f1"
              onClick={() => navigate('/tubes')}
            />
            <TubeHeroStat 
              icon={Play} 
              label={t('dashboard.inProgress')} 
              value={inProduction} 
              color="#3b82f6"
              onClick={() => navigate('/tubes?status=En%20cours')}
            />
            <TubeHeroStat 
              icon={CheckCircle} 
              label={t('dashboard.completed')} 
              value={completed} 
              color="#22c55e"
              onClick={() => navigate('/tubes?status=Terminé')}
            />
            <TubeHeroStat 
              icon={AlertCircle} 
              label={t('dashboard.issues')} 
              value={issues} 
              color="#ef4444"
              onClick={() => navigate('/tubes?status=Rebuté')}
            />
          </div>

          {/* Today's production badge */}
          {stats?.tubes?.today > 0 && (
            <div className="flex items-center gap-2 justify-center">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30">
                <TrendingUp size={14} className="text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                  +{stats.tubes.today} {t('dashboard.tubesAddedToday')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== PRIMARY STATUS CARDS (Production Flow) ========== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Activity size={16} style={{ color: 'var(--color-accent)' }} />
            <h2 className="text-sm sm:text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('dashboard.productionStatus')}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-2.5">
          {primaryStatuses.map((status) => {
            const statusData = stats?.tubes?.byStatus?.[status];
            return (
              <StatusCard
                key={status}
                status={status}
                count={statusData?.count || 0}
                crossWelding={statusData?.crossWelding || 0}
                onClick={() => navigate(`/tubes?status=${encodeURIComponent(status)}`)}
                large
              />
            );
          })}
        </div>
      </div>

      {/* ========== SECONDARY STATUS CARDS (Issues) ========== */}
      <div 
        className="p-3 sm:p-4 rounded-xl border"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.02)',
          borderColor: 'rgba(239, 68, 68, 0.12)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="text-red-500" />
            <h3 className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('dashboard.issuesAndRework')}
            </h3>
          </div>
          <span 
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ 
              backgroundColor: issues > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              color: issues > 0 ? '#ef4444' : '#22c55e'
            }}
          >
            {issues} {t('common.total').toLowerCase()}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {secondaryStatuses.map((status) => {
            const statusData = stats?.tubes?.byStatus?.[status];
            return (
              <StatusCard
                key={status}
                status={status}
                count={statusData?.count || 0}
                crossWelding={statusData?.crossWelding || 0}
                onClick={() => navigate(`/tubes?status=${encodeURIComponent(status)}`)}
              />
            );
          })}
        </div>
      </div>

      {/* ========== PIPELINE PROGRESS + CHART ========== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <PipelineProgress 
            pipeline={stats?.pipeline || {}} 
            total={stats?.tubes?.total || 0} 
          />
        </div>
        <WeeklyChart data={stats?.weeklyProduction || []} title={t('dashboard.weeklyProduction')} />
      </div>

      {/* ========== LOTS & BOBINES SECTION (Secondary) ========== */}
      <div 
        className="p-4 sm:p-4 rounded-xl border"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Layers size={16} style={{ color: 'var(--color-text-muted)' }} />
            <h2 className="text-sm sm:text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('dashboard.materialsAndInventory')}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CompactStatCard
            icon={Package}
            title={t('dashboard.lots')}
            value={stats?.lots?.total || 0}
            subtitle={stats?.lots?.today > 0 ? `+${stats.lots.today} ${t('common.today').toLowerCase()}` : undefined}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            onClick={() => navigate('/lots')}
          />
          <CompactStatCard
            icon={Disc}
            title={t('dashboard.bobines')}
            value={stats?.bobines?.active || 0}
            subtitle={`/${stats?.bobines?.total || 0} ${t('common.total').toLowerCase()}`}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            onClick={() => navigate('/bobines')}
          />
        </div>
      </div>

      {/* ========== ACTIVITY + QUICK ACTIONS ========== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div 
          className="xl:col-span-2 p-4 rounded-xl border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Activity size={16} style={{ color: 'var(--color-accent)' }} />
              <h2 className="text-sm sm:text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('dashboard.recentActivity')}
              </h2>
            </div>
          </div>
          {stats?.recentActivity?.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {stats.recentActivity.map((activity) => (
                <ActivityItem key={activity.id} {...activity} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <AlertCircle size={24} style={{ color: 'var(--color-text-muted)' }} />
              <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {t('common.noData')}
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div 
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Zap size={16} style={{ color: 'var(--color-accent)' }} />
            <h2 className="text-sm sm:text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('dashboard.quickActions')}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction
              icon={Cylinder}
              label={t('dashboard.newTube')}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              onClick={() => navigate('/tubes?action=new')}
            />
            <QuickAction
              icon={Package}
              label={t('dashboard.newLot')}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
              onClick={() => navigate('/lots?action=new')}
            />
            <QuickAction
              icon={Disc}
              label={t('dashboard.newBobine')}
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
              onClick={() => navigate('/bobines?action=new')}
            />
            <QuickAction
              icon={Search}
              label={t('navigation.tubes')}
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
              onClick={() => navigate('/tubes')}
            />
            <QuickAction
              icon={Users}
              label={t('navigation.users')}
              gradient="bg-gradient-to-br from-pink-500 to-rose-600"
              onClick={() => navigate('/users')}
            />
            <QuickAction
              icon={Target}
              label={t('navigation.settings')}
              gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
              onClick={() => navigate('/parametres')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
