import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Layers, Package, Calendar, AlertTriangle, Info, User, Clock, Hash } from 'lucide-react';
import { lotsAPI } from '../services/api';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';

export default function LotForm({ lot, onClose, onSuccess }) {
  const { t, i18n } = useTranslation();
  const isEditing = !!lot;
  const { toast } = useModal();
  const { currentUser } = useAuth();
  
  // Available bobines
  const [availableBobines, setAvailableBobines] = useState([]);
  const [loadingBobines, setLoadingBobines] = useState(true);
  const [noBobinesAvailable, setNoBobinesAvailable] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    numero: '',
    bobine_id: '',
    date_demarrage: new Date().toISOString().slice(0, 16), // datetime-local format
    notes: '',
    statut: 'En cours',
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Get selected bobine details
  const selectedBobine = availableBobines.find(b => b.id === parseInt(formData.bobine_id)) || null;

  // Format date for display
  const formatDateDisplay = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }) + ' à ' + date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load next lot number and available bobines on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingBobines(true);
        
        // Load available bobines
        const bobinesResult = await lotsAPI.getAvailableBobines();
        setAvailableBobines(bobinesResult.data || []);
        setNoBobinesAvailable((bobinesResult.data || []).length === 0);
        
        // If creating new lot, get next number
        if (!isEditing) {
          const nextNumberResult = await lotsAPI.getNextNumber();
          setFormData(prev => ({
            ...prev,
            numero: nextNumberResult.nextNumber,
          }));
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        toast({ message: 'Erreur lors du chargement des données', type: 'error' });
      } finally {
        setLoadingBobines(false);
      }
    };
    
    if (lot) {
      // Edit mode - populate form with lot data
      setFormData({
        numero: lot.numero || '',
        bobine_id: lot.bobine_id || '',
        date_demarrage: lot.date_demarrage ? new Date(lot.date_demarrage).toISOString().slice(0, 16) : '',
        notes: lot.notes || '',
        statut: lot.statut || 'En cours',
      });
      setLoadingBobines(false);
    } else {
      loadInitialData();
    }
  }, [lot, isEditing, toast]);

  // Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    
    if (!formData.numero.trim()) {
      newErrors.numero = 'Le numéro de lot est requis';
    }
    
    if (!isEditing && !formData.bobine_id) {
      newErrors.bobine_id = 'Une bobine doit être sélectionnée';
    }
    
    if (!formData.date_demarrage) {
      newErrors.date_demarrage = 'La date de démarrage est requise';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        date_demarrage: new Date(formData.date_demarrage).toISOString(),
      };
      
      if (!isEditing) {
        // Add creator info
        payload.created_by_user_id = currentUser?.id || null;
        payload.created_by_name = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : null;
      }
      
      if (isEditing) {
        await lotsAPI.update(lot.id, payload);
        toast({ message: 'Lot modifié avec succès', type: 'success' });
      } else {
        await lotsAPI.create(payload);
        toast({ message: 'Lot créé avec succès', type: 'success' });
      }
      
      onSuccess();
    } catch (err) {
      console.error('Error saving lot:', err);
      toast({ message: err.message || 'Erreur lors de l\'enregistrement', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Status options for editing
  const statutOptions = [
    { value: 'En attente', label: 'En attente' },
    { value: 'En cours', label: 'En cours' },
    { value: 'Production', label: 'Production' },
    { value: 'Terminé', label: 'Terminé' },
    { value: 'Annulé', label: 'Annulé' },
  ];

  // Get creator name
  const creatorName = currentUser ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() : 'Utilisateur';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Header */}
        <div className="p-6 gradient-primary flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Layers size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Modifier le lot' : 'Nouveau lot'}
              </h2>
              <p className="text-white/70 text-sm">
                {isEditing ? `Modification de ${lot.numero}` : 'Démarrer un nouveau lot de production'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Summary Card - Shows info in a modern card at the top */}
            <div 
              className="rounded-xl border overflow-hidden"
              style={{ 
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)'
              }}
            >
              {/* Card Header with Lot Number */}
              <div 
                className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-accent)', opacity: 0.15 }}
                  >
                    <Hash size={24} style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                      Numéro du lot
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <input
                        type="text"
                        name="numero"
                        value={formData.numero}
                        onChange={handleChange}
                        placeholder="Ex: 1, 2, 3..."
                        className={`text-2xl font-bold bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-24 ${errors.numero ? 'text-red-500' : ''}`}
                        style={{ color: errors.numero ? 'var(--color-error)' : 'var(--color-text-primary)' }}
                      />
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: 'var(--color-accent)',
                          color: 'white',
                          opacity: 0.9
                        }}
                      >
                        Auto
                      </span>
                    </div>
                  </div>
                </div>
                {errors.numero && (
                  <p className="text-sm" style={{ color: 'var(--color-error)' }}>{errors.numero}</p>
                )}
              </div>

              {/* Info Grid */}
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bobine Info */}
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                    >
                      <Package size={18} style={{ color: '#6366f1' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                        Bobine associée
                      </p>
                      {isEditing && lot.bobine_numero ? (
                        <div>
                          <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {lot.bobine_numero}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {lot.bobine_epaisseur && `${lot.bobine_epaisseur} mm`}
                            {lot.bobine_largeur && ` × ${lot.bobine_largeur} mm`}
                          </p>
                        </div>
                      ) : selectedBobine ? (
                        <div>
                          <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {selectedBobine.numero}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {selectedBobine.epaisseur && `${selectedBobine.epaisseur} mm`}
                            {selectedBobine.largeur && ` × ${selectedBobine.largeur} mm`}
                            {selectedBobine.grade_code && ` • ${selectedBobine.grade_code}`}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
                          Sélectionnez une bobine
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                    >
                      <Calendar size={18} style={{ color: '#22c55e' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                        Date de démarrage
                      </p>
                      <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {formData.date_demarrage ? formatDateDisplay(formData.date_demarrage) : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Created On */}
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                    >
                      <Clock size={18} style={{ color: '#f59e0b' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                        {isEditing ? 'Créé le' : 'Sera créé le'}
                      </p>
                      <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {isEditing && lot.created_at 
                          ? formatDateDisplay(lot.created_at)
                          : formatDateDisplay(new Date().toISOString())
                        }
                      </p>
                    </div>
                  </div>

                  {/* Creator */}
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
                    >
                      <User size={18} style={{ color: '#8b5cf6' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                        Créé par
                      </p>
                      <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {isEditing ? (lot.created_by_name || 'Non spécifié') : creatorName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* No bobines warning - only for creating */}
            {!isEditing && noBobinesAvailable && !loadingBobines && (
              <div 
                className="p-4 rounded-xl flex items-start gap-3"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              >
                <AlertTriangle size={22} style={{ color: 'var(--color-error)' }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-error)' }}>
                    Aucune bobine disponible
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Toutes les bobines sont actuellement en cours d'utilisation ou épuisées. 
                    Veuillez d'abord ajouter une nouvelle bobine avec le statut "Disponible".
                  </p>
                </div>
              </div>
            )}

            {/* Form Fields Section */}
            <div 
              className="rounded-xl border p-5 space-y-5"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Info size={16} style={{ color: 'var(--color-accent)' }} />
                Paramètres du lot
              </h3>

              {/* Bobine Selection - only for creating */}
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    <div className="flex items-center gap-2">
                      <Package size={16} />
                      Bobine à utiliser *
                    </div>
                  </label>
                  {loadingBobines ? (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                      <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                      <span style={{ color: 'var(--color-text-muted)' }}>Chargement des bobines...</span>
                    </div>
                  ) : (
                    <select
                      name="bobine_id"
                      value={formData.bobine_id}
                      onChange={handleChange}
                      disabled={noBobinesAvailable}
                      className={`w-full px-4 py-3 rounded-xl border focus-ring ${errors.bobine_id ? 'border-red-500' : ''}`}
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: errors.bobine_id ? 'var(--color-error)' : 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <option value="">Sélectionner une bobine</option>
                      {availableBobines.map((bobine) => (
                        <option key={bobine.id} value={bobine.id}>
                          {bobine.numero} - {bobine.grade_code || 'Sans grade'} 
                          {bobine.epaisseur && ` | ${bobine.epaisseur}mm`}
                          {bobine.largeur && ` × ${bobine.largeur}mm`}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.bobine_id && (
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>{errors.bobine_id}</p>
                  )}
                  <p className="mt-1 text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Info size={12} />
                    Seules les bobines avec le statut "Disponible" sont affichées
                  </p>
                </div>
              )}

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    Date de démarrage *
                  </div>
                </label>
                <input
                  type="datetime-local"
                  name="date_demarrage"
                  value={formData.date_demarrage}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border focus-ring ${errors.date_demarrage ? 'border-red-500' : ''}`}
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: errors.date_demarrage ? 'var(--color-error)' : 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                {errors.date_demarrage && (
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>{errors.date_demarrage}</p>
                )}
              </div>

              {/* Status - only for editing */}
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Statut
                  </label>
                  <select
                    name="statut"
                    value={formData.statut}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border focus-ring"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {statutOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border font-medium hover:bg-[var(--color-bg-secondary)] transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || (!isEditing && noBobinesAvailable)}
                className="flex-1 px-4 py-3 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  isEditing ? 'Enregistrer' : 'Créer le lot'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
