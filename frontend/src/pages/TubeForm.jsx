import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Save, 
  Loader2, 
  Cylinder, 
  Ruler, 
  Hash,
  AlertCircle,
  Layers,
  CircleDot,
  Sparkles,
  CheckCircle2,
  Package,
  Gauge,
  Link2,
  Info,
  AlertTriangle
} from 'lucide-react';
import { tubesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

// Diameter options (8" to 72")
const DIAMETER_OPTIONS = [
  { pouce: 8, mm: 203.2 }, { pouce: 10, mm: 254 }, { pouce: 12, mm: 304.8 },
  { pouce: 14, mm: 355.6 }, { pouce: 16, mm: 406.4 }, { pouce: 18, mm: 457.2 },
  { pouce: 20, mm: 508 }, { pouce: 22, mm: 558.8 }, { pouce: 24, mm: 609.6 },
  { pouce: 26, mm: 660.4 }, { pouce: 28, mm: 711.2 }, { pouce: 30, mm: 762 },
  { pouce: 32, mm: 812.8 }, { pouce: 34, mm: 863.6 }, { pouce: 36, mm: 914.4 },
  { pouce: 38, mm: 965.2 }, { pouce: 40, mm: 1016 }, { pouce: 42, mm: 1066.8 },
  { pouce: 44, mm: 1117.6 }, { pouce: 46, mm: 1168.4 }, { pouce: 48, mm: 1219.2 },
  { pouce: 50, mm: 1270 }, { pouce: 52, mm: 1320.8 }, { pouce: 54, mm: 1371.6 },
  { pouce: 56, mm: 1422.4 }, { pouce: 58, mm: 1473.2 }, { pouce: 60, mm: 1524 },
  { pouce: 64, mm: 1625.6 }, { pouce: 68, mm: 1727.2 }, { pouce: 72, mm: 1828.8 },
];

// Custom styles for animations
const animationStyles = `
  @keyframes slideIn {
    from { opacity: 0; transform: scale(0.95) translateY(-10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .animate-slide-in { animation: slideIn 0.3s ease-out forwards; }
  .animate-pulse-glow { animation: pulse-glow 2s infinite; }
  .input-focus-ring:focus { 
    outline: none;
    ring: 2px;
    ring-offset: 2px;
  }
  .btn-hover-scale { transition: all 0.2s ease; }
  .btn-hover-scale:hover:not(:disabled) { transform: scale(1.02); }
  .btn-hover-scale:active:not(:disabled) { transform: scale(0.98); }
  .field-group { transition: all 0.2s ease; }
  .field-group:hover { transform: translateY(-1px); }
  .success-check { animation: checkPop 0.3s ease-out; }
  @keyframes checkPop {
    0% { transform: scale(0); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
`;

// Field wrapper component - defined outside to prevent re-renders
const FieldWrapper = ({ icon: Icon, iconColor, label, required, error, valid, children }) => (
  <div className="field-group">
    <label className="flex items-center gap-2 text-sm font-semibold mb-2">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColor}`}>
        <Icon size={14} className="text-white" />
      </div>
      <span style={{ color: 'var(--color-text-primary)' }}>
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {valid && !error && (
        <CheckCircle2 size={16} className="text-emerald-500 success-check ml-auto" />
      )}
    </label>
    {children}
    {error && (
      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1 animate-slide-in">
        <AlertCircle size={12} /> {error}
      </p>
    )}
  </div>
);

export default function TubeForm({ tube, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [availableLots, setAvailableLots] = useState([]);
  const [activeLot, setActiveLot] = useState(null); // Lot currently in production
  const [nextNumber, setNextNumber] = useState('');
  const [errors, setErrors] = useState({});
  const [validFields, setValidFields] = useState({});
  const [noActiveLotError, setNoActiveLotError] = useState(false);
  
  const { currentUser } = useAuth();
  const { toast } = useModal();

  const [formData, setFormData] = useState({
    numero: tube?.numero || '',
    lot_id: tube?.lot_id || '',
    bobine_id: tube?.bobine_id || '',
    diametre_pouce: tube?.diametre_pouce || '',
    diametre_mm: tube?.diametre_mm || '',
    longueur: tube?.longueur || '',
    statut: tube?.statut || 'En attente',
    is_cross_welding: tube?.is_cross_welding || false,
    lot2_id: tube?.lot2_id || '',
  });

  const [nextProductionLot, setNextProductionLot] = useState(null);
  const [crossWeldingError, setCrossWeldingError] = useState(null);

  const isEdit = !!tube;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // When Cross Welding is enabled, auto-find the next production lot
    if (formData.is_cross_welding && activeLot && availableLots.length > 0) {
      // Find the next lot in sequence that is "En production"
      // The next lot should have a higher numero than the current active lot
      const currentLotNumero = parseInt(activeLot.numero);
      
      // Find all lots that are in production and have a higher numero
      const nextLots = availableLots
        .filter(l => 
          l.id !== activeLot.id && 
          (l.statut === 'En production' || l.statut === 'Production') &&
          parseInt(l.numero) > currentLotNumero
        )
        .sort((a, b) => parseInt(a.numero) - parseInt(b.numero));
      
      if (nextLots.length > 0) {
        // Found the next lot in sequence
        setNextProductionLot(nextLots[0]);
        setFormData(prev => ({ ...prev, lot2_id: nextLots[0].id.toString() }));
        setCrossWeldingError(null);
      } else {
        // No next lot is ready
        setNextProductionLot(null);
        setFormData(prev => ({ ...prev, lot2_id: '' }));
        setCrossWeldingError(t('tubes.nextLotNotReady'));
      }
    } else if (!formData.is_cross_welding) {
      setNextProductionLot(null);
      setCrossWeldingError(null);
      setFormData(prev => ({ ...prev, lot2_id: '' }));
    }
  }, [formData.is_cross_welding, activeLot, availableLots]);

  useEffect(() => {
    // Update mm when pouces change
    if (formData.diametre_pouce) {
      const option = DIAMETER_OPTIONS.find(d => d.pouce === parseFloat(formData.diametre_pouce));
      if (option) {
        setFormData(prev => ({ ...prev, diametre_mm: option.mm }));
      }
    }
  }, [formData.diametre_pouce]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [lotsRes, numberRes] = await Promise.all([
        tubesAPI.getAvailableLots(true), // Get all lots
        !isEdit ? tubesAPI.getNextNumber() : Promise.resolve(null),
      ]);
      
      setAvailableLots(lotsRes);
      
      // Find the active production lot (first lot in "Production" or "En production" status)
      const productionLot = lotsRes.find(l => l.statut === 'Production' || l.statut === 'En production');
      
      if (!isEdit) {
        if (productionLot) {
          setActiveLot(productionLot);
          setFormData(prev => ({ 
            ...prev, 
            lot_id: productionLot.id.toString(),
            bobine_id: productionLot.bobine_id || ''
          }));
          setNoActiveLotError(false);
        } else {
          setNoActiveLotError(true);
        }
        
        if (numberRes) {
          setNextNumber(numberRes.nextNumber);
          setFormData(prev => ({ ...prev, numero: numberRes.nextNumber }));
        }
      } else {
        // If editing, find the lot used by the tube
        if (tube.lot_id) {
          const lot = lotsRes.find(l => l.id === tube.lot_id);
          setActiveLot(lot);
        }
        
        // If editing a Cross Welding tube, find lot2
        if (tube.lot2_id) {
          const lot2 = lotsRes.find(l => l.id === tube.lot2_id);
          setNextProductionLot(lot2);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t('tubes.loadError'));
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const newValidFields = {};
    
    if (!formData.numero?.trim()) {
      newErrors.numero = t('validation.numberRequired');
    } else {
      newValidFields.numero = true;
    }
    if (!formData.diametre_pouce) {
      newErrors.diametre_pouce = t('validation.diameterRequired');
    } else {
      newValidFields.diametre_pouce = true;
    }
    if (!formData.longueur || parseFloat(formData.longueur) <= 0) {
      newErrors.longueur = t('validation.lengthRequired');
    } else {
      newValidFields.longueur = true;
    }
    
    // Check if we have an active production lot
    if (!activeLot && !isEdit) {
      newErrors.lot_id = t('tubes.noLotInProduction');
    }
    
    // Cross Welding validation
    if (formData.is_cross_welding) {
      if (!nextProductionLot) {
        newErrors.cross_welding = crossWeldingError || t('tubes.nextLotNotReady');
      }
    }
    
    setErrors(newErrors);
    setValidFields(newValidFields);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        lot_id: activeLot?.id || formData.lot_id || null,
        bobine_id: activeLot?.bobine_id || formData.bobine_id || null,
        lot2_id: formData.is_cross_welding && nextProductionLot ? nextProductionLot.id : null,
        is_cross_welding: formData.is_cross_welding || false,
        created_by_user_id: !isEdit ? currentUser?.id : undefined,
        created_by_name: !isEdit ? `${currentUser?.prenom || ''} ${currentUser?.nom || ''}`.trim() : undefined,
      };

      const result = isEdit
        ? await tubesAPI.update(tube.id, dataToSend)
        : await tubesAPI.create(dataToSend);

      toast.success(isEdit ? t('tubes.tubeUpdated') : t('tubes.tubeCreated'));
      onSuccess?.(result);
      onClose();
    } catch (error) {
      toast.error(error.message || t('tubes.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors and validation only for select fields to avoid re-renders on text input
    if (field === 'diametre_pouce') {
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
      if (value) setValidFields(prev => ({ ...prev, diametre_pouce: true }));
    }
    if (field === 'lot_id') {
      // lot_id change is handled separately
    }
  };

  // Clear error when typing in text fields (on blur instead)
  const handleTextBlur = (field) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validate longueur on blur only
  const handleLongueurBlur = () => {
    handleTextBlur('longueur');
    if (formData.longueur && parseFloat(formData.longueur) > 0) {
      setValidFields(prev => ({ ...prev, longueur: true }));
    }
  };

  // Validate numero on blur only
  const handleNumeroBlur = () => {
    handleTextBlur('numero');
    if (formData.numero?.trim()) {
      setValidFields(prev => ({ ...prev, numero: true }));
    }
  };

  return (
    <>
      <style>{animationStyles}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div 
          className="animate-slide-in relative w-full max-w-xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col"
          style={{ 
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Header with gradient */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTAtMThjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            
            <div className="relative flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Cylinder size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {isEdit ? t('tubes.editTube') : t('tubes.createNewTube')}
                    <Sparkles size={18} className="text-yellow-300" />
                  </h2>
                  <p className="text-sm text-white/80">
                    {isEdit ? `${t('common.tube')} N° ${tube.numero}` : t('tubes.pipelineSubtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          </div>

        {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingData ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center animate-pulse-glow mb-4">
                  <Loader2 size={28} className="animate-spin text-white" />
                </div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {t('common.loading')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error: No active production lot */}
                {noActiveLotError && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 animate-slide-in">
                    <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700 dark:text-red-300">
                      <p className="font-semibold mb-1">{t('tubes.noLotInProduction')}</p>
                      <p>{t('tubes.noLotInProductionMessage')}</p>
                    </div>
                  </div>
                )}

                {/* Info Card - Active Production Lot */}
                {activeLot && (
                  <div className="relative overflow-hidden rounded-2xl border animate-slide-in"
                    style={{ 
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                          <Package size={16} className="text-white" />
                        </div>
                        <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {t('statuses.inProduction')}: {t('navigation.lots')} {activeLot.numero}
                        </span>
                        <span className="ml-auto px-2 py-1 text-xs font-bold rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                          {t('statuses.inProduction')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <InfoPill label={t('tubes.bobine')} value={activeLot.bobine_numero} color="blue" />
                        <InfoPill label={t('bobines.grade')} value={activeLot.grade_code} color="purple" />
                        <InfoPill label={t('bobines.nuance')} value={activeLot.nuance_code} color="amber" />
                        <InfoPill label={t('bobines.thickness')} value={activeLot.bobine_epaisseur ? `${activeLot.bobine_epaisseur} mm` : '-'} color="emerald" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Row 1: Number & Type de tube */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldWrapper 
                    icon={Hash} 
                    iconColor="bg-gradient-to-br from-violet-500 to-purple-600" 
                    label={t('tubes.tubeNumber')} 
                    required 
                    error={errors.numero}
                    valid={validFields.numero}
                  >
                    <input
                      type="text"
                      value={formData.numero}
                      onChange={(e) => handleChange('numero', e.target.value)}
                      onBlur={handleNumeroBlur}
                      placeholder="Ex: 001"
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 ${
                        errors.numero ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 
                        validFields.numero ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : ''
                      }`}
                      style={{ 
                        backgroundColor: errors.numero ? undefined : validFields.numero ? undefined : 'var(--color-bg-secondary)', 
                        borderColor: errors.numero ? undefined : validFields.numero ? undefined : 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </FieldWrapper>

                  {/* Type de tube */}
                  <div className="field-group">
                    <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-pink-500 to-rose-600">
                        <Link2 size={14} className="text-white" />
                      </div>
                      <span style={{ color: 'var(--color-text-primary)' }}>
                        {t('common.type')}
                      </span>
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, is_cross_welding: false, lot2_id: '' }));
                          setCrossWeldingError(null);
                        }}
                        className={`flex-1 px-4 py-3 rounded-xl border-2 font-semibold transition-all duration-200 ${
                          !formData.is_cross_welding 
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        style={{ 
                          borderColor: !formData.is_cross_welding ? undefined : 'var(--color-border)',
                          color: !formData.is_cross_welding ? undefined : 'var(--color-text-primary)',
                        }}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, is_cross_welding: true }))}
                        className={`flex-1 px-4 py-3 rounded-xl border-2 font-semibold transition-all duration-200 ${
                          formData.is_cross_welding 
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        style={{ 
                          borderColor: formData.is_cross_welding ? undefined : 'var(--color-border)',
                          color: formData.is_cross_welding ? undefined : 'var(--color-text-primary)',
                        }}
                      >
                        Cross Welding (C.W)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cross Welding Info - Automatic */}
                {formData.is_cross_welding && (
                  <div className="animate-slide-in">
                    {/* Error Message - No next lot available */}
                    {crossWeldingError && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800">
                        <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-700 dark:text-red-300">
                          <p className="font-semibold mb-1">{t('tubes.crossWeldingError')}</p>
                          <p>{crossWeldingError}</p>
                        </div>
                      </div>
                    )}

                    {/* Success Message - Next lot found */}
                    {nextProductionLot && activeLot && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-emerald-700 dark:text-emerald-300">
                          <p className="font-semibold mb-1">{t('tubes.crossWelding')} (C.W)</p>
                          <p>{t('tubes.crossWeldingInfo')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Row 2: Diameter & Length */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldWrapper 
                    icon={Gauge} 
                    iconColor="bg-gradient-to-br from-orange-500 to-red-600" 
                    label={t('tubes.diameter')} 
                    required 
                    error={errors.diametre_pouce}
                    valid={validFields.diametre_pouce}
                  >
                    <select
                      value={formData.diametre_pouce}
                      onChange={(e) => handleChange('diametre_pouce', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 cursor-pointer ${
                        errors.diametre_pouce ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 
                        validFields.diametre_pouce ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : ''
                      }`}
                      style={{ 
                        backgroundColor: errors.diametre_pouce ? undefined : validFields.diametre_pouce ? undefined : 'var(--color-bg-secondary)', 
                        borderColor: errors.diametre_pouce ? undefined : validFields.diametre_pouce ? undefined : 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <option value="">{t('tubes.selectDiameter')}</option>
                      {DIAMETER_OPTIONS.map(opt => (
                        <option key={opt.pouce} value={opt.pouce}>
                          {opt.pouce}" ({opt.mm} mm)
                        </option>
                      ))}
                    </select>
                  </FieldWrapper>

                  <FieldWrapper 
                    icon={Ruler} 
                    iconColor="bg-gradient-to-br from-emerald-500 to-green-600" 
                    label={t('tubes.lengthMm')} 
                    required 
                    error={errors.longueur}
                    valid={validFields.longueur}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.longueur}
                      onChange={(e) => handleChange('longueur', e.target.value)}
                      onBlur={handleLongueurBlur}
                      placeholder="Ex: 12.50"
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 ${
                        errors.longueur ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 
                        validFields.longueur ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : ''
                      }`}
                      style={{ 
                        backgroundColor: errors.longueur ? undefined : validFields.longueur ? undefined : 'var(--color-bg-secondary)', 
                        borderColor: errors.longueur ? undefined : validFields.longueur ? undefined : 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </FieldWrapper>
                </div>

                {/* Status (only for edit) */}
                {isEdit && (
                  <FieldWrapper 
                    icon={CircleDot} 
                    iconColor="bg-gradient-to-br from-indigo-500 to-violet-600" 
                    label={t('common.status')}
                  >
                    <select
                      value={formData.statut}
                      onChange={(e) => handleChange('statut', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
                      style={{ 
                        backgroundColor: 'var(--color-bg-secondary)', 
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <option value="En attente">{t('statuses.pending')}</option>
                      <option value="En cours">{t('statuses.inProgress')}</option>
                      <option value="Terminé">{t('statuses.completed')}</option>
                      <option value="Annulé">{t('statuses.cancelled')}</option>
                    </select>
                  </FieldWrapper>
                )}
              </form>
            )}
          </div>

          {/* Footer */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t"
            style={{ 
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            <p className="text-xs hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
              {t('common.required')} <span className="text-red-500">*</span>
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-hover-scale flex-1 sm:flex-none px-5 py-2.5 rounded-xl border-2 font-semibold transition-all duration-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-900/20"
                style={{ 
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <X size={18} />
                  {t('common.cancel')}
                </span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || loadingData}
                className="btn-hover-scale flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {isEdit ? t('common.save') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Info Pill component for inherited lot properties
function InfoPill({ label, value, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-violet-500',
    amber: 'from-amber-500 to-orange-500',
    emerald: 'from-emerald-500 to-teal-500',
  };
  
  return (
    <div className="text-center p-2 rounded-xl transition-all duration-200 hover:scale-105"
      style={{ backgroundColor: 'var(--color-card)' }}
    >
      <div className={`w-8 h-8 mx-auto mb-1 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-sm`}>
        <span className="text-xs font-bold text-white">{value?.charAt(0) || '-'}</span>
      </div>
      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
        {value || '-'}
      </p>
    </div>
  );
}
