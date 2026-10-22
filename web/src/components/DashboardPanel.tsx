import { useEffect, useState } from "react";
import { api, type BoardDetail, type DashboardWidget, type DashboardWidgetType } from "../api.js";

const CHART_COLORS = ["#0073ea", "#00c875", "#fdab3d", "#e2445c", "#a25ddc", "#579bfc", "#ffcb00", "#ff5ac4"];

export default function DashboardPanel({ board }: { board: BoardDetail }) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<DashboardWidgetType>("COUNT_BY_COLUMN");
  const [columnId, setColumnId] = useState("");
  const [targetLabel, setTargetLabel] = useState("Done");

  async function reload() {
    setWidgets(await api.listWidgets(board.id));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  async function createWidget() {
    if (!name.trim() || !columnId) return;
    await api.createWidget(board.id, name.trim(), type, columnId, type === "BATTERY" ? targetLabel : undefined);
    setName("");
    reload();
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Novo widget</h3>
        <div className="toolbar">
          <input placeholder="Nome do widget" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value as DashboardWidgetType)}>
            <option value="COUNT_BY_COLUMN">Gráfico (contagem por coluna)</option>
            <option value="NUMBER_SUM">Números (soma de coluna numérica)</option>
            <option value="BATTERY">Bateria (% com um valor-alvo)</option>
          </select>
          <select value={columnId} onChange={(e) => setColumnId(e.target.value)}>
            <option value="">coluna…</option>
            {board.columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {type === "BATTERY" && (
            <input
              placeholder="valor-alvo (ex: Done)"
              value={targetLabel}
              onChange={(e) => setTargetLabel(e.target.value)}
            />
          )}
          <button onClick={createWidget}>Adicionar</button>
        </div>
      </div>

      <div className="widget-grid">
        {widgets.map((w) => (
          <div className="card" key={w.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{w.name}</strong>
              <button
                className="secondary"
                style={{ padding: "2px 8px" }}
                onClick={async () => {
                  await api.deleteWidget(w.id);
                  reload();
                }}
              >
                ×
              </button>
            </div>
            {w.type === "NUMBER_SUM" && <div className="widget-number">{w.data?.sum ?? 0}</div>}
            {w.type === "BATTERY" && (
              <div>
                <div className="widget-number">{w.data?.percent ?? 0}%</div>
                <div style={{ background: "#e6e9ef", borderRadius: 6, height: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      background: "#00c875",
                      height: "100%",
                      width: `${w.data?.percent ?? 0}%`,
                    }}
                  />
                </div>
                <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
                  {w.data?.matching ?? 0} de {w.data?.total ?? 0} itens em "{w.config.targetLabel}"
                </p>
              </div>
            )}
            {w.type === "COUNT_BY_COLUMN" && (() => {
              const entries = Object.entries(w.data?.counts ?? {});
              const max = Math.max(1, ...entries.map(([, count]) => count));
              return (
                <div style={{ marginTop: 4 }}>
                  {entries.map(([label, count], i) => (
                    <div className="bar-chart-row" key={label}>
                      <span className="bar-chart-label" title={label}>
                        {label}
                      </span>
                      <span className="bar-chart-track">
                        <span
                          className="bar-chart-fill"
                          style={{
                            width: `${(count / max) * 100}%`,
                            background: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </span>
                      <span className="bar-chart-count">{count}</span>
                    </div>
                  ))}
                  {entries.length === 0 && <p className="muted">Sem dados ainda.</p>}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
