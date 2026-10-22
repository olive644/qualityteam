import { useState } from "react";
import { api, type BoardColumn, type ColumnLabel } from "../api.js";
import { labelsForColumn } from "./ColumnCell.js";

const PALETTE = ["#c4c4c4", "#579bfc", "#ffcb00", "#fdab3d", "#e2445c", "#00c875", "#a25ddc", "#ff5ac4", "#0073ea"];

export default function ColumnLabelsEditor({
  column,
  onClose,
  onSaved,
}: {
  column: BoardColumn;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [labels, setLabels] = useState<ColumnLabel[]>(() => labelsForColumn(column));

  function update(i: number, patch: Partial<ColumnLabel>) {
    setLabels((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function remove(i: number) {
    setLabels((ls) => ls.filter((_, idx) => idx !== i));
  }

  function add() {
    setLabels((ls) => [...ls, { label: "Nova etiqueta", color: PALETTE[ls.length % PALETTE.length] }]);
  }

  async function save() {
    await api.updateColumn(column.id, { settings: { labels } });
    onSaved();
    onClose();
  }

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Etiquetas de "{column.title}"</h3>
        <button className="secondary" style={{ padding: "2px 8px" }} onClick={onClose}>
          ×
        </button>
      </div>
      <div style={{ marginTop: 12 }}>
        {labels.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <input
              type="color"
              value={l.color}
              onChange={(e) => update(i, { color: e.target.value })}
              style={{ width: 36, padding: 2 }}
            />
            <input
              value={l.label}
              onChange={(e) => update(i, { label: e.target.value })}
              style={{ flex: 1 }}
            />
            <button className="secondary" style={{ padding: "4px 8px" }} onClick={() => remove(i)}>
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="toolbar" style={{ marginTop: 4 }}>
        <button className="secondary" onClick={add}>
          + Etiqueta
        </button>
        <button onClick={save}>Salvar</button>
      </div>
    </div>
  );
}
