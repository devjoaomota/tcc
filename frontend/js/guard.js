import { api, getToken, clearToken } from "./api.js";

// Confere o token antes de mostrar a página. Chame no topo do script de cada
// página protegida.
export async function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.replace("index.html");
    return null;
  }
  try {
    const { user } = await api.me();
    return user;
  } catch {
    clearToken();
    window.location.replace("index.html");
    return null;
  }
}
