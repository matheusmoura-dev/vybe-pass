const express = require("express");
const router = express.Router();
const pool = require("../db");

function getSituacao(event) {
  if (event.status === "encerrado") return "encerrado";
  if (event.status === "rascunho") return "rascunho";

  const now = new Date();
  const eventDate = new Date(event.data_evento);

  if (eventDate < now) return "encerrado";

  return "aberto";
}

// GET /api/events
router.get("/", async (req, res) => {
  try {
    const [events] = await pool.query(`
      SELECT
        id,
        nome,
        slug,
        descricao,
        banner,
        capa,
        local_nome,
        endereco,
        data_evento,
        status
      FROM events
      WHERE status IN ('publicado', 'encerrado')
      ORDER BY data_evento ASC
    `);

    const formatted = events.map((event) => ({
      ...event,
      situacao: getSituacao(event),
    }));

    res.json({
      ok: true,
      events: formatted,
    });
  } catch (err) {
    console.error("EVENTS LIST ERROR:", err);

    res.status(500).json({
      ok: false,
      message: "Erro ao buscar eventos.",
    });
  }
});

// GET /api/events/:slug
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await pool.query(
      `
      SELECT *
      FROM events
      WHERE slug = ?
      LIMIT 1
      `,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Evento não encontrado.",
      });
    }

    const event = rows[0];

    res.json({
      ok: true,
      event: {
        ...event,
        situacao: getSituacao(event),
      },
    });
  } catch (err) {
    console.error("EVENT DETAILS ERROR:", err);

    res.status(500).json({
      ok: false,
      message: "Erro ao buscar evento.",
    });
  }
});

module.exports = router;