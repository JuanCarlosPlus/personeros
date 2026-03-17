import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  seed: () => api.post('/auth/seed'),
};

// Coverage drill-down
export const coverageAPI = {
  national: () => api.get('/coverage/national'),
  provinces: (deptCode) => api.get(`/coverage/dept/${deptCode}`),
  districts: (provCode) => api.get(`/coverage/prov/${provCode}`),
  centros: (ubigeo) => api.get(`/coverage/dist/${ubigeo}`),
  mesas: (ubigeo, idLocal) =>
    api.get(`/coverage/centros/${ubigeo}/${encodeURIComponent(idLocal)}`),
};

// Personeros
export const personeroAPI = {
  dniLookup: (dni) => api.get(`/personeros/dni/${dni}`),
  createOrUpdate: (data) => api.post('/personeros', data),
  list: (params) => api.get('/personeros', { params }),
  sugeridos: (ubigeo, idLocal, mesa) =>
    api.get(`/personeros/sugeridos/${ubigeo}/${encodeURIComponent(idLocal)}/${mesa}`),
  asignar: (personeroId, mesaCodigo) =>
    api.post('/personeros/asignar', { personeroId, mesaCodigo }),
  desasignar: (mesaCodigo) =>
    api.post('/personeros/desasignar', { mesaCodigo }),
  confirmar: (mesaCodigo) =>
    api.post('/personeros/confirmar', { mesaCodigo }),
  stats: () => api.get('/personeros/stats'),
};
