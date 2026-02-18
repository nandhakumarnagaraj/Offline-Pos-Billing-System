import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const configService = {
  async fetchConfig() {
    try {
      const response = await axios.get(`${API_BASE_URL}/config`);
      return response.data; // Flat { "shop.name": "..." }
    } catch (error) {
      console.error('Failed to fetch config from backend, using local defaults', error);
      return null;
    }
  }
};
