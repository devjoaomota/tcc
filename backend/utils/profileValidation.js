export const PHONE_MIN_DIGITS = 10;
export const PHONE_MAX_DIGITS = 13;
export const NAME_MAX_LENGTH = 255;

export function parsePhone(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return { error: "Informe um numero de telefone valido." };
  }
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS) {
    return { error: "Informe um numero de telefone valido com DDD." };
  }
  return { value: digits };
}

export function parseName(value, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    return required ? { error: "Informe o nome." } : { value: null };
  }
  if (typeof value !== "string") return { error: "O nome deve ser um texto." };
  const name = value.trim();
  if (!name) return required ? { error: "Informe o nome." } : { value: null };
  if (name.length > NAME_MAX_LENGTH) return { error: `O nome deve ter ate ${NAME_MAX_LENGTH} caracteres.` };
  return { value: name };
}
