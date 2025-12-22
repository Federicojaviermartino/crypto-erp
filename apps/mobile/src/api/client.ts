import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';

/**
 * API Client for Crypto ERP Mobile App
 *
 * Features:
 * - Automatic JWT token injection
 * - Token refresh on 401
 * - Company ID header injection
 * - Request/response interceptors
 * - Error handling
 */
class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: Add auth token and company ID
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const companyId = await AsyncStorage.getItem(STORAGE_KEYS.COMPANY_ID);

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (companyId) {
          config.headers['X-Company-Id'] = companyId;
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor: Handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue failed requests while refreshing
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;

            await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

            // Retry all queued requests
            this.failedQueue.forEach((prom) => prom.resolve(accessToken));
            this.failedQueue = [];

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            this.failedQueue.forEach((prom) => prom.reject(refreshError));
            this.failedQueue = [];

            await this.clearAuth();
            // Trigger logout in app (will be handled by Redux)
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      },
    );
  }

  private async clearAuth() {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.COMPANY_ID,
    ]);
  }

  // Generic request methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }
}

export default new ApiClient();
