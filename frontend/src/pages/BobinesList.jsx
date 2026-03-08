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
  Package,
  X,
  RefreshCw
} from 'lucide-react';
import { bobinesAPI, gradesAPI, fournisseursAPI } from '../services/api';
import { useModal } from '../context/ModalContext';
import { useRealTimeData, SOCKET_EVENTS } from '../context/SocketContext';
import BobineForm from './BobineForm';
import BobineDetail from './BobineDetail';

export default function BobinesList() {
  const { t } = useTranslation();
  const [bobines, setBobines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedFournisseur, setSelectedFournisseur] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Status options - matching database values (case-insensitive)
  const statutOptions = [
    { value: 'disponible', label: 'Disponible', color: '#22c55e' },
    { value: 'en cours', label: 'En cours', color: '#f59e0b' },
    { value: 'installée', label: 'Installée', color: '#6366f1' },
    { value: 'epuisee', label: 'Épuisée', color: '#ef4444' },
  ];

  // Reload trigger for real-time updates
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const getStatutBadge = (statut) => {
    const normalizedStatut = (statut || '').toLowerCase();
    const option = statutOptions.find(o => o.value === normalizedStatut) || statutOptions[0];
    return (
      <span 
        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${option.color}20`, color: option.color }}
      >
        {option.label}
      </span>
    );
  };
  
  // Reference data
  const [grades, setGrades] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedBobine, setSelectedBobine] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Modal context
  const { toast } = useModal();

  // Real-time callback - trigger reload
  const handleRealTimeUpdate = useCallback((event, data) => {
    // Trigger reload when any bobine event occurs
    setReloadTrigger(prev => prev + 1);
  }, []);

  // Subscribe to real-time bobine events
  useRealTimeData(
    [
      SOCKET_EVENTS.BOBINE_CREATED,
      SOCKET_EVENTS.BOBINE_UPDATED,
      SOCKET_EVENTS.BOBINE_DELETED,
    ],
    handleRealTimeUpdate,
    true // Show notifications
  );

  // Load reference data
  useEffect(() => {
    const loadRefData = async () => {
      try {
        const [gradesData, fournisseursData] = await Promise.all([
          gradesAPI.getAll(),
          fournisseursAPI.getAll()
        ]);
        setGrades(gradesData);
        setFournisseurs(fournisseursData);
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    };
    loadRefData();
  }, []);

  // Load bobines
  const loadBobines = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (selectedGrade) params.grade_id = selectedGrade;
      if (selectedFournisseur) params.fournisseur_id = selectedFournisseur;
      if (selectedStatut) params.statut = selectedStatut;

      const result = await bobinesAPI.getAll(params);
      setBobines(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBobines();
  }, [pagination.page, search, selectedGrade, selectedFournisseur, selectedStatut, reloadTrigger]);

  // Handlers
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCreate = () => {
    setSelectedBobine(null);
    setShowForm(true);
  };

  const handleEdit = (bobine) => {
    setSelectedBobine(bobine);
    setShowForm(true);
  };

  const handleView = (bobine) => {
    setSelectedBobine(bobine);
    setShowDetail(true);
  };

  const handleDelete = async (id) => {
    try {
      await bobinesAPI.delete(id);
      setDeleteConfirm(null);
      loadBobines();
    } catch (err) {
      toast({ message: 'Erreur lors de la suppression: ' + err.message, type: 'error' });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedBobine(null);
    loadBobines();
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedGrade('');
    setSelectedFournisseur('');
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

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Gestion des <span className="gradient-text">Bobines</span>
          </h1>
          <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {pagination.total} bobine{pagination.total > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium gradient-primary hover:opacity-90 transition-opacity shadow-lg"
        >
          <Plus size={20} />
          <span>Nouvelle bobine</span>
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
                placeholder="Rechercher par numéro de bobine..."
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
              showFilters || selectedGrade || selectedFournisseur || selectedStatut
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
                : ''
            }`}
            style={{ 
              borderColor: showFilters || selectedGrade || selectedFournisseur || selectedStatut
                ? 'var(--color-accent)' 
                : 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <Filter size={18} />
            <span>Filtres</span>
            {(selectedGrade || selectedFournisseur || selectedStatut) && (
              <span className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-white text-xs flex items-center justify-center">
                {(selectedGrade ? 1 : 0) + (selectedFournisseur ? 1 : 0) + (selectedStatut ? 1 : 0)}
              </span>
            )}
          </button>

          <button
            onClick={loadBobines}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border hover:bg-[var(--color-bg-secondary)] transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <RefreshCw size={18} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Grade
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => { setSelectedGrade(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="w-full px-3 py-2 rounded-lg border focus-ring"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">Tous les grades</option>
                {grades.map(grade => (
                  <option key={grade.id} value={grade.id}>{grade.code}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Fournisseur
              </label>
              <select
                value={selectedFournisseur}
                onChange={(e) => { setSelectedFournisseur(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="w-full px-3 py-2 rounded-lg border focus-ring"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">Tous les fournisseurs</option>
                {fournisseurs.map(f => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Statut
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
                <option value="">Tous les statuts</option>
                {statutOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {(selectedGrade || selectedFournisseur || selectedStatut) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors self-end"
                style={{ color: 'var(--color-error)' }}
              >
                <X size={16} />
                Effacer les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
          {error}
        </div>
      )}

      {/* Table */}
      <div 
        className="rounded-2xl border overflow-hidden"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4" style={{ color: 'var(--color-text-muted)' }}>Chargement...</p>
          </div>
        ) : bobines.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Aucune bobine trouvée
            </p>
            <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {search || selectedGrade || selectedFournisseur 
                ? 'Essayez de modifier vos filtres'
                : 'Commencez par créer une nouvelle bobine'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Numéro
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell" style={{ color: 'var(--color-text-primary)' }}>
                    Grade / Nuance
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold hidden lg:table-cell" style={{ color: 'var(--color-text-primary)' }}>
                    Dimensions
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold hidden sm:table-cell" style={{ color: 'var(--color-text-primary)' }}>
                    Poids
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold hidden xl:table-cell" style={{ color: 'var(--color-text-primary)' }}>
                    Fournisseur
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold hidden lg:table-cell" style={{ color: 'var(--color-text-primary)' }}>
                    Réception
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold hidden sm:table-cell" style={{ color: 'var(--color-text-primary)' }}>
                    Statut
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {bobines.map((bobine, index) => (
                  <tr 
                    key={bobine.id}
                    className="border-t hover:bg-[var(--color-bg-secondary)]/50 transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                          <Package size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {bobine.numero}
                          </p>
                          {bobine.photo_count > 0 && (
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {bobine.photo_count} photo{bobine.photo_count > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {bobine.grade_code || '-'}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {bobine.nuance_code || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell" style={{ color: 'var(--color-text-secondary)' }}>
                      {bobine.epaisseur} × {bobine.largeur} mm
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {formatNumber(bobine.poids)} kg
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell" style={{ color: 'var(--color-text-secondary)' }}>
                      {bobine.fournisseur_nom || '-'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatDate(bobine.date_reception)}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {getStatutBadge(bobine.statut)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleView(bobine)}
                          className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                          title="Voir détails"
                        >
                          <Eye size={18} style={{ color: 'var(--color-text-secondary)' }} />
                        </button>
                        <button
                          onClick={() => handleEdit(bobine)}
                          className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={18} style={{ color: 'var(--color-accent)' }} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(bobine)}
                          className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={18} style={{ color: 'var(--color-error)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div 
            className="px-4 py-3 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Page {pagination.page} sur {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <ChevronLeft size={18} style={{ color: 'var(--color-text-primary)' }} />
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg border hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <ChevronRight size={18} style={{ color: 'var(--color-text-primary)' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mobile-overlay">
          <div 
            className="w-full max-w-md p-6 rounded-2xl shadow-xl"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Confirmer la suppression
            </h3>
            <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              Êtes-vous sûr de vouloir supprimer la bobine <strong>{deleteConfirm.numero}</strong> ?
              Cette action est irréversible.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border hover:bg-[var(--color-bg-secondary)] transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <BobineForm
          bobine={selectedBobine}
          onClose={() => { setShowForm(false); setSelectedBobine(null); }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Detail Modal */}
      {showDetail && selectedBobine && (
        <BobineDetail
          bobineId={selectedBobine.id}
          onClose={() => { setShowDetail(false); setSelectedBobine(null); }}
          onEdit={() => { setShowDetail(false); setShowForm(true); }}
        />
      )}
    </div>
  );
}
