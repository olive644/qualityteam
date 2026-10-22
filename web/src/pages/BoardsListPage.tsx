import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Board } from "../api.js";

export default function BoardsListPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");

  async function reload() {
    setBoards(await api.listBoards());
  }

  useEffect(() => {
    reload();
  }, []);

  async function createBoard() {
    if (!name.trim()) return;
    await api.createBoard(name.trim());
    setName("");
    reload();
  }

  return (
    <div>
      <h2>Boards</h2>
      <div className="toolbar">
        <input
          placeholder="Nome do novo board"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createBoard()}
        />
        <button onClick={createBoard}>+ Novo board</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {boards.length === 0 && <p className="muted" style={{ padding: 16 }}>Nenhum board ainda.</p>}
        {boards.map((b) => (
          <div className="board-list-item" key={b.id} style={{ borderBottom: "1px solid #e6e9ef" }}>
            <Link to={`/boards/${b.id}`}>{b.name}</Link>
            <button
              className="secondary"
              onClick={async () => {
                await api.deleteBoard(b.id);
                reload();
              }}
            >
              Excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
