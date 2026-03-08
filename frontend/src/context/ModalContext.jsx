import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState(null);
  
  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Confirm dialog
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmModal({
        title: options.title || 'Confirmation',
        message: options.message,
        confirmText: options.confirmText || 'Confirmer',
        cancelText: options.cancelText || 'Annuler',
        type: options.type || 'warning', // warning, danger, info
        onConfirm: () => {
          setConfirmModal(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(false);
        },
      });
    });
  }, []);

  // Base toast function
  const showToast = useCallback((options) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message: typeof options === 'string' ? options : options.message,
      type: typeof options === 'string' ? 'info' : (options.type || 'info'), // success, error, warning, info
      duration: typeof options === 'string' ? 4000 : (options.duration || 4000),
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
    
    return id;
  }, []);

  // Toast notification with convenience methods
  const toast = useMemo(() => Object.assign(
    (options) => showToast(options),
    {
      success: (message, duration) => showToast({ message, type: 'success', duration }),
      error: (message, duration) => showToast({ message, type: 'error', duration }),
      warning: (message, duration) => showToast({ message, type: 'warning', duration }),
      info: (message, duration) => showToast({ message, type: 'info', duration }),
    }
  ), [showToast]);

  // Remove toast manually
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ModalContext.Provider value={{ confirm, toast, removeToast }}>
      {children}
      
      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal {...confirmModal} />
      )}
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

// Confirm Modal Component
function ConfirmModal({ title, message, confirmText, cancelText, type, onConfirm, onCancel }) {
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-500/20',
          iconColor: '#ef4444',
          buttonBg: 'bg-red-500 hover:bg-red-600',
          Icon: AlertTriangle,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/20',
          iconColor: '#f59e0b',
          buttonBg: 'bg-amber-500 hover:bg-amber-600',
          Icon: AlertCircle,
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-500/20',
          iconColor: '#3b82f6',
          buttonBg: 'gradient-primary hover:opacity-90',
          Icon: Info,
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.Icon;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-md rounded-2xl shadow-xl animate-in fade-in zoom-in duration-200"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Icon */}
          <div className={`w-12 h-12 mx-auto rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}>
            <Icon size={24} style={{ color: styles.iconColor }} />
          </div>
          
          {/* Title */}
          <h3 
            className="text-lg font-semibold text-center mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h3>
          
          {/* Message */}
          <p 
            className="text-center mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {message}
          </p>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border hover:bg-[var(--color-bg-secondary)] transition-colors font-medium"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-all ${styles.buttonBg}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast Container Component
function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[101] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}

// Toast Component
function Toast({ message, type, onRemove }) {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500/10 border-green-500/30',
          iconColor: '#22c55e',
          Icon: CheckCircle,
        };
      case 'error':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          iconColor: '#ef4444',
          Icon: AlertTriangle,
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30',
          iconColor: '#f59e0b',
          Icon: AlertCircle,
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-500/10 border-blue-500/30',
          iconColor: '#3b82f6',
          Icon: Info,
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.Icon;

  return (
    <div 
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-in slide-in-from-right duration-300 ${styles.bg}`}
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <Icon size={20} style={{ color: styles.iconColor }} className="flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>
        {message}
      </p>
      <button
        onClick={onRemove}
        className="p-1 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors flex-shrink-0"
      >
        <X size={16} style={{ color: 'var(--color-text-muted)' }} />
      </button>
    </div>
  );
}

export default ModalContext;
