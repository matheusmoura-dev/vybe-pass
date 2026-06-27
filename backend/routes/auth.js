const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

function onlyNumbers(value = "") {
  return String(value).replace(/\D/g, "");
}

function cleanInstagram(value = "") {
  return String(value).trim().replace(/^@/, "").toLowerCase();
}

function cleanUsername(value = "") {
  return String(value)
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "");
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { username, nome, whatsapp, instagram, email, password } = req.body;

    if (!username || !nome || !whatsapp || !password) {
      return res.status(400).json({
        ok: false,
        message: "Preencha VYBE ID, nome, WhatsApp e senha.",
      });
    }

    const cleanUser = cleanUsername(username);
    const cleanPhone = onlyNumbers(whatsapp);
    const cleanInsta = instagram ? cleanInstagram(instagram) : null;
    const cleanEmail = email ? String(email).trim().toLowerCase() : null;

    if (cleanUser.length < 3) {
      return res.status(400).json({
        ok: false,
        message: "Sua VYBE ID precisa ter pelo menos 3 caracteres.",
      });
    }

    if (cleanPhone.length < 10) {
      return res.status(400).json({
        ok: false,
        message: "WhatsApp inválido.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "A senha precisa ter pelo menos 6 caracteres.",
      });
    }

    const [exists] = await pool.query(
      `SELECT id FROM users 
       WHERE username = ? OR whatsapp = ? OR email = ?
       LIMIT 1`,
      [cleanUser, cleanPhone, cleanEmail]
    );

    if (exists.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "VYBE ID, WhatsApp ou e-mail já cadastrado.",
      });
    }

    const senhaHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users 
        (username, nome, whatsapp, instagram, email, senha_hash, role, nivel, xp, status, ativo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'user', 1, 0, 'ativo', 1, NOW(), NOW())`,
      [cleanUser, nome.trim(), cleanPhone, cleanInsta, cleanEmail, senhaHash]
    );

    const user = {
      id: result.insertId,
      username: cleanUser,
      nome: nome.trim(),
      whatsapp: cleanPhone,
      instagram: cleanInsta,
      email: cleanEmail,
      role: "user",
      nivel: 1,
      xp: 0,
    };

    return res.status(201).json({
      ok: true,
      message: "Conta criada com sucesso.",
      token: createToken(user),
      user,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "Erro ao criar conta.",
      error: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        ok: false,
        message: "Informe VYBE ID, WhatsApp ou e-mail e senha.",
      });
    }

    const rawLogin = String(login).trim();
    const cleanPhone = onlyNumbers(rawLogin);
    const cleanUser = cleanUsername(rawLogin);
    const cleanEmail = rawLogin.toLowerCase();

    const [rows] = await pool.query(
      `SELECT 
        id, username, nome, whatsapp, instagram, email, senha_hash,
        foto, banner, bio, cidade, estado, pais,
        role, nivel, xp, connections_count, push_token, ativo, status
       FROM users
       WHERE username = ? OR whatsapp = ? OR email = ?
       LIMIT 1`,
      [cleanUser, cleanPhone, cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        ok: false,
        message: "Conta não encontrada.",
      });
    }

    const user = rows[0];

    if (!user.ativo || user.status !== "ativo") {
      return res.status(403).json({
        ok: false,
        message: "Conta desativada ou suspensa.",
      });
    }

    const validPassword = await bcrypt.compare(password, user.senha_hash);

    if (!validPassword) {
      return res.status(401).json({
        ok: false,
        message: "Senha incorreta.",
      });
    }

    delete user.senha_hash;

    await pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);

    return res.json({
      ok: true,
      message: "Login realizado com sucesso.",
      token: createToken(user),
      user,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "Erro ao fazer login.",
      error: error.message,
    });
  }
});

module.exports = router;