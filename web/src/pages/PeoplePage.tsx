import { useEffect, useState } from "react";
import { api, type Person } from "../api.js";
import { Avatar } from "../avatar.js";

const PALETTE = ["#0073ea", "#00c875", "#fdab3d", "#e2445c", "#a25ddc", "#579bfc", "#ffcb00", "#ff5ac4"];

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  async function reload() {
    setPeople(await api.listPeople());
  }

  useEffect(() => {
    reload();
  }, []);

  async function create() {
    if (!name.trim()) return;
    await api.createPerson(name.trim(), color, email.trim() || undefined, role.trim() || undefined);
    setName("");
    setRole("");
    setEmail("");
    setColor(PALETTE[(people.length + 1) % PALETTE.length]);
    reload();
  }

  return (
    <div>
      <h2>Pessoas</h2>
      <p className="muted" style={{ marginTop: -10, marginBottom: 20 }}>
        Cadastre os membros da sua equipe aqui — eles passam a aparecer como opções na coluna Responsável dos
        boards, e na página de Carga de trabalho.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Adicionar pessoa</h3>
        <div className="toolbar">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 40, padding: 2 }} />
          <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Cargo (ex: Analista)" value={role} onChange={(e) => setRole(e.target.value)} />
          <input placeholder="E-mail (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button onClick={create}>+ Adicionar</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {people.length === 0 && <p className="muted" style={{ padding: 16 }}>Nenhuma pessoa cadastrada ainda.</p>}
        {people.map((p) => (
          <div className="board-list-item" key={p.id} style={{ borderBottom: "1px solid #e6e9ef" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={p.name} color={p.color} />
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                {p.role && <div className="muted">{p.role}</div>}
                {p.email && <div className="muted">{p.email}</div>}
              </div>
            </div>
            <button
              className="secondary"
              onClick={async () => {
                await api.deletePerson(p.id);
                reload();
              }}
            >
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
