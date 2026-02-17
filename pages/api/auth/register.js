// pages/api/auth/register.js
import { createUser } from "../../../lib/users";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email và mật khẩu là bắt buộc" });
  try {
    const u = await createUser({ email, password, name });
    return res.status(201).json({ ok: true, user: u });
  } catch (e) {
    return res.status(400).json({ error: String(e.message || e) });
  }
}
