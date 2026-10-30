/**
 * Rotas MII — /api/mii/*
 *
 * GET  /api/mii/ping          → testa conexão com o MII
 * GET  /api/mii/config        → retorna config atual (sem senha)
 * POST /api/mii/config        → salva credenciais
 * GET  /api/mii/lote/:lote    → consulta um lote
 * POST /api/mii/lotes         → consulta vários lotes  body: string[]
 */

import { Router } from "express";
import { consultarLote, consultarLotes } from "../mii.js";
import { getConfigSafe, saveConfig, loadConfig } from "../miiConfig.js";

export const miiRouter = Router();

// GET /api/mii/config
miiRouter.get("/config", (_req, res) => {
  res.json(getConfigSafe());
});

// POST /api/mii/config
miiRouter.post("/config", (req, res) => {
  const { host, server, plant, query, user, pass } = req.body ?? {};
  const updated = saveConfig({ host, server, plant, query, user, pass });
  // retorna config segura (sem a senha)
  res.json(getConfigSafe());
  console.log(`[MII] Configuração salva para usuário: ${updated.user}`);
});

// GET /api/mii/ping
miiRouter.get("/ping", async (_req, res) => {
  const cfg = loadConfig();
  if (!cfg.user || !cfg.pass) {
    return res.status(400).json({ ok: false, erro: "Credenciais não configuradas" });
  }

  // Testa com um lote fictício — se o erro for "não encontrado" (não erro de auth), está ok
  const result = await consultarLote("PING_TEST");
  const authOk = !result.erro?.includes("401") && !result.erro?.includes("403") && !result.erro?.includes("Falha");

  if (authOk) {
    res.json({ ok: true, usuario: cfg.user, host: cfg.host });
  } else {
    res.status(401).json({ ok: false, erro: result.erro });
  }
});

// GET /api/mii/lote/:lote
miiRouter.get("/lote/:lote", async (req, res) => {
  const lote = decodeURIComponent(req.params.lote).trim();
  if (!lote) return res.status(400).json({ erro: "Número do lote não informado" });
  const result = await consultarLote(lote);
  res.json(result);
});

// POST /api/mii/lotes
miiRouter.post("/lotes", async (req, res) => {
  const body = req.body;
  if (!Array.isArray(body)) {
    return res.status(400).json({ erro: "Envie uma lista de lotes: [\"SZG...\", ...]" });
  }
  const lotes = body.map((l: unknown) => String(l).trim()).filter(Boolean);
  if (lotes.length === 0) {
    return res.status(400).json({ erro: "Lista de lotes vazia" });
  }
  const results = await consultarLotes(lotes);
  res.json(results);
});
