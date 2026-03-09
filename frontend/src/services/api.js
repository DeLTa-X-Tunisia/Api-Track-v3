export const API_BASE_URL = '/api';

// Generic fetch wrapper with error handling
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// Grades API
export const gradesAPI = {
  getAll: () => fetchAPI('/grades'),
  getById: (id) => fetchAPI(`/grades/${id}`),
  getNuances: (gradeId) => fetchAPI(`/grades/${gradeId}/nuances`),
};

// Nuances API
export const nuancesAPI = {
  getAll: () => fetchAPI('/nuances'),
  getById: (id) => fetchAPI(`/nuances/${id}`),
};

// Fournisseurs API
export const fournisseursAPI = {
  getAll: (actif = true) => fetchAPI(`/fournisseurs?actif=${actif}`),
  getById: (id) => fetchAPI(`/fournisseurs/${id}`),
  create: (data) => fetchAPI('/fournisseurs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => fetchAPI(`/fournisseurs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id, permanent = false) => fetchAPI(`/fournisseurs/${id}?permanent=${permanent}`, {
    method: 'DELETE',
  }),
};

// Bobines API
export const bobinesAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchAPI(`/bobines${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => fetchAPI(`/bobines/${id}`),
  create: (data) => fetchAPI('/bobines', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => fetchAPI(`/bobines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => fetchAPI(`/bobines/${id}`, {
    method: 'DELETE',
  }),
  
  // Photos
  getPhotos: (bobineId) => fetchAPI(`/bobines/${bobineId}/photos`),
  uploadPhotos: async (bobineId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('photos', file);
    });
    return fetchAPI(`/bobines/${bobineId}/photos`, {
      method: 'POST',
      body: formData,
    });
  },
  deletePhoto: (bobineId, photoId) => fetchAPI(`/bobines/${bobineId}/photos/${photoId}`, {
    method: 'DELETE',
  }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => fetchAPI('/dashboard/stats'),
};

