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

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { name, whatsapp, instagram, email, password } = req.body;

    if (!name || !whatsapp || !instagram || !password) {
      return res.status(400).json({
        ok: false,
        message: "Preencha nome, WhatsApp, Instagram e senha.",
      });
    }

    const cleanPhone = onlyNumbers(whatsapp);
    const cleanInsta = cleanInstagram(instagram);
    const cleanEmail = email ? String(email).trim().toLowerCase() : null;

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
      "SELECT id FROM users WHERE whatsapp = ? OR instagram = ? LIMIT 1",
      [cleanPhone, cleanInsta]
    );

    if (exists.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "Já existe uma conta com esse WhatsApp ou Instagram.",
      });
    }

    const senhaHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users 
        (nome, whatsapp, instagram, email, senha_hash, role, nivel, xp, ativo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'user', 1, 0, 1, NOW(), NOW())`,
      [name.trim(), cleanPhone, cleanInsta, cleanEmail, senhaHash]
    );

    const user = {
      id: result.insertId,
      nome: name.trim(),
      whatsapp: cleanPhone,
      instagram: cleanInsta,
      email: cleanEmail,
      role: "user",
      nivel: 1,
      xp: 0,
    };

    const token = createToken(user);

    return res.status(201).json({
      ok: true,
      message: "Conta criada com sucesso.",
      token,
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
        message: "Informe WhatsApp/Instagram e senha.",
      });
    }

    const rawLogin = String(login).trim();
    const cleanPhone = onlyNumbers(rawLogin);
    const cleanInsta = cleanInstagram(rawLogin);

    const [rows] = await pool.query(
      `SELECT id, nome, whatsapp, instagram, email, senha_hash, foto, role, nivel, xp, push_token, ativo
       FROM users
       WHERE whatsapp = ? OR instagram = ? OR email = ?
       LIMIT 1`,
      [cleanPhone, cleanInsta, rawLogin.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        ok: false,
        message: "Conta não encontrada.",
      });
    }

    const user = rows[0];

    if (!user.ativo) {
      return res.status(403).json({
        ok: false,
        message: "Conta desativada.",
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

    const token = createToken(user);

    return res.json({
      ok: true,
      message: "Login realizado com sucesso.",
      token,
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