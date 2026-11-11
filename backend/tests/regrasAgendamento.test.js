import test from "node:test";
import assert from "node:assert/strict";
import { isValidDate, isValidSlot, bookingDateError } from "../utils/time.js";
import { estimate, canCancelInAdvance } from "../utils/packages.js";
import { serviceMatchesPet } from "../utils/appointments.js";

test("datas impossiveis sao recusadas", () => {
  assert.equal(isValidDate("2027-02-30"), false);
  assert.equal(isValidDate("2028-02-29"), true);
  assert.equal(isValidDate("29/02/2028"), false);
});

test("grade de horarios vai de 08:00 a 17:30 em intervalos de 30 minutos", () => {
  assert.equal(isValidSlot("08:00"), true);
  assert.equal(isValidSlot("17:30"), true);
  assert.equal(isValidSlot("07:30"), false);
  assert.equal(isValidSlot("18:00"), false);
  assert.equal(isValidSlot("10:15"), false);
});

test("domingo e recusado como dia de atendimento", () => {
  assert.match(bookingDateError("2026-11-15"), /domingos/);
});

test("estimativa soma a taxa de transporte apenas quando ha busca ou entrega", () => {
  assert.equal(estimate(5500, "leva_ao_pet_shop", "retira_no_pet_shop").total_cents, 5500);
  assert.equal(estimate(5500, "busca_em_casa", "retira_no_pet_shop").total_cents, 7000);
  assert.equal(estimate(5500, "busca_em_casa", "entrega_em_casa").total_cents, 7000);
});

test("pacote cobre o servico e o transporte incluido", () => {
  const contract = { includes_pickup: 1, includes_delivery: 1, name: "4 banhos" };
  const quote = estimate(5500, "busca_em_casa", "entrega_em_casa", contract);
  assert.equal(quote.total_cents, 0);
  assert.equal(quote.package_covered_cents, 5500);
});

test("servico precisa corresponder ao porte do pet", () => {
  assert.equal(serviceMatchesPet({ name: "Pequeno - Banho" }, { size: "Pequeno" }), true);
  assert.equal(serviceMatchesPet({ name: "Grande - Banho e Tosa" }, { size: "Pequeno" }), false);
});

test("cancelamento de pacote respeita a antecedencia minima", () => {
  const appointment = { date: "2026-12-10", time: "10:00" };
  assert.equal(canCancelInAdvance(appointment, 24, { date: "2026-12-09", time: "09:00" }), true);
  assert.equal(canCancelInAdvance(appointment, 24, { date: "2026-12-09", time: "11:00" }), false);
});
