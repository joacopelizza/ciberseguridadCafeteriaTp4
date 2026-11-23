import type { ErrorHttp } from './tipos';

// ============================================================
// SECCIÓN 1: LISTAS BLANCAS DE VALORES PERMITIDOS
//
// COMMIT RECOMENDADO:
// security: centralizar valores permitidos de la aplicación
// ============================================================
export const valoresValidos = {
  tiposProducto: ['espresso', 'filtrado', 'pasteleria'],
  variedades: ['Brasil', 'Colombia', 'Etiopía'],
  estadosPedido: ['abierto', 'preparando', 'listo', 'entregado'],
  roles: ['admin', 'barista', 'mozo', 'cliente'],
  extensionesImagen: ['.png', '.jpg', '.jpeg', '.webp'],
} as const;

// ============================================================
// SECCIÓN 2: VALIDADORES Y ERRORES HTTP
//
// COMMIT RECOMENDADO:
// security: centralizar validaciones de entrada
// ============================================================
export function idPositivo(valor: unknown): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function textoDentroDeRango(valor: unknown, minimo: number, maximo: number): valor is string {
  return typeof valor === 'string' && valor.trim().length >= minimo && valor.trim().length <= maximo;
}

export function crearErrorHttp(status: number, mensaje: string): ErrorHttp {
  const error = new Error(mensaje) as ErrorHttp;
  error.status = status;
  return error;
}
