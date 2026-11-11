// Dados ficticios de demonstracao.
// Uso: node scripts/seed-demo.js --confirm   (recria os dados de demonstracao)
//      node scripts/seed-demo.js --remove    (apaga os dados de demonstracao)
// Apaga e recria somente os clientes da lista DEMO_CLIENTS; as datas sao
// geradas em relacao ao dia da execucao.
import "dotenv/config";
import { v4 as uuid } from "uuid";
import { db, initDatabase } from "../db/database.js";
import { seed } from "../db/seed.js";
import { nowInShop } from "../utils/time.js";
import { addDays, weekStart } from "../utils/packages.js";
import { appointmentNotification } from "../utils/notifications.js";

const args = new Set(process.argv.slice(2));
if (!args.has("--confirm") && !args.has("--remove")) {
  console.log("Uso: node scripts/seed-demo.js --confirm   (recria os dados de demonstracao)");
  console.log("     node scripts/seed-demo.js --remove    (apaga os dados de demonstracao)");
  process.exit(1);
}

// Aleatoriedade deterministica: mesmos nomes/escolhas a cada execucao.
let seedState = 20261103;
function rand() {
  seedState |= 0; seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
function weighted(pairs) {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of pairs) { if ((r -= w) <= 0) return value; }
  return pairs[pairs.length - 1][0];
}

// Clientes ficticios (os 6 primeiros sao os mesmos do banco de demo da equipe).
// address: indice em STREETS (ruas reais ate ~5,5 km da loja), ou null.
const STREETS = [
  { cep: "13185-095", street: "Rua das Rosas", neighborhood: "Jardim Malta" },
  { cep: "13185-082", street: "Rua Margaridas", neighborhood: "Jardim Malta" },
  { cep: "13185-638", street: "Rua Santo Antônio", neighborhood: "Jardim Nova América" },
  { cep: "13185-606", street: "Rua Antônio Marcos", neighborhood: "Vila América" },
  { cep: "13185-134", street: "Rua Antonio Pascucci", neighborhood: "Vila Inema" },
  { cep: "13185-112", street: "Rua Antônio Luiz Borges", neighborhood: "Jardim do Lago" },
  { cep: "13185-014", street: "Rua Antônio Bairral", neighborhood: "Jardim Sumarezinho" },
  { cep: "13185-305", street: "Rua Osmar Antonio Meira", neighborhood: "Jardim Rosolém" },
  { cep: "13185-394", street: "Rua Antônio Viegas", neighborhood: "Núcleo Santa Isabel" },
  { cep: "13184-632", street: "Rua Ipê", neighborhood: "Parque dos Pinheiros" },
  { cep: "13186-231", street: "Rua Antônio Nelson Barbosa", neighborhood: "Jardim do Bosque" },
  { cep: "13183-343", street: "Rua Sergipe", neighborhood: "Jardim São Jorge" },
];

// joined: meses atras em que virou cliente (mais clientes recentes = curva de crescimento).
// pay: forma de pagamento preferida.
const DEMO_CLIENTS = [
  { phone: "19991230001", name: "Mariana Alves", joined: 11, address: 0, pay: "pix" },
  { phone: "19991230002", name: "Rafael Costa", joined: 11, address: null, pay: "cartao_credito" },
  { phone: "19991230003", name: "Fernanda Lima", joined: 10, address: 2, pay: "pix" },
  { phone: "19991230004", name: "Carlos Mendes", joined: 10, address: null, pay: "dinheiro" },
  { phone: "19991230005", name: "Juliana Rocha", joined: 9, address: 3, pay: "cartao_debito" },
  { phone: "19991230006", name: "Paulo Henrique", joined: 9, address: 5, pay: "pix" },
  { phone: "19991230007", name: "Beatriz Nogueira", joined: 8, address: null, pay: "pix" },
  { phone: "19991230008", name: "Lucas Ferreira", joined: 8, address: 7, pay: "cartao_credito" },
  { phone: "19991230009", name: "Camila Ribeiro", joined: 7, address: null, pay: "cartao_debito" },
  { phone: "19991230010", name: "Gustavo Martins", joined: 7, address: 4, pay: "pix" },
  { phone: "19991230011", name: "Aline Carvalho", joined: 6, address: null, pay: "pix" },
  { phone: "19991230012", name: "Thiago Barbosa", joined: 6, address: 9, pay: "cartao_credito" },
  { phone: "19991230013", name: "Patrícia Gomes", joined: 5, address: null, pay: "dinheiro" },
  { phone: "19991230014", name: "Rodrigo Almeida", joined: 5, address: 1, pay: "pix" },
  { phone: "19991230015", name: "Larissa Pereira", joined: 4, address: null, pay: "cartao_debito" },
  { phone: "19991230016", name: "Eduardo Santos", joined: 4, address: 8, pay: "pix" },
  { phone: "19991230017", name: "Vanessa Oliveira", joined: 3, address: null, pay: "cartao_credito" },
  { phone: "19991230018", name: "Diego Moreira", joined: 3, address: 6, pay: "pix" },
  { phone: "19991230019", name: "Renata Teixeira", joined: 3, address: null, pay: "pix" },
  { phone: "19991230020", name: "Felipe Araújo", joined: 2, address: 10, pay: "cartao_debito" },
  { phone: "19991230021", name: "Natália Castro", joined: 2, address: null, pay: "pix" },
  { phone: "19991230022", name: "Bruno Cardoso", joined: 1, address: 11, pay: "cartao_credito" },
  { phone: "19991230023", name: "Isabela Duarte", joined: 1, address: null, pay: "pix" },
  { phone: "19991230024", name: "Marcelo Freitas", joined: 0, address: null, pay: "dinheiro" },
];

