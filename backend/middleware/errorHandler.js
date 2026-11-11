export const INVALID_JSON_MESSAGE = "O corpo da requisicao nao e um JSON valido.";
export const INTERNAL_ERROR_MESSAGE = "Erro interno do servidor.";

export function resolveError(err) {
  if (err?.type === "entity.parse.failed") return { status: 400, error: INVALID_JSON_MESSAGE };
  if (err?.type === "entity.too.large") return { status: 413, error: "A requisicao e grande demais." };
  if (err?.name === "MulterError") {
    const error = err.code === "LIMIT_FILE_SIZE" ? "A imagem deve ter no maximo 5 MB." : "Nao foi possivel receber o arquivo enviado.";
    return { status: 400, error };
  }
  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 && err.expose !== false) {
    return { status: err.status, error: err.message };
  }
  return { status: 500, error: INTERNAL_ERROR_MESSAGE };
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const { status, error } = resolveError(err);
  if (status === 500) console.error(err);
  res.status(status).json({ error });
}
