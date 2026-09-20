import { NavLink } from "react-router-dom";
import logoSmmc from "../../assets/images/Logo-smmc.jpeg";

const links = [
  {
    to: "/",
    label: "Tableau de bord",
    icon: "bi-speedometer2",
  },
  {
    to: "/articles",
    label: "Articles",
    icon: "bi-box-seam",
  },
  {
    to: "/categories",
    label: "Catégories",
    icon: "bi-tags",
  },
  {
    to: "/fournisseurs",
    label: "Fournisseurs",
    icon: "bi-truck",
  },
  {
    to: "/demandes",
    label: "Demandes",
    icon: "bi-file-earmark-text",
  },
  {
    to: "/mouvements",
    label: "Mouvements",
    icon: "bi-arrow-left-right",
  },
  {
    to: "/inventaire",
    label: "Inventaire",
    icon: "bi-clipboard-check",
  },
  {
    to: "/rapports",
    label: "Rapports",
    icon: "bi-bar-chart-line",
  },
];

export default function Sidebar() {
  return (
    <aside
      className="bg-white border-end"
      style={{
        width: "250px",
        minWidth: "250px",
        minHeight: "100vh",
      }}
    >
      {/* LOGO */}
      <div className="text-center p-3 border-bottom">
        <img
          src={logoSmmc}
          alt="SMMC"
          style={{
            maxWidth: "170px",
            height: "auto",
          }}
        />
      </div>

      {/* MENU */}
      <nav className="p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `nav-link d-flex align-items-center rounded px-3 py-2 mb-1 ${
                isActive ? "smmc-menu-active" : "text-dark"
              }`
            }
          >
            <i className={`bi ${link.icon} me-3`}></i>

            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}