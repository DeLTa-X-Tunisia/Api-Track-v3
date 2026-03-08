import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Eye, EyeOff, Copy, RotateCcw, Check } from 'lucide-react';
import { usersAPI } from '../services/api';
import { useModal } from '../context/ModalContext';

export default function UserForm({ user, onClose, onSuccess }) {
  const { t } = useTranslation();
  const isEdit = !!user;
  
  // Form state
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    role: 'observateur_limite',
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Access code state (for edit mode)
  const [accessCode, setAccessCode] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // New user created code (for display after creation)
  const [createdUser, setCreatedUser] = useState(null);
  
  // Modal context
  const { confirm, toast } = useModal();

  // Role options
  const roleOptions = [
    { value: 'admin_systeme', label: 'Admin Système' },
    { value: 'admin_limite', label: 'Admin accès limité' },
    { value: 'superviseur_limite', label: 'Superviseur accès limité' },
    { value: 'observateur_limite', label: 'Observateur accès limité' },
  ];

  // Load user data for edit
  useEffect(() => {
    if (user) {
      setFormData({
        nom: user.nom || '',
        prenom: user.prenom || '',
        role: user.role || 'observateur_limite',
      });
    }
  }, [user]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    
    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }
    if (!formData.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
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
      if (isEdit) {
        await usersAPI.update(user.id, formData);
        onSuccess();
      } else {
        const result = await usersAPI.create(formData);
        setCreatedUser(result);
      }
    } catch (err) {
      toast({ message: 'Erreur: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Access code handlers (edit mode)
  const handleViewCode = async () => {
    if (showCode) {
      setShowCode(false);
      return;
    }
    
    if (accessCode) {
      setShowCode(true);
      return;
    }
    
    setLoadingCode(true);
    try {
      const result = await usersAPI.getAccessCode(user.id);
      setAccessCode(result.code_acces);
      setShowCode(true);
    } catch (err) {
      toast({ message: 'Erreur: ' + err.message, type: 'error' });
    } finally {
      setLoadingCode(false);
    }
  };

  const handleRegenerateCode = async () => {
    const confirmed = await confirm({
      title: 'Régénérer le code d\'accès',
      message: 'L\'ancien code ne fonctionnera plus. Voulez-vous continuer ?',
      confirmText: 'Régénérer',
      cancelText: 'Annuler',
      type: 'warning',
    });
    
    if (!confirmed) return;
    
    setLoadingCode(true);
    try {
      const result = await usersAPI.regenerateCode(user.id);
      setAccessCode(result.code_acces);
      setShowCode(true);
      toast({ message: 'Code d\'accès régénéré avec succès', type: 'success' });
    } catch (err) {
      toast({ message: 'Erreur: ' + err.message, type: 'error' });
    } finally {
      setLoadingCode(false);
    }
  };

  const handleCopyCode = async (code) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Show success screen after creation
  if (createdUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 mobile-overlay overflow-y-auto">
        <div 
          className="w-full max-w-md my-8 rounded-2xl shadow-xl"
          style={{ backgroundColor: 'var(--color-bg-primary)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Utilisateur créé
            </h2>
            <button
              onClick={onSuccess}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <X size={20} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          </div>

          {/* Success Content */}
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Check size={32} className="text-green-500" />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {createdUser.prenom} {createdUser.nom}
              </h3>
              <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {createdUser.matricule}
              </p>
            </div>

            {/* Code d'accès */}
            <div 
              className="p-4 rounded-xl border text-center"
              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
            >
              <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Code d'accès Api-Track
              </p>
              <p 
                className="text-3xl font-mono font-bold tracking-widest mb-3"
                style={{ color: 'var(--color-accent)' }}
              >
                {createdUser.code_acces}
              </p>
              <button
                onClick={() => handleCopyCode(createdUser.code_acces)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-[var(--color-bg-tertiary)] transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                {copiedCode ? (
                  <>
                    <Check size={16} className="text-green-500" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copier le code</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
              Conservez ce code précieusement. C'est l'unique moyen de connexion à Api-Track.
            </p>

            <button
              onClick={onSuccess}
              className="w-full px-4 py-3 rounded-xl text-white font-medium gradient-primary hover:opacity-90 transition-opacity"
            >
              Terminer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 mobile-overlay overflow-y-auto">
      <div 
        className="w-full max-w-md my-8 rounded-2xl shadow-xl"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <X size={20} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Matricule (only shown in edit mode) */}
          {isEdit && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Matricule
              </label>
              <input
                type="text"
                value={user.matricule}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border font-mono"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              />
            </div>
          )}

          {/* Prénom */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="prenom"
              value={formData.prenom}
              onChange={handleChange}
              placeholder="Prénom de l'utilisateur"
              className={`w-full px-4 py-2.5 rounded-xl border focus-ring ${errors.prenom ? 'border-red-500' : ''}`}
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: errors.prenom ? '' : 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {errors.prenom && <p className="mt-1 text-sm text-red-500">{errors.prenom}</p>}
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              placeholder="Nom de l'utilisateur"
              className={`w-full px-4 py-2.5 rounded-xl border focus-ring ${errors.nom ? 'border-red-500' : ''}`}
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: errors.nom ? '' : 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {errors.nom && <p className="mt-1 text-sm text-red-500">{errors.nom}</p>}
          </div>

          {/* Rôle */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Rôle
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border focus-ring"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {roleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Access Code Section (edit mode only) */}
          {isEdit && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Code d'accès Api-Track
              </label>
              <div 
                className="p-4 rounded-xl border"
                style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between">
                  <span 
                    className="font-mono text-lg tracking-widest"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {showCode && accessCode ? accessCode : '••••••'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleViewCode}
                      disabled={loadingCode}
                      className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                      title={showCode ? "Masquer" : "Voir"}
                    >
                      {loadingCode ? (
                        <div className="w-5 h-5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                      ) : showCode ? (
                        <EyeOff size={18} style={{ color: 'var(--color-text-secondary)' }} />
                      ) : (
                        <Eye size={18} style={{ color: 'var(--color-text-secondary)' }} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      disabled={loadingCode}
                      className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                      title="Régénérer"
                    >
                      <RotateCcw size={18} style={{ color: 'var(--color-text-secondary)' }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => accessCode && handleCopyCode(accessCode)}
                      disabled={!accessCode || loadingCode}
                      className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50"
                      title="Copier"
                    >
                      {copiedCode ? (
                        <Check size={18} style={{ color: '#22c55e' }} />
                      ) : (
                        <Copy size={18} style={{ color: 'var(--color-text-secondary)' }} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border hover:bg-[var(--color-bg-secondary)] transition-colors font-medium"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl text-white font-medium gradient-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
