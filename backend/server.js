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

router.get("/", async (req, res) => {
  try {
    const [events] = await pool.query(`
      SELECT
        e.id,
        e.nome,
        e.slug,
        e.descricao,
        e.banner,
        e.capa,
        e.local_nome,
        e.endereco,
        e.data_evento,
        e.status,

        o.id AS organizer_id,
        o.nome AS organizer_nome,
        o.slug AS organizer_slug,
        o.foto AS organizer_foto,
        o.banner AS organizer_banner,
        o.bio AS organizer_bio,
        o.instagram AS organizer_instagram,
        o.nivel AS organizer_nivel,
        o.xp AS organizer_xp,
        o.verificado AS organizer_verificado
      FROM events e
      LEFT JOIN organizers o ON o.id = e.organizer_id
      WHERE e.status IN ('publicado', 'encerrado')
      ORDER BY e.data_evento ASC
    `);

    const formatted = events.map((event) => ({
      id: event.id,
      nome: event.nome,
      slug: event.slug,
      descricao: event.descricao,
      banner: event.banner,
      capa: event.capa,
      local_nome: event.local_nome,
      endereco: event.endereco,
      data_evento: event.data_evento,
      status: event.status,
      situacao: getSituacao(event),
      organizer: event.organizer_id
        ? {
            id: event.organizer_id,
            nome: event.organizer_nome,
            slug: event.organizer_slug,
            foto: event.organizer_foto,
            banner: event.organizer_banner,
            bio: event.organizer_bio,
            instagram: event.organizer_instagram,
            nivel: event.organizer_nivel,
            xp: event.organizer_xp,
            verificado: Boolean(event.organizer_verificado),
          }
        : null,
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

router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        e.*,

        o.id AS organizer_id,
        o.nome AS organizer_nome,
        o.slug AS organizer_slug,
        o.foto AS organizer_foto,
        o.banner AS organizer_banner,
        o.bio AS organizer_bio,
        o.instagram AS organizer_instagram,
        o.whatsapp AS organizer_whatsapp,
        o.cidade AS organizer_cidade,
        o.nivel AS organizer_nivel,
        o.xp AS organizer_xp,
        o.verificado AS organizer_verificado
      FROM events e
      LEFT JOIN organizers o ON o.id = e.organizer_id
      WHERE e.slug = ?
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
        organizer: event.organizer_id
          ? {
              id: event.organizer_id,
              nome: event.organizer_nome,
              slug: event.organizer_slug,
              foto: event.organizer_foto,
              banner: event.organizer_banner,
              bio: event.organizer_bio,
              instagram: event.organizer_instagram,
              whatsapp: event.organizer_whatsapp,
              cidade: event.organizer_cidade,
              nivel: event.organizer_nivel,
              xp: event.organizer_xp,
              verificado: Boolean(event.organizer_verificado),
            }
          : null,
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