import {
  useEffect,
  useState,
} from "react";

import {
  Outlet,
  useLocation,
} from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AdminLayout() {

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const location = useLocation();

  useEffect(() => {
    if (window.innerWidth <= 991) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="smmc-app">

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() =>
          window.innerWidth <= 991 &&
          setSidebarOpen(false)
        }
      />

      <div className="smmc-main">

        <Topbar
          onMenuClick={() =>
            setSidebarOpen(
              !sidebarOpen
            )
          }
        />

        <main className="smmc-content">

          <div className="page-container">
            <Outlet />
          </div>

        </main>

      </div>
    </div>
  );
}