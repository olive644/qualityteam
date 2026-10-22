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
      <p className="muted" style={{ marginTop: -10, marginBottom: 20 }}>
        Cada board organiza um fluxo de trabalho em grupos, itens e colunas — como um quadro de projeto. Crie um
        para cada time, processo ou iniciativa que você quer acompanhar.
      </p>
      <div className="toolbar">
        <input
          placeholder="Nome do novo board (ex: Projetos de Marketing)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createBoard()}
        />
        <button onClick={createBoard}>+ Novo board</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {boards.length === 0 && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum board ainda</p>
            <p className="muted">Crie o primeiro acima pra começar a organizar o trabalho da sua equipe.</p>
          </div>
        )}
        {boards.map((b) => (
          <div className="board-list-item" key={b.id} style={{ borderBottom: "1px solid #e6e9ef" }}>
            <div>
              <Link to={`/boards/${b.id}`}>{b.name}</Link>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {b.itemCount ?? 0} {b.itemCount === 1 ? "item" : "itens"}
              </div>
            </div>
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
