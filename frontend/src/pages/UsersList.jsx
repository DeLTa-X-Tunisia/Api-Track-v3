import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  RefreshCw,
  Copy,
  RotateCcw,
  Check,
  Power
} from 'lucide-react';
import { usersAPI } from '../services/api';
import { useModal } from '../context/ModalContext';
import { useRealTimeData, SOCKET_EVENTS } from '../context/SocketContext';
import UserForm from './UserForm';

export default function UsersList() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedActif, setSelectedActif] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Access code states
  const [visibleCodes, setVisibleCodes] = useState({});
  const [loadingCodes, setLoadingCodes] = useState({});
  const [copiedCode, setCopiedCode] = useState(null);

  // Modal context
  const { confirm, toast } = useModal();

  // Real-time callback
  const handleRealTimeUpdate = useCallback((event, data) => {
    // Reload data when any user event occurs
    loadUsers();
  }, []);

  // Subscribe to real-time user events
  useRealTimeData(
    [
      SOCKET_EVENTS.USER_CREATED,
      SOCKET_EVENTS.USER_UPDATED,
      SOCKET_EVENTS.USER_DELETED,
      SOCKET_EVENTS.USER_TOGGLED,
    ],
    handleRealTimeUpdate,
    true // Show notifications
  );

  // Role options
  const roleOptions = [
    { value: 'admin_systeme', label: 'Admin Système', color: '#8b5cf6' },
    { value: 'admin_limite', label: 'Admin accès limité', color: '#3b82f6' },
    { value: 'superviseur_limite', label: 'Superviseur accès limité', color: '#f59e0b' },
    { value: 'observateur_limite', label: 'Observateur accès limité', color: '#6b7280' },
  ];

  const getRoleBadge = (role) => {
    const option = roleOptions.find(o => o.value === role) || roleOptions[3];
    return (
      <span 
        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${option.color}20`, color: option.color }}
      >
        {option.label}
      </span>
    );
  };

  const getStatusBadge = (actif) => {
    return actif ? (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
        Actif
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-500">
        Inactif
      </span>
    );
  };

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (selectedRole) params.role = selectedRole;
      if (selectedActif !== '') params.actif = selectedActif;

      const result = await usersAPI.getAll(params);
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [pagination.page, search, selectedRole, selectedActif]);

  // Handlers
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await usersAPI.delete(id);
      setDeleteConfirm(null);
      loadUsers();
    } catch (err) {
      toast({ message: 'Erreur lors de la suppression: ' + err.message, type: 'error' });
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await usersAPI.toggleActive(user.id);
      loadUsers();
    } catch (err) {
      toast({ message: 'Erreur: ' + err.message, type: 'error' });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedUser(null);
    loadUsers();
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedRole('');
    setSelectedActif('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Access code handlers
  const handleViewCode = async (userId) => {
    if (visibleCodes[userId]) {
      setVisibleCodes(prev => ({ ...prev, [userId]: null }));
      return;
    }
    
    setLoadingCodes(prev => ({ ...prev, [userId]: true }));
    try {
      const result = await usersAPI.getAccessCode(userId);
      setVisibleCodes(prev => ({ ...prev, [userId]: result.code_acces }));
    } catch (err) {
      toast({ message: 'Erreur: ' + err.message, type: 'error' });
    } finally {
      setLoadingCodes(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleRegenerateCode = async (userId) => {
    const confirmed = await confirm({
      title: 'Régénérer le code d\'accès',
      message: 'L\'ancien code ne fonctionnera plus. Voulez-vous continuer ?',
      confirmText: 'Régénérer',
      cancelText: 'Annuler',
      type: 'warning',
    });
    
    if (!confirmed) return;
    
    setLoadingCodes(prev => ({ ...prev, [userId]: true }));
    try {
      const result = await usersAPI.regenerateCode(userId);
      setVisibleCodes(prev => ({ ...prev, [userId]: result.code_acces }));
      toast({ message: 'Code d\'accès régénéré avec succès', type: 'success' });
    } catch (err) {
      toast({ message: 'Erreur: ' + err.message, type: 'error' });
    } finally {
      setLoadingCodes(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleCopyCode = async (userId) => {
    const code = visibleCodes[userId];
    if (!code) {
      // First fetch the code
      setLoadingCodes(prev => ({ ...prev, [userId]: true }));
      try {
        const result = await usersAPI.getAccessCode(userId);
        await navigator.clipboard.writeText(result.code_acces);
        setCopiedCode(userId);
        setTimeout(() => setCopiedCode(null), 2000);
      } catch (err) {
        toast({ message: 'Erreur: ' + err.message, type: 'error' });
      } finally {
        setLoadingCodes(prev => ({ ...prev, [userId]: false }));
      }
    } else {
      await navigator.clipboard.writeText(code);
      setCopiedCode(userId);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Gestion des <span className="gradient-text">Utilisateurs</span>
          </h1>
          <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {pagination.total} utilisateur{pagination.total > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium gradient-primary hover:opacity-90 transition-opacity shadow-lg"
        >
          <Plus size={20} />
          <span>Nouvel utilisateur</span>
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
                placeholder="Rechercher par nom, prénom ou matricule..."
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
              showFilters || selectedRole || selectedActif !== ''
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
                : ''
            }`}
            style={{ 
              borderColor: showFilters || selectedRole || selectedActif !== ''
                ? 'var(--color-accent)' 
                : 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <Filter size={18} />
            <span>Filtres</span>
            {(selectedRole || selectedActif !== '') && (
              <span className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-white text-xs flex items-center justify-center">
                {(selectedRole ? 1 : 0) + (selectedActif !== '' ? 1 : 0)}
              </span>
            )}
          </button>

          <button
            onClick={loadUsers}
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
                Rôle
              </label>
              <select
                value={selectedRole}
                onChange={(e) => { setSelectedRole(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="w-full px-3 py-2 rounded-lg border focus-ring"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">Tous les rôles</option>
                {roleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Statut
              </label>
              <select
                value={selectedActif}
                onChange={(e) => { setSelectedActif(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="w-full px-3 py-2 rounded-lg border focus-ring"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">Tous les statuts</option>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </div>

            {(selectedRole || selectedActif !== '') && (
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
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Aucun utilisateur trouvé
            </p>
            <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {search || selectedRole || selectedActif !== ''
                ? 'Essayez de modifier vos filtres'
                : 'Commencez par créer un nouvel utilisateur'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Matricule
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Nom complet
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell" style={{ color: 'var(--color-text-primary)' }}>
                    Rôle
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold hidden lg:table-cell" style={{ color: 'var(--color-text-primary)' }}>
                    Code d'accès
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
                {users.map((user) => (
                  <tr 
                    key={user.id}
                    className="border-t hover:bg-[var(--color-bg-secondary)]/50 transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                          <Users size={18} className="text-white" />
                        </div>
                        <span className="font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {user.matricule}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {user.prenom} {user.nom}
                      </p>
                      <p className="text-sm md:hidden" style={{ color: 'var(--color-text-muted)' }}>
                        {roleOptions.find(o => o.value === user.role)?.label || user.role}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {visibleCodes[user.id] || '••••••'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewCode(user.id)}
                            disabled={loadingCodes[user.id]}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                            title={visibleCodes[user.id] ? "Masquer" : "Voir"}
                          >
                            {loadingCodes[user.id] ? (
                              <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                            ) : visibleCodes[user.id] ? (
                              <EyeOff size={16} style={{ color: 'var(--color-text-secondary)' }} />
                            ) : (
                              <Eye size={16} style={{ color: 'var(--color-text-secondary)' }} />
                            )}
                          </button>
                          <button
                            onClick={() => handleRegenerateCode(user.id)}
                            disabled={loadingCodes[user.id]}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                            title="Régénérer"
                          >
                            <RotateCcw size={16} style={{ color: 'var(--color-text-secondary)' }} />
                          </button>
                          <button
                            onClick={() => handleCopyCode(user.id)}
                            disabled={loadingCodes[user.id]}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                            title="Copier"
                          >
                            {copiedCode === user.id ? (
                              <Check size={16} style={{ color: '#22c55e' }} />
                            ) : (
                              <Copy size={16} style={{ color: 'var(--color-text-secondary)' }} />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {getStatusBadge(user.actif)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.actif 
                              ? 'hover:bg-orange-500/10' 
                              : 'hover:bg-green-500/10'
                          }`}
                          title={user.actif ? "Désactiver" : "Activer"}
                        >
                          <Power 
                            size={18} 
                            style={{ color: user.actif ? '#f59e0b' : '#22c55e' }} 
                          />
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={18} style={{ color: 'var(--color-accent)' }} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(user)}
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
              Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{deleteConfirm.prenom} {deleteConfirm.nom}</strong> ({deleteConfirm.matricule}) ?
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
        <UserForm
          user={selectedUser}
          onClose={() => { setShowForm(false); setSelectedUser(null); }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
