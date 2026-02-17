// lib/users.js
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const dataPath = path.join(process.cwd(), "data");
const filePath = path.join(dataPath, "users.json");

async function ensureDataFile() {
  if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]), "utf8");
  }
}

export async function listUsers() {
  await ensureDataFile();
  const raw = fs.readFileSync(filePath, "utf8");
  try { return JSON.parse(raw || "[]"); } catch (e) { return []; }
}

export async function findUserByEmail(email) {
  const users = await listUsers();
  return users.find(u => u.email === String(email).toLowerCase());
}

export async function createUser({ email, password, name }) {
  email = String(email).toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) throw new Error("User already exists");
  const hashed = await bcrypt.hash(String(password), 10);
  const users = await listUsers();
  const user = { id: Date.now().toString(), email, name: name || "", password: hashed, createdAt: new Date().toISOString() };
  users.push(user);
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2), "utf8");
  return { id: user.id, email: user.email, name: user.name };
}

export async function verifyUser({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(String(password), user.password);
  if (!ok) return null;
  return { id: user.id, email: user.email, name: user.name };
}
