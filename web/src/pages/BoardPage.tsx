import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type BoardDetail, type BoardColumn, type ColumnType, type Item } from "../api.js";
import BoardTable from "../components/BoardTable.js";
import KanbanView from "../components/KanbanView.js";
import AutomationsPanel from "../components/AutomationsPanel.js";
import DashboardPanel from "../components/DashboardPanel.js";

const TABS = ["Quadro", "Kanban", "Automações", "Dashboard"] as const;

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Quadro");

  async function reload() {
    if (!id) return;
    setBoard(await api.getBoard(id));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!board) return <p>Carregando…</p>;

  return (
    <div>
      <h2>{board.name}</h2>
      <div className="toolbar">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "" : "secondary"} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Quadro" && <BoardTable board={board} onChange={reload} />}
      {tab === "Kanban" && <KanbanView board={board} onChange={reload} />}
      {tab === "Automações" && <AutomationsPanel board={board} />}
      {tab === "Dashboard" && <DashboardPanel board={board} />}
    </div>
  );
}

export type { BoardColumn, ColumnType, Item };
