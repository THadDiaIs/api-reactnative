import AsyncStorage from '@react-native-async-storage/async-storage';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const TOKEN_STORAGE_KEY = 'token';
const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:5000';
const DEFAULT_TIMEOUT_MS = 65000;

interface ApiErrorBody {
  mensaje?: string;
  errores?: Record<string, string[]>;
}

export class ApiService {
  private readonly baseUrl: string;
  private token: string | null = null;
  private onSesionExpirada: () => void = () => {};

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setOnSesionExpirada(callback: () => void) {
    this.onSesionExpirada = callback;
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  async clearToken(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  async restoreToken(): Promise<boolean> {
    this.token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    return this.token !== null;
  }

  private buildUrl(endpoint: string): string {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${normalizedEndpoint}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const hadToken = this.token !== null;
      const response = await fetch(this.buildUrl(endpoint), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          ...options.headers,
        },
        signal: controller.signal,
      });

      if (response.status === 204) {
        return null as T;
      }

      const contentType = response.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');
      const data: unknown = isJson ? await response.json() : await response.text();

      if (response.status === 401 && hadToken) {
        await this.clearToken();
        this.onSesionExpirada();
      }

      if (!response.ok) {
        const errorBody = isJson ? (data as ApiErrorBody) : undefined;
        const message =
          errorBody?.mensaje ?? `Error HTTP ${response.status}: ${response.statusText || 'Error de conexión'}`;
        throw new ApiError(message, response.status, data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('La petición tardó demasiado tiempo. Intenta de nuevo.', 408);
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Error de conexión con el servidor',
        0
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiService = new ApiService();
