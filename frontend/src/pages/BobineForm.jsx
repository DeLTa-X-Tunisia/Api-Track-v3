import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Trash2, Plus, Loader2, Pencil } from 'lucide-react';
import { bobinesAPI, gradesAPI, fournisseursAPI } from '../services/api';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';
import FournisseurModal from '../components/FournisseurModal';

export default function BobineForm({ bobine, onClose, onSuccess }) {
  const { t } = useTranslation();
  const isEdit = !!bobine;
  
  // Form state
  const [formData, setFormData] = useState({
    numero: '',
    grade_id: '',
    nuance_id: '',
    epaisseur: '',
    largeur: '',
    poids: '',
    fournisseur_id: '',
    date_reception: new Date().toISOString().split('T')[0],
    statut: 'disponible',
  });
  
  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [photosToDelete, setPhotosToDelete] = useState([]);
  
  // Reference data
  const [grades, setGrades] = useState([]);
  const [nuances, setNuances] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingNuances, setLoadingNuances] = useState(false);
  const [errors, setErrors] = useState({});
  const [showFournisseurModal, setShowFournisseurModal] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState(null);
  
  // Modal context
  const { confirm, toast } = useModal();
  
  // Auth context - for automatic creator tracking
  const { currentUser } = useAuth();

  // Load reference data
  useEffect(() => {
    const loadData = async () => {
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
    loadData();
  }, []);

  // Load bobine data for editing
  useEffect(() => {
    if (bobine) {
      setFormData({
        numero: bobine.numero || '',
        grade_id: bobine.grade_id || '',
        nuance_id: bobine.nuance_id || '',
        epaisseur: bobine.epaisseur || '',
        largeur: bobine.largeur || '',
        poids: bobine.poids || '',
        fournisseur_id: bobine.fournisseur_id || '',
        date_reception: bobine.date_reception ? bobine.date_reception.split('T')[0] : '',
        statut: bobine.statut || 'disponible',
      });
      
      // Load photos
      if (bobine.id) {
        bobinesAPI.getPhotos(bobine.id).then(photos => {
          setExistingPhotos(photos);
        }).catch(console.error);
      }
    }
  }, [bobine]);

  // Load nuances when grade changes
  useEffect(() => {
    if (formData.grade_id) {
      setLoadingNuances(true);
      gradesAPI.getNuances(formData.grade_id)
        .then(data => {
          setNuances(data);
          // Clear nuance if it doesn't belong to new grade
          if (formData.nuance_id && !data.find(n => n.id == formData.nuance_id)) {
            setFormData(prev => ({ ...prev, nuance_id: '' }));
          }
        })
        .catch(console.error)
        .finally(() => setLoadingNuances(false));
    } else {
      setNuances([]);
      setFormData(prev => ({ ...prev, nuance_id: '' }));
    }
  }, [formData.grade_id]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Handle photo selection
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    const totalPhotos = existingPhotos.length - photosToDelete.length + photos.length + files.length;
    
    if (totalPhotos > 5) {
      toast({ message: 'Maximum 5 photos par bobine', type: 'warning' });
      return;
    }
    
    const validFiles = files.filter(file => {
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        toast({ message: `${file.name}: Type de fichier non autorisé`, type: 'error' });
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ message: `${file.name}: Fichier trop volumineux (max 5MB)`, type: 'error' });
        return false;
      }
      return true;
    });
    
    setPhotos(prev => [...prev, ...validFiles]);
  };

  // Remove new photo
  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Mark existing photo for deletion
  const markPhotoForDeletion = (photoId) => {
    setPhotosToDelete(prev => [...prev, photoId]);
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    
    if (!formData.numero.trim()) {
      newErrors.numero = t('validation.bobineNumberRequired');
    }
    if (!formData.epaisseur || formData.epaisseur <= 0) {
      newErrors.epaisseur = t('validation.thicknessPositive');
    }
    if (!formData.largeur || formData.largeur <= 0) {
      newErrors.largeur = t('validation.widthPositive');
    }
    if (!formData.poids || formData.poids <= 0) {
      newErrors.poids = t('validation.weightPositive');
    }
    if (!formData.date_reception) {
      newErrors.date_reception = t('validation.dateRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      let bobineId;
      
      if (isEdit) {
        await bobinesAPI.update(bobine.id, formData);
        bobineId = bobine.id;
        
        // Delete marked photos
        for (const photoId of photosToDelete) {
          await bobinesAPI.deletePhoto(bobineId, photoId);
        }
      } else {
        // Automatically use the connected user as creator
        const created_by_name = currentUser 
          ? `${currentUser.prenom} ${currentUser.nom}` 
          : null;
        const created_by_user_id = currentUser?.id || null;
        
        const result = await bobinesAPI.create({
          ...formData,
          created_by_user_id,
          created_by_name,
        });
        bobineId = result.id;
      }
      
      // Upload new photos
      if (photos.length > 0) {
        await bobinesAPI.uploadPhotos(bobineId, photos);
      }
      
      onSuccess();
    } catch (err) {
      if (err.message.includes('existe déjà')) {
        setErrors({ numero: t('bobines.bobineExists') });
      } else {
        toast({ message: t('common.error') + ': ' + err.message, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh fournisseurs after adding/editing one
  const handleFournisseurSuccess = async (fournisseur) => {
    const fournisseursData = await fournisseursAPI.getAll();
    setFournisseurs(fournisseursData);
    if (!editingFournisseur) {
      // Only auto-select for new fournisseur
      setFormData(prev => ({ ...prev, fournisseur_id: fournisseur.id }));
    }
    setShowFournisseurModal(false);
    setEditingFournisseur(null);
  };

  // Edit fournisseur
  const handleEditFournisseur = () => {
    const fournisseur = fournisseurs.find(f => f.id == formData.fournisseur_id);
    if (fournisseur) {
      setEditingFournisseur(fournisseur);
      setShowFournisseurModal(true);
    }
  };

  // Delete fournisseur
  const handleDeleteFournisseur = async () => {
    const fournisseur = fournisseurs.find(f => f.id == formData.fournisseur_id);
    if (!fournisseur) return;
    
    const confirmed = await confirm({
      title: t('suppliers.deleteSupplier'),
      message: t('suppliers.deleteConfirm', { name: fournisseur.nom }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
    });
    
    if (confirmed) {
      try {
        await fournisseursAPI.delete(fournisseur.id);
        const fournisseursData = await fournisseursAPI.getAll();
        setFournisseurs(fournisseursData);
        setFormData(prev => ({ ...prev, fournisseur_id: '' }));
        toast({ message: t('suppliers.supplierDeleted'), type: 'success' });
      } catch (err) {
        toast({ message: t('common.error') + ': ' + err.message, type: 'error' });
      }
    }
  };

  const totalPhotosCount = existingPhotos.length - photosToDelete.length + photos.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 mobile-overlay overflow-y-auto">
      <div 
        className="w-full max-w-2xl my-8 rounded-2xl shadow-xl"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isEdit ? t('bobines.edit') : t('bobines.create')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <X size={20} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Numéro */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {t('bobines.number')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="numero"
              value={formData.numero}
              onChange={handleChange}
              placeholder="Ex: BOB-2024-001"
              className={`w-full px-4 py-2.5 rounded-xl border focus-ring ${errors.numero ? 'border-red-500' : ''}`}
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: errors.numero ? '' : 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {errors.numero && <p className="mt-1 text-sm text-red-500">{errors.numero}</p>}
          </div>

          {/* Grade & Nuance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Grade
              </label>
              <select
                name="grade_id"
                value={formData.grade_id}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border focus-ring"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">Sélectionner un grade</option>
                {grades.map(grade => (
                  <option key={grade.id} value={grade.id}>{grade.code}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Nuance
              </label>
              <select
                name="nuance_id"
                value={formData.nuance_id}
                onChange={handleChange}
                disabled={!formData.grade_id || loadingNuances}
                className="w-full px-4 py-2.5 rounded-xl border focus-ring disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">
                  {loadingNuances ? t('common.loading') : t('bobines.selectNuance')}
                </option>
                {nuances.map(nuance => (
                  <option key={nuance.id} value={nuance.id}>{nuance.code}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('bobines.thicknessMm')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="epaisseur"
                value={formData.epaisseur}
                onChange={handleChange}
                placeholder="Ex: 12"
                step="0.01"
                min="0"
                className={`w-full px-4 py-2.5 rounded-xl border focus-ring ${errors.epaisseur ? 'border-red-500' : ''}`}
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: errors.epaisseur ? '' : 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              {errors.epaisseur && <p className="mt-1 text-sm text-red-500">{errors.epaisseur}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('bobines.widthMm')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="largeur"
                value={formData.largeur}
                onChange={handleChange}
                placeholder="Ex: 1500"
                step="0.01"
                min="0"
                className={`w-full px-4 py-2.5 rounded-xl border focus-ring ${errors.largeur ? 'border-red-500' : ''}`}
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: errors.largeur ? '' : 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              {errors.largeur && <p className="mt-1 text-sm text-red-500">{errors.largeur}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('bobines.weightKg')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="poids"
                value={formData.poids}
                onChange={handleChange}
                placeholder="Ex: 32000"
                step="0.01"
                min="0"
                className={`w-full px-4 py-2.5 rounded-xl border focus-ring ${errors.poids ? 'border-red-500' : ''}`}
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: errors.poids ? '' : 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              {errors.poids && <p className="mt-1 text-sm text-red-500">{errors.poids}</p>}
            </div>
          </div>

          {/* Fournisseur */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {t('bobines.supplier')}
            </label>
            <div className="flex gap-2">
              <select
                name="fournisseur_id"
                value={formData.fournisseur_id}
                onChange={handleChange}
                className="flex-1 px-4 py-2.5 rounded-xl border focus-ring"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">Sélectionner un fournisseur</option>
                {fournisseurs.map(f => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
              {formData.fournisseur_id && (
                <>
                  <button
                    type="button"
                    onClick={handleEditFournisseur}
                    className="px-3 py-2.5 rounded-xl border hover:bg-[var(--color-bg-secondary)] transition-colors"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    title={t('suppliers.editSupplier')}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteFournisseur}
                    className="px-3 py-2.5 rounded-xl border hover:bg-red-50 hover:border-red-300 transition-colors"
                    style={{ borderColor: 'var(--color-border)', color: '#ef4444' }}
                    title={t('suppliers.deleteSupplier')}
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingFournisseur(null);
                  setShowFournisseurModal(true);
                }}
                className="px-4 py-2.5 rounded-xl border hover:bg-[var(--color-bg-secondary)] transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
                title={t('suppliers.addSupplier')}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Date de réception & Statut (statut only on edit) */}
          <div className={`grid grid-cols-1 ${isEdit ? 'sm:grid-cols-2' : ''} gap-4`}>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('bobines.receptionDate')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date_reception"
                value={formData.date_reception}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-xl border focus-ring ${errors.date_reception ? 'border-red-500' : ''}`}
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: errors.date_reception ? '' : 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              {errors.date_reception && <p className="mt-1 text-sm text-red-500">{errors.date_reception}</p>}
            </div>

            {isEdit && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {t('common.status')}
                </label>
                <select
                  name="statut"
                  value={formData.statut}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border focus-ring"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="disponible">{t('statuses.available')}</option>
                  <option value="en_cours">{t('statuses.inProgress')}</option>
                  <option value="epuisee">{t('statuses.exhausted')}</option>
                </select>
              </div>
            )}
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {t('bobines.photos')} ({totalPhotosCount}/5)
            </label>
            
            {/* Existing photos */}
            {existingPhotos.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {existingPhotos
                  .filter(photo => !photosToDelete.includes(photo.id))
                  .map(photo => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={`http://localhost:5000${photo.path}`}
                        alt={photo.original_name}
                        className="w-24 h-24 object-cover rounded-lg border"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                      <button
                        type="button"
                        onClick={() => markPhotoForDeletion(photo.id)}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* New photos preview */}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {photos.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-24 h-24 object-cover rounded-lg border"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            {totalPhotosCount < 5 && (
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:bg-[var(--color-bg-secondary)] transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Upload size={20} style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {t('bobines.addPhoto')} (max {5 - totalPhotosCount})
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border hover:bg-[var(--color-bg-secondary)] transition-colors font-medium"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl text-white font-medium gradient-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isEdit ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>

      {/* Fournisseur Modal */}
      {showFournisseurModal && (
        <FournisseurModal
          fournisseur={editingFournisseur}
          onClose={() => {
            setShowFournisseurModal(false);
            setEditingFournisseur(null);
          }}
          onSuccess={handleFournisseurSuccess}
        />
      )}
    </div>
  );
}
