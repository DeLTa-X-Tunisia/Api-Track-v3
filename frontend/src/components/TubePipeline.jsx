import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { 
  Check, 
  User,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Loader2,
  X,
  Wrench,
  SkipForward,
  AlertTriangle,
  Pause,
  TrendingDown,
  MessageSquare,
  Trash2,         // Rebut
  ImagePlus,      // Image upload
  Camera,         // Camera icon
  History,        // Historique
  Clock,          // Timestamp
  Image,          // Images
  FileText,       // Details
  Plus,           // Add button for multi-repair
  RotateCcw,      // Refaire (redo)
  // Icons for each stage
  Cylinder,       // Formage
  Flame,          // Pointage GMAW
  Eye,            // CV Pointage
  Zap,            // SAW
  Search,         // CV Cordon
  Microscope,     // Macro
  Scissors,       // Chanfrein
  Droplet,        // Hydrotest
  ShieldCheck,    // CV Fuite
  Radio,          // UT
  ScanLine,       // Radio Scopie
  Ruler,          // Contrôle dimensionnel
  // Additional icons for repair modal
  CircleAlert,    // Défaut
  HelpCircle,     // Cause
  UserCheck,      // Responsabilité
  ClipboardList,  // Réparation à faire
  Shield,         // Action future
  StickyNote,     // Commentaire
  Sparkles,       // Decorative
  Hash,           // Repair number
  // Additional icons for interrupt modal
  Settings2,      // Paramètre soudure
  Archive,        // Pas de place pour stockage
  MoreHorizontal, // Autre
  Package,        // Manque de fictif
  Circle,         // Pas de bobine
  CheckCircle,    // Selected indicator
  Play,           // Resume from interrupt
  // Certification icons
  Award,          // Certification Hydraulique
  Medal,          // Certification API 5L
} from 'lucide-react';
import { tubesAPI, reparationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import CrudSelect from './CrudSelect';

const pipelineStages = [
  { key: 'formage', labelKey: 'stages.formage', shortLabel: 'FOR', descKey: 'stages.formageDesc', icon: Cylinder },
  { key: 'pointage', labelKey: 'stages.pointage', shortLabel: 'PNT', descKey: 'stages.pointageDesc', icon: Flame },
  { key: 'cv_pointage', labelKey: 'stages.cvPointage', shortLabel: 'CVP', descKey: 'stages.cvPointageDesc', icon: Eye },
  { key: 'saw', labelKey: 'stages.saw', shortLabel: 'SAW', descKey: 'stages.sawDesc', icon: Zap },
  { key: 'cv_cordon', labelKey: 'stages.cvCordon', shortLabel: 'CVC', descKey: 'stages.cvCordonDesc', icon: Search },
  { key: 'macro', labelKey: 'stages.macro', shortLabel: 'MAC', descKey: 'stages.macroDesc', icon: Microscope },
  { key: 'chanfrein', labelKey: 'stages.chanfrein', shortLabel: 'CHF', descKey: 'stages.chanfreinDesc', icon: Scissors },
  { key: 'hydrotest', labelKey: 'stages.hydrotest', shortLabel: 'HYD', descKey: 'stages.hydrotestDesc', icon: Droplet },
  { key: 'cv_fuite', labelKey: 'stages.cvFuite', shortLabel: 'CVF', descKey: 'stages.cvFuiteDesc', icon: ShieldCheck },
  { key: 'ut', labelKey: 'stages.ut', shortLabel: 'UT', descKey: 'stages.utDesc', icon: Radio },
  { key: 'radio', labelKey: 'stages.radioScopie', shortLabel: 'RAD', descKey: 'stages.radioScopieDesc', icon: ScanLine },
  { key: 'controle_dim', labelKey: 'stages.controleDim', shortLabel: 'DIM', descKey: 'stages.controleDimDesc', icon: Ruler },
];

// Color scheme for stages
const stageColors = {
  waiting: { bg: '#9ca3af', bgLight: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
  active: { bg: '#f59e0b', bgLight: '#fef3c7', text: '#d97706', border: '#fbbf24' },
  validated: { bg: '#22c55e', bgLight: '#dcfce7', text: '#16a34a', border: '#86efac' },
};

// Action button configurations
const actionConfig = {
  validate: { labelKey: 'validation.validate', icon: Check, color: '#22c55e', hoverColor: '#16a34a', needsComment: false },
  repair: { labelKey: 'validation.repair', icon: Wrench, color: '#3b82f6', hoverColor: '#2563eb', needsComment: true },
  skip: { labelKey: 'validation.skip', icon: SkipForward, color: '#6b7280', hoverColor: '#4b5563', needsComment: false },
  nc: { labelKey: 'validation.derogate', icon: AlertTriangle, color: '#f97316', hoverColor: '#ea580c', needsComment: false, defaultCommentKey: 'validation.acceptedWithDefects' },
  interrupt: { labelKey: 'validation.interrupt', icon: Pause, color: '#eab308', hoverColor: '#ca8a04', needsComment: false },
  downgrade: { labelKey: 'validation.declassify', icon: TrendingDown, color: '#ef4444', hoverColor: '#dc2626', needsComment: true },
  rebut: { labelKey: 'validation.rebut', icon: Trash2, color: '#7f1d1d', hoverColor: '#991b1b', needsComment: true },
  cancel: { labelKey: 'validation.cancel', icon: X, color: '#ef4444', hoverColor: '#dc2626', needsComment: false, outline: true },
  redo: { labelKey: 'validation.redo', icon: RotateCcw, color: '#8b5cf6', hoverColor: '#7c3aed', needsComment: false, outline: true },
  // Repair resolution actions (when tube is "En réparation")
  repair_resolution: { labelKey: 'repair.resolutionTitle', icon: Settings2, color: '#3b82f6', hoverColor: '#2563eb', needsComment: false },
  repair_validated: { labelKey: 'repair.repairValidated', icon: Check, color: '#22c55e', hoverColor: '#16a34a', needsComment: false },
  repair_derogation: { labelKey: 'repair.derogation', icon: AlertTriangle, color: '#f97316', hoverColor: '#ea580c', needsComment: false },
  // Resume from interruption (when tube is "Interrompu")
  resume: { labelKey: 'validation.resume', icon: Play, color: '#22c55e', hoverColor: '#16a34a', needsComment: false },
  // Certification actions (last 2 stages only)
  cert_hydraulique: { labelKey: 'certification.certifyHydraulic', icon: Award, color: '#0ea5e9', hoverColor: '#0284c7', needsComment: false },
  cert_api5l: { labelKey: 'certification.certifyAPI5L', icon: Medal, color: '#a855f7', hoverColor: '#9333ea', needsComment: false },
};

export default function TubePipeline({ tube, onUpdate, compact = false }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState({}); // Track which stages have history expanded
  const [actionModal, setActionModal] = useState({ open: false, action: null, stage: null });
  const [comment, setComment] = useState('');
  
  // Dropdown data from API
  const [defauts, setDefauts] = useState([]);
  const [causes, setCauses] = useState([]);
  const [responsabilites, setResponsabilites] = useState([]);
  const [actionsFutures, setActionsFutures] = useState([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(false);
  
  // Multi-repair form state - array of repair items
  const emptyRepairItem = {
    defaut_ids: [], // Array for multi-select
    cause_ids: [], // Array for multi-select
    responsabilite_id: '',
    responsabilite_code: '',
    responsabilite_libelle: '',
    reparation_a_faire: '',
    action_future_ids: [], // Array for multi-select
    commentaire: '',
    images: [], // Array of { file, preview }
  };
  const [repairs, setRepairs] = useState([{ ...emptyRepairItem }]);
  const repairImageRefs = useRef({});
  
  // Repair modal state
  const [repairModal, setRepairModal] = useState({ open: false, stage: null });
  
  // Validation modal with images
  const [validationModal, setValidationModal] = useState({ open: false, stage: null });
  const [validationImages, setValidationImages] = useState([null, null, null, null, null]);
  const [validationComment, setValidationComment] = useState('');
  const fileInputRefs = useRef([]);
  
  // Skip modal state
  const [skipModal, setSkipModal] = useState({ open: false, stage: null });
  const [causesPasser, setCausesPasser] = useState([]);
  const [skipData, setSkipData] = useState({
    cause_id: '',
    cause_libelle: '',
  });
  
  // Interrupt modal state
  const [interruptModal, setInterruptModal] = useState({ open: false, stage: null });
  const [causesInterruption, setCausesInterruption] = useState([]);
  const [interruptData, setInterruptData] = useState({
    selectedCauses: [], // Array of { id, libelle, is_autre }
    autre_cause: '',
    responsabilite_id: '',
    responsabilite_libelle: '',
    commentaire: '',
  });
  
  // Repair resolution modal state (when tube is "En réparation")
  const [repairResolutionModal, setRepairResolutionModal] = useState({ open: false, stage: null });
  const [repairResolutionComment, setRepairResolutionComment] = useState('');
  
  const { currentUser } = useAuth();
  const { toast, confirm } = useModal();

  // API base URL for images  
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Load dropdown data when repair modal opens
  useEffect(() => {
    if (repairModal.open && defauts.length === 0) {
      loadDropdownData();
    }
  }, [repairModal.open]);

  // Load skip dropdown data when skip modal opens
  useEffect(() => {
    if (skipModal.open && causesPasser.length === 0) {
      loadSkipDropdownData();
    }
  }, [skipModal.open]);

  // Load interrupt dropdown data when interrupt modal opens
  useEffect(() => {
    if (interruptModal.open && causesInterruption.length === 0) {
      loadInterruptDropdownData();
    }
  }, [interruptModal.open]);

  const loadDropdownData = async () => {
    setDropdownsLoading(true);
    try {
      const [defautsData, causesData, responsabilitesData, actionsFuturesData] = await Promise.all([
        reparationsAPI.getDefauts(),
        reparationsAPI.getCauses(),
        reparationsAPI.getResponsabilites(),
        reparationsAPI.getActionsFutures(),
      ]);
      setDefauts(defautsData);
      setCauses(causesData);
      setResponsabilites(responsabilitesData);
      setActionsFutures(actionsFuturesData);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setDropdownsLoading(false);
    }
  };

  const loadSkipDropdownData = async () => {
    setDropdownsLoading(true);
    try {
      const causesData = await reparationsAPI.getCausesPasser();
      setCausesPasser(causesData);
    } catch (error) {
      console.error('Error loading skip dropdown data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setDropdownsLoading(false);
    }
  };

  const loadInterruptDropdownData = async () => {
    setDropdownsLoading(true);
    try {
      const [causesData, responsabilitesData] = await Promise.all([
        reparationsAPI.getCausesInterruption(),
        reparationsAPI.getResponsabilites()
      ]);
      setCausesInterruption(causesData);
      setResponsabilites(responsabilitesData);
    } catch (error) {
      console.error('Error loading interrupt dropdown data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setDropdownsLoading(false);
    }
  };

  const getStageState = (stageKey, index) => {
    const isValidated = tube[`${stageKey}_validee`];
    if (isValidated) return 'validated';
    
    // Check if this is the next stage to validate
    const previousStages = pipelineStages.slice(0, index);
    const allPreviousValidated = previousStages.every(s => tube[`${s.key}_validee`]);
    if (allPreviousValidated) return 'active';
    
    return 'waiting';
  };

  // Open validation modal instead of validating directly
  const openValidationModal = (stage) => {
    setValidationModal({ open: true, stage });
    setValidationImages([null, null, null, null, null]);
    setValidationComment('');
  };

  const closeValidationModal = () => {
    setValidationModal({ open: false, stage: null });
    setValidationImages([null, null, null, null, null]);
    setValidationComment('');
  };

  const handleImageSelect = (index, e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('L\'image ne doit pas dépasser 5 Mo');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Seuls les fichiers image sont acceptés');
        return;
      }
      const newImages = [...validationImages];
      newImages[index] = {
        file,
        preview: URL.createObjectURL(file),
      };
      setValidationImages(newImages);
    }
  };

  const removeImage = (index) => {
    const newImages = [...validationImages];
    if (newImages[index]?.preview) {
      URL.revokeObjectURL(newImages[index].preview);
    }
    newImages[index] = null;
    setValidationImages(newImages);
  };

  const handleValidateWithImages = async () => {
    const { stage } = validationModal;
    if (!stage) return;

    // Capture data BEFORE closing modal to avoid state timing issues
    const imagesToUpload = validationImages.filter(img => img !== null);
    const commentToSave = validationComment.trim();
    const validatorName = currentUser 
      ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
      : 'Utilisateur';

    setLoading(stage.key);
    closeValidationModal();

    try {
      let result;
      if (imagesToUpload.length > 0) {
        // Use FormData for image upload
        const formData = new FormData();
        formData.append('validator_id', currentUser?.id || '');
        formData.append('validator_name', validatorName || 'Utilisateur');
        if (commentToSave) {
          formData.append('comment', commentToSave);
        }
        
        imagesToUpload.forEach((img) => {
          formData.append('images', img.file);
        });
        
        result = await tubesAPI.validateStageWithImages(tube.id, stage.key, formData);
      } else {
        // No images, use regular validation
        result = await tubesAPI.validateStage(tube.id, stage.key, {
          validator_id: currentUser?.id,
          validator_name: validatorName || 'Utilisateur',
          comment: commentToSave || undefined,
        });
      }
      
      toast.success(t('validation.stageValidated'));
      
      // Ensure onUpdate is called with the result to update parent state
      if (onUpdate && result) {
        onUpdate(result);
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error(error.message || 'Erreur lors de la validation');
    } finally {
      setLoading(null);
    }
  };

  const handleValidate = async (stageKey, stageLabel) => {
    setLoading(stageKey);
    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : 'Utilisateur';
      
      const result = await tubesAPI.validateStage(tube.id, stageKey, {
        validator_id: currentUser?.id,
        validator_name: validatorName || 'Utilisateur',
      });
      toast.success(`Étape "${stageLabel}" validée avec succès`);
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la validation');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelValidation = async (stageKey, stageLabel) => {
    const confirmed = await confirm({
      title: t('validation.cancelValidation'),
      message: t('validation.cancelValidationConfirm'),
      confirmText: t('validation.cancelValidation'),
      confirmVariant: 'danger',
    });
    
    if (!confirmed) return;
    
    setLoading(stageKey);
    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : 'Utilisateur';
      
      const result = await tubesAPI.cancelValidation(tube.id, stageKey, {
        validator_id: currentUser?.id,
        validator_name: validatorName || 'Utilisateur',
      });
      toast.success(t('validation.validationCancelled'));
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'annulation');
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteHistoryEntry = async (historyId, actionLabel) => {
    const confirmed = await confirm({
      title: t('modals.deleteTitle'),
      message: t('modals.confirmDeleteMessage'),
      confirmText: t('common.delete'),
      confirmVariant: 'danger',
    });
    
    if (!confirmed) return;
    
    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : t('auth.welcomeBack');
      
      const result = await tubesAPI.deleteHistoryEntry(tube.id, historyId, {
        deleted_by_id: currentUser?.id,
        deleted_by_name: validatorName || 'Utilisateur',
      });
      toast.success('Entrée supprimée de l\'historique');
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleDeleteRepair = async (repairId, repairIndex) => {
    const confirmed = await confirm({
      title: 'Supprimer la réparation',
      message: `Êtes-vous sûr de vouloir supprimer la réparation #${repairIndex + 1} ?`,
      confirmText: 'Supprimer',
      confirmVariant: 'danger',
    });
    
    if (!confirmed) return;
    
    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : 'Utilisateur';
      
      const result = await tubesAPI.deleteRepair(tube.id, repairId, {
        deleted_by_id: currentUser?.id,
        deleted_by_name: validatorName || 'Utilisateur',
      });
      toast.success('Réparation supprimée');
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const openActionModal = (action, stage) => {
    if (action === 'repair') {
      // Open specialized repair modal
      setRepairModal({ open: true, stage });
      setRepairs([{ ...emptyRepairItem }]);
    } else if (action === 'skip') {
      // Open specialized skip modal
      setSkipModal({ open: true, stage });
      setSkipData({
        cause_id: '',
        cause_code: '',
        cause_libelle: '',
        decision_id: '',
        decision_code: '',
        decision_libelle: '',
        reporte: false,
        reporte_commentaire: '',
      });
    } else {
      setActionModal({ open: true, action, stage });
      setComment('');
    }
  };

  const closeSkipModal = () => {
    setSkipModal({ open: false, stage: null });
    setSkipData({
      cause_id: '',
      cause_libelle: '',
    });
  };

  const handleSkipSubmit = async () => {
    const { stage } = skipModal;
    if (!stage) return;

    setLoading(stage.key);
    closeSkipModal();

    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : 'Utilisateur';

      // Build comment from skip data - simplified
      const comment = skipData.cause_libelle ? skipData.cause_libelle : 'Sans raison';

      const actionData = {
        validator_id: currentUser?.id,
        validator_name: validatorName || 'Utilisateur',
        action: 'skip',
        comment: comment,
        skip_cause_id: skipData.cause_id || null,
        skip_cause_code: skipData.cause_code || null,
        skip_cause_libelle: skipData.cause_libelle || null,
        skip_decision_id: skipData.decision_id || null,
        skip_decision_code: skipData.decision_code || null,
        skip_decision_libelle: skipData.decision_libelle || null,
        skip_reporte: skipData.reporte,
        skip_reporte_commentaire: skipData.reporte_commentaire || null,
      };

      const result = await tubesAPI.stageAction(tube.id, stage.key, actionData);
      toast.success(t('skip.skipSuccess'));
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || 'Erreur lors du passage');
    } finally {
      setLoading(null);
    }
  };

  // Interrupt modal handlers
  const openInterruptModal = (stage) => {
    setInterruptModal({ open: true, stage });
    setInterruptData({
      selectedCauses: [],
      autre_cause: '',
      responsabilite_id: '',
      responsabilite_libelle: '',
      commentaire: '',
    });
  };

  const closeInterruptModal = () => {
    setInterruptModal({ open: false, stage: null });
    setInterruptData({
      selectedCauses: [],
      autre_cause: '',
      responsabilite_id: '',
      responsabilite_libelle: '',
      commentaire: '',
    });
  };

  const toggleInterruptCause = (cause) => {
    setInterruptData(prev => {
      const isSelected = prev.selectedCauses.some(c => c.id === cause.id);
      if (isSelected) {
        return {
          ...prev,
          selectedCauses: prev.selectedCauses.filter(c => c.id !== cause.id),
          autre_cause: cause.is_autre ? '' : prev.autre_cause,
        };
      } else {
        return {
          ...prev,
          selectedCauses: [...prev.selectedCauses, cause],
        };
      }
    });
  };

  const handleInterruptSubmit = async () => {
    const { stage } = interruptModal;
    if (!stage) return;

    // Validate at least one cause selected
    if (interruptData.selectedCauses.length === 0) {
      toast.error('Veuillez sélectionner au moins une cause');
      return;
    }

    // If "Autre" is selected, check if autre_cause is filled
    const hasAutre = interruptData.selectedCauses.some(c => c.is_autre);
    if (hasAutre && !interruptData.autre_cause.trim()) {
      toast.error('Veuillez spécifier la cause "Autre"');
      return;
    }

    setLoading(stage.key);
    closeInterruptModal();

    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : 'Utilisateur';

      // Build comment from interrupt data
      const causesLabels = interruptData.selectedCauses.map(c => 
        c.is_autre ? `Autre: ${interruptData.autre_cause}` : c.libelle
      );
      const responsabiliteText = interruptData.responsabilite_libelle ? ` – ${interruptData.responsabilite_libelle}` : '';
      const comment = `Interrompu – ${causesLabels.join(', ')}${responsabiliteText}${interruptData.commentaire ? ` – ${interruptData.commentaire}` : ''}`;

      const actionData = {
        validator_id: currentUser?.id,
        validator_name: validatorName || 'Utilisateur',
        action: 'interrupt',
        comment: comment,
        interrupt_causes: interruptData.selectedCauses.map(c => ({
          cause_id: c.id,
          cause_code: c.code,
          cause_libelle: c.is_autre ? interruptData.autre_cause : c.libelle,
          is_autre: c.is_autre || false,
        })),
        interrupt_responsabilite_id: interruptData.responsabilite_id || null,
        interrupt_responsabilite_libelle: interruptData.responsabilite_libelle || null,
        interrupt_commentaire: interruptData.commentaire || null,
      };

      const result = await tubesAPI.stageAction(tube.id, stage.key, actionData);
      toast.success(t('interrupt.interruptSuccess'));
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || "Erreur lors de l'interruption");
    } finally {
      setLoading(null);
    }
  };

  // Resume from interrupt handler
  const handleResume = async (stage) => {
    setLoading(stage.key);
    
    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : 'Utilisateur';

      const result = await tubesAPI.resume(tube.id, {
        resumed_by_id: currentUser?.id,
        resumed_by_name: validatorName || 'Utilisateur',
      });
      
      toast.success(t('interrupt.resumeSuccess'));
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || "Erreur lors de la reprise");
    } finally {
      setLoading(null);
    }
  };

  // Certification handler (Hydraulique / API 5L)
  const handleCertification = async (action, stage) => {
    const certLabels = {
      cert_hydraulique: { label: 'Hydraulique', status: 'Certifié Hydraulique' },
      cert_api5l: { label: 'API 5L', status: 'Certifié API 5L' },
    };
    
    const cert = certLabels[action];
    
    // Ask for confirmation
    const confirmed = await confirm({
      title: `Certification ${cert.label}`,
      message: `Voulez-vous certifier ce tube comme "${cert.status}" ?\n\nCette action terminera le pipeline et le tube sera marqué comme certifié.`,
      confirmText: 'Certifier',
      confirmVariant: 'primary',
    });
    
    if (!confirmed) return;
    
    setLoading(stage.key);
    
    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : 'Utilisateur';

      const result = await tubesAPI.certify(tube.id, {
        certification_type: action === 'cert_hydraulique' ? 'hydraulique' : 'api5l',
        stage_key: stage.key,
        validator_id: currentUser?.id,
        validator_name: validatorName || 'Utilisateur',
      });
      
      toast.success(`Tube certifié ${cert.label} avec succès !`);
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || "Erreur lors de la certification");
    } finally {
      setLoading(null);
    }
  };

  // Repair Resolution Modal Handlers
  const openRepairResolutionModal = (stage) => {
    setRepairResolutionModal({ open: true, stage });
    setRepairResolutionComment('');
  };

  const closeRepairResolutionModal = () => {
    setRepairResolutionModal({ open: false, stage: null });
    setRepairResolutionComment('');
  };

  const handleRepairResolution = async (action) => {
    const { stage } = repairResolutionModal;
    if (!stage) return;

    const actionLabels = {
      repair_validated: 'Réparation validée',
      repair_derogation: 'Dérogation',
      rebut: 'Rebut',
      downgrade: 'Déclassement'
    };

    // For destructive actions, confirm first
    if (action === 'rebut' || action === 'downgrade') {
      const confirmText = action === 'rebut' 
        ? 'Êtes-vous sûr de vouloir rebuter ce tube ? Le pipeline sera terminé et le tube sera marqué comme rebuté.'
        : 'Êtes-vous sûr de vouloir déclasser ce tube ? Le pipeline sera terminé et le tube sera marqué comme déclassé.';
      
      const confirmed = await confirm({
        title: actionLabels[action],
        message: confirmText,
        confirmText: action === 'rebut' ? 'Rebuter' : 'Déclasser',
        confirmVariant: 'danger',
      });
      
      if (!confirmed) return;
    }

    setLoading(stage.key);
    closeRepairResolutionModal();

    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : 'Utilisateur';

      const result = await tubesAPI.resolveRepair(tube.id, {
        action: action,
        comment: repairResolutionComment || null,
        validator_id: currentUser?.id,
        validator_name: validatorName || 'Utilisateur',
      });

      toast.success(actionLabels[action] + ' enregistré(e) avec succès');
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la résolution de la réparation');
    } finally {
      setLoading(null);
    }
  };

  const handleRedo = async (stage) => {
    const confirmed = await confirm({
      title: 'Refaire ce stage',
      message: t('validation.redoConfirm', { stage: t(stage.labelKey) }),
      confirmText: 'Refaire',
      confirmVariant: 'warning',
    });
    
    if (!confirmed) return;

    setLoading(stage.key);
    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : 'Utilisateur';

      const result = await tubesAPI.cancelValidation(tube.id, stage.key, {
        validator_id: currentUser?.id,
        validator_name: validatorName || 'Utilisateur',
        action: 'redo',
      });
      toast.success(t('validation.stageReset'));
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || 'Erreur lors du retour en arrière');
    } finally {
      setLoading(null);
    }
  };

  const closeActionModal = () => {
    setActionModal({ open: false, action: null, stage: null });
    setComment('');
  };

  const closeRepairModal = () => {
    // Clean up image previews
    repairs.forEach(repair => {
      repair.images.forEach(img => {
        if (img?.preview) URL.revokeObjectURL(img.preview);
      });
    });
    setRepairModal({ open: false, stage: null });
    setRepairs([{ ...emptyRepairItem }]);
  };

  // Add new repair item
  const addRepairItem = () => {
    if (repairs.length >= 10) {
      toast.error('Maximum 10 réparations par soumission');
      return;
    }
    setRepairs([...repairs, { ...emptyRepairItem }]);
  };

  // Remove repair item
  const removeRepairItem = (index) => {
    if (repairs.length <= 1) return;
    const newRepairs = [...repairs];
    // Clean up image previews
    newRepairs[index].images.forEach(img => {
      if (img?.preview) URL.revokeObjectURL(img.preview);
    });
    newRepairs.splice(index, 1);
    setRepairs(newRepairs);
  };

  // Update repair item field
  const updateRepairField = (index, field, value) => {
    const newRepairs = [...repairs];
    newRepairs[index][field] = value;
    setRepairs(newRepairs);
  };

  // Handle dropdown selection
  // For multi-select (defaut, cause, action_future): receives array of IDs
  // For single-select (responsabilite): receives full item object
  const handleDropdownSelect = (index, type, value) => {
    const newRepairs = [...repairs];
    if (type === 'defaut') {
      // Multi-select: value is array of IDs
      newRepairs[index].defaut_ids = value || [];
    } else if (type === 'cause') {
      // Multi-select: value is array of IDs
      newRepairs[index].cause_ids = value || [];
    } else if (type === 'responsabilite') {
      // Single select: value is the item object
      newRepairs[index].responsabilite_id = value?.id || '';
      newRepairs[index].responsabilite_code = value?.code || '';
      newRepairs[index].responsabilite_libelle = value?.libelle || '';
    } else if (type === 'action_future') {
      // Multi-select: value is array of IDs
      newRepairs[index].action_future_ids = value || [];
    }
    setRepairs(newRepairs);
  };

  // Handle repair image selection
  const handleRepairImageSelect = (repairIndex, fileIndex, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Seuls les fichiers image sont acceptés');
      return;
    }

    const newRepairs = [...repairs];
    const images = [...newRepairs[repairIndex].images];
    
    // Replace or add image at the specified index
    if (images[fileIndex]?.preview) {
      URL.revokeObjectURL(images[fileIndex].preview);
    }
    images[fileIndex] = {
      file,
      preview: URL.createObjectURL(file),
    };
    
    newRepairs[repairIndex].images = images;
    setRepairs(newRepairs);
  };

  // Remove repair image
  const removeRepairImage = (repairIndex, fileIndex) => {
    const newRepairs = [...repairs];
    const images = [...newRepairs[repairIndex].images];
    
    if (images[fileIndex]?.preview) {
      URL.revokeObjectURL(images[fileIndex].preview);
    }
    images.splice(fileIndex, 1);
    
    newRepairs[repairIndex].images = images;
    setRepairs(newRepairs);
  };

  // Submit repairs
  const handleSubmitRepairs = async () => {
    const { stage } = repairModal;
    if (!stage) return;

    // Validate at least one repair has defaut selected
    const hasValidRepair = repairs.some(r => r.defaut_ids && r.defaut_ids.length > 0);
    if (!hasValidRepair) {
      toast.error('Veuillez sélectionner au moins un défaut');
      return;
    }

    setLoading(stage.key);
    
    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : 'Utilisateur';

      // Prepare FormData
      const formData = new FormData();
      formData.append('validator_id', currentUser?.id || '');
      formData.append('validator_name', validatorName || 'Utilisateur');

      // Prepare repairs data with image counts
      // Convert defaut_ids and cause_ids arrays to details for backend
      const repairsData = repairs.map(r => ({
        defaut_ids: r.defaut_ids || [],
        defaut_details: defauts.filter(d => r.defaut_ids?.includes(d.id)).map(d => ({
          id: d.id,
          code: d.code,
          libelle: d.libelle
        })),
        cause_ids: r.cause_ids || [],
        cause_details: causes.filter(c => r.cause_ids?.includes(c.id)).map(c => ({
          id: c.id,
          code: c.code,
          libelle: c.libelle
        })),
        responsabilite_id: r.responsabilite_id,
        responsabilite_code: r.responsabilite_code,
        responsabilite_libelle: r.responsabilite_libelle,
        reparation_a_faire: r.reparation_a_faire,
        action_future_ids: r.action_future_ids || [],
        action_future_details: actionsFutures.filter(a => r.action_future_ids?.includes(a.id)).map(a => ({
          id: a.id,
          code: a.code,
          libelle: a.libelle
        })),
        commentaire: r.commentaire,
        image_count: r.images.length,
      }));
      formData.append('repairs', JSON.stringify(repairsData));

      // Append all images in order (repair 0 images, then repair 1 images, etc.)
      repairs.forEach(repair => {
        repair.images.forEach(img => {
          if (img?.file) {
            formData.append('images', img.file);
          }
        });
      });

      const result = await tubesAPI.submitRepairs(tube.id, stage.key, formData);
      
      toast.success(t('repair.success', { count: repairs.length }));
      closeRepairModal();
      
      if (onUpdate && result) {
        onUpdate(result);
      }
    } catch (error) {
      console.error('Repair submission error:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement des réparations');
    } finally {
      setLoading(null);
    }
  };

  const handleActionWithComment = async () => {
    const { action, stage } = actionModal;
    if (!action || !stage) return;

    // Check if comment is required
    if (actionConfig[action].needsComment && !comment.trim()) {
      toast.error('Veuillez saisir un commentaire');
      return;
    }

    setLoading(stage.key);
    closeActionModal();

    try {
      const validatorName = currentUser 
        ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() 
        : 'Utilisateur';

      // Use default comment if action has one and no comment provided
      const finalComment = comment.trim() || actionConfig[action].defaultComment || '';

      const actionData = {
        validator_id: currentUser?.id,
        validator_name: validatorName || 'Utilisateur',
        action: action,
        comment: finalComment,
      };

      const result = await tubesAPI.stageAction(tube.id, stage.key, actionData);
      
      const actionLabel = t(actionConfig[action].labelKey);
      toast.success(t('actions.success', { action: actionLabel }));
      if (onUpdate) onUpdate(result);
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'action');
    } finally {
      setLoading(null);
    }
  };

  const handleAction = (action, stage, index) => {
    const state = getStageState(stage.key, index);
    
    if (action === 'validate' && state === 'active') {
      // Open validation modal with image upload
      openValidationModal(stage);
    } else if (action === 'cancel' && state === 'validated') {
      handleCancelValidation(stage.key, t(stage.labelKey));
    } else if (action === 'redo' && state === 'validated') {
      handleRedo(stage);
    } else if (action === 'skip') {
      // Open skip modal (has custom UI)
      openActionModal(action, stage);
    } else if (action === 'interrupt') {
      // Open interrupt modal with multi-select causes
      openInterruptModal(stage);
    } else if (action === 'repair_resolution') {
      // Open repair resolution modal (when tube is "En réparation")
      openRepairResolutionModal(stage);
    } else if (action === 'resume') {
      // Resume from interruption (when tube is "Interrompu")
      handleResume(stage);
    } else if (action === 'cert_hydraulique' || action === 'cert_api5l') {
      // Certification actions - requires confirmation
      handleCertification(action, stage);
    } else if (actionConfig[action].needsComment) {
      openActionModal(action, stage);
    }
  };

  const validatedCount = pipelineStages.filter(s => tube[`${s.key}_validee`]).length;
  const progressPercent = (validatedCount / pipelineStages.length) * 100;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Stages without repair button (Formage, Pointage, SAW)
  const stagesWithoutRepair = ['formage', 'pointage', 'saw', 'controle_dim'];

  // Check if a stage was skipped (last action was 'skip')
  const wasStageSkipped = (stageKey) => {
    const stageHistory = tube.stage_history?.filter(h => h.stage === stageKey) || [];
    if (stageHistory.length === 0) return false;
    
    // Sort by created_at desc to get the most recent action
    const sortedHistory = [...stageHistory].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    // Check if the last action (excluding 'redo' and 'cancel') was 'skip'
    const lastSignificantAction = sortedHistory.find(h => 
      h.action !== 'redo' && h.action !== 'cancel'
    );
    
    return lastSignificantAction?.action === 'skip';
  };

  // Get available actions for a stage based on its state and stage key
  const getAvailableActions = (state, stageKey) => {
    // If tube is interrupted for this stage, show only resume action
    if (tube.statut === 'Interrompu' && tube.interrupt_stage === stageKey) {
      return ['resume'];
    }
    
    // If tube is in repair mode for this stage, show repair resolution action
    if (tube.statut === 'En réparation' && tube.repair_stage === stageKey) {
      return ['repair_resolution'];
    }
    
    if (state === 'active') {
      const actions = ['validate'];
      
      // Add repair if applicable
      if (!stagesWithoutRepair.includes(stageKey)) {
        actions.push('repair');
      }
      
      // Common actions for all stages including rebut
      actions.push('skip', 'nc', 'interrupt', 'downgrade', 'rebut');
      
      // Add certification buttons for last 2 stages (radio and controle_dim)
      const certificationStages = ['radio', 'controle_dim'];
      if (certificationStages.includes(stageKey)) {
        actions.push('cert_hydraulique', 'cert_api5l');
      }
      
      return actions;
    }
    if (state === 'validated') {
      // Only show "Refaire" if the stage was skipped, not if it was normally validated
      if (wasStageSkipped(stageKey)) {
        return ['redo', 'cancel'];
      }
      // For normally validated stages, only show "Annuler"
      return ['cancel'];
    }
    return [];
  };

  // Compact view for list
  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {pipelineStages.map((stage, index) => {
          const state = getStageState(stage.key, index);
          const colors = stageColors[state];
          const isValidated = state === 'validated';

          return (
            <div 
              key={stage.key} 
              className="relative group"
              title={`${t(stage.labelKey)}: ${isValidated ? t('pipeline.validated') : state === 'active' ? t('status.waiting') : t('pipeline.upcoming')}`}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{ 
                  backgroundColor: colors.bgLight,
                  border: `2px solid ${colors.bg}`,
                  color: colors.bg,
                }}
              >
                {isValidated ? (
                  <Check size={10} strokeWidth={3} />
                ) : (
                  <span className="text-[8px]">{index + 1}</span>
                )}
              </div>
            </div>
          );
        })}
        <span 
          className="ml-1.5 text-xs font-medium whitespace-nowrap"
          style={{ color: validatedCount === 12 ? '#22c55e' : 'var(--color-text-muted)' }}
        >
          {validatedCount}/12
        </span>
      </div>
    );
  }

  // Full vertical view for detail
  return (
    <>
      <div 
        className="rounded-xl border"
        style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)' 
        }}
      >
        {/* Header */}
        <div 
          className="px-3 sm:px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <h3 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--color-text-primary)' }}>
              Pipeline Production
            </h3>
            <span 
              className="text-xs sm:text-sm px-2 py-0.5 rounded-full font-medium"
              style={{ 
                backgroundColor: validatedCount === 12 ? stageColors.validated.bgLight : stageColors.active.bgLight,
                color: validatedCount === 12 ? stageColors.validated.text : stageColors.active.text,
              }}
            >
              {validatedCount}/12
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-3 sm:px-4 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div 
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{ 
                width: `${progressPercent}%`,
                background: validatedCount === 12 
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)' 
                  : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              }}
            />
          </div>
        </div>

        {/* Vertical Stages List */}
        <div className="p-2 sm:p-4">
          <div className="space-y-1.5 sm:space-y-2">
            {pipelineStages.map((stage, index) => {
              const state = getStageState(stage.key, index);
              const colors = stageColors[state];
              const isLoading = loading === stage.key;
              const isValidated = state === 'validated';
              const isActive = state === 'active';
              const isExpanded = expandedStage === stage.key;
              const Icon = stage.icon;
              const availableActions = getAvailableActions(state, stage.key);

              return (
                <div 
                  key={stage.key} 
                  className="rounded-lg border transition-all"
                  style={{ 
                    backgroundColor: isExpanded ? colors.bgLight : 'var(--color-card)',
                    borderColor: isExpanded ? colors.border : 'var(--color-border)',
                  }}
                >
                  {/* Stage Header - Clickable */}
                  <button
                    onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
                    disabled={isLoading}
                    className="w-full p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 text-left hover:opacity-90 transition-opacity touch-manipulation active:scale-[0.99]"
                  >
                    {/* Timeline connector and step number */}
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs sm:text-sm font-bold"
                        style={{ 
                          backgroundColor: colors.bg,
                          color: 'white',
                        }}
                      >
                        {isLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : isValidated ? (
                          <Check size={14} strokeWidth={3} />
                        ) : (
                          index + 1
                        )}
                      </div>
                    </div>

                    {/* Stage Icon */}
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        backgroundColor: colors.bgLight,
                        border: `2px solid ${colors.border}`,
                      }}
                    >
                      <Icon size={16} className="sm:hidden" style={{ color: colors.text }} />
                      <Icon size={20} className="hidden sm:block" style={{ color: colors.text }} />
                    </div>

                    {/* Stage Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span 
                          className="font-semibold text-sm sm:text-base"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {t(stage.labelKey)}
                        </span>
                        <span 
                          className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-medium"
                          style={{ 
                            backgroundColor: colors.bgLight,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          {isValidated ? t('pipeline.validated') : isActive ? t('status.waiting') : t('pipeline.upcoming')}
                        </span>
                      </div>
                      <p 
                        className="text-xs sm:text-sm truncate"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {t(stage.descKey)}
                      </p>
                    </div>

                    {/* Expand indicator */}
                    <div className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div 
                      className="px-2.5 sm:px-4 pb-3 sm:pb-4 pt-0 border-t"
                      style={{ borderColor: colors.border }}
                    >
                      {/* Validation Info for validated stages */}
                      {isValidated && (
                        <div 
                          className="mt-2.5 sm:mt-3 p-2.5 sm:p-3 rounded-lg"
                          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <User size={14} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                              <span className="truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                {tube[`${stage.key}_validator_name`] || 'Non spécifié'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                              <span style={{ color: 'var(--color-text-secondary)' }}>
                                {formatDate(tube[`${stage.key}_validated_at`])}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {availableActions.length > 0 && (
                        <div className="mt-2.5 sm:mt-3">
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {availableActions.map((actionKey) => {
                              const action = actionConfig[actionKey];
                              const ActionIcon = action.icon;
                              const isCertification = actionKey.startsWith('cert_');
                              
                              return (
                                <button
                                  key={actionKey}
                                  onClick={() => handleAction(actionKey, stage, index)}
                                  disabled={isLoading}
                                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 touch-manipulation ${isCertification ? 'ring-2 ring-offset-1' : ''}`}
                                  style={action.outline ? {
                                    backgroundColor: 'transparent',
                                    border: `2px solid ${action.color}`,
                                    color: action.color,
                                  } : {
                                    backgroundColor: action.color,
                                    color: 'white',
                                    ...(isCertification ? { ringColor: action.color } : {}),
                                  }}
                                >
                                  {isLoading && loading === stage.key ? (
                                    <Loader2 size={14} className="animate-spin flex-shrink-0" />
                                  ) : (
                                    <ActionIcon size={14} className="flex-shrink-0" />
                                  )}
                                  <span className="whitespace-nowrap">{t(action.labelKey)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* History Section */}
                      {(() => {
                        const stageImages = tube.validation_images?.filter(img => img.stage === stage.key) || [];
                        const stageHistory = tube.stage_history?.filter(h => h.stage === stage.key) || [];
                        const stageReparations = tube.reparations?.filter(r => r.stage === stage.key) || [];
                        const hasHistory = stageImages.length > 0 || stageHistory.length > 0 || stageReparations.length > 0;
                        
                        if (!hasHistory) return null;
                        
                        const isHistoryExpanded = expandedHistory[stage.key];
                        
                        return (
                          <div className="mt-3 border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
                            <button
                              onClick={() => setExpandedHistory(prev => ({ ...prev, [stage.key]: !prev[stage.key] }))}
                              className="w-full flex items-center justify-between p-2.5 sm:p-3 text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors touch-manipulation"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              <div className="flex items-center gap-2">
                                <History size={14} className="flex-shrink-0" />
                                <span className="sm:hidden">
                                  {stageHistory.length}A, {stageReparations.length}R, {stageImages.length}I
                                </span>
                                <span className="hidden sm:inline">
                                  Historique ({stageHistory.length} action{stageHistory.length > 1 ? 's' : ''}, {stageReparations.length} réparation{stageReparations.length > 1 ? 's' : ''}, {stageImages.length} image{stageImages.length > 1 ? 's' : ''})
                                </span>
                              </div>
                              {isHistoryExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            
                            {isHistoryExpanded && (
                              <div className="p-2.5 sm:p-3 pt-0 space-y-2 sm:space-y-3">
                                {/* Validation Images */}
                                {stageImages.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 text-[10px] sm:text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                                      <Image size={12} />
                                      Images de validation
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2">
                                      {stageImages.map((img, imgIdx) => (
                                        <a
                                          key={imgIdx}
                                          href={`${API_BASE.replace('/api', '')}${img.image_path}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                                          style={{ borderColor: 'var(--color-border)' }}
                                        >
                                          <img
                                            src={`${API_BASE.replace('/api', '')}${img.image_path}`}
                                            alt={img.original_name || `Image ${imgIdx + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </a>
                                      ))}
                                    </div>
                                    <div className="text-[10px] sm:text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                      Par {stageImages[0]?.uploaded_by_name || 'Utilisateur'} le {formatDate(stageImages[0]?.uploaded_at)}
                                    </div>
                                  </div>
                                )}

                                {/* Detailed Repairs */}
                                {stageReparations.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                                      <Wrench size={12} />
                                      Réparations détaillées
                                    </div>
                                    <div className="space-y-2">
                                      {stageReparations.map((repair, repIdx) => (
                                        <div 
                                          key={repIdx}
                                          className="p-3 rounded-lg border-l-2 group relative"
                                          style={{ 
                                            backgroundColor: 'var(--color-bg-tertiary)',
                                            borderColor: '#3b82f6'
                                          }}
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <span 
                                              className="px-2 py-0.5 rounded text-xs font-medium"
                                              style={{ 
                                                backgroundColor: '#3b82f620',
                                                color: '#3b82f6',
                                              }}
                                            >
                                              Réparation #{repIdx + 1}
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                                <Clock size={10} />
                                                {formatDate(repair.created_at)}
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteRepair(repair.id, repIdx);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                                                title={t('repair.removeRepairConfirm')}
                                              >
                                                <Trash2 size={12} style={{ color: '#ef4444' }} />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          <div className="space-y-1 text-xs">
                                            {repair.defaut_libelle && (
                                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                                <span className="font-medium">{t('repair.defect')}:</span> {repair.defaut_code} - {repair.defaut_libelle}
                                              </div>
                                            )}
                                            {repair.cause_libelle && (
                                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                                <span className="font-medium">Cause:</span> {repair.cause_code} - {repair.cause_libelle}
                                              </div>
                                            )}
                                            {repair.responsabilite_libelle && (
                                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                                <span className="font-medium">Responsabilité:</span> {repair.responsabilite_libelle}
                                              </div>
                                            )}
                                            {repair.reparation_a_faire && (
                                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                                <span className="font-medium">Réparation à faire:</span> {repair.reparation_a_faire}
                                              </div>
                                            )}
                                            {(repair.action_future_details?.length > 0 || repair.action_future_libelle) && (
                                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                                <span className="font-medium">Action future:</span> {
                                                  repair.action_future_details?.length > 0
                                                    ? repair.action_future_details.map(a => `${a.code} - ${a.libelle}`).join(', ')
                                                    : `${repair.action_future_code} - ${repair.action_future_libelle}`
                                                }
                                              </div>
                                            )}
                                            {repair.commentaire && (
                                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                                <span className="font-medium">Commentaire:</span> {repair.commentaire}
                                              </div>
                                            )}
                                            <div style={{ color: 'var(--color-text-muted)' }}>
                                              <User size={10} className="inline mr-1" />
                                              {repair.validator_name || 'Utilisateur'}
                                            </div>
                                          </div>

                                          {/* Repair Images */}
                                          {repair.images && repair.images.length > 0 && (
                                            <div className="mt-2">
                                              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                                                Photos ({repair.images.length})
                                              </div>
                                              <div className="grid grid-cols-5 gap-1">
                                                {repair.images.map((img, imgIdx) => (
                                                  <a
                                                    key={imgIdx}
                                                    href={`${API_BASE.replace('/api', '')}${img.image_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block aspect-square rounded overflow-hidden border hover:opacity-80 transition-opacity"
                                                    style={{ borderColor: 'var(--color-border)' }}
                                                  >
                                                    <img
                                                      src={`${API_BASE.replace('/api', '')}${img.image_path}`}
                                                      alt={img.original_name || `Image ${imgIdx + 1}`}
                                                      className="w-full h-full object-cover"
                                                    />
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Action History */}
                                {stageHistory.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                                      <FileText size={12} />
                                      Actions effectuées
                                    </div>
                                    <div className="space-y-2">
                                      {stageHistory.map((entry, entryIdx) => {
                                        const actionInfo = actionConfig[entry.action] || { label: entry.action, color: '#6b7280' };
                                        const isSkipAction = entry.action === 'skip';
                                        return (
                                          <div 
                                            key={entryIdx}
                                            className="p-2 rounded-lg text-xs group relative"
                                            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                                          >
                                            <div className="flex items-center justify-between mb-1">
                                              <span 
                                                className="px-2 py-0.5 rounded font-medium"
                                                style={{ 
                                                  backgroundColor: actionInfo.color + '20',
                                                  color: actionInfo.color,
                                                }}
                                              >
                                                {isSkipAction 
                                                  ? `Passer – ${entry.comment || 'Sans raison'}`
                                                  : (actionInfo.labelKey ? t(actionInfo.labelKey) : entry.action)
                                                }
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                                                  <Clock size={10} />
                                                  {formatDate(entry.created_at)}
                                                </div>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteHistoryEntry(entry.id, actionInfo.labelKey ? t(actionInfo.labelKey) : entry.action);
                                                  }}
                                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                                                  title={t('common.delete')}
                                                >
                                                  <Trash2 size={12} style={{ color: '#ef4444' }} />
                                                </button>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--color-text-muted)' }}>
                                              <User size={10} />
                                              {entry.validator_name || t('auth.welcomeBack')}
                                            </div>
                                            {/* Show comment only for non-skip actions */}
                                            {entry.comment && !isSkipAction && (
                                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                                <span className="font-medium">{t('repair.comment')}:</span> {entry.comment}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Waiting message */}
                      {state === 'waiting' && (
                        <div 
                          className="mt-3 text-sm text-center py-2 rounded-lg"
                          style={{ 
                            backgroundColor: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-muted)' 
                          }}
                        >
                          Les étapes précédentes doivent être validées
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Validation Modal with Images */}
      {validationModal.open && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onMouseDown={closeValidationModal}
        >
          <div 
            className="relative w-full max-w-lg rounded-xl shadow-xl p-6"
            style={{ backgroundColor: 'var(--color-card)' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <Check size={18} className="inline mr-2" style={{ color: '#22c55e' }} />
                {t('validation.validate')} - {t(validationModal.stage?.labelKey)}
              </h3>
              <button
                type="button"
                onClick={closeValidationModal}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            {/* Image Upload Section */}
            <div className="mb-4">
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <Camera size={14} className="inline mr-2" />
                Photos de validation <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>(optionnel, max 5)</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {validationImages.map((img, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg border-2 border-dashed overflow-hidden group"
                    style={{ borderColor: img ? '#22c55e' : 'var(--color-border)' }}
                  >
                    {img ? (
                      <>
                        <img
                          src={img.preview}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => fileInputRefs.current[index]?.click()}
                        className="w-full h-full flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                      >
                        <ImagePlus size={20} style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {index + 1}
                        </span>
                      </button>
                    )}
                    <input
                      type="file"
                      ref={(el) => (fileInputRefs.current[index] = el)}
                      onChange={(e) => handleImageSelect(index, e)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Comment Section */}
            <div className="mb-4">
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <MessageSquare size={14} className="inline mr-2" />
                Commentaire <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>(optionnel)</span>
              </label>
              <textarea
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-input)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="Ajouter un commentaire..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeValidationModal}
                className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleValidateWithImages}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
                style={{ backgroundColor: '#22c55e' }}
              >
                <Check size={14} />
                Valider l'étape
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Action Modal with Comment */}
      {actionModal.open && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onMouseDown={closeActionModal}
        >
          <div 
            className="relative w-full max-w-md rounded-xl shadow-xl p-6"
            style={{ backgroundColor: 'var(--color-card)' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t(actionConfig[actionModal.action]?.labelKey)} - {t(actionModal.stage?.labelKey)}
              </h3>
              <button
                type="button"
                onClick={closeActionModal}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            <div className="mb-4">
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <MessageSquare size={14} className="inline mr-2" />
                Commentaire {actionConfig[actionModal.action]?.needsComment && <span className="text-red-500">*</span>}
                {actionConfig[actionModal.action]?.defaultComment && !actionConfig[actionModal.action]?.needsComment && (
                  <span className="text-xs ml-2 font-normal" style={{ color: 'var(--color-text-muted)' }}>(optionnel)</span>
                )}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-input)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder={actionConfig[actionModal.action]?.defaultComment 
                  ? `Saisissez un commentaire ou laissez vide pour "${actionConfig[actionModal.action]?.defaultComment}"...`
                  : "Saisissez un commentaire..."}
                autoFocus
              />
              {/* Info message for default comment */}
              {actionConfig[actionModal.action]?.defaultComment && !comment.trim() && (
                <div 
                  className="flex items-center gap-2 mt-3 p-3 rounded-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${actionConfig[actionModal.action]?.color}10 0%, ${actionConfig[actionModal.action]?.color}05 100%)`,
                    border: `1px dashed ${actionConfig[actionModal.action]?.color}30`,
                  }}
                >
                  <AlertCircle size={16} style={{ color: actionConfig[actionModal.action]?.color }} />
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Sans commentaire, la décision sera enregistrée comme{' '}
                    <span 
                      className="font-semibold px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: actionConfig[actionModal.action]?.color }}
                    >
                      {actionConfig[actionModal.action]?.defaultComment}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeActionModal}
                className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleActionWithComment}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
                style={{ 
                  backgroundColor: actionConfig[actionModal.action]?.color 
                }}
              >
                {(() => {
                  const ActionIcon = actionConfig[actionModal.action]?.icon;
                  return ActionIcon ? <ActionIcon size={14} /> : null;
                })()}
                Confirmer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Skip Modal - Minimal Modern Design */}
      {skipModal.open && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-900/40 backdrop-blur-md"
          onMouseDown={closeSkipModal}
        >
          {/* Modal Container with modern shadow */}
          <div 
            className="relative w-full max-w-lg rounded-3xl overflow-hidden"
            style={{ 
              backgroundColor: 'var(--color-card)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with gradient accent */}
            <div 
              className="relative px-6 pt-6 pb-5"
              style={{ 
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
              }}
            >
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-30" style={{
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
                transform: 'translate(30%, -30%)',
              }} />
              <div className="absolute bottom-0 left-0 w-24 h-24 opacity-20" style={{
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
                transform: 'translate(-30%, 30%)',
              }} />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Icon with gradient background */}
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.4)',
                    }}
                  >
                    <SkipForward size={26} className="text-white" />
                  </div>
                  <div>
                    <h3 
                      className="text-xl font-bold tracking-tight"
                      style={{ 
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {t('skip.skipStage')}
                    </h3>
                    <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {t(skipModal.stage?.labelKey)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeSkipModal}
                  className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105 group"
                  style={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  }}
                >
                  <X size={20} className="text-red-500 group-hover:text-red-600 transition-colors" />
                </button>
              </div>
            </div>

            {/* Body with card styling */}
            <div className="p-6">
              {/* Cause Section Card */}
              <div 
                className="rounded-2xl p-5 transition-all duration-300"
                style={{ 
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                  >
                    <HelpCircle size={18} style={{ color: '#6366f1' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Raison du passage
                    </h4>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Optionnel - Sélectionnez une cause
                    </p>
                  </div>
                </div>
                
                {/* CrudSelect with enhanced styling */}
                <CrudSelect
                  value={skipData.cause_id}
                  onChange={(item) => setSkipData(prev => ({
                    ...prev,
                    cause_id: item?.id || '',
                    cause_libelle: item?.libelle || '',
                  }))}
                  items={causesPasser}
                  onRefresh={async () => {
                    const data = await reparationsAPI.getCausesPasser();
                    setCausesPasser(data);
                  }}
                  onAdd={reparationsAPI.createCausePasser}
                  onUpdate={reparationsAPI.updateCausePasser}
                  onDelete={reparationsAPI.deleteCausePasser}
                  placeholder="Choisir une cause..."
                  label=""
                  accentColor="#6366f1"
                  icon={HelpCircle}
                  showCode={false}
                />
              </div>

              {/* Info message with modern styling */}
              <div 
                className="flex items-center gap-3 mt-4 p-4 rounded-xl"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)',
                  border: '1px dashed rgba(99, 102, 241, 0.2)',
                }}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                >
                  <AlertCircle size={16} style={{ color: '#6366f1' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Sans sélection, la décision sera enregistrée comme{' '}
                  <span 
                    className="font-semibold px-2 py-0.5 rounded-md whitespace-nowrap inline-block"
                    style={{ 
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                    }}
                  >
                    Sans raison
                  </span>
                </p>
              </div>
            </div>

            {/* Footer with prominent buttons */}
            <div 
              className="flex gap-3 justify-end px-6 py-5"
              style={{ 
                backgroundColor: 'var(--color-background)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <button
                type="button"
                onClick={closeSkipModal}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                }}
              >
                <X size={16} />
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSkipSubmit}
                className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 flex items-center gap-2 hover:scale-105 active:scale-95"
                style={{ 
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  boxShadow: '0 4px 14px -4px rgba(99, 102, 241, 0.5)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 20px -4px rgba(99, 102, 241, 0.6)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 14px -4px rgba(99, 102, 241, 0.5)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
                }}
              >
                <SkipForward size={18} />
                Passer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Interrupt Modal - Modern Design with Multi-Select Causes */}
      {interruptModal.open && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-900/40 backdrop-blur-md"
          onMouseDown={closeInterruptModal}
        >
          {/* Modal Container with modern shadow */}
          <div 
            className="relative w-full max-w-xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col"
            style={{ 
              backgroundColor: 'var(--color-card)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with gradient accent - Yellow/Amber theme */}
            <div 
              className="relative px-6 pt-6 pb-5 flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
              }}
            >
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-30" style={{
                background: 'radial-gradient(circle, rgba(234, 179, 8, 0.3) 0%, transparent 70%)',
                transform: 'translate(30%, -30%)',
              }} />
              <div className="absolute bottom-0 left-0 w-24 h-24 opacity-20" style={{
                background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%)',
                transform: 'translate(-30%, 30%)',
              }} />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Icon with gradient background */}
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
                      boxShadow: '0 8px 16px -4px rgba(234, 179, 8, 0.4)',
                    }}
                  >
                    <Pause size={26} className="text-white" />
                  </div>
                  <div>
                    <h3 
                      className="text-xl font-bold tracking-tight"
                      style={{ 
                        background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {t('interrupt.interruptTube')}
                    </h3>
                    <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {t(interruptModal.stage?.labelKey)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeInterruptModal}
                  className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105 group"
                  style={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  }}
                >
                  <X size={20} className="text-red-500 group-hover:text-red-600 transition-colors" />
                </button>
              </div>
            </div>

            {/* Body with scrollable content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Causes Section */}
              <div 
                className="rounded-2xl p-5 transition-all duration-300 mb-4"
                style={{ 
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}
                  >
                    <AlertTriangle size={18} style={{ color: '#eab308' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Causes de l'interruption
                    </h4>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Sélectionnez une ou plusieurs causes
                    </p>
                  </div>
                </div>
                
                {/* Causes Multi-Select Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {causesInterruption.map((cause) => {
                    const isSelected = interruptData.selectedCauses.some(c => c.id === cause.id);
                    const CauseIcon = cause.code === 'CI001' ? Package 
                      : cause.code === 'CI002' ? Circle 
                      : cause.code === 'CI003' ? AlertTriangle 
                      : cause.code === 'CI004' ? Settings2 
                      : cause.code === 'CI005' ? Clock 
                      : cause.code === 'CI006' ? Archive 
                      : MoreHorizontal;
                    
                    return (
                      <button
                        key={cause.id}
                        onClick={() => toggleInterruptCause(cause)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                          isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                        }`}
                        style={{
                          backgroundColor: isSelected 
                            ? 'rgba(234, 179, 8, 0.1)' 
                            : 'var(--color-card)',
                          borderColor: isSelected 
                            ? '#eab308' 
                            : 'var(--color-border)',
                          boxShadow: isSelected 
                            ? '0 4px 12px -4px rgba(234, 179, 8, 0.3)' 
                            : 'none',
                        }}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: isSelected 
                              ? 'rgba(234, 179, 8, 0.15)' 
                              : 'rgba(100, 116, 139, 0.1)',
                          }}
                        >
                          <CauseIcon size={16} style={{ color: isSelected ? '#eab308' : 'var(--color-text-muted)' }} />
                        </div>
                        <span 
                          className="text-sm font-medium text-left flex-1"
                          style={{ color: isSelected ? '#eab308' : 'var(--color-text-secondary)' }}
                        >
                          {cause.libelle}
                        </span>
                        {isSelected && (
                          <CheckCircle size={18} style={{ color: '#eab308' }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* "Autre" Text Input - Shows when "Autre" cause is selected */}
                {interruptData.selectedCauses.some(c => c.is_autre) && (
                  <div className="mt-4">
                    <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-muted)' }}>
                      {t('interrupt.specifyOtherCause')}
                    </label>
                    <input
                      type="text"
                      value={interruptData.autre_cause}
                      onChange={(e) => setInterruptData(prev => ({ ...prev, autre_cause: e.target.value }))}
                      placeholder={t('interrupt.describeOtherCause')}
                      className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:ring-2 focus:ring-yellow-500/30"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Responsabilité Section */}
              <div 
                className="rounded-2xl p-5 transition-all duration-300 mb-4"
                style={{ 
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.05)',
                }}
              >
                <CrudSelect
                  label={t('interrupt.responsibilityOptional')}
                  value={interruptData.responsabilite_id}
                  onChange={(item) => setInterruptData(prev => ({
                    ...prev,
                    responsabilite_id: item?.id || '',
                    responsabilite_libelle: item?.libelle || '',
                  }))}
                  items={responsabilites}
                  onRefresh={async () => {
                    const data = await reparationsAPI.getResponsabilites();
                    setResponsabilites(data);
                  }}
                  onAdd={reparationsAPI.createResponsabilite}
                  onUpdate={reparationsAPI.updateResponsabilite}
                  onDelete={reparationsAPI.deleteResponsabilite}
                  placeholder={t('interrupt.selectResponsiblePlaceholder')}
                  accentColor="#eab308"
                  icon={UserCheck}
                  showCode={false}
                />
              </div>

              {/* Commentaire Section */}
              <div 
                className="rounded-2xl p-5 transition-all duration-300"
                style={{ 
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}
                  >
                    <MessageSquare size={18} style={{ color: '#eab308' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {t('interrupt.comment')}
                    </h4>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {t('common.optional')} - {t('common.info')}
                    </p>
                  </div>
                </div>
                
                <textarea
                  value={interruptData.commentaire}
                  onChange={(e) => setInterruptData(prev => ({ ...prev, commentaire: e.target.value }))}
                  placeholder={t('interrupt.interruptDetails')}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:ring-2 focus:ring-yellow-500/30 resize-none"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              {/* Selected causes summary */}
              {interruptData.selectedCauses.length > 0 && (
                <div 
                  className="flex items-center gap-3 mt-4 p-4 rounded-xl"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.06) 0%, rgba(245, 158, 11, 0.06) 100%)',
                    border: '1px dashed rgba(234, 179, 8, 0.2)',
                  }}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}
                  >
                    <CheckCircle size={16} style={{ color: '#eab308' }} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="font-semibold">{interruptData.selectedCauses.length}</span> cause{interruptData.selectedCauses.length > 1 ? 's' : ''} sélectionnée{interruptData.selectedCauses.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Footer with prominent buttons */}
            <div 
              className="flex gap-3 justify-end px-6 py-5 flex-shrink-0"
              style={{ 
                backgroundColor: 'var(--color-background)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <button
                type="button"
                onClick={closeInterruptModal}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                }}
              >
                <X size={16} />
                Annuler
              </button>
              <button
                type="button"
                onClick={handleInterruptSubmit}
                disabled={interruptData.selectedCauses.length === 0}
                className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ 
                  background: interruptData.selectedCauses.length > 0 
                    ? 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)'
                    : 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
                  boxShadow: interruptData.selectedCauses.length > 0 
                    ? '0 4px 14px -4px rgba(234, 179, 8, 0.5)'
                    : 'none',
                }}
                onMouseEnter={(e) => {
                  if (interruptData.selectedCauses.length > 0) {
                    e.currentTarget.style.boxShadow = '0 6px 20px -4px rgba(234, 179, 8, 0.6)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ca8a04 0%, #d97706 100%)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (interruptData.selectedCauses.length > 0) {
                    e.currentTarget.style.boxShadow = '0 4px 14px -4px rgba(234, 179, 8, 0.5)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)';
                  }
                }}
              >
                <Pause size={18} />
                Interrompre
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Enhanced Repair Modal - Modern Design */}
      {repairModal.open && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm"
          onMouseDown={closeRepairModal}
        >
          {/* Modal Container */}
          <div 
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{ 
              backgroundColor: 'var(--color-card)',
            }}
          >
            {/* Header with gradient */}
            <div 
              className="flex items-center justify-between p-5 border-b"
              style={{ 
                borderColor: 'var(--color-border)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, transparent 100%)',
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  }}
                >
                  <Wrench size={22} className="text-white" />
                </div>
                <div>
                  <h3 
                    className="text-lg font-bold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {t('repair.repairTube')} - {t(repairModal.stage?.labelKey)}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {t('repair.repairForm')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeRepairModal}
                className="p-2.5 rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-110 active:scale-95"
              >
                <X size={20} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {dropdownsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)' }}
                  >
                    <Loader2 size={28} className="animate-spin" style={{ color: '#3b82f6' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Chargement des données...
                  </span>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Repairs List */}
                  {repairs.map((repair, repairIndex) => (
                    <div 
                      key={repairIndex}
                      className="rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-lg"
                      style={{ 
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      {/* Repair Card Header */}
                      <div 
                        className="flex items-center justify-between px-4 py-3 border-b"
                        style={{ 
                          borderColor: 'var(--color-border)',
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                            style={{ 
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: 'white',
                            }}
                          >
                            {repairIndex + 1}
                          </div>
                          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            Réparation #{repairIndex + 1}
                          </span>
                        </div>
                        {repairs.length > 1 && (
                          <button
                            onClick={() => removeRepairItem(repairIndex)}
                            className="p-2 rounded-lg transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900/30 hover:scale-110 active:scale-95"
                            title={t('repair.removeRepairConfirm')}
                          >
                            <Trash2 size={16} style={{ color: '#ef4444' }} />
                          </button>
                        )}
                      </div>

                      {/* Repair Card Body */}
                      <div className="p-4 space-y-4">
                        {/* Dropdowns Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Défaut Dropdown with CRUD - Multi-select */}
                          <CrudSelect
                            label={t('repair.defect')}
                            value={repair.defaut_ids}
                            onChange={(ids) => handleDropdownSelect(repairIndex, 'defaut', ids)}
                            items={defauts}
                            onAdd={reparationsAPI.createDefaut}
                            onUpdate={reparationsAPI.updateDefaut}
                            onDelete={reparationsAPI.deleteDefaut}
                            onRefresh={loadDropdownData}
                            required={true}
                            placeholder={t('repair.selectDefectPlaceholder')}
                            icon={CircleAlert}
                            accentColor="#ef4444"
                            multiple={true}
                          />

                          {/* Cause Dropdown with CRUD - Multi-select */}
                          <CrudSelect
                            label={t('repair.cause')}
                            value={repair.cause_ids}
                            onChange={(ids) => handleDropdownSelect(repairIndex, 'cause', ids)}
                            items={causes}
                            onAdd={reparationsAPI.createCause}
                            onUpdate={reparationsAPI.updateCause}
                            onDelete={reparationsAPI.deleteCause}
                            onRefresh={loadDropdownData}
                            placeholder={t('repair.selectCausePlaceholder')}
                            icon={HelpCircle}
                            accentColor="#f59e0b"
                            multiple={true}
                          />

                          {/* Responsabilité Dropdown with CRUD */}
                          <CrudSelect
                            label={t('repair.responsibility')}
                            value={repair.responsabilite_id}
                            onChange={(item) => handleDropdownSelect(repairIndex, 'responsabilite', item)}
                            items={responsabilites}
                            onAdd={reparationsAPI.createResponsabilite}
                            onUpdate={reparationsAPI.updateResponsabilite}
                            onDelete={reparationsAPI.deleteResponsabilite}
                            onRefresh={loadDropdownData}
                            showCode={false}
                            placeholder={t('repair.selectResponsibilityPlaceholder')}
                            icon={UserCheck}
                            accentColor="#8b5cf6"
                          />

                          {/* Réparation à faire */}
                          <div className="group">
                            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5 transition-colors group-focus-within:text-emerald-500" 
                              style={{ color: 'var(--color-text-muted)' }}>
                              <ClipboardList size={12} style={{ color: '#10b981' }} />
                              {t('repair.repairToDo')}
                            </label>
                            <input
                              type="text"
                              value={repair.reparation_a_faire}
                              onChange={(e) => updateRepairField(repairIndex, 'reparation_a_faire', e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl border-2 text-sm transition-all duration-200 
                                focus:ring-2 focus:ring-offset-1 focus:border-emerald-400 hover:border-emerald-300 hover:shadow-sm"
                              style={{
                                backgroundColor: 'var(--color-input)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-primary)',
                                '--tw-ring-color': 'rgba(16, 185, 129, 0.3)',
                              }}
                              placeholder={t('repair.defectDescription')}
                            />
                          </div>

                          {/* Action future - CrudSelect Dropdown Multi-select */}
                          <CrudSelect
                            label={t('repair.futureAction')}
                            value={repair.action_future_ids}
                            onChange={(ids) => handleDropdownSelect(repairIndex, 'action_future', ids)}
                            items={actionsFutures}
                            onAdd={reparationsAPI.createActionFuture}
                            onUpdate={reparationsAPI.updateActionFuture}
                            onDelete={reparationsAPI.deleteActionFuture}
                            onRefresh={loadDropdownData}
                            placeholder={t('repair.preventiveMeasures')}
                            icon={Shield}
                            accentColor="#06b6d4"
                            multiple={true}
                          />

                          {/* Commentaire - Full width */}
                          <div className="sm:col-span-2 group">
                            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5 transition-colors group-focus-within:text-indigo-500" 
                              style={{ color: 'var(--color-text-muted)' }}>
                              <StickyNote size={12} style={{ color: '#6366f1' }} />
                              {t('repair.comment')}
                            </label>
                            <textarea
                              value={repair.commentaire}
                              onChange={(e) => updateRepairField(repairIndex, 'commentaire', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2.5 rounded-xl border-2 text-sm transition-all duration-200 resize-none
                                focus:ring-2 focus:ring-offset-1 focus:border-indigo-400 hover:border-indigo-300 hover:shadow-sm"
                              style={{
                                backgroundColor: 'var(--color-input)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-primary)',
                                '--tw-ring-color': 'rgba(99, 102, 241, 0.3)',
                              }}
                              placeholder="Commentaire additionnel..."
                            />
                          </div>
                        </div>

                        {/* Images Section */}
                        <div 
                          className="p-4 rounded-xl border-2 border-dashed transition-all duration-200 hover:border-blue-300"
                          style={{ 
                            backgroundColor: 'var(--color-bg-tertiary)',
                            borderColor: 'var(--color-border)',
                          }}
                        >
                          <label className="flex items-center gap-2 text-xs font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                            <Camera size={14} style={{ color: '#3b82f6' }} />
                            Photos de la réparation
                            <span 
                              className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ 
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                color: '#3b82f6',
                              }}
                            >
                              {repair.images.filter(Boolean).length}/5
                            </span>
                          </label>
                          <div className="grid grid-cols-5 gap-2 sm:gap-3">
                            {[0, 1, 2, 3, 4].map((imgIndex) => {
                              const img = repair.images[imgIndex];
                              return (
                                <div
                                  key={imgIndex}
                                  className="relative aspect-square rounded-xl border-2 border-dashed overflow-hidden group transition-all duration-200 hover:scale-105"
                                  style={{ 
                                    borderColor: img ? '#3b82f6' : 'var(--color-border)',
                                    backgroundColor: img ? 'transparent' : 'var(--color-input)',
                                  }}
                                >
                                  {img ? (
                                    <>
                                      <img
                                        src={img.preview}
                                        alt={`Photo ${imgIndex + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                        <button
                                          onClick={() => removeRepairImage(repairIndex, imgIndex)}
                                          className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center 
                                            transform scale-0 group-hover:scale-100 transition-transform duration-200 hover:bg-red-600"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (e) => handleRepairImageSelect(repairIndex, imgIndex, e);
                                        input.click();
                                      }}
                                      className="w-full h-full flex flex-col items-center justify-center gap-1 
                                        transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    >
                                      <ImagePlus size={18} className="transition-transform group-hover:scale-110" style={{ color: 'var(--color-text-muted)' }} />
                                      <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                        Photo {imgIndex + 1}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Another Repair Button */}
                  <button
                    onClick={addRepairItem}
                    className="w-full py-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 
                      text-sm font-semibold transition-all duration-300 
                      hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent hover:border-solid hover:shadow-md
                      dark:hover:from-blue-900/20 hover:scale-[1.01] active:scale-[0.99]"
                    style={{ 
                      borderColor: '#3b82f6',
                      color: '#3b82f6',
                    }}
                  >
                    <Sparkles size={18} className="animate-pulse" />
                    Ajouter une autre réparation
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                    >
                      +1
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer with gradient */}
            <div 
              className="flex flex-col sm:flex-row gap-3 justify-end p-5 border-t"
              style={{ 
                borderColor: 'var(--color-border)',
                background: 'linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.05) 100%)',
              }}
            >
              <button
                type="button"
                onClick={closeRepairModal}
                className="px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 
                  hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105 active:scale-95 order-2 sm:order-1"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmitRepairs}
                disabled={loading || dropdownsLoading}
                className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold 
                  transition-all duration-200 flex items-center justify-center gap-2 
                  disabled:opacity-50 hover:shadow-lg hover:scale-105 active:scale-95 order-1 sm:order-2"
                style={{ 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                }}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Wrench size={16} />
                )}
                Enregistrer {repairs.length > 1 ? `(${repairs.length} réparations)` : 'la réparation'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Repair Resolution Modal - Shown when tube is "En réparation" */}
      {repairResolutionModal.open && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-900/40 backdrop-blur-md"
          onMouseDown={closeRepairResolutionModal}
        >
          {/* Modal Container */}
          <div 
            className="relative w-full max-w-lg rounded-3xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{ 
              backgroundColor: 'var(--color-card)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
          >
            {/* Header with gradient accent - Blue theme for repair */}
            <div 
              className="relative px-6 pt-6 pb-5"
              style={{ 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
              }}
            >
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-30" style={{
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                transform: 'translate(30%, -30%)',
              }} />
              <div className="absolute bottom-0 left-0 w-24 h-24 opacity-20" style={{
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
                transform: 'translate(-30%, 30%)',
              }} />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Icon with gradient background */}
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                      boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    <Wrench size={26} className="text-white" />
                  </div>
                  <div>
                    <h3 
                      className="text-xl font-bold tracking-tight"
                      style={{ 
                        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {t('repair.resolutionTitle')}
                    </h3>
                    <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {t(repairResolutionModal.stage?.labelKey)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeRepairResolutionModal}
                  className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105 group"
                  style={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  }}
                >
                  <X size={20} className="text-red-500 group-hover:text-red-600 transition-colors" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Status Info */}
              <div 
                className="flex items-center gap-3 p-4 rounded-xl mb-6"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.06) 0%, rgba(245, 158, 11, 0.06) 100%)',
                  border: '1px solid rgba(234, 179, 8, 0.2)',
                }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}
                >
                  <AlertTriangle size={20} style={{ color: '#eab308' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#eab308' }}>
                    Tube en réparation
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Choisissez la suite à donner à cette étape
                  </p>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {/* Réparation validée */}
                <button
                  type="button"
                  onClick={() => handleRepairResolution('repair_validated')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                    borderColor: 'rgba(34, 197, 94, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#22c55e';
                    e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px -4px rgba(34, 197, 94, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.2)';
                    e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.05)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    }}
                  >
                    <Check size={24} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                    Réparation validée
                  </span>
                  <span className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Passer à l'étape suivante
                  </span>
                </button>

                {/* Déroger */}
                <button
                  type="button"
                  onClick={() => handleRepairResolution('repair_derogation')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: 'rgba(249, 115, 22, 0.05)',
                    borderColor: 'rgba(249, 115, 22, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#f97316';
                    e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px -4px rgba(249, 115, 22, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.2)';
                    e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.05)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    }}
                  >
                    <AlertTriangle size={24} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#f97316' }}>
                    Déroger
                  </span>
                  <span className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Continuer malgré les défauts
                  </span>
                </button>

                {/* Rebuter */}
                <button
                  type="button"
                  onClick={() => handleRepairResolution('rebut')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: 'rgba(127, 29, 29, 0.05)',
                    borderColor: 'rgba(127, 29, 29, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#7f1d1d';
                    e.currentTarget.style.backgroundColor = 'rgba(127, 29, 29, 0.1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px -4px rgba(127, 29, 29, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(127, 29, 29, 0.2)';
                    e.currentTarget.style.backgroundColor = 'rgba(127, 29, 29, 0.05)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
                    }}
                  >
                    <Trash2 size={24} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#7f1d1d' }}>
                    Rebuter
                  </span>
                  <span className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Terminer le pipeline
                  </span>
                </button>

                {/* Déclasser */}
                <button
                  type="button"
                  onClick={() => handleRepairResolution('downgrade')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ef4444';
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px -4px rgba(239, 68, 68, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    }}
                  >
                    <TrendingDown size={24} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                    Déclasser
                  </span>
                  <span className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Terminer le pipeline
                  </span>
                </button>
              </div>

              {/* Optional Comment */}
              <div 
                className="rounded-2xl p-5 transition-all duration-300"
                style={{ 
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                  >
                    <MessageSquare size={18} style={{ color: '#3b82f6' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {t('repair.comment')}
                    </h4>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {t('common.optional')}
                    </p>
                  </div>
                </div>
                
                <textarea
                  value={repairResolutionComment}
                  onChange={(e) => setRepairResolutionComment(e.target.value)}
                  placeholder={t('interrupt.addDecisionComment')}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500/30 resize-none"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div 
              className="flex gap-3 justify-end px-6 py-5"
              style={{ 
                backgroundColor: 'var(--color-background)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <button
                type="button"
                onClick={closeRepairResolutionModal}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: 'rgba(107, 114, 128, 0.1)',
                  color: '#6b7280',
                  border: '1px solid rgba(107, 114, 128, 0.2)',
                }}
              >
                <X size={16} />
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
