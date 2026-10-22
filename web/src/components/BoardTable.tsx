import { Fragment, useState } from "react";
import { api, type BoardDetail, type ColumnType } from "../api.js";
import { COLUMN_TYPE_LABELS } from "../labels.js";
import ColumnCell from "./ColumnCell.js";

const COLUMN_TYPES: ColumnType[] = [
  "TEXT",
  "LONG_TEXT",
  "STATUS",
  "PRIORITY",
  "PEOPLE",
  "DATE",
  "TIMELINE",
  "NUMBERS",
  "DROPDOWN",
  "LINK",
];

export default function BoardTable({ board, onChange }: { board: BoardDetail; onChange: () => void }) {
  const [newColTitle, setNewColTitle] = useState("");
  const [newColType, setNewColType] = useState<ColumnType>("STATUS");
  const [newGroupName, setNewGroupName] = useState("");
  const [newItemByGroup, setNewItemByGroup] = useState<Record<string, string>>({});

  async function addColumn() {
    if (!newColTitle.trim()) return;
    await api.createColumn(board.id, newColTitle.trim(), newColType);
    setNewColTitle("");
    onChange();
  }

  async function addGroup() {
    if (!newGroupName.trim()) return;
    await api.createGroup(board.id, newGroupName.trim());
    setNewGroupName("");
    onChange();
  }

  async function addItem(groupId: string) {
    const name = newItemByGroup[groupId]?.trim();
    if (!name) return;
    await api.createItem(board.id, groupId, name);
    setNewItemByGroup((s) => ({ ...s, [groupId]: "" }));
    onChange();
  }

  return (
    <div>
      <div className="toolbar">
        <input placeholder="Nome do grupo" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
        <button onClick={addGroup}>+ Grupo</button>

        <input placeholder="Título da coluna" value={newColTitle} onChange={(e) => setNewColTitle(e.target.value)} />
        <select value={newColType} onChange={(e) => setNewColType(e.target.value as ColumnType)}>
          {COLUMN_TYPES.map((t) => (
            <option key={t} value={t}>
              {COLUMN_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button onClick={addColumn}>+ Coluna</button>
      </div>

      <table className="board-table">
        <thead>
          <tr>
            <th>Item</th>
            {board.columns.map((c) => (
              <th key={c.id}>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {board.groups.map((group) => {
            const items = board.items.filter((i) => i.groupId === group.id);
            return (
              <Fragment key={group.id}>
                <tr className="group-row">
                  <td colSpan={board.columns.length + 1}>{group.name}</td>
                </tr>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.name}{" "}
                      <button
                        className="secondary"
                        style={{ padding: "2px 6px", fontSize: 11 }}
                        onClick={async () => {
                          await api.deleteItem(item.id);
                          onChange();
                        }}
                      >
                        ×
                      </button>
                    </td>
                    {board.columns.map((col) => <ColumnCell key={col.id} item={item} column={col} onChange={onChange} />)}
                  </tr>
                ))}
                <tr>
                  <td colSpan={board.columns.length + 1}>
                    <input
                      placeholder="+ Adicionar item"
                      value={newItemByGroup[group.id] ?? ""}
                      onChange={(e) => setNewItemByGroup((s) => ({ ...s, [group.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addItem(group.id)}
                      style={{ width: "100%", border: "none" }}
                    />
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
