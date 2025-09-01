import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger.js';

interface ServiceConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

class ServiceClient {
  private client: AxiosInstance;
  private retries: number;

  constructor(config: ServiceConfig) {
    this.retries = config.retries;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
        (config) => {
          logger.debug('Service request:', {
            method: config.method,
            url: config.url,
            baseURL: config.baseURL
          });
          return config;
        },
        (error) => {
          logger.error('Service request error:', error);
          return Promise.reject(error);
        }
    );

    // Response interceptor
    this.client.interceptors.response.use(
        (response) => {
          logger.debug('Service response:', {
            status: response.status,
            url: response.config.url
          });
          return response;
        },
        (error) => {
          logger.error('Service response error:', {
            status: error.response?.status,
            message: error.message,
            url: error.config?.url
          });
          return Promise.reject(error);
        }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry(() => this.client.get(url, config));
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry(() => this.client.post(url, data, config));
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry(() => this.client.put(url, data, config));
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry(() => this.client.delete(url, config));
  }

  private async executeWithRetry<T>(operation: () => Promise<any>): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await operation();
        return response.data;
      } catch (error: any) {
        lastError = error;

        // Don't retry on 4xx errors (client errors)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }

        // Retry on connection errors and 5xx errors
        const shouldRetry = (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND' ||
          error.cause?.code === 'ECONNREFUSED' ||
          (error.response?.status >= 500)
        );

        if (!shouldRetry || attempt === this.retries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        logger.warn(`Service request failed, retrying in ${delay}ms (attempt ${attempt}/${this.retries})`, {
          error: error.message,
          url: error.config?.url
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

// Lazy initialization to avoid constructor call before dotenv loads
let authServiceClientInstance: ServiceClient | null = null;
let aiServiceClientInstance: ServiceClient | null = null;
let analyticsServiceClientInstance: ServiceClient | null = null;
let submissionServiceClientInstance: ServiceClient | null = null;

export const getAuthServiceClient = (): ServiceClient => {
  if (!authServiceClientInstance) {
    authServiceClientInstance = new ServiceClient({
      baseURL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      timeout: 5000,
      retries: 3
    });
  }
  return authServiceClientInstance;
};

export const getAIServiceClient = (): ServiceClient => {
  if (!aiServiceClientInstance) {
    aiServiceClientInstance = new ServiceClient({
      baseURL: process.env.AI_SERVICE_URL || 'http://localhost:3003',
      timeout: 30000,
      retries: 2
    });
  }
  return aiServiceClientInstance;
};


export const getAnalyticsServiceClient = (): ServiceClient => {
  if (!analyticsServiceClientInstance) {
    analyticsServiceClientInstance = new ServiceClient({
      baseURL: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005',
      timeout: 10000,
      retries: 3
    });
  }
  return analyticsServiceClientInstance;
};

export const getSubmissionServiceClient = (): ServiceClient => {
  if (!submissionServiceClientInstance) {
    submissionServiceClientInstance = new ServiceClient({
      baseURL: process.env.SUBMISSION_SERVICE_URL || 'http://localhost:3004',
      timeout: 10000,
      retries: 3
    });
  }
  return submissionServiceClientInstance;
};


// For backward compatibility (but use getters instead)
export const authServiceClient = {
  get: (url: string, config?: AxiosRequestConfig) => getAuthServiceClient().get(url, config),
  post: (url: string, data?: any, config?: AxiosRequestConfig) => getAuthServiceClient().post(url, data, config),
  put: (url: string, data?: any, config?: AxiosRequestConfig) => getAuthServiceClient().put(url, data, config),
  delete: (url: string, config?: AxiosRequestConfig) => getAuthServiceClient().delete(url, config)
};

export const aiServiceClient = {
  get: (url: string, config?: AxiosRequestConfig) => getAIServiceClient().get(url, config),
  post: (url: string, data?: any, config?: AxiosRequestConfig) => getAIServiceClient().post(url, data, config),
  put: (url: string, data?: any, config?: AxiosRequestConfig) => getAIServiceClient().put(url, data, config),
  delete: (url: string, config?: AxiosRequestConfig) => getAIServiceClient().delete(url, config)
};
