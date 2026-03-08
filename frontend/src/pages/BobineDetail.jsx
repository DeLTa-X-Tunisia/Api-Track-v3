import { useState, useEffect } from 'react';
import { X, Edit2, Package, Calendar, Scale, Ruler, Building2, Hash, FileText, Image, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { bobinesAPI } from '../services/api';

export default function BobineDetail({ bobineId, onClose, onEdit }) {
  const [bobine, setBobine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

  useEffect(() => {
    const loadBobine = async () => {
      setLoading(true);
      try {
        const data = await bobinesAPI.getById(bobineId);
        setBobine(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadBobine();
  }, [bobineId]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Status badge helper
  const getStatutBadge = (statut) => {
    const options = {
      disponible: { label: 'Disponible', color: '#22c55e' },
      en_cours: { label: 'En cours', color: '#f59e0b' },
      epuisee: { label: 'Épuisée', color: '#ef4444' },
    };
    const option = options[statut] || options.disponible;
    return (
      <span 
        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${option.color}20`, color: option.color }}
      >
        {option.label}
      </span>
    );
  };

  // Photo gallery navigation
  const navigatePhoto = (direction) => {
    if (selectedPhotoIndex === null || !bobine?.photos) return;
    const newIndex = selectedPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < bobine.photos.length) {
      setSelectedPhotoIndex(newIndex);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mobile-overlay">
        <div 
          className="w-full max-w-2xl p-12 rounded-2xl shadow-xl text-center"
          style={{ backgroundColor: 'var(--color-bg-primary)' }}
        >
          <div className="inline-block w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4" style={{ color: 'var(--color-text-muted)' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mobile-overlay">
        <div 
          className="w-full max-w-md p-6 rounded-2xl shadow-xl"
          style={{ backgroundColor: 'var(--color-bg-primary)' }}
        >
          <p className="text-red-500">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-lg border hover:bg-[var(--color-bg-secondary)] transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (!bobine) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 mobile-overlay overflow-y-auto">
        <div 
          className="w-full max-w-3xl my-8 rounded-2xl shadow-xl"
          style={{ backgroundColor: 'var(--color-bg-primary)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Package size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {bobine.numero}
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Détails de la bobine
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                style={{ color: 'var(--color-accent)' }}
              >
                <Edit2 size={18} />
                <span className="hidden sm:inline">Modifier</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                <X size={20} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Grade & Nuance */}
              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Hash size={18} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Grade / Nuance
                  </span>
                </div>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {bobine.grade_code || 'Non spécifié'}
                </p>
                {bobine.nuance_code && (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {bobine.nuance_code}
                  </p>
                )}
              </div>

              {/* Dimensions */}
              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Ruler size={18} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Dimensions
                  </span>
                </div>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {bobine.epaisseur} × {bobine.largeur} mm
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Épaisseur × Largeur
                </p>
              </div>

              {/* Poids */}
              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Scale size={18} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Poids
                  </span>
                </div>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {formatNumber(bobine.poids)} kg
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {(bobine.poids / 1000).toFixed(2)} tonnes
                </p>
              </div>

              {/* Date de réception */}
              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={18} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Date de réception
                  </span>
                </div>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {formatDate(bobine.date_reception)}
                </p>
              </div>

              {/* Fournisseur */}
              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={18} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Fournisseur
                  </span>
                </div>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {bobine.fournisseur_nom || 'Non spécifié'}
                </p>
                {bobine.fournisseur_contact && (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Contact: {bobine.fournisseur_contact}
                  </p>
                )}
              </div>

              {/* Créé par */}
              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <User size={18} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Créé par
                  </span>
                </div>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {bobine.created_by_name || 'Non spécifié'}
                </p>
                {bobine.created_at && (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatDate(bobine.created_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            {bobine.notes && (
              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={18} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Notes
                  </span>
                </div>
                <p style={{ color: 'var(--color-text-primary)' }}>
                  {bobine.notes}
                </p>
              </div>
            )}

            {/* Photos */}
            {bobine.photos && bobine.photos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Image size={18} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Photos ({bobine.photos.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {bobine.photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className="aspect-square rounded-xl overflow-hidden border hover:border-[var(--color-accent)] transition-colors"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <img
                        src={`http://localhost:5000${photo.path}`}
                        alt={photo.original_name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t flex flex-wrap items-center gap-4 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <span>Créé le: {formatDate(bobine.created_at)}</span>
              <span>Mis à jour le: {formatDate(bobine.updated_at)}</span>
              {getStatutBadge(bobine.statut)}
            </div>
          </div>
        </div>
      </div>

      {/* Photo Lightbox */}
      {selectedPhotoIndex !== null && bobine.photos && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(null); }}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={24} className="text-white" />
          </button>

          {selectedPhotoIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigatePhoto(-1); }}
              className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={24} className="text-white" />
            </button>
          )}

          {selectedPhotoIndex < bobine.photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigatePhoto(1); }}
              className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronRight size={24} className="text-white" />
            </button>
          )}

          <img
            src={`http://localhost:5000${bobine.photos[selectedPhotoIndex].path}`}
            alt={bobine.photos[selectedPhotoIndex].original_name}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm">
            {selectedPhotoIndex + 1} / {bobine.photos.length}
          </div>
        </div>
      )}
    </>
  );
}
