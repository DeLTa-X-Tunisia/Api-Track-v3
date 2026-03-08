import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ClipboardList, 
  Package, 
  Wrench, 
  Check, 
  Clock, 
  User,
  Calendar,
  ChevronRight,
  AlertCircle,
  Loader2,
  CircleDot
} from 'lucide-react';
import { lotsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

// Stage configuration - labels will come from translations
const getStageConfig = (t) => [
  {
    key: 'demandee',
    label: t('lotPipeline.demandee'),
    description: t('lotPipeline.demandeeDesc'),
    icon: ClipboardList,
  },
  {
    key: 'recue',
    label: t('lotPipeline.recue'),
    description: t('lotPipeline.recueDesc'),
    icon: Package,
  },
  {
    key: 'installee',
    label: t('lotPipeline.installee'),
    description: t('lotPipeline.installeeDesc'),
    icon: Wrench,
  },
];

// Color scheme for stages
const stageColors = {
  waiting: { bg: '#9ca3af', bgLight: '#f3f4f6', text: '#6b7280' },
  active: { bg: '#f59e0b', bgLight: '#fef3c7', text: '#d97706' },
  validated: { bg: '#22c55e', bgLight: '#dcfce7', text: '#16a34a' },
};

export default function LotPipeline({ lot, onUpdate }) {
  const [loading, setLoading] = useState(null);
  const { currentUser } = useAuth();
  const { toast, confirm } = useModal();
  const { t, i18n } = useTranslation();
  
  const pipelineStages = getStageConfig(t);

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const locale = i18n.language === 'ar' ? 'ar-SA' : i18n.language === 'it' ? 'it-IT' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
    return {
      date: date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' }) + ` ${t('time.at')} ` + date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getStageStatus = (stageKey) => {
    const isValidated = lot[`${stageKey}_validee`];
    const validatorName = lot[`${stageKey}_validator_name`];
    const validatedAt = lot[`${stageKey}_validated_at`];
    
    const stageIndex = pipelineStages.findIndex(s => s.key === stageKey);
    let canValidate = !isValidated;
    
    if (stageIndex > 0) {
      const prevStageKey = pipelineStages[stageIndex - 1].key;
      canValidate = canValidate && lot[`${prevStageKey}_validee`];
    }
    
    let canCancel = isValidated;
    if (stageIndex < pipelineStages.length - 1) {
      const nextStageKey = pipelineStages[stageIndex + 1].key;
      canCancel = canCancel && !lot[`${nextStageKey}_validee`];
    }
    
    // Determine visual state
    let state = 'waiting';
    if (isValidated) {
      state = 'validated';
    } else if (canValidate) {
      state = 'active';
    }
    
    return {
      isValidated,
      validatorName,
      validatedAt: formatDateTime(validatedAt),
      canValidate,
      canCancel,
      state,
      colors: stageColors[state],
    };
  };

  const handleValidate = async (stageKey, stageLabel) => {
    const confirmed = await confirm({
      title: t('lotPipeline.validateStage'),
      message: `${t('lotPipeline.validateStageConfirm')} "${stageLabel}" ?`,
      confirmText: t('common.validate'),
      confirmStyle: 'primary',
    });
    
    if (!confirmed) return;
    
    setLoading(stageKey);
    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : t('users.name');
      
      const result = await lotsAPI.validateStage(lot.id, stageKey, {
        validator_id: currentUser?.id,
        validator_name: validatorName || t('users.name'),
      });
      toast.success(t('lotPipeline.stageValidatedSuccess'));
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || t('lotPipeline.validationError'));
    } finally {
      setLoading(null);
    }
  };

  const handleCancelValidation = async (stageKey, stageLabel) => {
    const confirmed = await confirm({
      title: t('lotPipeline.cancelValidation'),
      message: `${t('lotPipeline.cancelValidationConfirm')} "${stageLabel}" ?`,
      confirmText: t('validation.cancelValidation'),
      confirmStyle: 'danger',
    });
    
    if (!confirmed) return;
    
    setLoading(stageKey);
    try {
      const result = await lotsAPI.cancelValidation(lot.id, stageKey);
      toast.success(t('lotPipeline.validationCancelledSuccess'));
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || t('lotPipeline.cancelError'));
    } finally {
      setLoading(null);
    }
  };

  const validatedCount = pipelineStages.filter(s => lot[`${s.key}_validee`]).length;
  const progressPercent = (validatedCount / pipelineStages.length) * 100;

  return (
    <div 
      className="rounded-xl border overflow-hidden"
      style={{ 
        backgroundColor: 'var(--color-bg-secondary)', 
        borderColor: 'var(--color-border)' 
      }}
    >
      {/* Header */}
      <div 
        className="px-5 py-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('lotPipeline.title')}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {t('lotPipeline.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              {validatedCount}/{pipelineStages.length}
            </span>
            <div 
              className="w-20 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--color-border)' }}
            >
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${progressPercent}%`,
                  backgroundColor: validatedCount === pipelineStages.length ? '#22c55e' : '#f59e0b'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Timeline - Desktop */}
      <div className="p-5">
        <div className="hidden md:block">
          <div className="relative">
            {/* Background Connection Line */}
            <div 
              className="absolute top-10 left-[16.5%] right-[16.5%] h-1 rounded-full"
              style={{ backgroundColor: 'var(--color-border)' }}
            />
            {/* Progress Line */}
            <div 
              className="absolute top-10 left-[16.5%] h-1 rounded-full transition-all duration-700 ease-out"
              style={{ 
                width: `${Math.max(0, (progressPercent / 100) * 67)}%`,
                backgroundColor: '#22c55e'
              }}
            />
            
            {/* Stages */}
            <div className="relative flex justify-between">
              {pipelineStages.map((stage, index) => {
                const status = getStageStatus(stage.key);
                const Icon = stage.icon;
                const isLoading = loading === stage.key;
                
                return (
                  <div key={stage.key} className="flex flex-col items-center" style={{ width: '33%' }}>
                    {/* Stage Circle */}
                    <button
                      disabled={!status.canValidate || isLoading}
                      onClick={() => status.canValidate && handleValidate(stage.key, stage.label)}
                      className={`
                        relative z-10 w-20 h-20 rounded-full flex items-center justify-center
                        transition-all duration-300 border-4
                        ${status.canValidate && !isLoading ? 'cursor-pointer hover:scale-110 shadow-lg' : ''}
                        ${status.state === 'active' ? 'animate-pulse' : ''}
                      `}
                      style={{ 
                        backgroundColor: status.state === 'validated' ? status.colors.bg : 'var(--color-bg-primary)',
                        borderColor: status.colors.bg,
                        boxShadow: status.state === 'active' ? `0 0 20px ${status.colors.bg}40` : undefined,
                      }}
                    >
                      {isLoading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                      ) : status.isValidated ? (
                        <Check className="w-9 h-9 text-white" strokeWidth={3} />
                      ) : (
                        <Icon 
                          className="w-8 h-8 transition-colors"
                          style={{ color: status.colors.bg }}
                        />
                      )}
                    </button>
                    
                    {/* Stage Label */}
                    <h4 
                      className="mt-3 text-sm font-semibold text-center"
                      style={{ color: status.state === 'waiting' ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
                    >
                      {stage.label}
                    </h4>
                    
                    {/* Status Indicator */}
                    <div className="mt-2 min-h-[60px] text-center">
                      {status.isValidated && status.validatedAt ? (
                        <div className="space-y-1">
                          <div 
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: status.colors.bgLight, color: status.colors.text }}
                          >
                            <Check size={12} />
                            {t('lotPipeline.validated')}
                          </div>
                          <div className="flex flex-col items-center gap-0.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            <span className="flex items-center gap-1">
                              <User size={10} />
                              {status.validatorName || 'Système'}
                            </span>
                            <span>{status.validatedAt.date}</span>
                            <span>{status.validatedAt.time}</span>
                          </div>
                          {status.canCancel && (
                            <button
                              onClick={() => handleCancelValidation(stage.key, stage.label)}
                              disabled={isLoading}
                              className="mt-1 text-[11px] text-red-500 hover:text-red-600 underline transition-colors"
                            >
                              {t('common.cancel')}
                            </button>
                          )}
                        </div>
                      ) : status.canValidate ? (
                        <div 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium animate-pulse"
                          style={{ backgroundColor: status.colors.bgLight, color: status.colors.text }}
                        >
                          <CircleDot size={12} />
                          {t('lotPipeline.clickToValidate')}
                        </div>
                      ) : (
                        <div 
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
                        >
                          <Clock size={12} />
                          {t('lotPipeline.waiting')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {pipelineStages.map((stage, index) => {
            const status = getStageStatus(stage.key);
            const Icon = stage.icon;
            const isLoading = loading === stage.key;
            const isLast = index === pipelineStages.length - 1;
            
            return (
              <div key={stage.key} className="relative">
                {/* Connection Line */}
                {!isLast && (
                  <div 
                    className="absolute left-6 top-14 w-0.5 h-6 rounded-full transition-colors duration-500"
                    style={{ 
                      backgroundColor: status.isValidated ? '#22c55e' : 'var(--color-border)'
                    }}
                  />
                )}
                
                <div 
                  className={`
                    relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-300
                    ${status.canValidate && !isLoading ? 'cursor-pointer hover:shadow-md' : ''}
                  `}
                  style={{ 
                    backgroundColor: status.state === 'validated' 
                      ? status.colors.bgLight 
                      : 'var(--color-bg-primary)',
                    borderColor: status.state === 'waiting' 
                      ? 'var(--color-border)' 
                      : status.colors.bg,
                    borderWidth: status.state === 'active' ? '2px' : '1px',
                  }}
                  onClick={() => status.canValidate && !isLoading && handleValidate(stage.key, stage.label)}
                >
                  {/* Icon */}
                  <div 
                    className={`
                      flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                      transition-all duration-300
                      ${status.state === 'active' ? 'animate-pulse' : ''}
                    `}
                    style={{ 
                      backgroundColor: status.state === 'validated' ? status.colors.bg : status.colors.bgLight,
                    }}
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: status.colors.bg }} />
                    ) : status.isValidated ? (
                      <Check className="w-6 h-6 text-white" strokeWidth={3} />
                    ) : (
                      <Icon className="w-6 h-6" style={{ color: status.colors.bg }} />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 
                          className="font-semibold"
                          style={{ color: status.state === 'waiting' ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
                        >
                          {stage.label}
                        </h4>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {stage.description}
                        </p>
                      </div>
                      
                      {/* Status Badge */}
                      {status.isValidated ? (
                        <div 
                          className="flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: status.colors.bg, color: 'white' }}
                        >
                          {t('lotPipeline.validated')}
                        </div>
                      ) : status.canValidate ? (
                        <div 
                          className="flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium animate-pulse"
                          style={{ backgroundColor: status.colors.bgLight, color: status.colors.text }}
                        >
                          {t('lotPipeline.inProgress')}
                        </div>
                      ) : (
                        <div 
                          className="flex-shrink-0 px-2 py-1 rounded-full text-xs"
                          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
                        >
                          {t('lotPipeline.waiting')}
                        </div>
                      )}
                    </div>
                    
                    {/* Validation Info */}
                    {status.isValidated && status.validatedAt && (
                      <div 
                        className="mt-3 pt-3 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                      >
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {status.validatorName || t('settings.systemMode')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {status.validatedAt.full}
                        </span>
                        {status.canCancel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelValidation(stage.key, stage.label);
                            }}
                            disabled={isLoading}
                            className="text-red-500 hover:text-red-600 underline ml-auto"
                          >
                            {t('common.cancel')}
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Action hint for active stage */}
                    {status.canValidate && !status.isValidated && (
                      <div 
                        className="mt-2 flex items-center gap-1 text-xs font-medium"
                        style={{ color: status.colors.text }}
                      >
                        <ChevronRight size={14} />
                        Appuyez pour valider cette étape
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion Banner */}
      {validatedCount === pipelineStages.length && (
        <div 
          className="px-5 py-4 border-t flex items-center gap-3"
          style={{ 
            backgroundColor: stageColors.validated.bgLight,
            borderColor: stageColors.validated.bg
          }}
        >
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: stageColors.validated.bg }}
          >
            <Check className="w-6 h-6 text-white" strokeWidth={3} />
          </div>
          <div>
            <h4 className="font-semibold" style={{ color: stageColors.validated.text }}>
              {t('lotPipeline.pipelineComplete')}
            </h4>
            <p className="text-sm" style={{ color: stageColors.validated.text, opacity: 0.8 }}>
              {t('lotPipeline.allStagesValidated')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
