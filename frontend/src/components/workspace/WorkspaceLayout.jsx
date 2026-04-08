import { Outlet } from "react-router-dom";
import WorkspaceSidebar from "./WorkspaceSidebar";

/**
 * Authenticated workspace shell. Sidebar + main outlet.
 * Sits OUTSIDE the public Navbar/Footer/SmoothScroll layer.
 */
export default function WorkspaceLayout() {
  return (
    <div className="fixed inset-0 flex bg-gradient-to-br from-blue-100 via-sky-50 to-indigo-100 text-slate-800">
      {/* Soft radial accents for depth */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full bg-indigo-300/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[26rem] h-[26rem] rounded-full bg-sky-200/25 blur-3xl" />
      <WorkspaceSidebar />
      <main className="relative z-10 flex-1 min-w-0 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
