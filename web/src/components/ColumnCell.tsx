import { api, type BoardColumn, type Item } from "../api.js";

const STATUS_CYCLE: { label: string; color: string }[] = [
  { label: "Não iniciado", color: "#c4c4c4" },
  { label: "Em progresso", color: "#fdab3d" },
  { label: "Done", color: "#00c875" },
  { label: "Travado", color: "#e2445c" },
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

  if (column.type === "STATUS") {
    const current = value?.label as string | undefined;
    const idx = STATUS_CYCLE.findIndex((s) => s.label === current);
    const style = STATUS_CYCLE[idx] ?? { label: "Vazio", color: "#c4c4c4" };
    return (
      <td>
        <span
          className="status-pill"
          style={{ background: style.color }}
          onClick={() => {
            const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
            setValue({ label: next.label, color: next.color });
          }}
          title="clique para avançar o status"
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

  // TEXT, PEOPLE, DROPDOWN — simple text input is enough for an MVP
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
