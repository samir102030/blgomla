const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? "https://egy-chem-hub-production.up.railway.app/api"
  : "http://localhost:5002/api";

// Get auth token from localStorage (not needed since backend uses HTTP-only cookies)
// The token is automatically sent with requests via cookies
const getAuthToken = () => {
  return null; // Token is handled via HTTP-only cookies, not localStorage
};

// Base fetch configuration
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    credentials: 'include', // Include cookies in requests
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// File upload helper
const uploadFile = async (endpoint, file, additionalData = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const formData = new FormData();
  formData.append('image', file);
  
  // Add additional form data
  Object.keys(additionalData).forEach(key => {
    formData.append(key, additionalData[key]);
  });

  const config = {
    method: 'POST',
    credentials: 'include', // Include cookies in requests
    headers: {
      // Don't set Content-Type for FormData, let browser set it
    },
    body: formData,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};

// Generic CRUD operations
export const api = {
  // GET requests
  get: (endpoint) => apiRequest(endpoint),
  
  // POST requests
  post: (endpoint, data) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // PUT requests
  put: (endpoint, data) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // DELETE requests
  delete: (endpoint) => apiRequest(endpoint, {
    method: 'DELETE',
  }),
  
  // File upload
  upload: uploadFile,
};

// Resource-specific API functions
export const articlesAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/articles/all${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/articles/${id}${queryString ? `?${queryString}` : ''}`);
  },
  getByIdAdmin: (id) => api.get(`/articles/${id}/admin`),
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
};

export const newsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/news${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/news/${id}${queryString ? `?${queryString}` : ''}`);
  },
  getByIdAdmin: (id) => api.get(`/news/${id}/admin`),
  create: (data) => api.post('/news', data),
  update: (id, data) => api.put(`/news/${id}`, data),
  delete: (id) => api.delete(`/news/${id}`),
};

export const eventsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/events${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/events/${id}${queryString ? `?${queryString}` : ''}`);
  },
  getByIdAdmin: (id) => api.get(`/events/${id}/admin`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
};

export const productsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/products${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/products/${id}${queryString ? `?${queryString}` : ''}`);
  },
  getByIdAdmin: (id) => api.get(`/products/${id}/admin`),
  getTopViewed: () => api.get('/products/topViewed'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

export const usersAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/users${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  approve: (id) => api.put(`/users/${id}/approve`, {}),
  reject: (id) => api.put(`/users/${id}/reject`, {}),
  requestApproval: () => api.post('/users/request-approval', {}),
};

export const quotesAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/quotes${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => api.get(`/quotes/${id}`),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  delete: (id) => api.delete(`/quotes/${id}`),
  approve: (id) => api.put(`/quotes/${id}/approve`, {}),
  reject: (id) => api.put(`/quotes/${id}/reject`, {}),
  getStats: () => api.get('/quotes/stats'),
  // CRM integration method
  getAllWithCRM: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/quotes/crm${queryString ? `?${queryString}` : ''}`);
  },
};

export const crmAPI = undefined;

export const companyProfileAPI = {
  get: () => api.get('/company-profile'),
  getPublic: () => api.get('/company-profile/public'),
  update: (data) => api.put('/company-profile', data),
  updateSocial: (platform, data) => api.put(`/company-profile/social/${platform}`, data),
  updateLocation: (data) => api.put('/company-profile/location', data),
  updateWorkingHours: (data) => api.put('/company-profile/working-hours', data),
  reset: () => api.post('/company-profile/reset', {}),
};

export const logoAPI = {
  getCurrent: () => api.get('/logo/current'),
  getAll: () => api.get('/logo'),
  upload: (logoData) => api.post('/logo', logoData),
  setActive: (logoId) => api.put(`/logo/${logoId}/activate`, {}),
  delete: (logoId) => api.delete(`/logo/${logoId}`),
};

export const companiesAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/companies${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

export const categoriesAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/categories${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => api.get(`/categories/${id}`),
  getByIdAdmin: (id) => api.get(`/categories/${id}/admin`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const brandsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/brands${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => api.get(`/brands/${id}`),
  create: (data) => api.post('/brands', data),
  update: (id, data) => api.put(`/brands/${id}`, data),
  delete: (id) => api.delete(`/brands/${id}`),
};

export const slidersAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/sliders${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => api.get(`/sliders/${id}`),
  create: (data) => api.post('/sliders', data),
  update: (id, data) => api.put(`/sliders/${id}`, data),
  delete: (id) => api.delete(`/sliders/${id}`),
};

export const uploadAPI = {
  uploadImage: (imageFile) => {
    const url = `${API_BASE_URL}/cloudinary/upload`;
    
    const formData = new FormData();
    formData.append('myFile', imageFile); // Use 'myFile' to match backend expectation
    
    const config = {
      method: 'POST',
      credentials: 'include', // Include cookies in requests
      headers: {
        // Don't set Content-Type for FormData, let browser set it
      },
      body: formData,
    };

    return fetch(url, config).then(async (response) => {
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      return response.json();
    }).catch((error) => {
      console.error('Image upload failed:', error);
      throw error;
    });
  },
};

// Mission, Vision, Values APIs
export const missionAPI = {
  get: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/mission${queryString ? `?${queryString}` : ''}`);
  },
  update: (data) => api.put('/mission', data),
  updateById: (id, data) => api.put(`/mission/${id}`, data),
};

export const visionAPI = {
  get: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/vision${queryString ? `?${queryString}` : ''}`);
  },
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/vision/all${queryString ? `?${queryString}` : ''}`);
  },
  create: (data) => api.post('/vision', data),
  update: (id, data) => api.put(`/vision/${id}`, data),
  delete: (id) => api.delete(`/vision/${id}`),
};

export const valuesAPI = {
  get: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/values${queryString ? `?${queryString}` : ''}`);
  },
  update: (data) => api.put('/values', data),
};

export const metaContentAPI = {
  get: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/meta-content${queryString ? `?${queryString}` : ''}`);
  },
  update: (data) => api.put('/meta-content', data),
  create: (data) => api.post('/meta-content', data),
};

// Authentication API
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/users/login', credentials);
    // Store user info in localStorage (token is handled via HTTP-only cookies)
    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },
  
  register: (userData) => api.post('/users', userData),
  
  logout: async () => {
    try {
      await api.post('/users/logout', {});
    } finally {
      // Clear local storage (token is cleared via cookie by backend)
      localStorage.removeItem('user');
    }
  },
  
  getCurrentUser: () => api.get('/users/profile'),
  
  googleLogin: (credential) => api.post('/users/google-login', { credential }),
  
  // Helper function to get stored user info
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  // Helper function to check if user is logged in
  isLoggedIn: () => {
    return localStorage.getItem('user') !== null;
  },
  
  // Helper function to check if user is admin
  isAdmin: () => {
    const user = authAPI.getStoredUser();
    return user && user.isAdmin === true;
  },
}; 