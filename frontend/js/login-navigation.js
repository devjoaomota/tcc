export const DEFAULT_RETURN_PAGE = "home.html";

export const ALLOWED_RETURN_PAGES = [
  "home.html",
  "agendamentos.html",
  "agendar.html",
  "pets.html",
  "pets-novo.html",
  "pet-detalhe.html",
  "perfil.html",
  "pacotes.html",
  "checkout.html",
  "resumo.html",
];

export function safeReturnTo(value) {
  if (typeof value !== "string") return DEFAULT_RETURN_PAGE;
  const match = /^([a-z-]+\.html)(\?[\w=&%.-]*)?$/.exec(value.trim());
  if (!match || !ALLOWED_RETURN_PAGES.includes(match[1])) return DEFAULT_RETURN_PAGE;
  return match[1] + (match[2] || "");
}
