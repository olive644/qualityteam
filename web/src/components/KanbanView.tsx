import { api, type BoardDetail } from "../api.js";
import { STATUS_CYCLE } from "./ColumnCell.js";

function parseValue(raw: string | undefined): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const LANES = [...STATUS_CYCLE, { label: "Vazio", color: "#c4c4c4" }];

export default function KanbanView({ board, onChange }: { board: BoardDetail; onChange: () => void }) {
  const statusColumn = board.columns.find((c) => c.type === "STATUS");

  if (!statusColumn) {
    return (
      <p className="muted">
        Crie uma coluna do tipo <strong>STATUS</strong> no quadro pra usar a visualização Kanban — ela agrupa os
        itens pelas etiquetas dessa coluna, assim como a visualização Kanban do monday.com agrupa por status.
      </p>
    );
  }

  const items = board.items;
  const columnId = statusColumn.id;

  function laneOf(item: BoardDetail["items"][number]) {
    const cv = item.columnValues.find((v) => v.columnId === columnId);
    const value = parseValue(cv?.value);
    return value?.label ?? "Vazio";
  }

  async function moveTo(itemId: string, label: string, color: string) {
    await api.setColumnValue(itemId, columnId, label === "Vazio" ? null : { label, color });
    onChange();
  }

  return (
    <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
      {LANES.map((lane) => {
        const laneItems = items.filter((i) => laneOf(i) === lane.label);
        return (
          <div key={lane.label} style={{ minWidth: 220, flexShrink: 0 }}>
            <div
              style={{
                background: lane.color,
                color: "white",
                padding: "6px 10px",
                borderRadius: 6,
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {lane.label} <span style={{ opacity: 0.8 }}>({laneItems.length})</span>
            </div>
            {laneItems.map((item) => (
              <div key={item.id} className="card" style={{ padding: 10, marginBottom: 8 }}>
                <div style={{ marginBottom: 6 }}>{item.name}</div>
                <select
                  value={lane.label}
                  onChange={(e) => {
                    const target = LANES.find((l) => l.label === e.target.value)!;
                    moveTo(item.id, target.label, target.color);
                  }}
                  style={{ width: "100%", fontSize: 12 }}
                >
                  {LANES.map((l) => (
                    <option key={l.label} value={l.label}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {laneItems.length === 0 && <p className="muted" style={{ fontSize: 12 }}>Sem itens</p>}
          </div>
        );
      })}
    </div>
  );
}
