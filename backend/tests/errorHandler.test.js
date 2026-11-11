import test from "node:test";
import assert from "node:assert/strict";
import { resolveError, errorHandler, INTERNAL_ERROR_MESSAGE, INVALID_JSON_MESSAGE } from "../middleware/errorHandler.js";

test("JSON invalido recebe mensagem publica estavel", () => {
  const err = Object.assign(new SyntaxError("Unexpected end of JSON input"), { type: "entity.parse.failed", status: 400 });
  assert.deepEqual(resolveError(err), { status: 400, error: INVALID_JSON_MESSAGE });
});

test("erro interno nao expoe a mensagem original", () => {
  const err = Object.assign(new Error("Data too long for column 'phone' at row 1"), { code: "ER_DATA_TOO_LONG" });
  assert.deepEqual(resolveError(err), { status: 500, error: INTERNAL_ERROR_MESSAGE });
});

test("erro de requisicao com status 4xx mantem a mensagem definida pela API", () => {
  const err = Object.assign(new Error("Envie um arquivo de imagem."), { status: 400 });
  assert.deepEqual(resolveError(err), { status: 400, error: "Envie um arquivo de imagem." });
});

test("handler delega ao Express quando os cabecalhos ja foram enviados", () => {
  let delegated = null;
  errorHandler(new Error("x"), {}, { headersSent: true }, (err) => { delegated = err; });
  assert.equal(delegated.message, "x");
});