// cadence: intervalo medio (dias) entre banhos. flags: [pulgas, alergia, perfume, ja_foi_petshop, agressivo, nos]
const DEMO_PETS = [
  { key: "pipoca", owner: "19991230001", name: "Pipoca", breed: "Shih Tzu", age: 2, size: "Pequeno", cadence: 10, flags: [0, 0, 1, 1, 0, 1] },
  { key: "thor", owner: "19991230001", name: "Thor", breed: "Yorkshire Terrier", age: 4, size: "Pequeno", cadence: 21, flags: [0, 1, 0, 1, 0, 0] },
  { key: "hulk", owner: "19991230002", name: "Hulk", breed: "Pug", age: 3, size: "Pequeno", cadence: 21, flags: [0, 1, 0, 1, 0, 0] },
  { key: "luna", owner: "19991230003", name: "Luna", breed: "Border Collie", age: 5, size: "Médio", cadence: 14, flags: [0, 0, 1, 1, 0, 1] },
  { key: "bob", owner: "19991230004", name: "Bob", breed: "Sem raça definida", age: 7, size: "Médio", cadence: 30, flags: [1, 0, 1, 1, 0, 0] },
  { key: "mel", owner: "19991230005", name: "Mel", breed: "Lhasa Apso", age: 1, size: "Pequeno", cadence: 14, flags: [0, 0, 1, 0, 0, 1] },
  { key: "max", owner: "19991230006", name: "Max", breed: "Labrador Retriever", age: 6, size: "Grande", cadence: 14, flags: [0, 0, 1, 1, 0, 0] },
  { key: "nina", owner: "19991230006", name: "Nina", breed: "Golden Retriever", age: 3, size: "Grande", cadence: 21, flags: [0, 0, 1, 1, 0, 1] },
  { key: "fred", owner: "19991230007", name: "Fred", breed: "Poodle", age: 8, size: "Pequeno", cadence: 21, flags: [0, 0, 1, 1, 0, 1] },
  { key: "amora", owner: "19991230008", name: "Amora", breed: "Spitz Alemão", age: 2, size: "Pequeno", cadence: 14, flags: [0, 0, 1, 1, 0, 1] },
  { key: "zeus", owner: "19991230008", name: "Zeus", breed: "Husky Siberiano", age: 4, size: "Grande", cadence: 30, flags: [0, 0, 0, 1, 0, 1] },
  { key: "belinha", owner: "19991230009", name: "Belinha", breed: "Maltês", age: 6, size: "Pequeno", cadence: 14, flags: [0, 1, 0, 1, 0, 1] },
  { key: "toby", owner: "19991230010", name: "Toby", breed: "Beagle", age: 5, size: "Médio", cadence: 30, flags: [1, 0, 1, 1, 0, 0] },
  { key: "lola", owner: "19991230011", name: "Lola", breed: "Buldogue Francês", age: 3, size: "Pequeno", cadence: 21, flags: [0, 1, 0, 1, 0, 0] },
  { key: "pandora", owner: "19991230011", name: "Pandora", breed: "Dachshund (Salsicha)", age: 9, size: "Pequeno", cadence: 30, flags: [0, 0, 1, 1, 1, 0] },
  { key: "rex", owner: "19991230012", name: "Rex", breed: "Pastor Alemão", age: 7, size: "Grande", cadence: 30, flags: [0, 0, 0, 1, 1, 1] },
  { key: "bidu", owner: "19991230013", name: "Bidu", breed: "Schnauzer", age: 4, size: "Médio", cadence: 21, flags: [0, 0, 1, 1, 0, 1] },
  { key: "cookie", owner: "19991230014", name: "Cookie", breed: "Cocker Spaniel", age: 5, size: "Médio", cadence: 21, flags: [0, 0, 1, 1, 0, 1] },
  { key: "jade", owner: "19991230014", name: "Jade", breed: "Lulu da Pomerânia", age: 2, size: "Pequeno", cadence: 14, flags: [0, 0, 1, 1, 0, 1] },
  { key: "marley", owner: "19991230015", name: "Marley", breed: "Labrador Retriever", age: 2, size: "Grande", cadence: 21, flags: [1, 0, 1, 0, 0, 0] },
  { key: "sushi", owner: "19991230016", name: "Sushi", breed: "Shih Tzu", age: 1, size: "Pequeno", cadence: 14, flags: [0, 0, 1, 0, 0, 1] },
  { key: "chico", owner: "19991230016", name: "Chico", breed: "Sem raça definida", age: 10, size: "Médio", cadence: 30, flags: [0, 1, 0, 1, 0, 0] },
  { key: "duque", owner: "19991230017", name: "Duque", breed: "Rottweiler", age: 5, size: "Grande", cadence: 30, flags: [0, 0, 0, 1, 1, 0] },
  { key: "mia", owner: "19991230018", name: "Mia", breed: "Pinscher", age: 6, size: "Pequeno", cadence: 30, flags: [0, 0, 1, 1, 1, 0] },
  { key: "brisa", owner: "19991230019", name: "Brisa", breed: "Whippet", age: 3, size: "Médio", cadence: 30, flags: [0, 0, 1, 1, 0, 0] },
  { key: "paçoca", owner: "19991230019", name: "Paçoca", breed: "Sem raça definida", age: 4, size: "Pequeno", cadence: 21, flags: [1, 0, 1, 1, 0, 0] },
  { key: "apolo", owner: "19991230020", name: "Apolo", breed: "Golden Retriever", age: 1, size: "Grande", cadence: 21, flags: [0, 0, 1, 0, 0, 1] },
  { key: "kiara", owner: "19991230021", name: "Kiara", breed: "Chow Chow", age: 6, size: "Médio", cadence: 21, flags: [0, 1, 0, 1, 0, 1] },
  { key: "bento", owner: "19991230022", name: "Bento", breed: "Buldogue Inglês", age: 4, size: "Médio", cadence: 21, flags: [0, 1, 0, 1, 0, 0] },
  { key: "flor", owner: "19991230023", name: "Flor", breed: "Lhasa Apso", age: 7, size: "Pequeno", cadence: 14, flags: [0, 0, 1, 1, 0, 1] },
  { key: "tobias", owner: "19991230024", name: "Tobias", breed: "Basset Hound", age: 8, size: "Médio", cadence: 30, flags: [0, 0, 1, 0, 0, 0] },
  { key: "luke", owner: "19991230024", name: "Luke", breed: "Jack Russell Terrier", age: 2, size: "Pequeno", cadence: 30, flags: [0, 0, 1, 0, 0, 0] },
];

