/**
 * Página MII — Consulta SAP MII
 * Integra com api_mii.py (http://localhost:3000)
 */

import { useState, useEffect } from "react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

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

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:3000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
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
  const [serverOk, setServerOk]       = useState<boolean | null>(null);
  const [lotesInput, setLotesInput]   = useState("");
  const [campos, setCampos]           = useState<CampoKey[]>(["lote","maquina","produto","status"]);
  const [resultados, setResultados]   = useState<LoteResult[]>([]);
  const [loading, setLoading]         = useState(false);
  const [erro, setErro]               = useState("");
  const [copiado, setCopiado]         = useState(false);

  // Verifica se api_mii.py está rodando
  async function checarServidor() {
    setServerOk(null);
    try {
      await apiFetch<{ status: string }>("/ping");
      setServerOk(true);
    } catch {
      setServerOk(false);
    }
  }

  useEffect(() => { checarServidor(); }, []);

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
            SAP MII · {
              serverOk === null ? "Verificando servidor..." :
              serverOk ? <span style={{ color: "var(--green)" }}>api_mii.py rodando ✓</span> :
              <span style={{ color: "var(--red)" }}>Servidor offline</span>
            }
          </p>
        </div>
        <button className="btn-outline" onClick={checarServidor}>
          Verificar servidor
        </button>
      </div>

      {/* Banner: servidor offline */}
      {serverOk === false && (
        <div className="alert alert-red" style={{ marginBottom: 20 }}>
          <strong>api_mii.py não está rodando.</strong><br />
          Abra o terminal, vá até a pasta onde está o arquivo e rode:<br />
          <code style={{ display: "inline-block", marginTop: 6, padding: "4px 8px",
            background: "rgba(0,0,0,0.08)", borderRadius: 4, fontFamily: "monospace" }}>
            python api_mii.py
          </code>
          <br />
          <span style={{ fontSize: 12, marginTop: 4, display: "block" }}>
            Depois clique em "Verificar servidor" acima.
          </span>
        </div>
      )}

      {/* Área de consulta */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>

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
              disabled={loading || !serverOk}
            >
              {loading ? "Consultando..." : "Consultar MII"}
            </button>
            {!serverOk && (
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, textAlign: "center" }}>
                Inicie o api_mii.py primeiro
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
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
