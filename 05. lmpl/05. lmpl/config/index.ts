// API Configuration type
export interface ApiConfig {
  baseURL: string;
  headers: {
    'Content-Type': string;
    'Accept': string;
  };
  timeout: number;
}

// Error Messages type
export interface ErrorMessages {
  NETWORK_ERROR: string;
  TIMEOUT_ERROR: string;
  SERVER_ERROR: string;
  AUTH_ERROR: string;
}

export const API_CONFIG: ApiConfig = {
  // Use environment variable with fallback for development
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.254.118:3000/api', // Use computer's IP address
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
};

// Network error messages
export const ERROR_MESSAGES: ErrorMessages = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  AUTH_ERROR: 'Authentication failed. Please check your credentials.',
}; 