export interface ApiConfig {
  baseURL: string;
  headers: {
    'Content-Type': string;
    'Accept': string;
  };
  timeout: number;
  retryAttempts: number;
}

// Use environment variable for API URL if available
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://teacher-app-backend-mnqv.onrender.com/api';

export const API_CONFIG: ApiConfig = {
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
  retryAttempts: 3, // Number of retry attempts
}; 