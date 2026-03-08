import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronDown, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Check, 
  Loader2,
  Settings,
  AlertTriangle,
  Sparkles,
  Tag,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

/**
 * CrudSelect - Modern dropdown with integrated CRUD operations
 */
export default function CrudSelect({
  label,
  value,
  onChange,
  items = [],
  onAdd,
  onUpdate,
  onDelete,
  onRefresh,
  displayField = 'libelle',
  codeField = 'code',
  showCode = true,
  required = false,
  placeholder = '-- Sélectionner --',
  disabled = false,
  icon: Icon = null,
  accentColor = '#3b82f6',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ code: '', libelle: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [manageSearchQuery, setManageSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const { currentUser } = useAuth();
  const { toast, confirm } = useModal();

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item[codeField]?.toLowerCase().includes(query) ||
      item[displayField]?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  }, [items, searchQuery, codeField, displayField]);

  // Filter items for management modal
  const filteredManageItems = useMemo(() => {
    if (!manageSearchQuery.trim()) return items;
    const query = manageSearchQuery.toLowerCase();
    return items.filter(item => 
      item[codeField]?.toLowerCase().includes(query) ||
      item[displayField]?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  }, [items, manageSearchQuery, codeField, displayField]);

  // Group items by prefix (CV, NDT, etc.) for better organization
  const groupedManageItems = useMemo(() => {
    const groups = {};
    const categoryNames = {
      'CV': 'Contrôle Visuel',
      'NDT': 'Contrôle Non Destructif (NDT)',
      'HYD': 'Hydrotest',
      'CHF': 'Chanfrein',
      'MAC': 'Macro',
      'DEF': 'Défauts généraux',
      'CAU': 'Causes',
      'RES': 'Responsabilités',
    };
    
    filteredManageItems.forEach(item => {
      const code = item[codeField] || '';
      const prefix = code.match(/^[A-Z]+/)?.[0] || 'AUTRE';
      if (!groups[prefix]) {
        groups[prefix] = {
          name: categoryNames[prefix] || prefix,
          items: []
        };
      }
      groups[prefix].items.push(item);
    });
    return groups;
  }, [filteredManageItems, codeField]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItem = items.find(item => item.id === parseInt(value));

  const getUserInfo = () => ({
    user_id: currentUser?.id,
    user_name: currentUser ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() : 'Utilisateur'
  });

  const handleSelect = (item) => {
    onChange(item);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleAdd = async () => {
    if (!newItem.code.trim() || !newItem.libelle.trim()) {
      toast.error('Le code et le libellé sont requis');
      return;
    }
    setLoading(true);
    try {
      await onAdd({ ...newItem, ...getUserInfo() });
      toast.success('Élément ajouté avec succès');
      setNewItem({ code: '', libelle: '', description: '' });
      setIsAdding(false);
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingItem.code.trim() || !editingItem.libelle.trim()) {
      toast.error('Le code et le libellé sont requis');
      return;
    }
    setLoading(true);
    try {
      await onUpdate(editingItem.id, { ...editingItem, ...getUserInfo() });
      toast.success('Élément modifié avec succès');
      setEditingItem(null);
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = await confirm({
      title: 'Désactiver cet élément ?',
      message: `Voulez-vous désactiver "${item[displayField]}" ? Il ne sera plus visible dans la liste mais pourra être réactivé.`,
      confirmText: 'Désactiver',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      await onDelete(item.id, getUserInfo());
      toast.success('Élément désactivé');
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la désactivation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group" ref={containerRef}>
      {/* Label with icon and gear button */}
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium transition-colors group-focus-within:text-blue-500" 
            style={{ color: 'var(--color-text-muted)' }}>
            {Icon && <Icon size={12} style={{ color: accentColor }} />}
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          
          {/* Gear button aligned right in label row */}
          <button
            type="button"
            onClick={() => setIsManageOpen(true)}
            className="gear-btn p-1 rounded-md transition-all duration-300 opacity-60 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 group/gear"
            title={`Gérer les ${label?.toLowerCase() || 'éléments'}`}
          >
            <Settings 
              size={14} 
              className="transition-transform duration-500 group-hover/gear:rotate-180" 
              style={{ color: accentColor }} 
            />
          </button>
        </div>
      )}

      {/* Main Select Button - Full width without gear */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm text-left
          transition-all duration-200 ease-out
          ${isOpen ? 'ring-2 ring-offset-1 shadow-md' : 'hover:border-blue-300 hover:shadow-sm'}
          ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        style={{
          backgroundColor: 'var(--color-input)',
          borderColor: isOpen ? accentColor : 'var(--color-border)',
          color: selectedItem ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          '--tw-ring-color': `${accentColor}30`,
        }}
      >
        <span className="truncate flex items-center gap-2">
          {selectedItem && showCode && (
            <span 
              className="px-2 py-0.5 rounded text-sm font-mono font-bold"
              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
            >
              {selectedItem[codeField]}
            </span>
          )}
          {selectedItem ? <span className="text-xs text-gray-500 dark:text-gray-400">{selectedItem[displayField]}</span> : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`flex-shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: isOpen ? accentColor : 'var(--color-text-muted)' }}
        />
      </button>

      {/* Dropdown List with animation */}
      <div 
        className={`absolute z-50 mt-2 w-full max-h-80 overflow-hidden rounded-xl border-2 shadow-2xl
          transition-all duration-200 origin-top flex flex-col
          ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
        style={{ 
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Search Input in Dropdown - Always show for many items */}
        {items.length > 5 && (
          <div className="p-2 border-b sticky top-0 z-10 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-850" style={{ borderColor: 'var(--color-border)' }}>
            <div className="relative">
              <Search 
                size={14} 
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-9 pr-8 py-2 rounded-lg border text-xs transition-all duration-200 focus:ring-2 focus:outline-none"
                style={{
                  backgroundColor: 'var(--color-input)',
                  borderColor: searchQuery ? accentColor : 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  '--tw-ring-color': `${accentColor}30`,
                }}
                placeholder={`Rechercher parmi ${items.length} éléments...`}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={12} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              )}
            </div>
            <div className="text-[10px] mt-1 px-1 flex justify-between" style={{ color: 'var(--color-text-muted)' }}>
              <span>{searchQuery ? `${filteredItems.length} résultat${filteredItems.length > 1 ? 's' : ''}` : `${items.length} éléments`}</span>
              <span className="opacity-60">↓ Scroll pour voir plus</span>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
            <AlertTriangle size={20} className="mx-auto mb-2 opacity-50" />
            Aucun élément disponible
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="px-4 py-6 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
            <Search size={18} className="mx-auto mb-2 opacity-40" />
            Aucun résultat pour "{searchQuery}"
          </div>
        ) : (
          <div className="py-1 overflow-y-auto flex-1">
            {filteredItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-3
                  transition-all duration-150 hover:pl-4
                  ${item.id === parseInt(value) 
                    ? 'font-medium' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                style={{ 
                  color: 'var(--color-text-primary)',
                  backgroundColor: item.id === parseInt(value) ? `${accentColor}10` : 'transparent',
                  animationDelay: `${index * 30}ms`,
                }}
              >
                {showCode && (
                  <span 
                    className="px-2 py-1 rounded text-sm font-bold font-mono min-w-[50px] text-center"
                    style={{ 
                      backgroundColor: item.id === parseInt(value) ? `${accentColor}20` : `${accentColor}10`,
                      color: item.id === parseInt(value) ? accentColor : 'var(--color-text-primary)'
                    }}
                  >
                    {item[codeField]}
                  </span>
                )}
                <span className="flex-1 text-xs text-gray-500 dark:text-gray-400">{item[displayField]}</span>
                {item.id === parseInt(value) && (
                  <Check size={14} style={{ color: accentColor }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Management Modal */}
      {isManageOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => {
              setIsManageOpen(false);
              setEditingItem(null);
              setIsAdding(false);
              setManageSearchQuery('');
            }}
          />
          
          {/* Modal Container */}
          <div 
            className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col animate-slideUp"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            {/* Modal Header with gradient */}
            <div 
              className="flex items-center justify-between p-5 border-b"
              style={{ 
                borderColor: 'var(--color-border)',
                background: `linear-gradient(135deg, ${accentColor}08 0%, transparent 100%)`,
              }}
            >
              <h3 className="text-lg font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Settings size={20} style={{ color: accentColor }} />
                </div>
                <div>
                  <span>Gérer {label || 'les éléments'}</span>
                  <p className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
                    {items.length} élément{items.length > 1 ? 's' : ''} disponible{items.length > 1 ? 's' : ''}
                  </p>
                </div>
              </h3>
              <button
                onClick={() => {
                  setIsManageOpen(false);
                  setEditingItem(null);
                  setIsAdding(false);
                  setManageSearchQuery('');
                }}
                className="p-2 rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-110 active:scale-95"
              >
                <X size={20} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Add New Button */}
              {!isAdding && !editingItem && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border-2 border-dashed
                    text-sm font-semibold transition-all duration-200
                    hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent hover:border-solid
                    dark:hover:from-blue-900/20 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  <Sparkles size={16} className="animate-pulse" />
                  Ajouter un nouvel élément
                </button>
              )}

              {/* Add Form */}
              {isAdding && (
                <div 
                  className="p-5 rounded-xl border-2 space-y-4 animate-slideDown"
                  style={{ 
                    backgroundColor: `${accentColor}05`,
                    borderColor: accentColor,
                  }}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: accentColor }}>
                    <Plus size={16} />
                    Nouvel élément
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                        <Tag size={10} /> Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newItem.code}
                        onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-1"
                        style={{
                          backgroundColor: 'var(--color-input)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                          '--tw-ring-color': `${accentColor}30`,
                        }}
                        placeholder="Ex: DEF001"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                        Libellé <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newItem.libelle}
                        onChange={(e) => setNewItem({ ...newItem, libelle: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-1"
                        style={{
                          backgroundColor: 'var(--color-input)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                          '--tw-ring-color': `${accentColor}30`,
                        }}
                        placeholder="Nom affiché"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
                      Description (optionnelle)
                    </label>
                    <input
                      type="text"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-1"
                      style={{
                        backgroundColor: 'var(--color-input)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                        '--tw-ring-color': `${accentColor}30`,
                      }}
                      placeholder="Description optionnelle"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      onClick={() => {
                        setIsAdding(false);
                        setNewItem({ code: '', libelle: '', description: '' });
                      }}
                      className="px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={loading}
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2
                        transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg, #22c55e 0%, #16a34a 100%)` }}
                    >
                      {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Ajouter
                    </button>
                  </div>
                </div>
              )}

              {/* Search Input */}
              {!isAdding && !editingItem && items.length > 5 && (
                <div className="relative">
                  <Search 
                    size={16} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={manageSearchQuery}
                    onChange={(e) => setManageSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-1"
                    style={{
                      backgroundColor: 'var(--color-input)',
                      borderColor: manageSearchQuery ? accentColor : 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      '--tw-ring-color': `${accentColor}30`,
                    }}
                    placeholder="Rechercher par code, libellé ou description..."
                  />
                  {manageSearchQuery && (
                    <button
                      onClick={() => setManageSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X size={14} style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                  )}
                </div>
              )}

              {/* Search Results Info */}
              {manageSearchQuery && (
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {filteredManageItems.length} résultat{filteredManageItems.length > 1 ? 's' : ''} 
                    {filteredManageItems.length !== items.length && ` sur ${items.length}`}
                  </span>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
                    <p>Aucun élément disponible</p>
                    <p className="text-xs mt-1">Cliquez sur le bouton ci-dessus pour ajouter</p>
                  </div>
                ) : filteredManageItems.length === 0 ? (
                  <div className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <Search size={28} className="mx-auto mb-3 opacity-30" />
                    <p>Aucun résultat pour "{manageSearchQuery}"</p>
                    <button 
                      onClick={() => setManageSearchQuery('')}
                      className="text-xs mt-2 underline hover:no-underline"
                      style={{ color: accentColor }}
                    >
                      Effacer la recherche
                    </button>
                  </div>
                ) : (
                  filteredManageItems.map((item, index) => (
                    <div 
                      key={item.id}
                      className="p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md"
                      style={{ 
                        backgroundColor: editingItem?.id === item.id ? `${accentColor}05` : 'var(--color-bg-secondary)',
                        borderColor: editingItem?.id === item.id ? accentColor : 'var(--color-border)',
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      {editingItem?.id === item.id ? (
                        <div className="space-y-3 animate-fadeIn">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="flex items-center gap-1 text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                                <Tag size={10} /> Code <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={editingItem.code}
                                onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border-2 text-sm transition-all duration-200 focus:ring-2"
                                style={{
                                  backgroundColor: 'var(--color-input)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-primary)',
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
                                Libellé <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={editingItem.libelle}
                                onChange={(e) => setEditingItem({ ...editingItem, libelle: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border-2 text-sm transition-all duration-200 focus:ring-2"
                                style={{
                                  backgroundColor: 'var(--color-input)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-primary)',
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
                              Description
                            </label>
                            <input
                              type="text"
                              value={editingItem.description || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border-2 text-sm transition-all duration-200 focus:ring-2"
                              style={{
                                backgroundColor: 'var(--color-input)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-primary)',
                              }}
                            />
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              onClick={() => setEditingItem(null)}
                              className="px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                            >
                              Annuler
                            </button>
                            <button
                              onClick={handleEdit}
                              disabled={loading}
                              className="px-3 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-2
                                transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
                              style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)` }}
                            >
                              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <span 
                              className="px-3 py-1.5 rounded-lg text-sm font-mono font-bold min-w-[60px] text-center"
                              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                            >
                              {item[codeField]}
                            </span>
                            <div>
                              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                {item[displayField]}
                              </div>
                              {item.description && (
                                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => setEditingItem({ ...item })}
                              className="p-2 rounded-lg transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:scale-110 active:scale-95"
                              title="Modifier"
                            >
                              <Pencil size={14} style={{ color: '#3b82f6' }} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 rounded-lg transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900/30 hover:scale-110 active:scale-95"
                              title="Désactiver"
                            >
                              <Trash2 size={14} style={{ color: '#ef4444' }} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div 
              className="p-5 border-t flex justify-end"
              style={{ 
                borderColor: 'var(--color-border)',
                background: `linear-gradient(135deg, transparent 0%, ${accentColor}05 100%)`,
              }}
            >
              <button
                onClick={() => {
                  setIsManageOpen(false);
                  setEditingItem(null);
                  setIsAdding(false);
                  setManageSearchQuery('');
                }}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold
                  transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
                style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .animate-slideDown { animation: slideDown 0.2s ease-out; }
      `}</style>
    </div>
  );
}
