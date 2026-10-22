import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type WorkloadEntry } from "../api.js";
import { Avatar } from "../avatar.js";

const STATUS_COLOR: Record<string, string> = {
  "Não iniciado": "#c4c4c4",
  "Em progresso": "#fdab3d",
  Done: "#00c875",
  Travado: "#e2445c",
  "(sem status)": "#c4c4c4",
};

export default function WorkloadPage() {
  const [workload, setWorkload] = useState<WorkloadEntry[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.getWorkload().then(setWorkload);
  }, []);

  if (!workload) return <p>Carregando…</p>;

  const maxTotal = Math.max(1, ...workload.map((w) => w.total));

  return (
    <div>
      <h2>Carga de trabalho</h2>
      <p className="muted" style={{ marginTop: -10, marginBottom: 20 }}>
        Quantidade de itens atribuídos a cada pessoa, somando todos os boards que têm uma coluna Responsável — a
        mesma ideia da visão de Workload do monday.com.
      </p>

      {workload.length === 0 && (
        <p className="muted">
          Nenhuma pessoa cadastrada ainda. Vá em <Link to="/people">Pessoas</Link> pra adicionar sua equipe.
        </p>
      )}

      {workload.map((w) => (
        <div className="card" key={w.person.id}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
            onClick={() => setExpanded(expanded === w.person.id ? null : w.person.id)}
          >
            <Avatar name={w.person.name} color={w.person.color} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{w.person.name}</div>
              <div style={{ background: "#eef0f5", borderRadius: 4, height: 10, overflow: "hidden", marginTop: 4 }}>
                <div
                  style={{
                    background: "var(--blue)",
                    height: "100%",
                    width: `${(w.total / maxTotal) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--blue)", minWidth: 32, textAlign: "right" }}>
              {w.total}
            </div>
          </div>

          {w.total > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {Object.entries(w.byStatus).map(([status, count]) => (
                <span
                  key={status}
                  className="status-pill"
                  style={{ background: STATUS_COLOR[status] ?? "#9699a6", minWidth: "auto" }}
                >
                  {status}: {count}
                </span>
              ))}
            </div>
          )}

          {expanded === w.person.id && (
            <table className="board-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Board</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {w.items.map((it) => (
                  <tr key={it.itemId}>
                    <td>{it.itemName}</td>
                    <td>
                      <Link to={`/boards/${it.boardId}`}>{it.boardName}</Link>
                    </td>
                    <td>
                      <span className="status-pill" style={{ background: STATUS_COLOR[it.statusLabel] ?? "#9699a6" }}>
                        {it.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
                {w.items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="muted">
                      Nenhum item atribuído.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
