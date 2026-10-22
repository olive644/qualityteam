import { api, type BoardColumn, type Item } from "../api.js";

export const STATUS_CYCLE: { label: string; color: string }[] = [
  { label: "Não iniciado", color: "#c4c4c4" },
  { label: "Em progresso", color: "#fdab3d" },
  { label: "Done", color: "#00c875" },
  { label: "Travado", color: "#e2445c" },
];

export const PRIORITY_CYCLE: { label: string; color: string }[] = [
  { label: "Nenhuma", color: "#c4c4c4" },
  { label: "Baixa", color: "#579bfc" },
  { label: "Média", color: "#ffcb00" },
  { label: "Alta", color: "#fdab3d" },
  { label: "Crítica", color: "#ff5ac4" },
];

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
  onChange,
}: {
  item: Item;
  column: BoardColumn;
  onChange: () => void;
}) {
  const cv = item.columnValues.find((v) => v.columnId === column.id);
  const value = parseValue(cv?.value);

  async function setValue(v: unknown) {
    await api.setColumnValue(item.id, column.id, v);
    onChange();
  }

  if (column.type === "STATUS" || column.type === "PRIORITY") {
    const cycle = column.type === "STATUS" ? STATUS_CYCLE : PRIORITY_CYCLE;
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

  // TEXT, PEOPLE, DROPDOWN, LINK — simple text input is enough for an MVP
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
