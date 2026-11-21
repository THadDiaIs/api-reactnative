import { apiService, ApiService } from './api.service';

export type OrdenEstado = 'Pendiente' | 'Despachada' | 'Rechazada';

export interface OrdenDetalle {
  detalleOrdenId: number;
  inventarioId: number;
  productoId: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface Orden {
  ordenId: number;
  numeroOrden: string;
  cliente: string;
  total: number;
  estado: OrdenEstado;
  fechaMod: string;
  detalles: OrdenDetalle[];
}

export interface InventarioItem {
  inventarioId: number;
  productoId: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  existencia: number;
  precio: number;
  bajoStock?: boolean;
  fechaMod?: string;
}

export interface CrearOrdenDetalle {
  inventarioId: number;
  cantidad: number;
}

export interface CrearOrdenPayload {
  cliente: string;
  detalles: CrearOrdenDetalle[];
}

export class PedidosService {
  constructor(private readonly api: ApiService) {}

  getOrdenes(estado?: OrdenEstado): Promise<Orden[]> {
    const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
    return this.api.get<Orden[]>(`/ordenes${query}`);
  }

  getOrden(id: number): Promise<Orden> {
    return this.api.get<Orden>(`/ordenes/${id}`);
  }

  getInventario(): Promise<InventarioItem[]> {
    return this.api.get<InventarioItem[]>('/inventario');
  }

  crearOrden(payload: CrearOrdenPayload): Promise<Orden> {
    return this.api.post<Orden>('/ordenes', payload);
  }
}

export const pedidosService = new PedidosService(apiService);
