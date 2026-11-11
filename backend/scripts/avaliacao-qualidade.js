import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import mysql from "mysql2/promise";

// Uso: node scripts/avaliacao-qualidade.js <rotulo> [pasta-de-saida]
// Requer um MySQL/MariaDB de teste (variaveis LAB_DB_*). O banco aps_<rotulo> e recriado a cada execucao.

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendDir = path.resolve(backendDir, "..", "frontend");
const label = (process.argv[2] || "avaliacao").replace(/[^a-z0-9_]/gi, "_");
const outDir = path.resolve(process.argv[3] || path.join(backendDir, "avaliacao"));
mkdirSync(outDir, { recursive: true });

const DB = {
  host: process.env.LAB_DB_HOST || "127.0.0.1",
  port: Number(process.env.LAB_DB_PORT || 33316),
  user: process.env.LAB_DB_USER || "root",
  password: process.env.LAB_DB_PASSWORD || "",
};
const DB_NAME = `aps_${label}`;
const PORT = Number(process.env.LAB_API_PORT || 33317);
const BASE = `http://127.0.0.1:${PORT}`;

const SAO_PAULO = "America/Sao_Paulo";

function shopDatePlus(days) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: SAO_PAULO }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  while (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function resetDatabase() {
  const conn = await mysql.createConnection(DB);
  await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
  await conn.query(`CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
}

async function startApi() {
  const log = createWriteStream(path.join(outDir, `${label}-servidor.txt`));
  const child = spawn(process.execPath, ["server.js"], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      PORT_SERVER: String(PORT),
      DB_HOST: DB.host,
      DB_PORT: String(DB.port),
      DB_USER: DB.user,
      DB_PASSWORD: DB.password,
      DB_NAME,
      DB_SSL: "false",
      JWT_SECRET: randomBytes(48).toString("hex"),
      ADMIN_DEFAULT_PASSWORD: randomBytes(18).toString("base64url"),
    },
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return child;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error("A API nao respondeu ao health check.");
}

async function call(method, url, { token, json, body, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload = body;
  if (json !== undefined) {
    h["Content-Type"] = "application/json";
    payload = JSON.stringify(json);
  }
  const res = await fetch(`${BASE}${url}`, { method, headers: h, body: payload });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: res.status, data, text };
}

const results = [];
function record(id, group, scenario, expected, observed, passed) {
  results.push({ id, group, scenario, expected, observed, passed: Boolean(passed) });
}

const INTERNAL_DETAIL = /(sql|column|coluna|ER_[A-Z_]+|syntax|at row|Unexpected (token|end)|JSON (at position|input)|stack|\.js:\d+)/i;

async function login(phone, name) {
  return call("POST", "/api/auth/login", { json: { phone, name } });
}

async function runChecks() {
  const date = shopDatePlus(7);
  const html = readFileSync(path.join(frontendDir, "login.html"), "utf8");

  let r = await call("GET", "/api/health");
  record("F01", "Funcional", "Health check responde com o servico esperado", [200, true], [r.status, r.data?.ok === true], r.status === 200 && r.data?.ok === true);

  r = await call("GET", "/api/services");
  const services = r.data?.services || [];
  record("F02", "Funcional", "Catalogo possui os dez servicos do seed", [200, 10], [r.status, services.length], r.status === 200 && services.length === 10);
  const bath = services.find((s) => s.name === "Pequeno - Banho");

  r = await call("GET", "/api/pets");
  record("F03", "Funcional", "Consulta de pets exige autenticacao", 401, r.status, r.status === 401);

  const tutorA = await login("19991230001", "Tutor A");
  const tokenA = tutorA.data?.token;
  const tampered = tokenA ? `${tokenA.slice(0, -2)}${tokenA.slice(-2) === "aa" ? "bb" : "aa"}` : "x";
  r = await call("GET", "/api/pets", { token: tampered });
  record("F04", "Funcional", "Token adulterado e recusado", 401, r.status, r.status === 401);

  r = await login("12345", "Curto");
  record("F05", "Funcional", "Telefone curto e recusado", 400, r.status, r.status === 400);

  r = await call("GET", "/api/auth/me", { token: tokenA });
  record("F06", "Funcional", "Login e consulta do perfil", [200, "19991230001"], [r.status, r.data?.user?.phone], r.status === 200 && r.data?.user?.phone === "19991230001");

  const form = new FormData();
  form.set("name", "Thor");
  form.set("size", "Pequeno");
  form.set("breed", "Shih-tzu");
  form.set("age_years", "3");
  r = await call("POST", "/api/pets", { token: tokenA, body: form });
  const petA = r.data?.pet;
  record("F07", "Funcional", "Cadastro de pet", 201, r.status, r.status === 201 && petA?.id);

  r = await call("GET", `/api/services/${bath?.id}/slots?date=2027-02-30`);
  record("F08", "Funcional", "Data impossivel e recusada", 400, r.status, r.status === 400);

  r = await call("GET", `/api/services/${bath?.id}/slots?date=${date}`);
  const slots = r.data?.slots || [];
  record("F09", "Funcional", "Agenda futura tem vinte horarios", [200, 20], [r.status, slots.length], r.status === 200 && slots.length === 20);

  const base = { pet_id: petA?.id, service_id: bath?.id, date, time: "10:00", checkin_mode: "leva_ao_pet_shop", checkout_mode: "retira_no_pet_shop" };
  r = await call("POST", "/api/appointments/estimate", { token: tokenA, json: base });
  record("F10", "Funcional", "Estimativa de banho sem transporte: R$ 55,00", [200, 5500], [r.status, r.data?.estimate?.total_cents], r.status === 200 && r.data?.estimate?.total_cents === 5500);

  r = await call("POST", "/api/appointments/estimate", { token: tokenA, json: { ...base, checkin_mode: "busca_em_casa" } });
  record("F11", "Funcional", "Estimativa com busca em casa soma a taxa de R$ 15,00", [200, 7000], [r.status, r.data?.estimate?.total_cents], r.status === 200 && r.data?.estimate?.total_cents === 7000);

  r = await call("POST", "/api/appointments", { token: tokenA, json: { ...base, time: "07:00", payment_method: "pix" } });
  record("F12", "Funcional", "Horario fora da grade e recusado", 400, r.status, r.status === 400);

  r = await call("POST", "/api/appointments", { token: tokenA, json: { ...base, checkin_mode: "busca_em_casa", payment_method: "pix" } });
  record("F13", "Funcional", "Busca em casa exige endereco", 400, r.status, r.status === 400);

  const booking = { ...base, payment_method: "pix" };
  const pair = await Promise.all([
    call("POST", "/api/appointments", { token: tokenA, json: booking }),
    call("POST", "/api/appointments", { token: tokenA, json: booking }),
  ]);
  const codes = pair.map((p) => p.status).sort();
  const created = pair.find((p) => p.status === 201)?.data?.appointment;
  record("F14", "Confiabilidade", "Duas reservas simultaneas resultam em uma criacao e um conflito", [201, 409], codes, codes[0] === 201 && codes[1] === 409);

  r = await call("GET", `/api/services/${bath?.id}/slots?date=${date}`);
  const slot10 = (r.data?.slots || []).find((s) => s.time === "10:00");
  record("F15", "Funcional", "Horario reservado fica indisponivel", false, slot10?.available, slot10?.available === false);

  const c1 = await call("PATCH", `/api/appointments/${created?.id}/cancel`, { token: tokenA });
  const c2 = await call("PATCH", `/api/appointments/${created?.id}/cancel`, { token: tokenA });
  record("F16", "Funcional", "Cancelamento e idempotente", [200, 200], [c1.status, c2.status], c1.status === 200 && c2.status === 200);

  r = await call("GET", `/api/services/${bath?.id}/slots?date=${date}`);
  const slot10b = (r.data?.slots || []).find((s) => s.time === "10:00");
  record("F17", "Funcional", "Cancelamento libera o horario", true, slot10b?.available, slot10b?.available === true);

  r = await call("GET", "/api/rota-inexistente", { token: tokenA });
  record("F18", "Funcional", "Rota inexistente retorna JSON 404", [404, "json"], [r.status, r.data ? "json" : "texto"], r.status === 404 && r.data !== null);

  r = await call("GET", "/api/admin/appointments/today", { token: tokenA });
  record("S01", "Autorizacao", "Token de cliente em rota administrativa", 403, r.status, r.status === 403);

  const tutorB = await login("19991230002", "Tutor B");
  r = await call("GET", `/api/pets/${petA?.id}`, { token: tutorB.data?.token });
  record("S02", "Autorizacao", "Pet de outro tutor nao e exposto", 404, r.status, r.status === 404);

  r = await login("1".repeat(30), "Telefone longo");
  record("Q01", "Robustez", "Telefone com 30 digitos e recusado", 400, r.status, r.status === 400);
  const longPhoneBody = r.text;

  r = await login("19991230003", { nome: "objeto" });
  record("Q02", "Robustez", "Nome enviado como objeto e recusado", 400, r.status, r.status === 400);

  const leak = [longPhoneBody, r.text].some((t) => INTERNAL_DETAIL.test(t));
  record("Q03", "Tratamento de erros", "Respostas de erro nao expoem detalhes internos", "sem detalhe interno", leak ? "detalhe interno exposto" : "sem detalhe interno", !leak);

  r = await call("POST", "/api/auth/login", { body: "{\"phone\": ", headers: { "Content-Type": "application/json" } });
  const stable = r.status === 400 && typeof r.data?.error === "string" && !INTERNAL_DETAIL.test(r.data.error);
  record("Q04", "Tratamento de erros", "JSON invalido recebe mensagem publica estavel", [400, "mensagem publica"], [r.status, r.data?.error ?? r.text.slice(0, 80)], stable);

  const labelFor = (id) => new RegExp(`<label[^>]*\\bfor=["']${id}["']`, "i").test(html);
  record("A01", "Interacao", "Campos de nome e telefone com rotulo associado", true, labelFor("name") && labelFor("phone"), labelFor("name") && labelFor("phone"));
  const alertRole = /id=["']formError["'][^>]*role=["']alert["']|role=["']alert["'][^>]*id=["']formError["']/i.test(html);
  record("A02", "Interacao", "Mensagem de erro do login com role=\"alert\"", true, alertRole, alertRole);

  const again = await login("19991230001");
  const risk = {
    scenario: "Novo login informando apenas o telefone de um tutor existente",
    observed: again.status === 200 && Boolean(again.data?.token) && again.data?.user?.id === tutorA.data?.user?.id,
  };
  return risk;
}

async function runPerformance() {
  for (let i = 0; i < 10; i++) await fetch(`${BASE}/api/services`).then((r) => r.text());
  const samples = [];
  let errors = 0;
  const t0 = performance.now();
  for (let batch = 0; batch < 20; batch++) {
    await Promise.all(Array.from({ length: 10 }, async () => {
      const s = performance.now();
      const r = await fetch(`${BASE}/api/services`);
      await r.text();
      samples.push(performance.now() - s);
      if (r.status !== 200) errors++;
    }));
  }
  const total = performance.now() - t0;
  const sorted = [...samples].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.ceil(p * sorted.length) - 1];
  const round = (v) => Math.round(v * 100) / 100;
  return {
    requests: samples.length, concurrency: 10, warmup: 10, errors,
    errorRatePercent: round((errors / samples.length) * 100),
    p50Ms: round(pct(0.5)), p95Ms: round(pct(0.95)), maxMs: round(sorted.at(-1)),
    totalMs: round(total), throughputRps: round(samples.length / (total / 1000)),
    samplesMs: samples.map(round),
  };
}

await resetDatabase();
const api = await startApi();
try {
  const authenticationRisk = await runChecks();
  const performanceResult = await runPerformance();
  const passed = results.filter((r) => r.passed).length;
  const report = {
    label, executedAt: new Date().toISOString(), node: process.version,
    summary: { total: results.length, passed, failed: results.length - passed, approvalPercent: Math.round((passed / results.length) * 10000) / 100 },
    results, authenticationRisk, performance: performanceResult,
  };
  writeFileSync(path.join(outDir, `${label}-resultados.json`), JSON.stringify(report, null, 2));
  for (const r of results) console.log(`${r.passed ? "OK   " : "FALHA"} ${r.id} ${r.scenario} | esperado ${JSON.stringify(r.expected)} | obtido ${JSON.stringify(r.observed)}`);
  console.log(`\n${passed}/${results.length} verificacoes aprovadas`);
  console.log(`Risco de identidade observado: ${authenticationRisk.observed}`);
  console.log(`Desempenho: p50 ${performanceResult.p50Ms} ms, p95 ${performanceResult.p95Ms} ms, erros ${performanceResult.errors}/${performanceResult.requests}`);
  process.exitCode = passed === results.length ? 0 : 1;
} finally {
  const exited = new Promise((resolve) => api.once("exit", resolve));
  api.kill();
  await exited;
}
