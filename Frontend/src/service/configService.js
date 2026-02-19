import { api } from './api';

export const configService = {
  async fetchConfig() {
    try {
      const response = await api.get('/config');
      return response.data; // Flat { "shop.name": "..." }
    } catch (error) {
      console.error('Failed to fetch config from backend, using local defaults', error);
      return null;
    }
  }
};
