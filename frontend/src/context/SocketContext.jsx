import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useModal } from './ModalContext';

const SocketContext = createContext(null);

// Configuration for activity tracking
const ACTIVITY_PING_INTERVAL = 60 * 1000; // Send activity ping every 60 seconds
const ACTIVITY_DEBOUNCE_MS = 5000; // Debounce activity events by 5 seconds

// Socket events constants (must match backend)
export const SOCKET_EVENTS = {
  // Bobines events
  BOBINE_CREATED: 'bobine:created',
  BOBINE_UPDATED: 'bobine:updated',
  BOBINE_DELETED: 'bobine:deleted',
  
  // Users events
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_TOGGLED: 'user:toggled',
  
  // Fournisseurs events
  FOURNISSEUR_CREATED: 'fournisseur:created',
  FOURNISSEUR_UPDATED: 'fournisseur:updated',
  FOURNISSEUR_DELETED: 'fournisseur:deleted',
  
  // Grades events
  GRADE_CREATED: 'grade:created',
  GRADE_UPDATED: 'grade:updated',
  GRADE_DELETED: 'grade:deleted',
  
  // Nuances events
  NUANCE_CREATED: 'nuance:created',
  NUANCE_UPDATED: 'nuance:updated',
  NUANCE_DELETED: 'nuance:deleted',
  
  // Lots events
  LOT_CREATED: 'lot:created',
  LOT_UPDATED: 'lot:updated',
  LOT_DELETED: 'lot:deleted',
  
  // Tubes events
  TUBE_CREATED: 'tube:created',
  TUBE_UPDATED: 'tube:updated',
  TUBE_DELETED: 'tube:deleted',
  
  // General events
  DATA_REFRESH: 'data:refresh',
};

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionExpiredReason, setSessionExpiredReason] = useState(null);
  const listenersRef = useRef(new Map());
  const activityIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const isActiveRef = useRef(true);
  const { toast } = useModal();
  
  const STORAGE_KEY = 'apitrack_auth_user';
  
  // Function to authenticate user with socket
  const authenticateWithSocket = useCallback((socketInstance) => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY);
      if (savedUser) {
        const user = JSON.parse(savedUser);
        console.log('🔐 Authenticating user with socket:', user.nom);
        socketInstance.emit('user:authenticate', {
          userId: user.id,
          nom: `${user.prenom} ${user.nom}`,
          role: user.role
        });
      }
    } catch (error) {
      console.error('Error authenticating with socket:', error);
    }
  }, []);
  
  // Send activity ping to server
  const sendActivityPing = useCallback((socketInstance) => {
    if (socketInstance && socketInstance.connected && isActiveRef.current) {
      const savedUser = localStorage.getItem(STORAGE_KEY);
      if (savedUser) {
        socketInstance.emit('user:activity');
        console.log('📍 Activity ping sent');
      }
    }
  }, []);
  
  // Track user activity
  const trackActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current > ACTIVITY_DEBOUNCE_MS) {
      lastActivityRef.current = now;
      isActiveRef.current = true;
    }
  }, []);
  
  // Initialize socket connection
  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected:', socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
      
      // Auto-authenticate if user is logged in
      authenticateWithSocket(socketInstance);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
      toast({ 
        message: 'Connexion temps réel rétablie', 
        type: 'success',
        duration: 3000 
      });
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔌 Reconnection attempt:', attemptNumber);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('🔌 Reconnection error:', error.message);
    });
    
    // Handle session expiration (inactivity or forced logout)
    socketInstance.on('session-expired', (data) => {
      console.log('⚠️ Session expired:', data.reason, data.message);
      setSessionExpired(true);
      setSessionExpiredReason(data);
      
      // Clear local storage and redirect
      localStorage.removeItem(STORAGE_KEY);
      
      // Show toast based on reason
      const toastMessage = data.message || 'Votre session a expiré';
      toast({ 
        message: toastMessage, 
        type: 'warning',
        duration: 5000 
      });
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    });
    
    // Handle force-logout (legacy support)
    socketInstance.on('force-logout', () => {
      console.log('⚠️ Force logout received');
      setSessionExpired(true);
      setSessionExpiredReason({ reason: 'forced', message: 'Vous avez été déconnecté' });
      localStorage.removeItem(STORAGE_KEY);
      toast({ 
        message: 'Vous avez été déconnecté', 
        type: 'warning',
        duration: 5000 
      });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    };
  }, []);
  
  // Set up activity tracking
  useEffect(() => {
    // Activity events to track
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    
    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, trackActivity, { passive: true });
    });
    
    // Start activity ping interval
    if (socket) {
      activityIntervalRef.current = setInterval(() => {
        sendActivityPing(socket);
      }, ACTIVITY_PING_INTERVAL);
    }
    
    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, trackActivity);
      });
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
    };
  }, [socket, trackActivity, sendActivityPing]);
  
  // Handle browser close / tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Try to notify server about disconnect
      if (socket && socket.connected) {
        const savedUser = localStorage.getItem(STORAGE_KEY);
        if (savedUser) {
          const user = JSON.parse(savedUser);
          // Use sendBeacon for reliable delivery on page unload
          if (navigator.sendBeacon) {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            navigator.sendBeacon(
              `${apiUrl}/supervision/browser-close`,
              JSON.stringify({ userId: user.id, socketId: socket.id })
            );
          }
        }
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is being hidden (potential close/tab switch)
        isActiveRef.current = false;
      } else if (document.visibilityState === 'visible') {
        // User returned to page
        isActiveRef.current = true;
        lastActivityRef.current = Date.now();
        if (socket && socket.connected) {
          sendActivityPing(socket);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, sendActivityPing]);

  // Subscribe to an event
  const subscribe = useCallback((event, callback) => {
    if (!socket) return () => {};
    
    socket.on(event, callback);
    
    // Track listener for cleanup
    const listeners = listenersRef.current.get(event) || [];
    listeners.push(callback);
    listenersRef.current.set(event, listeners);
    
    // Return unsubscribe function
    return () => {
      socket.off(event, callback);
      const updatedListeners = listenersRef.current.get(event)?.filter(cb => cb !== callback) || [];
      listenersRef.current.set(event, updatedListeners);
    };
  }, [socket]);

  // Unsubscribe from an event
  const unsubscribe = useCallback((event, callback) => {
    if (!socket) return;
    
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }, [socket]);

  // Join a room
  const joinRoom = useCallback((room) => {
    if (socket && isConnected) {
      socket.emit('join:room', room);
    }
  }, [socket, isConnected]);

  // Leave a room
  const leaveRoom = useCallback((room) => {
    if (socket && isConnected) {
      socket.emit('leave:room', room);
    }
  }, [socket, isConnected]);

  // Emit an event
  const emit = useCallback((event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  }, [socket, isConnected]);
  
  // Authenticate user (call after login)
  const authenticateUser = useCallback((user) => {
    if (socket && isConnected && user) {
      console.log('🔐 Manual user authentication:', user.nom || user.prenom);
      socket.emit('user:authenticate', {
        userId: user.id,
        nom: `${user.prenom || ''} ${user.nom || ''}`.trim(),
        role: user.role
      });
    }
  }, [socket, isConnected]);
  
  // Listen for storage changes (login/logout)
  useEffect(() => {
    const handleStorageChange = () => {
      if (socket && isConnected) {
        authenticateWithSocket(socket);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [socket, isConnected, authenticateWithSocket]);

  const value = {
    socket,
    isConnected,
    connectionError,
    sessionExpired,
    sessionExpiredReason,
    subscribe,
    unsubscribe,
    joinRoom,
    leaveRoom,
    emit,
    authenticateUser,
    SOCKET_EVENTS,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook to use socket context
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

// Custom hook for real-time data with automatic refresh
export function useRealTimeData(events, onUpdate, showNotifications = true) {
  const { subscribe, isConnected } = useSocket();
  const { toast } = useModal();
  
  useEffect(() => {
    if (!isConnected) return;
    
    const unsubscribers = [];
    
    const eventArray = Array.isArray(events) ? events : [events];
    
    eventArray.forEach(event => {
      const unsubscribe = subscribe(event, (data) => {
        // Call the update callback
        if (onUpdate) {
          onUpdate(event, data);
        }
        
        // Show notification toast
        if (showNotifications && data.message) {
          let toastType = 'info';
          if (event.includes('created')) toastType = 'success';
          else if (event.includes('deleted')) toastType = 'warning';
          else if (event.includes('updated') || event.includes('toggled')) toastType = 'info';
          
          toast({ 
            message: data.message, 
            type: toastType,
            duration: 4000,
          });
        }
      });
      
      unsubscribers.push(unsubscribe);
    });
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [events, onUpdate, showNotifications, subscribe, isConnected, toast]);
}

export default SocketContext;
