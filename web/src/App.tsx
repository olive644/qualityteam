import { Route, Routes, Link } from "react-router-dom";
import BoardsListPage from "./pages/BoardsListPage.js";
import BoardPage from "./pages/BoardPage.js";

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>qualityteam</h1>
        <Link to="/">Boards</Link>
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
