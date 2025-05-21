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
  timeout: 60000, // Increase timeout to 60 seconds
  retryAttempts: 5, // Increase retry attempts
}; 