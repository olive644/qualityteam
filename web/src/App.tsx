import { Route, Routes, NavLink } from "react-router-dom";
import BoardsListPage from "./pages/BoardsListPage.js";
import BoardPage from "./pages/BoardPage.js";
import PeoplePage from "./pages/PeoplePage.js";
import WorkloadPage from "./pages/WorkloadPage.js";

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? "active" : undefined;
}

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div style={{ padding: "0 10px", marginBottom: 20 }}>
          <h1 style={{ margin: 0 }}>qualityteam</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9699c2" }}>Gestão de trabalho em equipe</p>
        </div>
        <NavLink to="/" end className={navClass}>
          Boards
        </NavLink>
        <NavLink to="/workload" className={navClass}>
          Carga de trabalho
        </NavLink>
        <NavLink to="/people" className={navClass}>
          Pessoas
        </NavLink>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<BoardsListPage />} />
          <Route path="/boards/:id" element={<BoardPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/workload" element={<WorkloadPage />} />
        </Routes>
      </main>
    </div>
  );
}
