import { useState } from "react";
import { api, type BoardDetail, type Person } from "../api.js";
import { labelsForColumn } from "./ColumnCell.js";
import { Avatar } from "../avatar.js";

function parseValue(raw: string | undefined): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function KanbanView({
  board,
  people,
  onChange,
}: {
  board: BoardDetail;
  people: Person[];
  onChange: () => void;
}) {
  const peopleColumn = board.columns.find((c) => c.type === "PEOPLE");
  const statusColumns = board.columns.filter((c) => c.type === "STATUS");
  const [selectedId, setSelectedId] = useState<string>("");
  const statusColumn = statusColumns.find((c) => c.id === selectedId) ?? statusColumns[0];

  if (!statusColumn) {
    return (
      <p className="muted">
        Crie uma coluna do tipo <strong>Status</strong> no quadro pra usar a visualização Kanban — ela agrupa os
        itens pelas etiquetas dessa coluna, exatamente como as etiquetas que você configurar nela, assim como no
        monday.com.
      </p>
    );
  }

  const LANES = [...labelsForColumn(statusColumn), { label: "Vazio", color: "#c4c4c4" }];
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
    <div>
      {statusColumns.length > 1 && (
        <div className="toolbar">
          <span className="muted">Agrupar por</span>
          <select value={statusColumn.id} onChange={(e) => setSelectedId(e.target.value)}>
            {statusColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}
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
            {laneItems.map((item) => {
              const assigneeIds: string[] = peopleColumn
                ? parseValue(item.columnValues.find((v) => v.columnId === peopleColumn.id)?.value) ?? []
                : [];
              const assignees = assigneeIds
                .map((id) => people.find((p) => p.id === id))
                .filter((p): p is Person => Boolean(p));
              return (
              <div key={item.id} className="card" style={{ padding: 10, marginBottom: 8 }}>
                <div style={{ marginBottom: 6 }}>{item.name}</div>
                {assignees.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                    {assignees.map((p) => (
                      <Avatar key={p.id} name={p.name} color={p.color} size={20} />
                    ))}
                  </div>
                )}
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
              );
            })}
            {laneItems.length === 0 && <p className="muted" style={{ fontSize: 12 }}>Sem itens</p>}
          </div>
        );
        })}
      </div>
    </div>
  );
}
