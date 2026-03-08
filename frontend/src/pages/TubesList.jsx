import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cylinder,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Check,
  Zap,
  FileText,
  ChevronDown,
  Award,
  Medal,
  Ban,
  ArrowDownCircle,
  Wrench,
  Calendar,
  Link2,
  Package,
  Disc,
} from 'lucide-react';
import { tubesAPI, lotsAPI, bobinesAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useModal } from '../context/ModalContext';
import TubeForm from './TubeForm';
import TubePipeline from '../components/TubePipeline';

// Pipeline stages for compact view
const PIPELINE_STAGES = [
  { key: 'formage', label: 'Formage', shortLabel: 'FOR', labelKey: 'stages.formage' },
  { key: 'pointage', label: 'Pointage', shortLabel: 'PNT', labelKey: 'stages.pointage' },
  { key: 'cv_pointage', label: 'CV Pointage', shortLabel: 'CVP', labelKey: 'stages.cvPointage' },
  { key: 'saw', label: 'SAW ID/OD', shortLabel: 'SAW', labelKey: 'stages.saw' },
  { key: 'cv_cordon', label: 'CV Cordon', shortLabel: 'CVC', labelKey: 'stages.cvCordon' },
  { key: 'macro', label: 'Macro', shortLabel: 'MAC', labelKey: 'stages.macro' },
  { key: 'chanfrein', label: 'Chanfrein', shortLabel: 'CHF', labelKey: 'stages.chanfrein' },
  { key: 'hydrotest', label: 'Hydrotest', shortLabel: 'HYD', labelKey: 'stages.hydrotest' },
  { key: 'cv_fuite', label: 'CV Fuite', shortLabel: 'CVF', labelKey: 'stages.cvFuite' },
  { key: 'ut', label: 'UT', shortLabel: 'UT', labelKey: 'stages.ut' },
  { key: 'radio', label: 'Radio Scopie', shortLabel: 'RAD', labelKey: 'stages.radioScopie' },
  { key: 'controle_dim', label: 'Ctrl Dim.', shortLabel: 'DIM', labelKey: 'stages.controleDim' },
];

// Status badge colors
const STATUS_STYLES = {
  'En attente': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: Clock, color: '#f59e0b' },
  'En cours': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: RefreshCw, color: '#3b82f6' },
  'Terminé': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle, color: '#22c55e' },
  'Annulé': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle, color: '#ef4444' },
  'Interrompu': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', icon: XCircle, color: '#dc2626' },
  // Certification statuses with distinct colors
  'Certifié Hydraulique': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', icon: Award, color: '#06b6d4' },
  'Certifié API 5L': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', icon: Medal, color: '#a855f7' },
  // Quality/Repair statuses
  'Rebuté': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-400', icon: Ban, color: '#9f1239' },
  'Déclassé': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-400', icon: ArrowDownCircle, color: '#b45309' },
  'En réparation': { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400', icon: Wrench, color: '#0284c7' },
};

