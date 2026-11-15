import axiosClient from './axiosClient';

const authApi = {
  ping: () => axiosClient.get('/ping'),
  login: (payload) => axiosClient.post('/auth/login', payload),
  getMe: () => axiosClient.get('/auth/me'),
  logout: () => axiosClient.post('/auth/logout'),
  pingRoleArea: (prefix) => axiosClient.get(`/${prefix}/ping-role`),
};

export default authApi;