import { Route, Routes, NavLink } from "react-router-dom";
import BoardsListPage from "./pages/BoardsListPage.js";
import BoardPage from "./pages/BoardPage.js";

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>qualityteam</h1>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
          Boards
        </NavLink>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<BoardsListPage />} />
          <Route path="/boards/:id" element={<BoardPage />} />
        </Routes>
      </main>
    </div>
  );
}
