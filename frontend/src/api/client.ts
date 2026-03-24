import axios from 'axios';

const TOKEN_KEY = 'auth_token';

export const apiClient = axios.create({
  baseURL: '/api/v1',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }

  return config;
});
