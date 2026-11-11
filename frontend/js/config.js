// Em desenvolvimento local (localhost ou IP da rede local) a API roda na porta
// 3333 do mesmo host; em producao ela e publicada em /backend no mesmo dominio.
const { protocol, hostname, host } = window.location;
const PRODUCTION_API_ORIGIN = `${protocol}//${host}/backend`;
const isLocalHost =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);

const DEFAULT_API_ORIGIN = isLocalHost
  ? `${protocol}//${hostname}:3333`
  : PRODUCTION_API_ORIGIN;

// Origem (sem "/api") usada para resolver caminhos relativos vindos da API,
// como as fotos de pet (/uploads/xxx.jpg) — o frontend pode ser servido por
// uma origem diferente (ex: XAMPP), então esses caminhos precisam do host da API.
export const API_ORIGIN = window.CAFOFO_API_ORIGIN || DEFAULT_API_ORIGIN;

export const API_BASE_URL = window.CAFOFO_API_URL || `${API_ORIGIN}/api`;
