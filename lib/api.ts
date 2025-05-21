import { API_CONFIG, ERROR_MESSAGES } from '../config';

// Mock user data
const mockUsers = [
  {
    id: '1',
    idNumber: '2020-0001',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    role: 'admin',
    username: 'admin',
    password: 'admin123'
  },
  {
    id: '2',
    idNumber: '2020-0002',
    firstName: 'Lecturer',
    lastName: 'User',
    email: 'lecturer@example.com',
    role: 'lecturer',
    username: 'lecturer',
    password: 'password123'
  },
  {
    id: '3',
    idNumber: '2020-1233',
    firstName: 'Rudelito',
    lastName: 'Dongiapon',
    email: 'dongiaponrudelito7@gmail.com',
    role: 'student',
    username: 'rudelito',
    password: 'rudelito'
  }
];

export type User = {
  _id: string;
  idNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: 'admin' | 'lecturer' | 'student';
};

export interface Course {
  _id: string;
  courseCode: string;
  courseName: string;
  description: string;
  lecturerId: {
    _id: string;
    firstName: string;
    lastName: string;
  } | null;
  schedules: Array<{
    days: string[];
    startTime: string;
    endTime: string;
  }>;
  students?: string[];
  enrolledStudents?: number;
}

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || ERROR_MESSAGES.SERVER_ERROR);
  }
  return response.json();
};

// Helper function to handle fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = API_CONFIG.timeout) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
      }
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
    throw error;
  }
};

const fetchWithRetry = async (url: string, options: RequestInit, retries = API_CONFIG.retryAttempts) => {
  try {
    console.log(`Attempting request to ${url} (${retries} retries left)`);
    
    // First try a health check to wake up the server
    console.log('Performing health check...');
    const healthCheck = await fetch(`${API_CONFIG.baseURL}/health`, {
      method: 'GET',
      headers: API_CONFIG.headers,
    }).catch(error => {
      console.error('Health check failed:', error);
      throw new Error('Server is not reachable');
    });

    console.log('Health check successful, proceeding with request...');
    const response = await fetchWithTimeout(url, options, API_CONFIG.timeout);
    return response;
  } catch (error) {
    console.error('Request failed:', error);
    if (retries > 0) {
      console.log(`Retrying request... ${retries} attempts left`);
      // Wait for 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};

export const authenticateUser = async (username: string, password: string) => {
  try {
    console.log('Starting login attempt...');
    console.log('API URL:', `${API_CONFIG.baseURL}/auth/login`);
    
    // First try a health check
    console.log('Performing health check...');
    const healthCheck = await fetch(`${API_CONFIG.baseURL}/health`, {
      method: 'GET',
      headers: API_CONFIG.headers,
    });
    console.log('Health check response:', await healthCheck.text());

    console.log('Attempting login request...');
    const response = await fetchWithRetry(
      `${API_CONFIG.baseURL}/auth/login`,
      {
        method: 'POST',
        headers: API_CONFIG.headers,
        body: JSON.stringify({ username, password }),
      }
    );

    console.log('Login response status:', response.status);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('Login error data:', errorData);
      throw new Error(errorData.message || ERROR_MESSAGES.AUTH_ERROR);
    }

    const data = await response.json();
    console.log('Login successful, user data:', data);
    return {
      success: true,
      user: data
    };
  } catch (error) {
    console.error('Authentication error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : ERROR_MESSAGES.AUTH_ERROR
    };
  }
};

export const getAllUsers = async () => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/users`, {
      headers: API_CONFIG.headers,
    });

    return handleResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
    throw new Error('Failed to fetch users: Unknown error');
  }
};

export const getUserById = async (id: string) => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/users/${id}`, {
      headers: API_CONFIG.headers,
    });

    return handleResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
    throw new Error('Failed to fetch user: Unknown error');
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
    throw new Error('Failed to fetch users: Unknown error');
  }
};

export const createUser = async (userData: any) => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    return handleResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
    throw new Error('Failed to create user: Unknown error');
  }
};

export const updateUser = async (id: string, userData: any) => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/users/${id}`, {
      method: 'PUT',
      headers: API_CONFIG.headers,
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update user');
    }

    return handleResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
    throw new Error('Failed to update user: Unknown error');
  }
};

export const deleteUser = async (userId: string) => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/users/${userId}`, {
      method: 'DELETE',
      headers: API_CONFIG.headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete user');
    }

    return handleResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
    throw new Error('Failed to delete user: Unknown error');
  }
};

export const getLoginLogs = async () => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/logs`, {
      headers: API_CONFIG.headers,
    });

    return handleResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch login logs: ${error.message}`);
    }
    throw new Error('Failed to fetch login logs: Unknown error');
  }
};

export const resetPassword = async (email: string, username: string, newPassword: string) => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/reset-password`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({ email, username, newPassword }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
    throw new Error('Password reset failed: Unknown error');
  }
};

export const createCourse = async (courseData: any) => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseData),
    });

    return handleResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create course: ${error.message}`);
    }
    throw new Error('Failed to create course: Unknown error');
  }
};

export const getCourses = async () => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/courses`, {
      headers: API_CONFIG.headers,
    });

    const courses = await handleResponse(response);
    
    // Calculate enrolled students count for each course
    const coursesWithEnrolledCount = courses.map((course: Course) => ({
      ...course,
      enrolledStudents: course.students ? course.students.length : 0
    }));

    return coursesWithEnrolledCount;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch courses: ${error.message}`);
    }
    throw new Error('Failed to fetch courses: Unknown error');
  }
};

export const updateCourse = async (courseId: string, courseData: Partial<Course>): Promise<Course> => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/courses/${courseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update course');
    }

    const updatedCourse = await response.json();
    return updatedCourse;
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
};

export const deleteCourse = async (id: string) => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/courses/${id}`, {
      method: 'DELETE',
      headers: API_CONFIG.headers,
    });

    return handleResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete course: ${error.message}`);
    }
    throw new Error('Failed to delete course: Unknown error');
  }
}; 