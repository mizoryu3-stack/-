import { NavLink, Route, Routes } from "react-router-dom";
import "./App.css";
import { useSessions } from "./lib/useSessions";
import Home from "./pages/Home";
import SessionFormPage from "./pages/SessionFormPage";
import SessionDetail from "./pages/SessionDetail";
import ExerciseProgress from "./pages/ExerciseProgress";

function App() {
  const store = useSessions();

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>💪 筋トレ記録</h1>
        <p>種目・重量・回数を記録して、成長を振り返ろう</p>
      </header>
      <nav className="app-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          記録一覧
        </NavLink>
        <NavLink to="/new" className={({ isActive }) => (isActive ? "active" : "")}>
          記録する
        </NavLink>
        <NavLink
          to="/exercises"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          種目別グラフ
        </NavLink>
      </nav>
      <main className="app-main">
        {!store.loaded ? (
          <p>読み込み中...</p>
        ) : (
          <Routes>
            <Route path="/" element={<Home store={store} />} />
            <Route path="/new" element={<SessionFormPage store={store} mode="new" />} />
            <Route
              path="/sessions/:id/edit"
              element={<SessionFormPage store={store} mode="edit" />}
            />
            <Route path="/sessions/:id" element={<SessionDetail store={store} />} />
            <Route path="/exercises" element={<ExerciseProgress store={store} />} />
          </Routes>
        )}
      </main>
    </div>
  );
}

export default App;
