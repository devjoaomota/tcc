import test from "node:test";
import assert from "node:assert/strict";
import { safeReturnTo, DEFAULT_RETURN_PAGE } from "../../frontend/js/login-navigation.js";

test("retorno para pagina local prevista e mantido", () => {
  assert.equal(safeReturnTo("agendamentos.html"), "agendamentos.html");
  assert.equal(safeReturnTo("pet-detalhe.html?id=abc-123"), "pet-detalhe.html?id=abc-123");
});

test("endereco externo ou pagina desconhecida volta para a pagina inicial", () => {
  for (const value of ["https://site-externo.com", "//site-externo.com", "javascript:alert(1)", "../admin/dashboard.html", "admin/dashboard.html", null]) {
    assert.equal(safeReturnTo(value), DEFAULT_RETURN_PAGE);
  }
});
