import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
  RefreshCw,
  Calendar,
  Package,
  User,
  AlertTriangle,
  ClipboardList,
  Wrench,
  Check
} from 'lucide-react';
import { lotsAPI } from '../services/api';
import { useModal } from '../context/ModalContext';
import { useRealTimeData, SOCKET_EVENTS } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import LotForm from './LotForm';
import LotDetail from './LotDetail';

// Mini Pipeline Component for list view
const MiniPipeline = ({ lot }) => {
  const { t } = useTranslation();
  const stages = [
    { key: 'demandee', icon: ClipboardList, label: t('lotPipeline.demandee') },
    { key: 'recue', icon: Package, label: t('lotPipeline.recue') },
    { key: 'installee', icon: Wrench, label: t('lotPipeline.installee') },
  ];

  const getStageState = (stageKey, index) => {
    const isValidated = lot[`${stageKey}_validee`];
    if (isValidated) return 'validated';
    
    // Check if this is the next stage to validate (first non-validated stage)
    const previousStages = stages.slice(0, index);
    const allPreviousValidated = previousStages.every(s => lot[`${s.key}_validee`]);
    if (allPreviousValidated) return 'active';
    
    return 'waiting';
  };

  const stageColors = {
    waiting: { bg: '#9ca3af', bgLight: 'rgba(156, 163, 175, 0.15)' },
    active: { bg: '#f59e0b', bgLight: 'rgba(245, 158, 11, 0.15)' },
    validated: { bg: '#22c55e', bgLight: 'rgba(34, 197, 94, 0.15)' },
  };

  const validatedCount = stages.filter(s => lot[`${s.key}_validee`]).length;

  const getStateLabel = (state) => {
    if (state === 'validated') return t('lotPipeline.validated');
    if (state === 'active') return t('lotPipeline.waiting');
    return t('lotPipeline.notStarted');
  };

  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, index) => {
        const state = getStageState(stage.key, index);
        const colors = stageColors[state];
        const Icon = stage.icon;
        const isValidated = state === 'validated';

        return (
          <div key={stage.key} className="flex items-center">
            <div 
              className="relative group"
              title={`${stage.label}: ${getStateLabel(state)}`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{ 
                  backgroundColor: colors.bgLight,
                  border: `2px solid ${colors.bg}`,
                }}
              >
                {isValidated ? (
                  <Check size={14} style={{ color: colors.bg }} strokeWidth={3} />
                ) : (
                  <Icon size={14} style={{ color: colors.bg }} />
                )}
              </div>
            </div>
            {index < stages.length - 1 && (
              <div 
                className="w-3 h-0.5 mx-0.5"
                style={{ 
                  backgroundColor: lot[`${stages[index + 1].key}_validee`] || lot[`${stage.key}_validee`] 
                    ? stageColors.validated.bg 
                    : 'var(--color-border)' 
                }}
              />
            )}
          </div>
        );
      })}
      <span 
        className="ml-2 text-xs font-medium"
        style={{ color: validatedCount === 3 ? '#22c55e' : 'var(--color-text-muted)' }}
      >
        {validatedCount}/3
      </span>
    </div>
  );
};

