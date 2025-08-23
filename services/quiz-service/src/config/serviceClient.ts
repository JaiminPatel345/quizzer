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
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

// Lazy initialization to avoid constructor call before dotenv loads
let authServiceClientInstance: ServiceClient | null = null;
let aiServiceClientInstance: ServiceClient | null = null;

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

export const getAiServiceClient = (): ServiceClient => {
  if (!aiServiceClientInstance) {
    aiServiceClientInstance = new ServiceClient({
      baseURL: process.env.AI_SERVICE_URL || 'http://localhost:3003',
      timeout: 30000, // AI operations can take longer
      retries: 2
    });
  }
  return aiServiceClientInstance;
};

// For backward compatibility (but use getters instead)
export const authServiceClient = {
  get: (url: string, config?: AxiosRequestConfig) => getAuthServiceClient().get(url, config),
  post: (url: string, data?: any, config?: AxiosRequestConfig) => getAuthServiceClient().post(url, data, config),
  put: (url: string, data?: any, config?: AxiosRequestConfig) => getAuthServiceClient().put(url, data, config),
  delete: (url: string, config?: AxiosRequestConfig) => getAuthServiceClient().delete(url, config)
};

export const aiServiceClient = {
  get: (url: string, config?: AxiosRequestConfig) => getAiServiceClient().get(url, config),
  post: (url: string, data?: any, config?: AxiosRequestConfig) => getAiServiceClient().post(url, data, config),
  put: (url: string, data?: any, config?: AxiosRequestConfig) => getAiServiceClient().put(url, data, config),
  delete: (url: string, config?: AxiosRequestConfig) => getAiServiceClient().delete(url, config)
};
