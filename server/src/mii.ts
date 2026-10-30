/**
 * Consulta ao SAP MII Illuminator.
 * Equivalente TypeScript/Node do api_mii.py, embutido no qualityteam.
 */

import { loadConfig } from "./miiConfig.js";

export interface LoteResult {
  lote: string;
  maquina: string;
  produto: string;
  descricao: string;
  ordem: string;
  status: string;
  qtd: string;
  uom: string;
  erro?: string;
}

function txt(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

export async function consultarLote(lote: string): Promise<LoteResult> {
  const cfg = loadConfig();

  if (!cfg.user || !cfg.pass) {
    return { lote, maquina: "", produto: "", descricao: "", ordem: "", status: "", qtd: "", uom: "", erro: "Credenciais MII não configuradas. Acesse /mii para configurar." };
  }

  const params = new URLSearchParams({
    QueryTemplate: cfg.query,
    "Param.1": cfg.plant,
    "Param.2": lote,
    "Content-Type": "text/xml",
    Server: cfg.server,
  });

  const url = `${cfg.host}/XMII/Illuminator?${params}`;
  const credenciais = Buffer.from(`${cfg.user}:${cfg.pass}`).toString("base64");

  let xmlText: string;
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Basic ${credenciais}` },
      signal: AbortSignal.timeout(10_000),
    });
    xmlText = await resp.text();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { lote, maquina: "", produto: "", descricao: "", ordem: "", status: "", qtd: "", uom: "", erro: `Falha na conexão: ${msg}` };
  }

  // Verificar erro fatal do MII
  const fatalMatch = xmlText.match(/<FatalError[^>]*>([\s\S]*?)<\/FatalError>/i);
  if (fatalMatch) {
    return { lote, maquina: "", produto: "", descricao: "", ordem: "", status: "", qtd: "", uom: "", erro: fatalMatch[1].trim() };
  }

  // Verificar se existe Row
  if (!/<Row[\s>]/i.test(xmlText)) {
    return { lote, maquina: "", produto: "", descricao: "", ordem: "", status: "", qtd: "", uom: "", erro: "Lote não encontrado" };
  }

  return {
    lote:      txt(xmlText, "LOTNO")    || lote,
    maquina:   txt(xmlText, "WRKCTR"),
    produto:   txt(xmlText, "PRODNO"),
    descricao: txt(xmlText, "DESCRPT1"),
    ordem:     txt(xmlText, "PLONO"),
    status:    txt(xmlText, "LOTSTAT"),
    qtd:       txt(xmlText, "ACTQTY"),
    uom:       txt(xmlText, "ACTUOM"),
  };
}

export async function consultarLotes(lotes: string[]): Promise<LoteResult[]> {
  // Processa em paralelo com limite de 10 simultâneos para não sobrecarregar o MII
  const BATCH = 10;
  const results: LoteResult[] = [];
  for (let i = 0; i < lotes.length; i += BATCH) {
    const chunk = lotes.slice(i, i + BATCH);
    const chunkResults = await Promise.all(chunk.map(consultarLote));
    results.push(...chunkResults);
  }
  return results;
}