// Users API
export const usersAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchAPI(`/users${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => fetchAPI(`/users/${id}`),
  create: (data) => fetchAPI('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => fetchAPI(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => fetchAPI(`/users/${id}`, {
    method: 'DELETE',
  }),
  toggleActive: (id) => fetchAPI(`/users/${id}/toggle-active`, {
    method: 'PATCH',
  }),
  getAccessCode: (id) => fetchAPI(`/users/${id}/code`),
  regenerateCode: (id) => fetchAPI(`/users/${id}/regenerate-code`, {
    method: 'POST',
  }),
  login: (code_acces) => fetchAPI('/users/login', {
    method: 'POST',
    body: JSON.stringify({ code_acces }),
  }),
};

// Lots API
export const lotsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchAPI(`/lots${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => fetchAPI(`/lots/${id}`),
  getNextNumber: () => fetchAPI('/lots/next-number'),
  getAvailableBobines: () => fetchAPI('/lots/available-bobines'),
  create: (data) => fetchAPI('/lots', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => fetchAPI(`/lots/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => fetchAPI(`/lots/${id}`, {
    method: 'DELETE',
  }),
  // Pipeline validation
  validateStage: (id, stage, validatorData) => fetchAPI(`/lots/${id}/validate/${stage}`, {
    method: 'POST',
    body: JSON.stringify(validatorData),
  }),
  cancelValidation: (id, stage) => fetchAPI(`/lots/${id}/cancel-validation/${stage}`, {
    method: 'POST',
  }),
};

// Tubes API
export const tubesAPI = {
  getAll: (params = {}) => {
    // Filter out undefined/null/empty values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '')
    );
    const queryString = new URLSearchParams(cleanParams).toString();
    return fetchAPI(`/tubes${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => fetchAPI(`/tubes/${id}`),
  getNextNumber: () => fetchAPI('/tubes/next-number'),
  getDiameterOptions: () => fetchAPI('/tubes/diameter-options'),
  getPipelineStages: () => fetchAPI('/tubes/pipeline-stages'),
  getAvailableLots: (all = false) => fetchAPI(`/tubes/available-lots${all ? '?all=true' : ''}`),
  create: (data) => fetchAPI('/tubes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => fetchAPI(`/tubes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => fetchAPI(`/tubes/${id}`, {
    method: 'DELETE',
  }),
  // Pipeline validation
  validateStage: (id, stage, validatorData) => fetchAPI(`/tubes/${id}/validate/${stage}`, {
    method: 'POST',
    body: JSON.stringify(validatorData),
  }),
  // Validation with images (FormData)
  validateStageWithImages: async (id, stage, formData) => {
    const response = await fetch(`${API_BASE_URL}/tubes/${id}/validate/${stage}`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for multipart
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur serveur');
    }
    return response.json();
  },
  cancelValidation: (id, stage, data = {}) => fetchAPI(`/tubes/${id}/cancel-validation/${stage}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  // Perform action on stage (repair, skip, NC, interrupt, downgrade, rebut)
  stageAction: (id, stage, actionData) => fetchAPI(`/tubes/${id}/action/${stage}`, {
    method: 'POST',
    body: JSON.stringify(actionData),
  }),
  // Delete history entry (soft delete)
  deleteHistoryEntry: (tubeId, historyId, data = {}) => fetchAPI(`/tubes/${tubeId}/history/${historyId}`, {
    method: 'DELETE',
    body: JSON.stringify(data),
  }),
  // Submit repairs with images (FormData)
  submitRepairs: async (id, stage, formData) => {
    const response = await fetch(`${API_BASE_URL}/tubes/${id}/repairs/${stage}`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur serveur');
    }
    return response.json();
  },
  // Resolve repair with outcome (repair_validated, repair_derogation, rebut, downgrade)
  resolveRepair: (id, data) => fetchAPI(`/tubes/${id}/resolve-repair`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  // Resume from interruption - records resume time and calculates duration
  resume: (id, data) => fetchAPI(`/tubes/${id}/resume`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  // Certify tube (Hydraulique or API 5L) - ends the pipeline
  certify: (id, data) => fetchAPI(`/tubes/${id}/certify`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  // Get repairs for a tube
  getRepairs: (id, stage = null) => {
    const params = stage ? `?stage=${stage}` : '';
    return fetchAPI(`/tubes/${id}/repairs${params}`);
  },
  // Delete a repair entry
  deleteRepair: (tubeId, repairId, data = {}) => fetchAPI(`/tubes/${tubeId}/repairs/${repairId}`, {
    method: 'DELETE',
    body: JSON.stringify(data),
  }),
};

// Reparations API (dropdowns)
export const reparationsAPI = {
  // Defauts
  getDefauts: (actif = true) => fetchAPI(`/reparations/defauts?actif=${actif}`),
  getAllDefauts: () => fetchAPI('/reparations/defauts?actif=all'),
  createDefaut: (data) => fetchAPI('/reparations/defauts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateDefaut: (id, data) => fetchAPI(`/reparations/defauts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteDefaut: (id, userInfo = {}) => fetchAPI(`/reparations/defauts/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(userInfo),
  }),
  
  // Causes
  getCauses: (actif = true) => fetchAPI(`/reparations/causes?actif=${actif}`),
  getAllCauses: () => fetchAPI('/reparations/causes?actif=all'),
  createCause: (data) => fetchAPI('/reparations/causes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCause: (id, data) => fetchAPI(`/reparations/causes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCause: (id, userInfo = {}) => fetchAPI(`/reparations/causes/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(userInfo),
  }),
  
  // Responsabilites
  getResponsabilites: (actif = true) => fetchAPI(`/reparations/responsabilites?actif=${actif}`),
  getAllResponsabilites: () => fetchAPI('/reparations/responsabilites?actif=all'),
  createResponsabilite: (data) => fetchAPI('/reparations/responsabilites', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateResponsabilite: (id, data) => fetchAPI(`/reparations/responsabilites/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteResponsabilite: (id, userInfo = {}) => fetchAPI(`/reparations/responsabilites/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(userInfo),
  }),

  // Actions Futures
  getActionsFutures: (actif = true) => fetchAPI(`/reparations/actions-futures?actif=${actif}`),
  getAllActionsFutures: () => fetchAPI('/reparations/actions-futures?actif=all'),
  createActionFuture: (data) => fetchAPI('/reparations/actions-futures', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateActionFuture: (id, data) => fetchAPI(`/reparations/actions-futures/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteActionFuture: (id, userInfo = {}) => fetchAPI(`/reparations/actions-futures/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(userInfo),
  }),

  // History
  getHistory: (tableName) => fetchAPI(`/reparations/history/${tableName}`),
  
  // Causes Passer (Skip)
  getCausesPasser: (actif = true) => fetchAPI(`/reparations/causes-passer?actif=${actif}`),
  getAllCausesPasser: () => fetchAPI('/reparations/causes-passer?actif=all'),
  createCausePasser: (data) => fetchAPI('/reparations/causes-passer', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCausePasser: (id, data) => fetchAPI(`/reparations/causes-passer/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCausePasser: (id, userInfo = {}) => fetchAPI(`/reparations/causes-passer/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(userInfo),
  }),
  
  // Decisions Passer (Skip)
  getDecisionsPasser: (actif = true) => fetchAPI(`/reparations/decisions-passer?actif=${actif}`),
  getAllDecisionsPasser: () => fetchAPI('/reparations/decisions-passer?actif=all'),
  createDecisionPasser: (data) => fetchAPI('/reparations/decisions-passer', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateDecisionPasser: (id, data) => fetchAPI(`/reparations/decisions-passer/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteDecisionPasser: (id, userInfo = {}) => fetchAPI(`/reparations/decisions-passer/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(userInfo),
  }),
  
  // Causes Interruption
  getCausesInterruption: (active = true) => fetchAPI(`/reparations/causes-interruption?active=${active}`),
  getAllCausesInterruption: () => fetchAPI('/reparations/causes-interruption?active=all'),
  createCauseInterruption: (data) => fetchAPI('/reparations/causes-interruption', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCauseInterruption: (id, data) => fetchAPI(`/reparations/causes-interruption/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCauseInterruption: (id, userInfo = {}) => fetchAPI(`/reparations/causes-interruption/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(userInfo),
  }),
};

export default {
  grades: gradesAPI,
  nuances: nuancesAPI,
  fournisseurs: fournisseursAPI,
  bobines: bobinesAPI,
  dashboard: dashboardAPI,
  users: usersAPI,
  lots: lotsAPI,
  tubes: tubesAPI,
  reparations: reparationsAPI,
};
