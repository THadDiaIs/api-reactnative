import { apiService, ApiService } from './api.service';

export interface Usuario {
  usuarioId: number;
  nombreUsuario: string;
  nombre: string;
}

export interface LoginResponse {
  token: string;
  expiracion: string;
  usuario: Usuario;
}

export class AuthService {
  constructor(private readonly api: ApiService) {}

  async login(nombreUsuario: string, password: string): Promise<Usuario> {
    const data = await this.api.post<LoginResponse>('/auth/login', {
      nombreUsuario,
      password,
    });
    await this.api.setToken(data.token);
    return data.usuario;
  }

  async logout(): Promise<void> {
    await this.api.clearToken();
  }

  restaurarSesion(): Promise<boolean> {
    return this.api.restoreToken();
  }

  getPerfil(): Promise<Usuario> {
    return this.api.get<Usuario>('/auth/perfil');
  }
}

export const authService = new AuthService(apiService);

