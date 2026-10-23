import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, parseColumnLabels, type BoardColumn, type ColumnLabel, type Item, type Person } from "../api.js";
import { Avatar } from "../avatar.js";

export const DEFAULT_STATUS_LABELS: ColumnLabel[] = [
  { label: "Não iniciado", color: "#c4c4c4" },
  { label: "Em progresso", color: "#fdab3d" },
  { label: "Done", color: "#00c875" },
  { label: "Travado", color: "#e2445c" },
];

export const DEFAULT_PRIORITY_LABELS: ColumnLabel[] = [
  { label: "Nenhuma", color: "#c4c4c4" },
  { label: "Baixa", color: "#579bfc" },
  { label: "Média", color: "#ffcb00" },
  { label: "Alta", color: "#fdab3d" },
  { label: "Crítica", color: "#ff5ac4" },
];

export function labelsForColumn(column: BoardColumn): ColumnLabel[] {
  const custom = parseColumnLabels(column);
  if (custom && custom.length > 0) return custom;
  return column.type === "PRIORITY" ? DEFAULT_PRIORITY_LABELS : DEFAULT_STATUS_LABELS;
}

function parseValue(raw: string | undefined): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function ColumnCell({
  item,
  column,
  people,
  onChange,
}: {
  item: Item;
  column: BoardColumn;
  people?: Person[];
  onChange: () => void;
}) {
  const cv = item.columnValues.find((v) => v.columnId === column.id);
  const value = parseValue(cv?.value);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  async function setValue(v: unknown) {
    await api.setColumnValue(item.id, column.id, v);
    onChange();
  }

  if (column.type === "PEOPLE") {
    const assigneeIds: string[] = Array.isArray(value) ? value : [];
    const assignees = assigneeIds
      .map((id) => people?.find((p) => p.id === id))
      .filter((p): p is Person => Boolean(p));

    function toggle(personId: string) {
      const next = assigneeIds.includes(personId)
        ? assigneeIds.filter((id) => id !== personId)
        : [...assigneeIds, personId];
      setValue(next);
    }

    function openPicker() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPickerPos({ top: rect.bottom + 4, left: rect.left });
      setPickerOpen((o) => !o);
    }

    return (
      <td>
        <div
          ref={triggerRef}
          style={{ display: "flex", gap: 4, alignItems: "center", cursor: "pointer", minHeight: 28 }}
          onClick={openPicker}
        >
          {assignees.map((p) => (
            <Avatar key={p.id} name={p.name} color={p.color} size={24} />
          ))}
          {assignees.length === 0 && <span className="muted">+ Atribuir</span>}
        </div>
        {pickerOpen &&
          createPortal(
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setPickerOpen(false)} />
              <div
                className="card"
                style={{
                  position: "fixed",
                  top: pickerPos.top,
                  left: pickerPos.left,
                  zIndex: 1000,
                  minWidth: 200,
                  padding: 8,
                  margin: 0,
                }}
              >
                {(!people || people.length === 0) && (
                  <p className="muted" style={{ margin: 4, whiteSpace: "normal" }}>
                    Nenhuma pessoa cadastrada — crie em "Pessoas".
                  </p>
                )}
                {people?.map((p) => (
                  <label
                    key={p.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", cursor: "pointer" }}
                  >
                    <input type="checkbox" checked={assigneeIds.includes(p.id)} onChange={() => toggle(p.id)} />
                    <Avatar name={p.name} color={p.color} size={22} />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </>,
            document.body
          )}
      </td>
    );
  }

  if (column.type === "STATUS" || column.type === "PRIORITY") {
    const cycle = labelsForColumn(column);
    const current = value?.label as string | undefined;
    const idx = cycle.findIndex((s) => s.label === current);
    const style = cycle[idx] ?? { label: "Vazio", color: "#c4c4c4" };
    return (
      <td>
        <span
          className="status-pill"
          style={{ background: style.color }}
          onClick={() => {
            const next = cycle[(idx + 1) % cycle.length];
            setValue({ label: next.label, color: next.color });
          }}
          title="clique para avançar"
        >
          {current ?? "Vazio"}
        </span>
      </td>
    );
  }

  if (column.type === "NUMBERS") {
    return (
      <td>
        <input
          type="number"
          defaultValue={value ?? ""}
          onBlur={(e) => setValue(e.target.value === "" ? null : Number(e.target.value))}
          style={{ width: 90 }}
        />
      </td>
    );
  }

  if (column.type === "DATE") {
    return (
      <td>
        <input type="date" defaultValue={value ?? ""} onBlur={(e) => setValue(e.target.value || null)} />
      </td>
    );
  }

  if (column.type === "TIMELINE") {
    const start = value?.start ?? "";
    const end = value?.end ?? "";
    return (
      <td>
        <input
          type="date"
          defaultValue={start}
          style={{ width: 110 }}
          onBlur={(e) => setValue({ start: e.target.value || null, end: end || null })}
        />
        {" → "}
        <input
          type="date"
          defaultValue={end}
          style={{ width: 110 }}
          onBlur={(e) => setValue({ start: start || null, end: e.target.value || null })}
        />
      </td>
    );
  }

  if (column.type === "LONG_TEXT") {
    return (
      <td>
        <textarea
          defaultValue={value ?? ""}
          onBlur={(e) => setValue(e.target.value || null)}
          rows={2}
          style={{ width: 180 }}
        />
      </td>
    );
  }

  // TEXT, DROPDOWN, LINK — simple text input is enough for an MVP
  return (
    <td>
      <input
        defaultValue={value ?? ""}
        onBlur={(e) => setValue(e.target.value || null)}
        style={{ width: 140 }}
      />
    </td>
  );
}
