import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Layers, Package, Calendar, User, FileText, Clock, Edit2, Hash, Cylinder, ArrowRight } from 'lucide-react';
import LotPipeline from '../components/LotPipeline';
import { useModal } from '../context/ModalContext';

export default function LotDetail({ lot: initialLot, onClose, onEdit, onUpdate }) {
  const [lot, setLot] = useState(initialLot);
  const navigate = useNavigate();
  const { toast } = useModal();
  const { t, i18n } = useTranslation();
  
  if (!lot) return null;

  const handlePipelineUpdate = (updatedLot) => {
    setLot(updatedLot);
    if (onUpdate) onUpdate(updatedLot);
    
    // Check if installee stage was just validated (status changed to Production)
    if (updatedLot.installee_validee && updatedLot.statut === 'Production') {
      // Show success message and redirect to Tubes module
      toast.success(t('lotDetail.bobineInstalledRedirect'));
      setTimeout(() => {
        onClose();
        navigate('/tubes');
      }, 1500);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const locale = i18n.language === 'ar' ? 'ar-SA' : i18n.language === 'it' ? 'it-IT' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
    return new Date(dateString).toLocaleString(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Status badge styling - use translation keys for status mapping
  const getStatutStyle = (statut) => {
    const styles = {
      'En attente': { bg: '#6366f120', color: '#6366f1' },
      'En cours': { bg: '#f59e0b20', color: '#f59e0b' },
      'Production': { bg: '#06b6d420', color: '#06b6d4' },
      'Terminé': { bg: '#22c55e20', color: '#22c55e' },
      'Annulé': { bg: '#ef444420', color: '#ef4444' },
    };
    return styles[statut] || styles['En attente'];
  };
  
  // Translate status for display
  const getStatutLabel = (statut) => {
    const statusMap = {
      'En attente': t('statuses.pending'),
      'En cours': t('statuses.inProgress'),
      'Production': t('statuses.production'),
      'Terminé': t('statuses.completed'),
      'Annulé': t('statuses.cancelled'),
    };
    return statusMap[statut] || statut;
  };

  const statutStyle = getStatutStyle(lot.statut);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Compact Header - Just close button */}
        <div 
          className="px-5 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-accent)', opacity: 0.9 }}
            >
              <Layers size={18} className="text-white" />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {t('lotDetail.title')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-secondary)]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Main Info Card - Lot Number + Bobine + Status */}
          <div 
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
          >
            {/* Top Row - Lot Number + Status + Bobine */}
            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                {/* Lot Number */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    <Hash size={26} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                      {t('lotDetail.lotNumber')}
                    </p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {lot.numero}
                    </p>
                  </div>
                  <span 
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ml-2"
                    style={{ backgroundColor: statutStyle.bg, color: statutStyle.color }}
                  >
                    {getStatutLabel(lot.statut)}
                  </span>
                </div>

                {/* Separator on desktop */}
                <div 
                  className="hidden sm:block w-px self-stretch"
                  style={{ backgroundColor: 'var(--color-border)' }}
                />

                {/* Bobine Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div 
                    className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                  >
                    <Package size={20} style={{ color: '#6366f1' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                      {t('lotDetail.associatedBobine')}
                    </p>
                    {lot.bobine_numero ? (
                      <>
                        <p className="text-lg font-bold truncate mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                          {lot.bobine_numero}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {lot.bobine_epaisseur && <span>{t('lotDetail.thickness')} <strong>{lot.bobine_epaisseur} mm</strong></span>}
                          {lot.bobine_largeur && <span>{t('lotDetail.width')} <strong>{lot.bobine_largeur} mm</strong></span>}
                          {lot.grade_nom && <span>{lot.grade_nom}</span>}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm italic mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {t('lotDetail.noBobine')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ backgroundColor: 'var(--color-border)', height: '1px' }} />

            {/* Bottom Row - Dates + Creator */}
            <div className="px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Date de démarrage */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                  >
                    <Calendar size={16} style={{ color: '#22c55e' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                      {t('lotDetail.startDate')}
                    </p>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {formatDateTime(lot.date_demarrage)}
                    </p>
                  </div>
                </div>

                {/* Créé le */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                  >
                    <Clock size={16} style={{ color: '#f59e0b' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                      {t('lotDetail.createdAt')}
                    </p>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {formatDateTime(lot.created_at)}
                    </p>
                  </div>
                </div>

                {/* Créé par */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
                  >
                    <User size={16} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                      {t('lotDetail.createdBy')}
                    </p>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {lot.created_by_name || t('common.noData')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline */}
          <LotPipeline lot={lot} onUpdate={handlePipelineUpdate} />

          {/* Notes */}
          {lot.notes && (
            <div 
              className="p-5 rounded-xl border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <FileText size={18} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                  {t('lots.notes')}
                </span>
              </div>
              <p style={{ color: 'var(--color-text-primary)' }}>
                {lot.notes}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div 
          className="p-4 border-t flex gap-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border font-medium hover:bg-[var(--color-bg-secondary)] transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            {t('common.close')}
          </button>
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-3 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Edit2 size={18} />
            {t('common.edit')}
          </button>
        </div>
      </div>
    </div>
  );
}
