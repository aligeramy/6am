import { HashRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import TodayPage from "./pages/Today";
import CalendarPage from "./pages/Calendar";
import SongsPage from "./pages/Songs";
import BudgetPage from "./pages/Budget";

export default function App() {
  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col bg-[#050505] text-[#f5f5f5] lg:flex-row">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<TodayPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/songs" element={<SongsPage />} />
              <Route path="/budget" element={<BudgetPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}