export default function LotsList() {
  const { t, i18n } = useTranslation();
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Status options with translations
  const getStatutOptions = () => [
    { value: 'En attente', label: t('statuses.pending'), color: '#6366f1' },
    { value: 'En cours', label: t('statuses.inProgress'), color: '#f59e0b' },
    { value: 'Production', label: t('statuses.production'), color: '#06b6d4' },
    { value: 'Terminé', label: t('statuses.completed'), color: '#22c55e' },
    { value: 'Annulé', label: t('statuses.cancelled'), color: '#ef4444' },
  ];
  
  const statutOptions = getStatutOptions();

  const getStatutBadge = (statut) => {
    const currentOptions = getStatutOptions();
    const option = currentOptions.find(o => o.value === statut) || currentOptions[0];
    return (
      <span 
        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${option.color}20`, color: option.color }}
      >
        {option.label}
      </span>
    );
  };
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Context
  const { toast, confirm } = useModal();
  const { currentUser } = useAuth();

  // Real-time callback
  const handleRealTimeUpdate = useCallback((event, data) => {
    // Reload data when any lot event occurs
    loadLots();
  }, []);

  // Subscribe to real-time lot and bobine events
  useRealTimeData(
    [
      SOCKET_EVENTS.LOT_CREATED,
      SOCKET_EVENTS.LOT_UPDATED,
      SOCKET_EVENTS.LOT_DELETED,
      SOCKET_EVENTS.BOBINE_UPDATED, // To refresh when bobine status changes
    ],
    handleRealTimeUpdate,
    true // Show notifications
  );

  // Load lots
  const loadLots = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (selectedStatut) params.statut = selectedStatut;

      const result = await lotsAPI.getAll(params);
      setLots(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLots();
  }, [pagination.page, search, selectedStatut]);

  // Handlers
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCreate = () => {
    setSelectedLot(null);
    setShowForm(true);
  };

  const handleEdit = (lot) => {
    setSelectedLot(lot);
    setShowForm(true);
  };

  const handleView = (lot) => {
    setSelectedLot(lot);
    setShowDetail(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: t('lots.deleteLot'),
      message: t('lots.deleteConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger'
    });

    if (confirmed) {
      try {
        await lotsAPI.delete(id);
        toast({ message: t('lots.lotDeleted'), type: 'success' });
        loadLots();
      } catch (err) {
        toast({ message: t('lots.deleteError') + ': ' + err.message, type: 'error' });
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedLot(null);
    loadLots();
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedStatut('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('lots.title')}
          </h1>
          <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {pagination.total} {t('lots.lotsFound')}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium gradient-primary hover:opacity-90 transition-opacity shadow-lg"
        >
          <Plus size={20} />
          <span>{t('dashboard.newLot')}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div 
        className="p-4 rounded-2xl border"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search 
                size={18} 
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <input
                type="text"
                placeholder={t('lots.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus-ring"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </form>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
              showFilters || selectedStatut
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
                : ''
            }`}
            style={{ 
              borderColor: showFilters || selectedStatut
                ? 'var(--color-accent)' 
                : 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <Filter size={18} />
            <span>{t('common.filters')}</span>
            {selectedStatut && (
              <span className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-white text-xs flex items-center justify-center">
                1
              </span>
            )}
          </button>

          <button
            onClick={loadLots}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border hover:bg-[var(--color-bg-secondary)] transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <RefreshCw size={18} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('common.status')}
              </label>
              <select
                value={selectedStatut}
                onChange={(e) => { setSelectedStatut(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="w-full px-3 py-2 rounded-lg border focus-ring"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">{t('lots.allStatuses')}</option>
                {statutOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {selectedStatut && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors self-end"
                style={{ color: 'var(--color-error)' }}
              >
                <X size={16} />
                {t('common.resetFilters')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div 
          className="p-4 rounded-xl flex items-center gap-3"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}
        >
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div 
        className="rounded-2xl border overflow-hidden"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <th className="text-left px-4 py-3 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('lots.number')}
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('navigation.bobines')}
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('lots.startDate')}
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('lots.createdBy')}
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('lots.pipeline')}
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('common.status')}
                </th>
                <th className="text-right px-4 py-3 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                      <span style={{ color: 'var(--color-text-muted)' }}>{t('common.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : lots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Layers size={48} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                    <p style={{ color: 'var(--color-text-muted)' }}>
                      {search || selectedStatut ? t('lots.noLotsFiltered') : t('lots.noLots')}
                    </p>
                  </td>
                </tr>
              ) : (
                lots.map((lot) => (
                  <tr 
                    key={lot.id} 
                    className="border-t hover:bg-[var(--color-bg-secondary)]/50 transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => handleView(lot)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Layers size={16} className="text-white" />
                        </div>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {lot.numero}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package size={16} style={{ color: 'var(--color-text-muted)' }} />
                        <div>
                          <span style={{ color: 'var(--color-text-primary)' }}>
                            {lot.bobine_numero || '-'}
                          </span>
                          {lot.grade_code && (
                            <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
                              ({lot.grade_code})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} style={{ color: 'var(--color-text-muted)' }} />
                        <span style={{ color: 'var(--color-text-primary)' }}>
                          {formatDateTime(lot.date_demarrage)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User size={16} style={{ color: 'var(--color-text-muted)' }} />
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {lot.created_by_name || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <MiniPipeline lot={lot} />
                    </td>
                    <td className="px-4 py-3">
                      {getStatutBadge(lot.statut)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleView(lot)}
                          className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                          title={t('common.details')}
                        >
                          <Eye size={18} style={{ color: 'var(--color-text-secondary)' }} />
                        </button>
                        <button
                          onClick={() => handleEdit(lot)}
                          className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit2 size={18} style={{ color: 'var(--color-accent)' }} />
                        </button>
                        <button
                          onClick={() => handleDelete(lot.id)}
                          className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 size={18} style={{ color: 'var(--color-error)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div 
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {t('common.pageOf', { current: pagination.page, total: pagination.totalPages })}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <ChevronLeft size={18} style={{ color: 'var(--color-text-primary)' }} />
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg border hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <ChevronRight size={18} style={{ color: 'var(--color-text-primary)' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <LotForm
          lot={selectedLot}
          onClose={() => { setShowForm(false); setSelectedLot(null); }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Detail Modal */}
      {showDetail && (
        <LotDetail
          lot={selectedLot}
          onClose={() => { setShowDetail(false); setSelectedLot(null); }}
          onEdit={() => { setShowDetail(false); handleEdit(selectedLot); }}
          onUpdate={(updatedLot) => {
            setSelectedLot(updatedLot);
            setLots(prev => prev.map(l => l.id === updatedLot.id ? updatedLot : l));
          }}
        />
      )}
    </div>
  );
}
