import test from "node:test";
import assert from "node:assert/strict";
import { parseName, parsePhone } from "../utils/profileValidation.js";

test("telefone com mascara e normalizado para digitos", () => {
  assert.deepEqual(parsePhone("(19) 99123-0001"), { value: "19991230001" });
});

test("telefone fora do intervalo de 10 a 13 digitos e recusado", () => {
  assert.ok(parsePhone("123456789").error);
  assert.ok(parsePhone("1".repeat(14)).error);
  assert.ok(parsePhone("1".repeat(30)).error);
});

test("telefone que nao e texto nem numero e recusado", () => {
  assert.ok(parsePhone({ numero: "19991230001" }).error);
  assert.ok(parsePhone(undefined).error);
});

test("nome e opcional no login e obrigatorio quando exigido", () => {
  assert.deepEqual(parseName(undefined), { value: null });
  assert.ok(parseName("", { required: true }).error);
});

test("nome com tipo indevido ou longo demais e recusado", () => {
  assert.ok(parseName({ nome: "objeto" }).error);
  assert.ok(parseName(42).error);
  assert.ok(parseName("a".repeat(256)).error);
  assert.deepEqual(parseName("  Ana  "), { value: "Ana" });
});
