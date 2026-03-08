import { createContext, useContext, useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'apitrack_auth_user';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedUser = localStorage.getItem(STORAGE_KEY);
        if (savedUser) {
          const user = JSON.parse(savedUser);
          // Verify user is still valid and active
          try {
            const response = await usersAPI.getById(user.id);
            if (response && response.actif) {
              setCurrentUser({
                id: response.id,
                matricule: response.matricule,
                nom: response.nom,
                prenom: response.prenom,
                role: response.role,
              });
              setIsAuthenticated(true);
            } else {
              // User no longer active
              localStorage.removeItem(STORAGE_KEY);
            }
          } catch {
            // User not found or error
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // Login with user data (after successful code verification)
  const login = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  };

  // Logout
  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    return currentUser?.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return currentUser?.role === 'admin_systeme';
  };

  const value = {
    currentUser,
    loading,
    isAuthenticated,
    login,
    logout,
    hasRole,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
