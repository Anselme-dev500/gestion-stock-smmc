import type { ReactNode } from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  return (
    <div className="d-flex min-vh-100">

      {/* SIDEBAR */}
      <Sidebar />

      {/* CONTENU PRINCIPAL */}
      <div className="flex-grow-1">

        {/* TOPBAR */}
        <Topbar />

        {/* CONTENU */}
        <main
          className="p-4 bg-light"
          style={{
            minHeight: "calc(100vh - 64px)",
          }}
        >
          {children}
        </main>

      </div>

    </div>
  );
}