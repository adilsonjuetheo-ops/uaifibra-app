import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Altere esta URL para o endereço do servidor IXC do provedor
export const IXC_BASE_URL = 'https://SEU_SERVIDOR_IXC/webservice/v1';

const api = axios.create({
  baseURL: IXC_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@uaifibra:token');
  if (token) {
    config.headers.ixcsoft = 'listar';
    config.headers.Authorization = `Basic ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('@uaifibra:token');
      await AsyncStorage.removeItem('@uaifibra:user');
    }
    return Promise.reject(error);
  }
);

export default api;