export default function TubesList() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [tubes, setTubes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lotFilter, setLotFilter] = useState('');
  const [bobineFilter, setBobineFilter] = useState('');
  const [sawDateFrom, setSawDateFrom] = useState('');
  const [sawDateTo, setSawDateTo] = useState('');
  const [crossWeldingFilter, setCrossWeldingFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTube, setSelectedTube] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTube, setExpandedTube] = useState(null);
  const [loadingTubeId, setLoadingTubeId] = useState(null);
  const [lots, setLots] = useState([]);
  const [bobines, setBobines] = useState([]);

  const { socket } = useSocket();
  const { toast, confirm } = useModal();

  const itemsPerPage = 10;

  // Load single tube with full history
  const loadTubeWithHistory = useCallback(async (tubeId) => {
    try {
      setLoadingTubeId(tubeId);
      const fullTube = await tubesAPI.getById(tubeId);
      // Update tube in list with full data including history
      setTubes(prev => prev.map(t => t.id === tubeId ? fullTube : t));
      return fullTube;
    } catch (error) {
      console.error('Error loading tube:', error);
      return null;
    } finally {
      setLoadingTubeId(null);
    }
  }, []);

  // Load lots and bobines for filters
  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [lotsRes, bobinesRes] = await Promise.all([
          lotsAPI.getAll({ limit: 1000 }),
          bobinesAPI.getAll({ limit: 1000 })
        ]);
        setLots(lotsRes.data || []);
        setBobines(bobinesRes.data || []);
      } catch (error) {
        console.error('Error loading filters data:', error);
      }
    };
    loadFiltersData();
  }, []);

  // Load tubes
  const loadTubes = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
      };
      
      // Only add non-empty filters
      if (search) params.search = search;
      if (statusFilter) params.statut = statusFilter;
      if (lotFilter) params.lot_id = lotFilter;
      if (bobineFilter) params.bobine_id = bobineFilter;
      if (sawDateFrom) params.saw_date_from = sawDateFrom;
      if (sawDateTo) params.saw_date_to = sawDateTo;
      if (crossWeldingFilter !== '') params.is_cross_welding = crossWeldingFilter;
      
      const response = await tubesAPI.getAll(params);
      setTubes(response.data || []);
      setTotalPages(response.totalPages || 1);
      setTotalCount(response.total || 0);
    } catch (error) {
      toast.error(t('tubes.loadError'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, lotFilter, bobineFilter, sawDateFrom, sawDateTo, crossWeldingFilter]);

  useEffect(() => {
    loadTubes();
  }, [loadTubes]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleTubeCreated = (data) => {
      loadTubes();
    };

    const handleTubeUpdated = (data) => {
      // data contains { tube: tubeData }
      const updatedTube = data.tube || data;
      // Update tube in list - replace entirely to include history data
      setTubes(prev => prev.map(t => t.id === updatedTube.id ? updatedTube : t));
      // Also update selected tube if it's the same one
      setSelectedTube(prev => prev?.id === updatedTube.id ? updatedTube : prev);
    };

    const handleTubeDeleted = ({ id }) => {
      setTubes(prev => prev.filter(t => t.id !== id));
    };

    socket.on('TUBE_CREATED', handleTubeCreated);
    socket.on('TUBE_UPDATED', handleTubeUpdated);
    socket.on('TUBE_DELETED', handleTubeDeleted);

    return () => {
      socket.off('TUBE_CREATED', handleTubeCreated);
      socket.off('TUBE_UPDATED', handleTubeUpdated);
      socket.off('TUBE_DELETED', handleTubeDeleted);
    };
  }, [socket, loadTubes]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTubes();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (tube) => {
    const confirmed = await confirm({
      title: t('modals.deleteTitle'),
      message: t('tubes.deleteConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await tubesAPI.delete(tube.id);
        toast.success(t('tubes.tubeDeleted'));
        loadTubes();
      } catch (error) {
        toast.error(error.message || t('tubes.deleteError'));
      }
    }
  };

  const handleEdit = (tube) => {
    setSelectedTube(tube);
    setShowForm(true);
  };

  const handleView = async (tube) => {
    // Load full tube data with history before showing detail
    const fullTube = await loadTubeWithHistory(tube.id);
    if (fullTube) {
      setSelectedTube(fullTube);
      setShowDetail(true);
    }
  };

  const handleExpandPipeline = async (tubeId, isCurrentlyExpanded) => {
    if (isCurrentlyExpanded) {
      setExpandedTube(null);
    } else {
      // Load full tube data with history before expanding
      await loadTubeWithHistory(tubeId);
      setExpandedTube(tubeId);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedTube(null);
  };

  const handleFormSuccess = () => {
    loadTubes();
  };

  const StatusBadge = ({ status, compact = false }) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES['En attente'];
    const Icon = style.icon;
    
    // Map status values to translation keys
    const statusTranslationKeys = {
      'En attente': 'statuses.pending',
      'En cours': 'statuses.inProgress',
      'Terminé': 'statuses.completed',
      'Annulé': 'statuses.cancelled',
      'Interrompu': 'statuses.interrupted',
      'Certifié Hydraulique': 'statuses.certifiedHydraulic',
      'Certifié API 5L': 'statuses.certifiedAPI5L',
      'Rebuté': 'statuses.rejected',
      'Déclassé': 'statuses.declassified',
      'En réparation': 'statuses.inRepair',
    };
    
    const translatedStatus = t(statusTranslationKeys[status] || 'statuses.pending');
    
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${style.bg} ${style.text}`}
        title={translatedStatus}
      >
        <Icon size={12} className="flex-shrink-0" />
        <span className="sm:hidden">{compact ? '' : translatedStatus}</span>
        <span className="hidden sm:inline">{translatedStatus}</span>
      </span>
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 sm:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Cylinder size={20} className="text-white sm:hidden" />
            <Cylinder size={24} className="text-white hidden sm:block" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {t('tubes.title')}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <span className="sm:hidden">{t('tubes.pipelineMobile')}</span>
              <span className="hidden sm:inline">{t('tubes.pipelineSubtitle')}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => { setSelectedTube(null); setShowForm(true); }}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-medium text-white transition-all hover:scale-105 active:scale-95 shadow-lg touch-manipulation w-full sm:w-auto"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Plus size={18} className="flex-shrink-0" />
          <span>{t('dashboard.newTube')}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-2 sm:gap-4">
        {[
          { status: 'En attente', translationKey: 'statuses.pending' },
          { status: 'En cours', translationKey: 'statuses.inProgress' },
          { status: 'Terminé', translationKey: 'statuses.completed' },
          { status: 'Annulé', translationKey: 'statuses.cancelled' },
          { status: 'Interrompu', translationKey: 'statuses.interrupted' },
          { status: 'Certifié Hydraulique', translationKey: 'statuses.certifiedHydraulic' },
          { status: 'Certifié API 5L', translationKey: 'statuses.certifiedAPI5L' },
          { status: 'Rebuté', translationKey: 'statuses.rejected' },
          { status: 'Déclassé', translationKey: 'statuses.declassified' },
          { status: 'En réparation', translationKey: 'statuses.inRepair' },
        ].map(({ status, translationKey }) => {
          const count = tubes.filter(tube => tube.statut === status).length;
          const style = STATUS_STYLES[status];
          const Icon = style.icon;
          const translatedLabel = t(translationKey);
          return (
            <div
              key={status}
              className="p-2 sm:p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
              style={{ 
                backgroundColor: 'var(--color-card)',
                borderColor: statusFilter === status ? style.color : 'var(--color-border)',
                boxShadow: statusFilter === status ? `0 0 0 2px ${style.color}20` : 'none',
              }}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{count}</p>
                  <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--color-text-muted)' }} title={translatedLabel}>
                    <span>{translatedLabel}</span>
                  </p>
                </div>
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg flex-shrink-0 flex items-center justify-center ${style.bg}`}>
                  <Icon size={18} className={`sm:hidden ${style.text}`} />
                  <Icon size={22} className={`hidden sm:block ${style.text}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div 
        className="p-4 rounded-xl border"
        style={{ 
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search 
              size={18} 
              className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`}
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder={t('tubes.searchPlaceholder')}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-lg border focus-ring`}
              style={{ 
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${showFilters ? 'bg-[var(--color-accent)] text-white border-transparent' : ''}`}
            style={!showFilters ? { 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            } : {}}
          >
            <Filter size={18} />
            {t('common.filters')}
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors hover:bg-[var(--color-bg-secondary)]"
            style={{ 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4" style={{ borderColor: 'var(--color-border)' }}>
            {/* Status Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                {t('common.status')}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 rounded-lg border focus-ring text-sm"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">{t('tubes.allStatuses')}</option>
                <option value="En attente">{t('statuses.pending')}</option>
                <option value="En cours">{t('statuses.inProgress')}</option>
                <option value="Terminé">{t('statuses.completed')}</option>
                <option value="Annulé">{t('statuses.cancelled')}</option>
                <option value="Interrompu">{t('statuses.interrupted')}</option>
                <option value="Certifié Hydraulique">{t('statuses.certifiedHydraulic')}</option>
                <option value="Certifié API 5L">{t('statuses.certifiedAPI5L')}</option>
                <option value="Rebuté">{t('statuses.rejected')}</option>
                <option value="Déclassé">{t('statuses.declassified')}</option>
                <option value="En réparation">{t('statuses.inRepair')}</option>
              </select>
            </div>

            {/* Lot Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                <Package size={14} className="text-blue-500" />
                <span>{t('tubes.lot')}</span>
              </label>
              <select
                value={lotFilter}
                onChange={(e) => { setLotFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 rounded-lg border focus-ring text-sm"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">{t('tubes.allLots')}</option>
                {lots.map(lot => (
                  <option key={lot.id} value={lot.id}>{lot.numero}</option>
                ))}
              </select>
            </div>

            {/* Bobine Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                <Disc size={14} className="text-amber-500" />
                <span>{t('tubes.bobine')}</span>
              </label>
              <select
                value={bobineFilter}
                onChange={(e) => { setBobineFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 rounded-lg border focus-ring text-sm"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">{t('tubes.allBobines')}</option>
                {bobines.map(bobine => (
                  <option key={bobine.id} value={bobine.id}>{bobine.numero}</option>
                ))}
              </select>
            </div>

            {/* SAW Date From */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                <Calendar size={14} className="text-violet-500" />
                <span>{t('tubes.sawDateFrom')}</span>
              </label>
              <input
                type="date"
                value={sawDateFrom}
                onChange={(e) => { setSawDateFrom(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 rounded-lg border focus-ring text-sm"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* SAW Date To */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                <Calendar size={14} className="text-violet-500" />
                <span>{t('tubes.sawDateTo')}</span>
              </label>
              <input
                type="date"
                value={sawDateTo}
                onChange={(e) => { setSawDateTo(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 rounded-lg border focus-ring text-sm"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* Cross Welding Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                <Link2 size={14} className="text-pink-500" />
                <span>{t('tubes.crossWelding')}</span>
              </label>
              <select
                value={crossWeldingFilter}
                onChange={(e) => { setCrossWeldingFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 rounded-lg border focus-ring text-sm"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">{t('common.all')}</option>
                <option value="true">{t('tubes.crossWeldingOnly')}</option>
                <option value="false">{t('tubes.normalOnly')}</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              {(statusFilter || lotFilter || bobineFilter || sawDateFrom || sawDateTo || crossWeldingFilter) && (
                <button
                  onClick={() => { 
                    setStatusFilter(''); 
                    setLotFilter('');
                    setBobineFilter('');
                    setSawDateFrom(''); 
                    setSawDateTo(''); 
                    setCrossWeldingFilter('');
                    setCurrentPage(1); 
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors w-full justify-center sm:w-auto"
                >
                  <X size={16} />
                  <span>{t('common.reset')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Count & Active Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {totalCount} {t('tubes.tubesFound')}
        </p>
        {/* Active filters tags */}
        {(statusFilter || lotFilter || bobineFilter || sawDateFrom || sawDateTo || crossWeldingFilter) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {statusFilter && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full"
                style={{ 
                  backgroundColor: STATUS_STYLES[statusFilter]?.color + '20',
                  color: STATUS_STYLES[statusFilter]?.color,
                }}
              >
                {statusFilter}
                <button onClick={() => setStatusFilter('')} className="hover:opacity-70">
                  <X size={12} />
                </button>
              </span>
            )}
            {lotFilter && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
              >
                <Package size={12} />
                Lot: {lots.find(l => l.id === parseInt(lotFilter))?.numero || lotFilter}
                <button onClick={() => setLotFilter('')} className="hover:opacity-70">
                  <X size={12} />
                </button>
              </span>
            )}
            {bobineFilter && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
              >
                <Disc size={12} />
                Bobine: {bobines.find(b => b.id === parseInt(bobineFilter))?.numero || bobineFilter}
                <button onClick={() => setBobineFilter('')} className="hover:opacity-70">
                  <X size={12} />
                </button>
              </span>
            )}
            {(sawDateFrom || sawDateTo) && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
              >
                <Calendar size={12} />
                SAW: {sawDateFrom && new Date(sawDateFrom).toLocaleDateString('fr-FR')}
                {sawDateFrom && sawDateTo && ' → '}
                {sawDateTo && new Date(sawDateTo).toLocaleDateString('fr-FR')}
                <button 
                  onClick={() => { setSawDateFrom(''); setSawDateTo(''); }} 
                  className="hover:opacity-70"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {crossWeldingFilter && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400"
              >
                <Link2 size={12} />
                {crossWeldingFilter === 'true' ? 'C.W' : 'Normal'}
                <button onClick={() => setCrossWeldingFilter('')} className="hover:opacity-70">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tubes List - Card Layout */}
      <div className="space-y-4">
        {loading ? (
          <div 
            className="flex items-center justify-center py-16 rounded-xl border"
            style={{ 
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
          </div>
        ) : tubes.length === 0 ? (
          <div 
            className="flex flex-col items-center justify-center py-16 rounded-xl border"
            style={{ 
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <AlertCircle size={48} style={{ color: 'var(--color-text-muted)' }} />
            <p className="mt-4 text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {t('tubes.noTubesFound')}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {search || statusFilter || lotFilter || bobineFilter ? t('tubes.modifyFilters') : t('tubes.startCreateTube')}
            </p>
          </div>
        ) : (
          tubes.map((tube) => {
            const validatedCount = PIPELINE_STAGES.filter(s => tube[`${s.key}_validee`]).length;
            const currentStageIndex = PIPELINE_STAGES.findIndex((s, i) => {
              const isValidated = tube[`${s.key}_validee`];
              if (isValidated) return false;
              const prevStages = PIPELINE_STAGES.slice(0, i);
              return prevStages.every(ps => tube[`${ps.key}_validee`]);
            });
            const currentStage = currentStageIndex >= 0 ? PIPELINE_STAGES[currentStageIndex] : null;
            const isExpanded = expandedTube === tube.id;
            const formatDate = (dateStr) => {
              if (!dateStr) return '';
              return new Date(dateStr).toLocaleDateString('fr-FR');
            };

            return (
              <div
                key={tube.id}
                className="rounded-xl border overflow-hidden transition-shadow hover:shadow-lg active:scale-[0.995]"
                style={{ 
                  backgroundColor: 'var(--color-card)',
                  borderColor: isExpanded ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              >
                {/* Compact Card Header */}
                <div className="p-3 sm:p-4" dir={isRTL ? 'rtl' : 'ltr'}>
                  <div className={`flex items-start justify-between gap-2 sm:gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {/* Left: Tube Info */}
                    <div className={`flex items-start gap-2 sm:gap-3 min-w-0 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {/* Icon */}
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 border-2"
                        style={{ 
                          borderColor: STATUS_STYLES[tube.statut]?.color || 'var(--color-border)',
                          backgroundColor: 'var(--color-bg-secondary)',
                        }}
                      >
                        <Cylinder size={16} className="sm:hidden" style={{ color: STATUS_STYLES[tube.statut]?.color || 'var(--color-text-muted)' }} />
                        <Cylinder size={20} className="hidden sm:block" style={{ color: STATUS_STYLES[tube.statut]?.color || 'var(--color-text-muted)' }} />
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-bold text-base sm:text-lg" style={{ color: 'var(--color-text-primary)' }}>
                            N°{tube.numero}
                          </span>
                          <StatusBadge status={tube.statut} />
                          {tube.is_cross_welding && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border border-pink-300 dark:border-pink-700">
                              <Link2 size={10} />
                              C.W
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          <span className="truncate">
                            {tube.lot_numero && `Lot ${tube.lot_numero}`}
                            {tube.is_cross_welding && tube.lot2_numero && ` → Lot ${tube.lot2_numero}`}
                            {(tube.lot_numero || tube.lot2_numero) && ' · '}
                            ø{tube.diametre_mm}mm
                            <span className="hidden sm:inline"> ({tube.diametre_pouce}")</span>
                          </span>
                        </p>
                        {/* Dates row */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] sm:text-xs">
                          {tube.created_at && (
                            <span className="flex items-center gap-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              <span className="hidden sm:inline">Début:</span>
                              <span>{formatDate(tube.created_at)}</span>
                            </span>
                          )}
                          {tube.saw_validated_at && (
                            <span className="flex items-center gap-0.5 text-violet-600 dark:text-violet-400 font-medium">
                              <span>SAW:</span>
                              <span>{formatDate(tube.saw_validated_at)}</span>
                            </span>
                          )}
                        </div>
                        {/* Last validated stage info */}
                        {validatedCount > 0 && (
                          <p className="text-[10px] sm:text-xs mt-1 flex items-center gap-1" style={{ color: '#22c55e' }}>
                            <Zap size={10} className="flex-shrink-0" />
                            <span className="truncate">
                              {PIPELINE_STAGES[validatedCount - 1].label}
                              <span className="hidden sm:inline">
                                {' '}{tube[`${PIPELINE_STAGES[validatedCount - 1].key}_validated_at`] && formatDate(tube[`${PIPELINE_STAGES[validatedCount - 1].key}_validated_at`])}
                              </span>
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Current Stage + Actions */}
                    <div className={`flex items-center gap-1.5 sm:gap-3 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {/* Current Stage Badge */}
                      <div className={`${isRTL ? 'text-left' : 'text-right'} hidden sm:block`}>
                        <span 
                          className="text-sm font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {currentStage ? t(currentStage.labelKey) : t('pipeline.done')}
                        </span>
                        <span 
                          className={`text-xs ${isRTL ? 'mr-1.5' : 'ml-1.5'} px-1.5 py-0.5 rounded font-medium`}
                          style={{ 
                            backgroundColor: validatedCount === 12 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: validatedCount === 12 ? '#22c55e' : '#f59e0b',
                          }}
                        >
                          {validatedCount}/12
                        </span>
                      </div>
                      
                      {/* Mobile progress indicator */}
                      <span 
                        className="sm:hidden text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ 
                          backgroundColor: validatedCount === 12 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: validatedCount === 12 ? '#22c55e' : '#f59e0b',
                        }}
                      >
                        {validatedCount}/12
                      </span>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <button
                          onClick={() => handleEdit(tube)}
                          className="p-1.5 sm:p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors touch-manipulation active:scale-90"
                          title={t('common.edit')}
                        >
                          <Edit2 size={14} className="sm:hidden" style={{ color: 'var(--color-text-muted)' }} />
                          <Edit2 size={16} className="hidden sm:block" style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                        <button
                          onClick={() => handleDelete(tube)}
                          className="p-1.5 sm:p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors touch-manipulation active:scale-90"
                          title={t('common.delete')}
                        >
                          <Trash2 size={14} className="text-red-500 sm:hidden" />
                          <Trash2 size={16} className="text-red-500 hidden sm:block" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5 sm:mt-3">
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className={`text-xs font-semibold w-16 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: 'var(--color-text-primary)' }}>
                        {t('stages.formage')}
                      </span>
                      <div className="flex-1 flex gap-0.5">
                        {PIPELINE_STAGES.map((stage, idx) => {
                          const isValidated = tube[`${stage.key}_validee`];
                          const isActive = idx === currentStageIndex;
                          let bgColor = '#e5e7eb'; // gray - waiting
                          if (isValidated) bgColor = '#22c55e'; // green - validated
                          else if (isActive) bgColor = '#3b82f6'; // blue - active
                          
                          return (
                            <div
                              key={stage.key}
                              className="h-1.5 sm:h-2 flex-1 rounded-full transition-colors"
                              style={{ backgroundColor: bgColor }}
                              title={`${t(stage.labelKey)}: ${isValidated ? t('pipeline.validated') : isActive ? t('pipeline.stageInfo') : t('pipeline.upcoming')}`}
                            />
                          );
                        })}
                      </div>
                      <span className="hidden sm:block text-xs font-semibold text-center w-20" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('pipeline.validatedCount', { validated: validatedCount, total: 12 })}
                      </span>
                      <span className={`hidden sm:block text-xs font-semibold w-16 ${isRTL ? 'text-left' : 'text-right'}`} style={{ color: 'var(--color-text-primary)' }}>
                        {t('stages.controleDim')}
                      </span>
                    </div>
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() => handleExpandPipeline(tube.id, isExpanded)}
                    disabled={loadingTubeId === tube.id}
                    className="w-full mt-2.5 sm:mt-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-[var(--color-bg-secondary)] active:scale-[0.98] disabled:opacity-50 touch-manipulation"
                    style={{ 
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {loadingTubeId === tube.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ChevronDown 
                        size={14} 
                        className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    )}
                    {loadingTubeId === tube.id ? t('common.loading') : isExpanded ? t('common.hide') : t('pipeline.fullPipeline')}
                  </button>
                </div>

                {/* Expanded Pipeline */}
                {isExpanded && (
                  <div 
                    className="px-4 pb-4 border-t pt-4"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <TubePipeline
                      tube={tube}
                      compact={false}
                      onUpdate={(updatedTube) => {
                        setTubes(prev => prev.map(t => t.id === updatedTube.id ? updatedTube : t));
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg-secondary)]"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <ChevronLeft size={20} style={{ color: 'var(--color-text-primary)' }} />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    currentPage === page 
                      ? 'bg-[var(--color-accent)] text-white' 
                      : 'hover:bg-[var(--color-bg-secondary)]'
                  }`}
                  style={currentPage !== page ? { color: 'var(--color-text-primary)' } : {}}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg-secondary)]"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <ChevronRight size={20} style={{ color: 'var(--color-text-primary)' }} />
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <TubeForm
          tube={selectedTube}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Detail Modal */}
      {showDetail && selectedTube && (
        <TubeDetailModal
          tube={selectedTube}
          onClose={() => { setShowDetail(false); setSelectedTube(null); }}
          onUpdate={(updatedTube) => {
            setTubes(prev => prev.map(t => t.id === updatedTube.id ? updatedTube : t));
            setSelectedTube(updatedTube);
          }}
        />
      )}
    </div>
  );
}

// Tube Detail Modal Component
function TubeDetailModal({ tube, onClose, onUpdate }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div 
        className={`relative w-full max-w-4xl rounded-2xl border shadow-2xl flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ 
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        {/* Header - Fixed */}
        <div 
          className={`flex-shrink-0 flex items-center justify-between px-6 py-4 border-b ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Cylinder size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {t('common.tube')} N° {tube.numero}
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {tube.diametre_pouce}" ({tube.diametre_mm} mm) • {tube.longueur} m
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <X size={20} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* Cross Welding Info Banner */}
          {tube.is_cross_welding && (
            <div className={`flex items-start gap-3 p-4 rounded-xl bg-pink-50 dark:bg-pink-900/20 border-2 border-pink-200 dark:border-pink-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Link2 size={20} className="text-pink-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-pink-700 dark:text-pink-300">
                <p className="font-semibold mb-1">{t('tubes.crossWelding')} (C.W)</p>
                <p>{t('tubes.crossWeldingInfo')}: <strong>{t('tubes.lot')} {tube.lot_numero}</strong> &amp; <strong>{t('tubes.lot')} {tube.lot2_numero}</strong></p>
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoCard label={t('tubes.lot')} value={tube.lot_numero ? `${t('tubes.lot')} ${tube.lot_numero}` : '-'} />
            {tube.is_cross_welding && (
              <InfoCard label={t('tubes.lot2')} value={tube.lot2_numero ? `${t('tubes.lot')} ${tube.lot2_numero}` : '-'} highlight />
            )}
            <InfoCard label={t('tubes.bobine')} value={tube.bobine_numero || '-'} />
            <InfoCard label={t('bobines.grade')} value={tube.grade_code || '-'} />
            <InfoCard label={t('bobines.nuance')} value={tube.nuance_code || '-'} />
            <InfoCard label={t('bobines.thickness')} value={tube.bobine_epaisseur ? `${tube.bobine_epaisseur} mm` : '-'} />
            <InfoCard label={t('tubes.length')} value={tube.longueur ? `${tube.longueur} m` : '-'} />
            <InfoCard label={t('common.status')} value={tube.statut} />
            <InfoCard label={t('tubes.createdBy')} value={tube.created_by_name || '-'} />
          </div>

          {/* Notes */}
          {tube.notes && (
            <div 
              className="p-4 rounded-xl border"
              style={{ 
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('tubes.observations')}</p>
              <p style={{ color: 'var(--color-text-primary)' }}>{tube.notes}</p>
            </div>
          )}

          {/* Full Pipeline */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {t('pipeline.title')}
            </h3>
            <TubePipeline
              tube={tube}
              compact={false}
              onUpdate={onUpdate}
            />
          </div>
        </div>

        {/* Footer - Fixed */}
        <div 
          className={`flex-shrink-0 flex items-center ${isRTL ? 'justify-start' : 'justify-end'} px-6 py-4 border-t`}
          style={{ 
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-card)',
          }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-medium text-white transition-transform hover:scale-105"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, highlight }) {
  return (
    <div 
      className={`p-3 rounded-lg ${highlight ? 'border-2 border-pink-300 dark:border-pink-700 bg-pink-50 dark:bg-pink-900/20' : ''}`}
      style={{ backgroundColor: highlight ? undefined : 'var(--color-bg-secondary)' }}
    >
      <p className={`text-xs ${highlight ? 'text-pink-600 dark:text-pink-400' : ''}`} style={{ color: highlight ? undefined : 'var(--color-text-muted)' }}>{label}</p>
      <p className={`font-medium ${highlight ? 'text-pink-700 dark:text-pink-300' : ''}`} style={{ color: highlight ? undefined : 'var(--color-text-primary)' }}>{value}</p>
    </div>
  );
}
