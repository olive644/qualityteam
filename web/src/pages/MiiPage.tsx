/**
 * Página MII — Consulta SAP MII
 * Configuração de credenciais + consulta de lotes em massa
 */

import { useState, useEffect, useRef } from "react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface MiiConfig {
  host: string;
  server: string;
  plant: string;
  query: string;
  user: string;
  configured: boolean;
}

interface LoteResult {
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

const CAMPOS = [
  { key: "lote",      label: "Lote"      },
  { key: "maquina",   label: "Máquina"   },
  { key: "produto",   label: "Produto"   },
  { key: "descricao", label: "Descrição" },
  { key: "ordem",     label: "Ordem"     },
  { key: "status",    label: "Status"    },
  { key: "qtd",       label: "Qtd"       },
  { key: "uom",       label: "UOM"       },
] as const;

type CampoKey = typeof CAMPOS[number]["key"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MII_BASE = "http://localhost:4000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MII_BASE}/api/mii${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.erro ?? `Erro ${res.status}`);
  return data as T;
}

function resultsToCsv(results: LoteResult[], campos: CampoKey[]): string {
  const header = campos.map(k => CAMPOS.find(c => c.key === k)!.label).join(";");
  const rows = results.map(r =>
    campos.map(k => `"${(r[k] ?? "").replace(/"/g, '""')}"`).join(";")
  );
  return [header, ...rows].join("\n");
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MiiPage() {
  const [config, setConfig]           = useState<MiiConfig | null>(null);
  const [showConfig, setShowConfig]   = useState(false);
  const [pingStatus, setPingStatus]   = useState<"idle"|"ok"|"erro">("idle");
  const [pingMsg, setPingMsg]         = useState("");

  // Consulta
  const [lotesInput, setLotesInput]   = useState("");
  const [campos, setCampos]           = useState<CampoKey[]>(["lote","maquina","produto","status"]);
  const [resultados, setResultados]   = useState<LoteResult[]>([]);
  const [loading, setLoading]         = useState(false);
  const [erro, setErro]               = useState("");
  const [copiado, setCopiado]         = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  // Config form
  const [cfgForm, setCfgForm] = useState({
    host: "http://ploula3075:50000",
    server: "Plant_4196",
    plant: "4196",
    query: "AmcorMII/Reports/PlantDBLibraries/qryGetLotDtlInfo",
    user: "",
    pass: "",
  });

  useEffect(() => {
    apiFetch<MiiConfig>("/config").then(c => {
      setConfig(c);
      setCfgForm(f => ({ ...f, host: c.host, server: c.server, plant: c.plant, query: c.query, user: c.user }));
      if (!c.configured) setShowConfig(true);
    }).catch(() => setShowConfig(true));
  }, []);

  async function salvarConfig(e: React.FormEvent) {
    e.preventDefault();
    try {
      const updated = await apiFetch<MiiConfig>("/config", {
        method: "POST",
        body: JSON.stringify(cfgForm),
      });
      setConfig(updated);
      setShowConfig(false);
      setPingStatus("idle");
    } catch (err: unknown) {
      alert("Erro ao salvar: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function testarConexao() {
    setPingStatus("idle");
    setPingMsg("Testando...");
    try {
      const r = await apiFetch<{ ok: boolean; usuario?: string; erro?: string }>("/ping");
      if (r.ok) {
        setPingStatus("ok");
        setPingMsg(`Conectado como ${r.usuario}`);
      } else {
        setPingStatus("erro");
        setPingMsg(r.erro ?? "Erro desconhecido");
      }
    } catch (err: unknown) {
      setPingStatus("erro");
      setPingMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function consultar() {
    const lotes = lotesInput
      .split(/[\n,;]+/)
      .map(l => l.trim())
      .filter(Boolean);

    if (lotes.length === 0) return setErro("Cole pelo menos um número de lote.");
    setErro("");
    setLoading(true);
    setResultados([]);
    try {
      const data = await apiFetch<LoteResult[]>("/lotes", {
        method: "POST",
        body: JSON.stringify(lotes),
      });
      setResultados(data);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function toggleCampo(key: CampoKey) {
    setCampos(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  function copiarCSV() {
    const csv = resultsToCsv(resultados, campos);
    navigator.clipboard.writeText(csv).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function baixarCSV() {
    const csv = resultsToCsv(resultados, campos);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mii-lotes-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const errosCount = resultados.filter(r => r.erro).length;
  const okCount = resultados.length - errosCount;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Consulta MII</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
            SAP MII · {config?.configured ? `Conectado como ${config.user}` : "Não configurado"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {config?.configured && (
            <button className="btn-outline" onClick={testarConexao}>Testar conexão</button>
          )}
          <button className="btn-primary" onClick={() => setShowConfig(s => !s)}>
            {showConfig ? "Fechar" : "Configurar credenciais"}
          </button>
        </div>
      </div>

      {/* Ping feedback */}
      {pingMsg && (
        <div className={`alert ${pingStatus === "ok" ? "alert-green" : pingStatus === "erro" ? "alert-red" : "alert-blue"}`}
             style={{ marginBottom: 16 }}>
          {pingMsg}
        </div>
      )}

      {/* Painel de configuração */}
      {showConfig && (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Credenciais MII</h3>
          <form onSubmit={salvarConfig}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <label className="field-label">
                Usuário
                <input className="input" value={cfgForm.user}
                  onChange={e => setCfgForm(f => ({ ...f, user: e.target.value }))} required />
              </label>
              <label className="field-label">
                Senha
                <input className="input" type="password" value={cfgForm.pass}
                  onChange={e => setCfgForm(f => ({ ...f, pass: e.target.value }))} required />
              </label>
            </div>
            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 13 }}>Configurações avançadas</summary>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <label className="field-label">
                  Host MII
                  <input className="input" value={cfgForm.host}
                    onChange={e => setCfgForm(f => ({ ...f, host: e.target.value }))} />
                </label>
                <label className="field-label">
                  Servidor
                  <input className="input" value={cfgForm.server}
                    onChange={e => setCfgForm(f => ({ ...f, server: e.target.value }))} />
                </label>
                <label className="field-label">
                  Planta
                  <input className="input" value={cfgForm.plant}
                    onChange={e => setCfgForm(f => ({ ...f, plant: e.target.value }))} />
                </label>
                <label className="field-label">
                  Query Template
                  <input className="input" value={cfgForm.query}
                    onChange={e => setCfgForm(f => ({ ...f, query: e.target.value }))} />
                </label>
              </div>
            </details>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn-primary">Salvar</button>
              {config?.configured && (
                <button type="button" className="btn-outline" onClick={testarConexao}>Testar agora</button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Área de consulta */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>
        {/* Coluna esquerda: input + campos */}
        <div>
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <label className="field-label" style={{ marginBottom: 8 }}>
              Lotes <span style={{ color: "var(--muted)", fontWeight: 400 }}>(um por linha, vírgula ou ponto e vírgula)</span>
            </label>
            <textarea
              className="input"
              rows={10}
              placeholder={"SZG001\nSZG002\nSZG003"}
              value={lotesInput}
              onChange={e => setLotesInput(e.target.value)}
              style={{ fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
            />
            {erro && <p style={{ color: "var(--red)", fontSize: 13, margin: "8px 0 0" }}>{erro}</p>}
            <button
              className="btn-primary"
              style={{ width: "100%", marginTop: 12 }}
              onClick={consultar}
              disabled={loading || !config?.configured}
            >
              {loading ? "Consultando..." : "Consultar MII"}
            </button>
            {!config?.configured && (
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, textAlign: "center" }}>
                Configure as credenciais primeiro
              </p>
            )}
          </div>

          {/* Campos */}
          <div className="card" style={{ padding: 16 }}>
            <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 13 }}>Campos exibidos</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CAMPOS.map(c => (
                <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={campos.includes(c.key)}
                    onChange={() => toggleCampo(c.key)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna direita: resultados */}
        <div>
          {resultados.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: "var(--muted)" }}>
                  {okCount} encontrado{okCount !== 1 ? "s" : ""}
                  {errosCount > 0 && `, ${errosCount} com erro`}
                </span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button className="btn-outline" onClick={copiarCSV}>
                    {copiado ? "Copiado!" : "Copiar CSV"}
                  </button>
                  <button className="btn-outline" onClick={baixarCSV}>Baixar CSV</button>
                </div>
              </div>

              <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--border)" }}>
                <table ref={tableRef} style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--bg)" }}>
                      {campos.map(k => (
                        <th key={k} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600,
                          borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                          {CAMPOS.find(c => c.key === k)!.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((r, i) => (
                      <tr key={i} style={{
                        background: r.erro ? "#fff5f5" : i % 2 === 0 ? "var(--surface)" : "var(--bg)",
                        borderBottom: "1px solid var(--border)",
                      }}>
                        {campos.map(k => (
                          <td key={k} style={{ padding: "8px 14px", whiteSpace: "nowrap" }}>
                            {k === "lote" && r.erro
                              ? <span title={r.erro} style={{ color: "var(--red)", cursor: "help" }}>
                                  {r.lote} ⚠
                                </span>
                              : r[k] || <span style={{ color: "var(--border)" }}>—</span>
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              <p>Consultando {lotesInput.split(/[\n,;]+/).filter(l => l.trim()).length} lotes no MII...</p>
            </div>
          )}

          {!loading && resultados.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
              <p style={{ fontSize: 32 }}>🔍</p>
              <p>Cole os números de lote ao lado e clique em Consultar MII</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
