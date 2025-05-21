interface ApiConfig {
  baseURL: string;
  headers: {
    'Content-Type': string;
    'Accept': string;
  };
  timeout: number;
  retryAttempts: number;
}

export const API_CONFIG: ApiConfig = {
  baseURL: 'https://teacher-app-backend-mnqv.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
  retryAttempts: 3, // Number of retry attempts
}; 