const VACCINES = [
  { name: "V10 (polivalente)", months: 12 },
  { name: "Antirrábica", months: 12 },
  { name: "Gripe canina (tosse dos canis)", months: 12 },
  { name: "Giárdia", months: 12 },
];

// Horarios validos da grade (08:00 ate 17:30). Dois banhistas: no maximo 2 pets por horario.
const SLOTS = [];
for (let h = 8; h < 18; h++) for (const m of ["00", "30"]) SLOTS.push(`${String(h).padStart(2, "0")}:${m}`);
const MAX_PER_SLOT = 2;
const PICKUP_FEE = 1500;

function dayOfWeek(date) { return new Date(`${date}T00:00:00Z`).getUTCDay(); }
function notSunday(date) { return dayOfWeek(date) === 0 ? addDays(date, 1) : date; }
function dt(date, time = "09:00", plusMinutes = 0) {
  const d = new Date(`${date}T${time}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + plusMinutes);
  return d.toISOString().slice(0, 19).replace("T", " ");
}
function monthsAgo(today, n) {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 10);
}

async function removeDemo(tx) {
  const phones = DEMO_CLIENTS.map((c) => c.phone);
  const users = await tx.all(`SELECT id FROM users WHERE phone IN (?)`, [phones]);
  if (!users.length) return 0;
  const ids = users.map((u) => u.id);
  // Ordem respeita as FKs RESTRICT: usos -> agendamentos -> pacotes -> usuarios (cascata no resto).
  await tx.run(`DELETE pu FROM package_usages pu JOIN appointments a ON a.id = pu.appointment_id WHERE a.user_id IN (?)`, [ids]);
  await tx.run(`DELETE pu FROM package_usages pu JOIN customer_packages cp ON cp.id = pu.customer_package_id WHERE cp.user_id IN (?)`, [ids]);
  await tx.run(`DELETE FROM appointments WHERE user_id IN (?)`, [ids]);
  await tx.run(`DELETE FROM customer_packages WHERE user_id IN (?)`, [ids]);
  await tx.run(`DELETE FROM users WHERE id IN (?)`, [ids]);
  return ids.length;
}

async function main() {
  await initDatabase();
  await seed();

  if (args.has("--remove")) {
    const n = await db.transaction(removeDemo);
    console.log(`Dados de demonstracao removidos (${n} clientes e tudo que pertence a eles).`);
    process.exit(0);
  }

  const now = nowInShop();
  const today = now.date;
  const services = await db.all(`SELECT * FROM services`);
  const plans = await db.all(`SELECT * FROM package_plans`);
  const admin = await db.get(`SELECT id FROM admins ORDER BY created_at LIMIT 1`);
  const serviceByName = Object.fromEntries(services.map((s) => [s.name, s]));
  const servicesFor = (size) => services.filter((s) => s.name.startsWith(`${size} -`));

  // Servico preferido por porte (banho simples e o mais comum).
  function pickService(pet) {
    const list = servicesFor(pet.size);
    return weighted(list.map((s) => [s, /Banho$/.test(s.name) ? 5 : /Tosa Higi/.test(s.name) ? 4 : /e Tosa$/.test(s.name) ? 2 : 1.5]));
  }

  // Estruturas em memoria
  const users = [], pets = [], addresses = [], vaccines = [];
  const appointments = [], packages = [], usages = [];
  const slotLoad = new Map();          // date|time -> qtd
  const serviceSlot = new Set();       // service|date|time
  const petBusy = new Set();           // pet|date
  const activePets = new Set();        // pets com em_analise/agendado

  const clientByPhone = {};
  for (const c of DEMO_CLIENTS) {
    const joinedDate = notSunday(addDays(monthsAgo(today, c.joined), -randInt(0, 20)));
    // Cadastro 2-5 dias antes do primeiro banho (que acontece a partir de joinedDate).
    const user = { id: uuid(), phone: c.phone, name: c.name, created_at: dt(addDays(joinedDate, -randInt(2, 5)), "18:00", randInt(0, 200)), ...c, joinedDate };
    users.push(user);
    clientByPhone[c.phone] = user;
    if (c.address !== null) {
      const st = STREETS[c.address];
      user.addressId = uuid();
      addresses.push({ id: user.addressId, user_id: user.id, cep: st.cep, street: st.street, number: String(randInt(12, 980)),
        neighborhood: st.neighborhood, city: "Hortolândia", state: "SP", is_default: 1, created_at: user.created_at });
    }
  }
  const petByKey = {};
  for (const p of DEMO_PETS) {
    const owner = clientByPhone[p.owner];
    const [fleas, allergy, perfume, petshop, aggressive, knots] = p.flags;
    const pet = { ...p, id: uuid(), user_id: owner.id, owner, created_at: dt(owner.created_at.slice(0, 10), owner.created_at.slice(11, 16), randInt(3, 20)),
      has_fleas_ticks: fleas, has_allergy: allergy, allows_perfume: perfume, been_to_petshop: petshop, is_aggressive: aggressive, has_fur_knots: knots };
    pets.push(pet);
    petByKey[p.key] = pet;
  }

  function slotFree(serviceId, date, time) {
    return (slotLoad.get(`${date}|${time}`) || 0) < MAX_PER_SLOT && !serviceSlot.has(`${serviceId}|${date}|${time}`);
  }
  function chooseTime(serviceId, date, preferred, { after = null } = {}) {
    const order = [...SLOTS].sort((a, b) => Math.abs(SLOTS.indexOf(a) - SLOTS.indexOf(preferred)) - Math.abs(SLOTS.indexOf(b) - SLOTS.indexOf(preferred)));
    return order.find((t) => (!after || t > after) && slotFree(serviceId, date, t)) || null;
  }

  // status: concluido | cancelado | recusado | agendado | em_analise
  function addAppointment(pet, date, status, { service = pickService(pet), time = null, preferred = null, contract = null, createdAt = null, after = null } = {}) {
    if (petBusy.has(`${pet.id}|${date}`)) return null;
    const t = time && slotFree(service.id, date, time) ? time : chooseTime(service.id, date, preferred || pet.preferredTime, { after });
    if (!t) return null;
    const owner = pet.owner;
    const transport = owner.addressId && chance(0.7);
    const checkin = transport && chance(0.85) ? "busca_em_casa" : "leva_ao_pet_shop";
    const checkout = transport && (checkin === "leva_ao_pet_shop" || chance(0.8)) ? "entrega_em_casa" : "retira_no_pet_shop";
    const needsTransport = checkin === "busca_em_casa" || checkout === "entrega_em_casa";
    const pickupIncluded = checkin === "busca_em_casa" && Boolean(contract?.includes_pickup);
    const deliveryIncluded = checkout === "entrega_em_casa" && Boolean(contract?.includes_delivery);
    const fee = (checkin === "busca_em_casa" && !pickupIncluded) || (checkout === "entrega_em_casa" && !deliveryIncluded) ? PICKUP_FEE : 0;
    const total = (contract ? 0 : service.price_cents) + fee;
    const payment = total > 0 ? (chance(0.8) ? owner.pay : pick(["pix", "dinheiro", "cartao_debito", "cartao_credito"])) : null;
    const created = createdAt || dt(addDays(date, -randInt(1, 6)), pick(["08:10", "12:40", "19:05", "21:20", "07:45", "18:30"]), randInt(0, 50));
    const a = {
      id: uuid(), user_id: owner.id, pet_id: pet.id, service_id: service.id, address_id: needsTransport ? owner.addressId : null,
      date, time: t, checkin_mode: checkin, checkout_mode: checkout, status, service_price_cents: service.price_cents,
      pickup_fee_cents: fee, total_cents: total, customer_package_id: contract?.id || null,
      package_covered_cents: contract ? service.price_cents : 0, payment_method: payment,
      pickup_included: pickupIncluded ? 1 : 0, delivery_included: deliveryIncluded ? 1 : 0,
      created_at: created < pet.created_at ? dt(pet.created_at.slice(0, 10), pet.created_at.slice(11, 16), 4) : created, pet, service,
    };
    appointments.push(a);
    petBusy.add(`${pet.id}|${date}`);
    if (!["cancelado", "recusado"].includes(status)) {
      slotLoad.set(`${date}|${t}`, (slotLoad.get(`${date}|${t}`) || 0) + 1);
      serviceSlot.add(`${service.id}|${date}|${t}`);
    }
    if (["em_analise", "agendado"].includes(status)) activePets.add(pet.id);
    return a;
  }

  // Pacotes (definidos antes do historico)
  const planFor = (serviceName) => plans.find((p) => p.service_id === serviceByName[serviceName].id);
  function addPackage(petKey, serviceName, priceCents, status, startsOffset, opts = {}) {
    const pet = petByKey[petKey];
    const plan = planFor(serviceName);
    const startsOn = status === "rascunho" ? null : addDays(today, startsOffset);
    const c = {
      id: uuid(), plan_id: plan.id, user_id: pet.user_id, pet_id: pet.id, service_id: plan.service_id, name: plan.name,
      price_cents: priceCents, quantity: 4, validity_days: 30, includes_pickup: opts.pickup ? 1 : 0, includes_delivery: opts.delivery ? 1 : 0,
      cancellation_notice_hours: opts.notice ?? 24, notes: opts.notes || "", status, starts_on: startsOn,
      expires_on: startsOn ? addDays(startsOn, 30) : null,
      activated_at: startsOn ? dt(startsOn, "09:15", randInt(0, 120)) : null, created_by: admin.id,
      created_at: startsOn ? dt(addDays(startsOn, -1), "17:20", randInt(0, 60)) : dt(addDays(today, -1), "16:40"),
      pet, service: serviceByName[serviceName],
    };
    packages.push(c);
    // Durante a vigencia do pacote os banhos sao os do pacote (sem avulsos).
    if (startsOn) pet.packageWindow = [startsOn, c.expires_on];
    return c;
  }
  function addUsage(contract, appointment, status) {
    usages.push({ id: uuid(), customer_package_id: contract.id, appointment_id: appointment.id, week_start: weekStart(appointment.date),
      status, created_at: appointment.created_at });
  }

  const pkgPipoca = addPackage("pipoca", "Pequeno - Banho", 19990, "ativo", -9, { notes: "Pacote mensal com desconto de fidelidade." });
  const pkgLuna = addPackage("luna", "Médio - Banho + Hidratação", 34990, "ativo", -18, { pickup: true, delivery: true, notice: 12, notes: "Inclui busca e entrega sem taxa." });
  const pkgMax = addPackage("max", "Grande - Banho + Tosa Higiênica", 64990, "ativo", -55, { notes: "Primeiro pacote do cliente." });
  addPackage("hulk", "Pequeno - Banho e Tosa", 30990, "rascunho", 0, { notes: "Cliente pediu para iniciar após o próximo pagamento." });
  const inPackage = (pet, date) => pet.packageWindow && date >= pet.packageWindow[0] && date < pet.packageWindow[1];

  // Historico (ate ontem)
  for (const pet of pets) {
    pet.preferredTime = pick(["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "13:30", "14:00", "14:30", "15:00", "16:00"]);
    pet.mainService = pickService(pet);
    let date = notSunday(addDays(pet.owner.joinedDate, randInt(0, 6)));
    const end = addDays(today, -1);
    while (date <= end) {
      if (!inPackage(pet, date)) {
        const service = chance(0.75) ? pet.mainService : pickService(pet);
        const status = weighted([["concluido", 92], ["cancelado", 5], ["recusado", 3]]);
        addAppointment(pet, date, status, { service });
      }
      date = notSunday(addDays(date, pet.cadence + randInt(-3, 4)));
    }
  }

  // Banhos dentro dos pacotes ativos (uma vez por semana, servico do pacote).
  function packageVisit(contract, date, status, usageStatus) {
    const a = addAppointment(contract.pet, notSunday(date), status, { service: contract.service, contract });
    if (a) addUsage(contract, a, usageStatus);
    return a;
  }
  // Max: pacote vencido e totalmente usado (mostra "expirado" e o historico completo).
  for (let w = 0; w < 4; w++) packageVisit(pkgMax, addDays(pkgMax.starts_on, 2 + w * 7), "concluido", "consumido");
  // Luna: 2 banhos usados, 2 restantes (busca/entrega incluidas no pacote).
  packageVisit(pkgLuna, addDays(pkgLuna.starts_on, 1), "concluido", "consumido");
  packageVisit(pkgLuna, addDays(pkgLuna.starts_on, 8), "concluido", "consumido");
  // Pipoca: 1 usado, 1 reservado para os proximos dias (agendado).
  packageVisit(pkgPipoca, addDays(pkgPipoca.starts_on, 2), "concluido", "consumido");

  // Hoje e proximos dias
  const freeForLive = new Set(["thor", "bob", "cookie", "brisa", "luke", "apolo", "jade"]); // ficam livres para agendar ao vivo
  // Pets com pacote vigente (Pipoca, Luna) ficam fora: Pipoca ja tem reserva, Luna fica livre para agendar usando o pacote.
  const candidates = pets.filter((p) => !freeForLive.has(p.key) && !inPackage(p, today));
  let ci = 0;
  const nextPet = () => candidates[ci++ % candidates.length];

  const nextWorkday = (from, n) => { let d = from; for (let i = 0; i < n; i++) d = notSunday(addDays(d, 1)); return d; };
  const futureDay = (n) => nextWorkday(today, n);

  // Pipoca: banho do pacote reservado e confirmado.
  {
    const d = futureDay(3);
    const a = addAppointment(pkgPipoca.pet, weekStart(d) === weekStart(addDays(pkgPipoca.starts_on, 2)) ? futureDay(6) : d, "agendado",
      { service: pkgPipoca.service, contract: pkgPipoca, createdAt: dt(addDays(today, -2), "20:15") });
    if (a) addUsage(pkgPipoca, a, "reservado");
  }

  // Agenda de hoje (se hoje nao for domingo): manha ja atendida em parte, tarde confirmada.
  const todaysTimes = ["08:30", "09:30", "11:00", "13:30", "15:00", "16:30"];
  if (dayOfWeek(today) !== 0) {
    todaysTimes.forEach((time, i) => {
      const status = i === 0 && time < now.time ? "concluido" : "agendado";
      addAppointment(nextPet(), today, status, { time, createdAt: dt(addDays(today, -randInt(2, 6)), "19:30", randInt(0, 90)) });
    });
  }
  // Confirmados nos proximos 10 dias uteis.
  for (let i = 0; i < 7; i++) addAppointment(nextPet(), futureDay(1 + i), "agendado", { createdAt: dt(addDays(today, -randInt(1, 4)), "18:00", randInt(0, 200)) });
  // Solicitacoes novas aguardando analise do pet shop (para aprovar/recusar ao vivo).
  for (let i = 0; i < 5; i++) addAppointment(nextPet(), futureDay(1 + i), "em_analise", { createdAt: dt(today, "07:10", -randInt(30, 900)) });
  // Um recusado e um cancelado recentes (aparecem na tela de Solicitacoes).
  addAppointment(nextPet(), futureDay(2), "recusado", { createdAt: dt(addDays(today, -1), "09:40") });
  addAppointment(nextPet(), futureDay(4), "cancelado", { createdAt: dt(addDays(today, -3), "11:25") });

  // Regra da API: so um agendamento ativo por pet. Rebaixa duplicados (seguranca).
  const seenActive = new Set();
  for (const a of appointments) {
    if (!["em_analise", "agendado"].includes(a.status)) continue;
    if (seenActive.has(a.pet_id)) a.status = "cancelado";
    seenActive.add(a.pet_id);
  }

  // Vacinas
  for (const pet of pets) {
    if (pet.key === "thor" || !chance(0.75)) continue; // Thor recebe uma carteira fixa logo abaixo
    const list = [...VACCINES].sort(() => rand() - 0.5).slice(0, randInt(1, 3));
    for (const v of list) {
      const applied = addDays(today, -randInt(20, 350));
      const next = addDays(applied, 365);
      vaccines.push({ id: uuid(), pet_id: pet.id, name: v.name, applied_at: applied, next_dose_at: next,
        notes: chance(0.4) ? pick(["Aplicada na clínica veterinária do bairro.", "Sem reação após a aplicação.", "Reforço anual."]) : null,
        created_at: dt(applied, "16:00", randInt(0, 120)) });
    }
  }
  // Thor (pet da cliente principal) com vacina vencendo em breve: bom para mostrar na tela do pet.
  vaccines.push({ id: uuid(), pet_id: petByKey.thor.id, name: "Gripe canina (tosse dos canis)", applied_at: addDays(today, -350), next_dose_at: addDays(today, 15), notes: "Reforço anual.", created_at: dt(addDays(today, -350), "15:00") });
  vaccines.push({ id: uuid(), pet_id: petByKey.thor.id, name: "V10 (polivalente)", applied_at: addDays(today, -260), next_dose_at: addDays(today, 105), notes: null, created_at: dt(addDays(today, -260), "15:00") });
  vaccines.push({ id: uuid(), pet_id: petByKey.thor.id, name: "Antirrábica", applied_at: addDays(today, -200), next_dose_at: addDays(today, 165), notes: "Campanha municipal de vacinação.", created_at: dt(addDays(today, -200), "11:00") });

  // Gravacao
  const counts = await db.transaction(async (tx) => {
    const removed = await removeDemo(tx);
    for (const u of users) await tx.run(`INSERT INTO users (id, phone, name, status, created_at) VALUES (?, ?, ?, 'pendente', ?)`, [u.id, u.phone, u.name, u.created_at]);
    for (const a of addresses) await tx.run(`INSERT INTO addresses (id, user_id, cep, street, number, neighborhood, city, state, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.user_id, a.cep, a.street, a.number, a.neighborhood, a.city, a.state, a.is_default, a.created_at]);
    for (const p of pets) await tx.run(`INSERT INTO pets (id, user_id, name, breed, age_years, size, photo_url, has_fleas_ticks, has_allergy, allows_perfume, been_to_petshop, is_aggressive, has_fur_knots, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.user_id, p.name, p.breed, p.age, p.size, p.has_fleas_ticks, p.has_allergy, p.allows_perfume, p.been_to_petshop, p.is_aggressive, p.has_fur_knots, p.created_at]);
    for (const v of vaccines) await tx.run(`INSERT INTO vaccines (id, pet_id, name, applied_at, next_dose_at, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [v.id, v.pet_id, v.name, v.applied_at, v.next_dose_at, v.notes, v.created_at]);
    for (const c of packages) await tx.run(`INSERT INTO customer_packages (id, plan_id, user_id, pet_id, service_id, name, price_cents, quantity, validity_days, includes_pickup, includes_delivery, cancellation_notice_hours, notes, status, starts_on, expires_on, activated_at, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.plan_id, c.user_id, c.pet_id, c.service_id, c.name, c.price_cents, c.quantity, c.validity_days, c.includes_pickup, c.includes_delivery,
       c.cancellation_notice_hours, c.notes, c.status, c.starts_on, c.expires_on, c.activated_at, c.created_by, c.created_at]);
    let notifications = 0;
    for (const a of appointments) {
      await tx.run(`INSERT INTO appointments (id, user_id, pet_id, service_id, address_id, date, time, checkin_mode, checkout_mode, status, service_price_cents, pickup_fee_cents, total_cents, customer_package_id, package_covered_cents, payment_method, pickup_included, delivery_included, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.user_id, a.pet_id, a.service_id, a.address_id, a.date, a.time, a.checkin_mode, a.checkout_mode, a.status, a.service_price_cents,
         a.pickup_fee_cents, a.total_cents, a.customer_package_id, a.package_covered_cents, a.payment_method, a.pickup_included, a.delivery_included, a.created_at]);
      // Avisos que o sistema teria enfileirado em cada mudanca de status feita pelo pet shop.
      const events = a.status === "em_analise" ? [] : a.status === "recusado" ? ["recusado"]
        : a.status === "cancelado" ? (chance(0.5) ? ["agendado", "cancelado"] : ["cancelado"]) : ["agendado"];
      let at = a.created_at;
      for (const ev of events) {
        at = dt(at.slice(0, 10), at.slice(11, 16), randInt(25, 240));
        const content = appointmentNotification(a, ev, a.pet.name, a.service.name);
        const nid = uuid();
        await tx.run(`INSERT INTO notifications (id, user_id, appointment_id, event_type, title, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [nid, a.user_id, a.id, ev, content.title, content.message, at]);
        await tx.run(`INSERT INTO notification_deliveries (id, notification_id, channel, recipient, status, created_at) VALUES (?, ?, 'whatsapp', ?, 'aguardando_integracao', ?)`,
          [uuid(), nid, a.pet.owner.phone, at]);
        notifications++;
      }
    }
    for (const u of usages) await tx.run(`INSERT INTO package_usages (id, customer_package_id, appointment_id, week_start, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [u.id, u.customer_package_id, u.appointment_id, u.week_start, u.status, u.created_at]);
    return { removed, notifications };
  });

  const by = (s) => appointments.filter((a) => a.status === s).length;
  console.log(`Demonstracao gerada para ${today} (${now.time}). Clientes anteriores removidos: ${counts.removed}.`);
  console.log(`Clientes: ${users.length} | Pets: ${pets.length} | Enderecos: ${addresses.length} | Vacinas: ${vaccines.length} | Pacotes: ${packages.length}`);
  console.log(`Agendamentos: ${appointments.length} (concluidos ${by("concluido")}, confirmados ${by("agendado")}, em analise ${by("em_analise")}, cancelados ${by("cancelado")}, recusados ${by("recusado")})`);
  console.log(`Hoje: ${appointments.filter((a) => a.date === today && !["cancelado", "recusado"].includes(a.status)).length} | Avisos WhatsApp enfileirados: ${counts.notifications}`);
  console.log(`Pets livres para agendar ao vivo: ${[...freeForLive].map((k) => `${petByKey[k].name} (${petByKey[k].owner.name})`).join(", ")}`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
