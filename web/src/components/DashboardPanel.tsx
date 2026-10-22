import { useEffect, useState } from "react";
import { api, type BoardDetail, type DashboardWidget, type DashboardWidgetType } from "../api.js";

export default function DashboardPanel({ board }: { board: BoardDetail }) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<DashboardWidgetType>("COUNT_BY_COLUMN");
  const [columnId, setColumnId] = useState("");

  async function reload() {
    setWidgets(await api.listWidgets(board.id));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  async function createWidget() {
    if (!name.trim() || !columnId) return;
    await api.createWidget(board.id, name.trim(), type, columnId);
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
            <option value="COUNT_BY_COLUMN">Contagem por coluna</option>
            <option value="NUMBER_SUM">Soma (coluna numérica)</option>
          </select>
          <select value={columnId} onChange={(e) => setColumnId(e.target.value)}>
            <option value="">coluna…</option>
            {board.columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
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
            {w.type === "COUNT_BY_COLUMN" && (
              <ul>
                {Object.entries(w.data?.counts ?? {}).map(([label, count]) => (
                  <li key={label}>
                    {label}: <strong>{count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
