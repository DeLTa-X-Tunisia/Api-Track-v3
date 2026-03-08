import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { fournisseursAPI } from '../services/api';
import { useModal } from '../context/ModalContext';

export default function FournisseurModal({ fournisseur, onClose, onSuccess }) {
  const isEdit = !!fournisseur;
  
  const [nom, setNom] = useState(fournisseur?.nom || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { toast } = useModal();

  const validate = () => {
    if (!nom.trim()) {
      setError('Le nom du fournisseur est requis');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      let result;
      if (isEdit) {
        result = await fournisseursAPI.update(fournisseur.id, { nom });
      } else {
        result = await fournisseursAPI.create({ nom });
      }
      onSuccess(result);
    } catch (err) {
      if (err.message.includes('existe déjà')) {
        setError('Ce fournisseur existe déjà');
      } else {
        toast({ message: 'Erreur: ' + err.message, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-2xl shadow-xl"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <X size={20} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => {
                setNom(e.target.value);
                if (error) setError('');
              }}
              placeholder="Nom du fournisseur"
              autoFocus
              className={`w-full px-4 py-2.5 rounded-xl border focus-ring ${error ? 'border-red-500' : ''}`}
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: error ? '' : 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border hover:bg-[var(--color-bg-secondary)] transition-colors font-medium"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-white font-medium gradient-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
