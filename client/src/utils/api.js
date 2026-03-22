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

// Instancia separada para personero (usa personeroToken)
const personeroAxios = axios.create({ baseURL: '/api/v1', timeout: 30000 });
personeroAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('personeroToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Instancia separada para jefe de local (usa jefeLocalToken)
const jefeLocalAxios = axios.create({ baseURL: '/api/v1', timeout: 30000 });
jefeLocalAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('jefeLocalToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
  seed: () => api.post('/auth/seed'),
};

// Coverage drill-down
export const coverageAPI = {
  national: (tipo = 'Nacional') => api.get('/coverage/national', { params: { tipo } }),
  provinces: (deptCode) => api.get(`/coverage/dept/${deptCode}`),
  districts: (provCode) => api.get(`/coverage/prov/${provCode}`),
  centros: (ubigeo) => api.get(`/coverage/dist/${ubigeo}`),
  mesas: (ubigeo, idLocal) =>
    api.get(`/coverage/centros/${ubigeo}/${encodeURIComponent(idLocal)}`),
};

// Coordinadores
export const coordinadorAPI = {
  // Listar: nivel='region'|'provincia'|'distrito'|'local', ubigeoLike='15'
  list: (params) => api.get('/coordinadores', { params }),
  // Obtener uno exacto
  getOne: (nivel, ubigeo, idLocal = '') =>
    api.get(`/coordinadores/${nivel}/${ubigeo}`, { params: idLocal ? { idLocal } : {} }),
  // Crear / actualizar
  createOrUpdate: (data) => api.post('/coordinadores', data),
  // Quitar
  remove: (id) => api.delete(`/coordinadores/${id}`),
  // Lookup DNI
  dniLookup: (dni) => api.get(`/coordinadores/dni/${dni}`),
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
  bulkCreate: (personeros) => api.post('/personeros/bulk', { personeros }),
  registerPublic: (data) => api.post('/personeros/registro-publico', data),
  remove: (id) => api.delete(`/personeros/${id}`),
  login: (dni, codigoTel) => api.post('/personeros/login', { dni, codigoTel }),
  miEstado: () => personeroAxios.get('/personeros/mi-estado'),
};

// Cargos
export const cargoAPI = {
  list: () => api.get('/cargos'),
  permisos: () => api.get('/cargos/permisos'),
  create: (data) => api.post('/cargos', data),
  update: (id, data) => api.put(`/cargos/${id}`, data),
  remove: (id) => api.delete(`/cargos/${id}`),
  seed: () => api.post('/cargos/seed'),
};

// Directivos
export const directivoAPI = {
  login: (dni, password) => api.post('/directivos/login', { dni, password }),
  list: (params) => api.get('/directivos', { params }),
  create: (data) => api.post('/directivos', data),
  update: (id, data) => api.put(`/directivos/${id}`, data),
  remove: (id) => api.delete(`/directivos/${id}`),
  getMe: () => api.get('/directivos/me'),
  dniLookup: (dni) => api.get(`/directivos/dni/${dni}`),
};

// Invitaciones
export const invitacionAPI = {
  bulkCreate: (invitaciones) => api.post('/invitaciones/bulk', { invitaciones }),
  list: (params) => api.get('/invitaciones', { params }),
  stats: () => api.get('/invitaciones/stats'),
  porLink: (linkCode) => api.get(`/invitaciones/por-link/${linkCode}`),
  verificar: (telefono, linkCode) => api.get(`/invitaciones/verificar/${telefono}/${linkCode}`),
};

// WhatsApp (para el robot)
export const whatsappAPI = {
  cola: () => api.get('/whatsapp/cola'),
  marcarEnviado: (id) => api.patch(`/whatsapp/${id}/enviado`),
  marcarError: (id) => api.patch(`/whatsapp/${id}/error`),
};

// Jefe de Local
export const jefeLocalAPI = {
  solicitarCodigo: (telefono) => api.post('/jefe-local/solicitar-codigo', { telefono }),
  verificarCodigo: (telefono, codigo) => api.post('/jefe-local/verificar-codigo', { telefono, codigo }),
  miLocal: () => jefeLocalAxios.get('/jefe-local/mi-local'),
  asignar: (personeroId, mesaCodigo) => jefeLocalAxios.post('/jefe-local/asignar', { personeroId, mesaCodigo }),
  desasignar: (mesaCodigo) => jefeLocalAxios.post('/jefe-local/desasignar', { mesaCodigo }),
  // Admin
  list: () => api.get('/jefe-local'),
  crear: (data) => api.post('/jefe-local/crear', data),
  remove: (id) => api.delete(`/jefe-local/${id}`),
};

// Chat
export const chatAPI = {
  canales: () => api.get('/chat/canales'),
  mensajes: (canal, desde) => api.get(`/chat/mensajes/${canal}`, { params: desde ? { desde } : {} }),
  enviar: (canal, texto) => api.post('/chat/mensajes', { canal, texto }),
};

// Reportes
export const reporteAPI = {
  directivos: () => api.get('/reportes/directivos'),
  tendencia: () => api.get('/reportes/tendencia'),
  estados: () => api.get('/reportes/estados'),
};
