import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { db } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    // Extensao sempre de imagem: evita salvar .html/.svg/.js servidos no mesmo dominio do site.
    const ext = IMAGE_EXTENSIONS[file.mimetype] || ".jpg";
    cb(null, `${uuid()}${ext}`);
  },
});
const IMAGE_EXTENSIONS = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
  "image/heic": ".heic", "image/heif": ".heif",
};
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_EXTENSIONS[file.mimetype]) {
      return cb(Object.assign(new Error("Envie um arquivo de imagem."), { status: 400 }));
    }
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth);

// Portes aceitos: precisam bater com o prefixo dos servicos ("Pequeno - Banho" etc.).
const PET_SIZES = ["Pequeno", "Médio", "Grande"];

// Retorna mensagem de erro (ou null). `partial` = PUT, onde campos ausentes mantem o valor atual.
function petFieldsError({ name, size, age_years }, partial = false) {
  if (!partial || name !== undefined) {
    if (typeof name !== "string" || !name.trim()) return "O nome do pet e obrigatorio.";
    if (name.trim().length > 60) return "O nome do pet deve ter ate 60 caracteres.";
  }
  if ((!partial || size !== undefined) && !PET_SIZES.includes(size)) return "Escolha o porte do pet: Pequeno, Médio ou Grande.";
  if (age_years !== undefined && age_years !== "") {
    const age = Number(age_years);
    if (!Number.isInteger(age) || age < 0 || age > 30) return "Informe a idade do pet em anos (0 a 30).";
  }
  return null;
}

// Converte "1"/"0"/"true"/"false" (form-data sempre manda string) para 0/1/null.
function toBoolFlag(value) {
  if (value === undefined || value === null || value === "") return null;
  return value === "1" || value === "true" ? 1 : 0;
}

// GET /api/pets
router.get("/", asyncHandler(async (req, res) => {
  const pets = await db.all(`SELECT * FROM pets WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`, [req.userId]);
  res.json({ pets });
}));

// GET /api/pets/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const pet = await db.get(`SELECT * FROM pets WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, [req.params.id, req.userId]);
  if (!pet) return res.status(404).json({ error: "Pet nao encontrado." });
  res.json({ pet });
}));

// POST /api/pets  (multipart/form-data: name, breed, age_years, size, photo,
// has_fleas_ticks, has_allergy, allows_perfume, been_to_petshop, is_aggressive, has_fur_knots)
router.post("/", upload.single("photo"), asyncHandler(async (req, res) => {
  const {
    name, breed, age_years, size,
    has_fleas_ticks, has_allergy, allows_perfume, been_to_petshop, is_aggressive, has_fur_knots,
  } = req.body;
  const fieldsError = petFieldsError(req.body);
  if (fieldsError) return res.status(400).json({ error: fieldsError });

  const id = uuid();
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  await db.run(
    `INSERT INTO pets (
       id, user_id, name, breed, age_years, size, photo_url,
       has_fleas_ticks, has_allergy, allows_perfume, been_to_petshop, is_aggressive, has_fur_knots
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, req.userId, name, breed || null, age_years ? Number(age_years) : null, size || null, photoUrl,
      toBoolFlag(has_fleas_ticks), toBoolFlag(has_allergy), toBoolFlag(allows_perfume),
      toBoolFlag(been_to_petshop), toBoolFlag(is_aggressive), toBoolFlag(has_fur_knots),
    ]
  );

  const pet = await db.get(`SELECT * FROM pets WHERE id = ?`, [id]);
  res.status(201).json({ pet });
}));

// PUT /api/pets/:id
router.put("/:id", upload.single("photo"), asyncHandler(async (req, res) => {
  const pet = await db.get(`SELECT * FROM pets WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, [req.params.id, req.userId]);
  if (!pet) return res.status(404).json({ error: "Pet nao encontrado." });
  const fieldsError = petFieldsError(req.body, true);
  if (fieldsError) return res.status(400).json({ error: fieldsError });

  const {
    name, breed, age_years, size,
    has_fleas_ticks, has_allergy, allows_perfume, been_to_petshop, is_aggressive, has_fur_knots,
  } = req.body;
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : pet.photo_url;

  await db.run(
    `UPDATE pets SET
       name = ?, breed = ?, age_years = ?, size = ?, photo_url = ?,
       has_fleas_ticks = ?, has_allergy = ?, allows_perfume = ?,
       been_to_petshop = ?, is_aggressive = ?, has_fur_knots = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [
      name || pet.name,
      breed ?? pet.breed,
      age_years ? Number(age_years) : pet.age_years,
      size ?? pet.size,
      photoUrl,
      has_fleas_ticks !== undefined ? toBoolFlag(has_fleas_ticks) : pet.has_fleas_ticks,
      has_allergy !== undefined ? toBoolFlag(has_allergy) : pet.has_allergy,
      allows_perfume !== undefined ? toBoolFlag(allows_perfume) : pet.allows_perfume,
      been_to_petshop !== undefined ? toBoolFlag(been_to_petshop) : pet.been_to_petshop,
      is_aggressive !== undefined ? toBoolFlag(is_aggressive) : pet.is_aggressive,
      has_fur_knots !== undefined ? toBoolFlag(has_fur_knots) : pet.has_fur_knots,
      pet.id,
    ]
  );

  const updated = await db.get(`SELECT * FROM pets WHERE id = ?`, [pet.id]);
  res.json({ pet: updated });
}));

// DELETE /api/pets/:id
router.delete("/:id", asyncHandler(async (req, res) => {
  // Arquiva o pet: os JOINs do historico continuam preservando os atendimentos.
  const result = await db.run(`UPDATE pets SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, [req.params.id, req.userId]);
  if (result.changes === 0) return res.status(404).json({ error: "Pet nao encontrado." });
  res.json({ ok: true });
}));

export default router;
