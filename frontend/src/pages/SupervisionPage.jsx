import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Users, 
  Activity, 
  Clock, 
  Shield, 
  AlertTriangle,
  LogIn,
  LogOut,
  Ban,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserX,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Trash2,
  Power,
  Globe,
  Monitor
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export default function SupervisionPage() {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === 'rtl';
  
  const [activeTab, setActiveTab] = useState('connected');
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [connectionLogs, setConnectionLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteOldModal, setShowDeleteOldModal] = useState(false);
  const [showForceLogoutModal, setShowForceLogoutModal] = useState(false);
  const [deleteOldDays, setDeleteOldDays] = useState('30');
  const [userToLogout, setUserToLogout] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Filters for logs
  const [filters, setFilters] = useState({
    action: '',
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'admin_systeme';
  
  // Check admin access
  useEffect(() => {
    if (currentUser && !isAdmin) {
      navigate('/');
    }
  }, [currentUser, isAdmin, navigate]);
  
  // Fetch connected users
  const fetchConnectedUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/supervision/connected-users`, {
        headers: { 'x-user-id': currentUser?.id }
      });
      if (response.ok) {
        const data = await response.json();
        setConnectedUsers(data);
      }
    } catch (error) {
      console.error('Error fetching connected users:', error);
    }
  }, [currentUser?.id]);
  
  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/supervision/stats`, {
        headers: { 'x-user-id': currentUser?.id }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [currentUser?.id]);
  
  // Fetch connection logs
  const fetchLogs = useCallback(async (page = 1) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
        ...(filters.action && { action: filters.action }),
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });
      
      const response = await fetch(`${API_BASE_URL}/supervision/connection-logs?${params}`, {
        headers: { 'x-user-id': currentUser?.id }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectionLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, [currentUser?.id, filters, pagination.limit]);
  
  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchConnectedUsers(),
        fetchStats(),
        fetchLogs(1)
      ]);
      setLoading(false);
    };
    
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, fetchConnectedUsers, fetchStats, fetchLogs]);
  
  // Auto-refresh connected users every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'connected') {
        fetchConnectedUsers();
        fetchStats();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [activeTab, fetchConnectedUsers, fetchStats]);
  
  // Real-time updates via Socket.IO
  const { subscribe, isConnected: socketConnected } = useSocket();
  
  // Use refs to avoid recreating socket listeners when functions change
  const fetchFunctionsRef = useRef({ fetchLogs, fetchConnectedUsers, fetchStats });
  const paginationRef = useRef(pagination);
  
  // Keep refs updated
  useEffect(() => {
    fetchFunctionsRef.current = { fetchLogs, fetchConnectedUsers, fetchStats };
    paginationRef.current = pagination;
  }, [fetchLogs, fetchConnectedUsers, fetchStats, pagination]);
  
  // Socket listeners - only recreate when socket connection status changes
  useEffect(() => {
    if (!isAdmin || !socketConnected) return;
    
    console.log('🔌 Setting up supervision socket listeners...');
    
    // Listen for new user connections
    const unsubConnect = subscribe('supervision:user-connected', (data) => {
      console.log('🟢 User connected:', data);
      fetchFunctionsRef.current.fetchConnectedUsers();
      fetchFunctionsRef.current.fetchStats();
    });
    
    // Listen for user disconnections
    const unsubDisconnect = subscribe('supervision:user-disconnected', (data) => {
      console.log('🔴 User disconnected:', data);
      fetchFunctionsRef.current.fetchConnectedUsers();
      fetchFunctionsRef.current.fetchStats();
    });
    
    // Listen for forced logouts
    const unsubForceLogout = subscribe('supervision:force-logout', (data) => {
      console.log('⚠️ User force logged out:', data);
      fetchFunctionsRef.current.fetchConnectedUsers();
      fetchFunctionsRef.current.fetchStats();
    });
    
    // Listen for logs deletion (bulk)
    const unsubLogsDeleted = subscribe('supervision:logs-deleted', (data) => {
      console.log('🗑️ Logs deleted:', data);
      fetchFunctionsRef.current.fetchLogs(1);
      fetchFunctionsRef.current.fetchStats();
    });
    
    // Listen for single log deletion
    const unsubLogDeleted = subscribe('supervision:log-deleted', (data) => {
      console.log('🗑️ Single log deleted:', data);
      fetchFunctionsRef.current.fetchLogs(paginationRef.current.page);
    });
    
    return () => {
      console.log('🔌 Cleaning up supervision socket listeners...');
      unsubConnect?.();
      unsubDisconnect?.();
      unsubForceLogout?.();
      unsubLogsDeleted?.();
      unsubLogDeleted?.();
    };
  }, [isAdmin, socketConnected, subscribe]);
  
  // Force logout user
  const handleForceLogout = async (userId, userName) => {
    setUserToLogout({ id: userId, name: userName });
    setShowForceLogoutModal(true);
  };
  
  const confirmForceLogout = async () => {
    if (!userToLogout) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/supervision/force-logout/${userToLogout.id}`, {
        method: 'POST',
        headers: { 'x-user-id': currentUser?.id }
      });
      
      if (response.ok) {
        fetchConnectedUsers();
        fetchStats();
        showToast(t('supervision.forceLogout') + ' ✓');
      }
    } catch (error) {
      console.error('Error forcing logout:', error);
    } finally {
      setShowForceLogoutModal(false);
      setUserToLogout(null);
    }
  };
  
  // Show toast notification
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Delete all logs
  const handleDeleteAllLogs = async () => {
    setShowDeleteAllModal(true);
  };
  
  const confirmDeleteAllLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/supervision/logs?all=true`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id }
      });
      
      if (response.ok) {
        const data = await response.json();
        fetchLogs(1);
        showToast(t('supervision.logsDeleted', { count: data.deletedCount }));
      }
    } catch (error) {
      console.error('Error deleting logs:', error);
    } finally {
      setShowDeleteAllModal(false);
    }
  };
  
  // Delete old logs
  const handleDeleteOldLogs = async () => {
    setDeleteOldDays('30');
    setShowDeleteOldModal(true);
  };
  
  const confirmDeleteOldLogs = async () => {
    const days = parseInt(deleteOldDays);
    if (isNaN(days) || days < 1) return;
    
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    try {
      const response = await fetch(`${API_BASE_URL}/supervision/logs?olderThan=${date.toISOString()}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id }
      });
      
      if (response.ok) {
        const data = await response.json();
        fetchLogs(1);
        showToast(t('supervision.logsDeleted', { count: data.deletedCount }));
      }
    } catch (error) {
      console.error('Error deleting old logs:', error);
    } finally {
      setShowDeleteOldModal(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(i18n.language, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return t('supervision.justNow');
    if (diffMins < 60) return t('supervision.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('supervision.hoursAgo', { count: diffHours });
    return formatDate(dateString);
  };
  
  // Get role style (color differentiation)
  const getRoleStyle = (role) => {
    switch (role) {
      case 'admin_systeme':
      case 'admin':
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' };
      case 'chef_equipe':
      case 'responsable':
        return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' };
      case 'operateur':
      case 'technicien':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' };
      case 'controleur':
      case 'inspecteur':
        return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' };
      case 'superviseur':
      case 'superviseur_limite':
      case 'gestionnaire':
        return { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' };
      case 'agent':
      case 'viewer':
        return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-500' };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-500' };
    }
  };
  
  // Get action icon and color
  const getActionStyle = (action, status) => {
    if (status === 'failed') {
      return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' };
    }
    if (status === 'blocked') {
      return { icon: Ban, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' };
    }
    
    switch (action) {
      case 'login':
        return { icon: LogIn, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' };
      case 'logout':
        return { icon: LogOut, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' };
      case 'forced_logout':
        return { icon: UserX, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' };
      case 'timeout':
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' };
      case 'admin_action':
        return { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' };
      default:
        return { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' };
    }
  };
  
  if (!currentUser || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('supervision.accessDenied')}
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {t('supervision.adminOnly')}
          </p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }
  
  return (
    <div className={`p-4 md:p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gradient-primary">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {t('supervision.title')}
            </h1>
          </div>
          {/* Real-time indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: socketConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: socketConnected ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
            }}>
            <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {socketConnected ? t('common.realTime') : t('common.disconnected')}
          </div>
        </div>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {t('supervision.description')}
        </p>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div 
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Wifi className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {stats.connectedUsers}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.connectedNow')}
                </p>
              </div>
            </div>
          </div>
          
          <div 
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <LogIn className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {stats.todayLogins}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.todayLogins')}
                </p>
              </div>
            </div>
          </div>
          
          <div 
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {stats.weekLogins}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.weekLogins')}
                </p>
              </div>
            </div>
          </div>
          
          <div 
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {stats.failedAttempts}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.failedAttempts')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('connected')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'connected'
              ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
              : 'border-transparent hover:text-[var(--color-accent)]'
          }`}
          style={{ color: activeTab === 'connected' ? undefined : 'var(--color-text-secondary)' }}
        >
          <div className="flex items-center gap-2">
            <Users size={16} />
            {t('supervision.connectedUsers')}
            {connectedUsers.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {connectedUsers.length}
              </span>
            )}
          </div>
        </button>
        
        <button
          onClick={() => { setActiveTab('logs'); fetchLogs(1); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
              : 'border-transparent hover:text-[var(--color-accent)]'
          }`}
          style={{ color: activeTab === 'logs' ? undefined : 'var(--color-text-secondary)' }}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} />
            {t('supervision.connectionLogs')}
          </div>
        </button>
      </div>
      
      {/* Connected Users Tab */}
      {activeTab === 'connected' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('supervision.activeConnections')}
            </h2>
            <button
              onClick={fetchConnectedUsers}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
              title={t('common.refresh')}
            >
              <RefreshCw size={18} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          </div>
          
          {connectedUsers.length === 0 ? (
            <div 
              className="p-8 text-center rounded-xl"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <WifiOff className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
              <p style={{ color: 'var(--color-text-muted)' }}>
                {t('supervision.noConnectedUsers')}
              </p>
            </div>
          ) : (
            <div 
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                        {t('supervision.user')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                        {t('supervision.role')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                        {t('supervision.connectedSince')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                        {t('supervision.ipAddress')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {connectedUsers.map((connectedUser) => {
                      const roleStyle = getRoleStyle(connectedUser.role);
                      const isCurrentUser = connectedUser.user_id === currentUser.id;
                      
                      return (
                        <tr 
                          key={connectedUser.id}
                          className={`hover:bg-[var(--color-bg-tertiary)] transition-colors ${isCurrentUser ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div 
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium"
                                  style={{ 
                                    background: 'linear-gradient(135deg, var(--color-accent) 0%, #a855f7 100%)'
                                  }}
                                >
                                  {connectedUser.nom?.[0] || 'U'}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
                              </div>
                              <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                  {connectedUser.prenom} {connectedUser.nom}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs text-blue-500">({t('common.you')})</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${roleStyle.bg} ${roleStyle.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dot}`} />
                              {t(`roles.${connectedUser.role}`, { defaultValue: connectedUser.role })}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              <Clock size={14} className="text-green-500" />
                              {formatRelativeTime(connectedUser.connected_at)}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              <Globe size={14} style={{ color: 'var(--color-text-muted)' }} />
                              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                                {connectedUser.ip_address || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              {!isCurrentUser ? (
                                <button
                                  onClick={() => handleForceLogout(connectedUser.user_id, `${connectedUser.prenom} ${connectedUser.nom}`)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors"
                                  title={t('supervision.forceLogout')}
                                >
                                  <Power size={14} />
                                  <span className="hidden sm:inline">{t('supervision.disconnect')}</span>
                                </button>
                              ) : (
                                <span className="text-xs text-green-500 flex items-center gap-1">
                                  <Wifi size={14} />
                                  {t('common.online')}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Connection Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div 
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.filterAction')}
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <option value="">{t('supervision.allActions')}</option>
                  <option value="login">{t('supervision.login')}</option>
                  <option value="logout">{t('supervision.logout')}</option>
                  <option value="forced_logout">{t('supervision.forcedLogout')}</option>
                  <option value="timeout">{t('supervision.timeout')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.filterStatus')}
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <option value="">{t('supervision.allStatuses')}</option>
                  <option value="success">{t('supervision.success')}</option>
                  <option value="failed">{t('supervision.failed')}</option>
                  <option value="blocked">{t('supervision.blocked')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.startDate')}
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>
              
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.endDate')}
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDeleteOldLogs}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-orange-600 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 transition-colors flex items-center gap-2"
                  title={t('supervision.deleteOldLogs')}
                >
                  <Clock size={16} />
                  <span className="hidden sm:inline">{t('supervision.deleteOldLogs')}</span>
                </button>
                <button
                  onClick={handleDeleteAllLogs}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
                  title={t('supervision.deleteAllLogs')}
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">{t('supervision.deleteAllLogs')}</span>
                </button>
              </div>
              <button
                onClick={() => fetchLogs(1)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white gradient-primary hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Filter size={16} />
                {t('supervision.applyFilters')}
              </button>
            </div>
          </div>
          
          {/* Logs Table */}
          <div 
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            {logsLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent)' }} />
              </div>
            ) : connectionLogs.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                <p style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.noLogs')}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                        <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                          {t('supervision.user')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                          {t('supervision.action')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                          {t('supervision.status')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                          {t('supervision.ipAddress')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                          {t('supervision.date')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {connectionLogs.map((log) => {
                        const style = getActionStyle(log.action, log.status);
                        const Icon = style.icon;
                        
                        return (
                          <tr 
                            key={log.id}
                            className="hover:bg-[var(--color-bg-tertiary)] transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                  style={{ 
                                    background: log.avatar_url 
                                      ? `url(${log.avatar_url})` 
                                      : 'linear-gradient(135deg, var(--color-accent) 0%, #a855f7 100%)',
                                    backgroundSize: 'cover'
                                  }}
                                >
                                  {!log.avatar_url && (log.nom?.[0] || '?')}
                                </div>
                                <div>
                                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                    {log.nom ? `${log.prenom} ${log.nom}` : t('supervision.unknownUser')}
                                  </p>
                                  {log.role && (
                                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                      {t(`roles.${log.role}`, { defaultValue: log.role })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${style.bg}`}>
                                <Icon size={12} className={style.color} />
                                <span className={style.color}>
                                  {t(`supervision.${log.action}`)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {log.status === 'success' ? (
                                  <CheckCircle size={14} className="text-green-500" />
                                ) : log.status === 'failed' ? (
                                  <XCircle size={14} className="text-red-500" />
                                ) : (
                                  <Ban size={14} className="text-orange-500" />
                                )}
                                <span 
                                  className="text-xs"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  {t(`supervision.${log.status}`)}
                                </span>
                              </div>
                              {log.failure_reason && (
                                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                  {log.failure_reason}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                                {log.ip_address || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                {formatDate(log.created_at)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div 
                    className="flex items-center justify-between px-4 py-3 border-t"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {t('supervision.showing', { 
                        from: (pagination.page - 1) * pagination.limit + 1,
                        to: Math.min(pagination.page * pagination.limit, pagination.total),
                        total: pagination.total
                      })}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchLogs(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
                      </button>
                      
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {pagination.page} / {pagination.totalPages}
                      </span>
                      
                      <button
                        onClick={() => fetchLogs(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={18} style={{ color: 'var(--color-text-secondary)' }} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <CheckCircle size={20} />
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
      
      {/* Delete All Logs Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteAllModal(false)}
          />
          <div 
            className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-in"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {t('supervision.deleteAllLogs')}
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.confirmDeleteAllLogs')}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--color-bg-tertiary)]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDeleteAllLogs}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Old Logs Modal */}
      {showDeleteOldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteOldModal(false)}
          />
          <div 
            className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-in"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {t('supervision.deleteOldLogs')}
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.deleteOlderThanDays')}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <input
                type="number"
                min="1"
                max="365"
                value={deleteOldDays}
                onChange={(e) => setDeleteOldDays(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-center text-2xl font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              />
              <p className="text-center mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {t('common.date').toLowerCase()}
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteOldModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--color-bg-tertiary)]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDeleteOldLogs}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Force Logout Modal */}
      {showForceLogoutModal && userToLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowForceLogoutModal(false); setUserToLogout(null); }}
          />
          <div 
            className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-in"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Power className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {t('supervision.forceLogout')}
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {t('supervision.confirmForceLogoutMessage')}
                </p>
              </div>
            </div>
            <div 
              className="mt-4 p-4 rounded-xl flex items-center gap-3"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, #a855f7 100%)' }}
              >
                {userToLogout.name?.[0] || 'U'}
              </div>
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {userToLogout.name}
              </span>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowForceLogoutModal(false); setUserToLogout(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--color-bg-tertiary)]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmForceLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                {t('supervision.disconnect')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
