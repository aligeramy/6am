import HomeSection from "./pages/Today";
import BoardSection from "./pages/Songs";
import CalendarSection from "./pages/Calendar";
import BudgetSection from "./pages/Budget";
import { TopBar } from "./components/TopBar";

export default function App() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f5]">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <section id="home" className="scroll-mt-24">
          <HomeSection />
        </section>
        <section id="board" className="mt-12 scroll-mt-24 border-t border-[#1c1c1c] pt-10">
          <BoardSection />
        </section>
        <section id="calendar" className="mt-12 scroll-mt-24 border-t border-[#1c1c1c] pt-10">
          <CalendarSection />
        </section>
        <section id="budget" className="mt-12 scroll-mt-24 border-t border-[#1c1c1c] pt-10">
          <BudgetSection />
        </section>
      </main>
    </div>
  );
}
