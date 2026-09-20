import { useState } from "react";
import { NavLink } from "react-router-dom";
import logoSmmc from "../../assets/images/Logo-smmc.jpeg";

interface MenuItem {
  to: string;
  label: string;
  icon: string;
}

interface MenuSectionProps {
  title: string;
  icon: string;
  items: MenuItem[];
}

const stockLinks: MenuItem[] = [
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
    to: "/etat-stock",
    label: "État du stock",
    icon: "bi-bar-chart-line",
  },
];

const approvisionnementLinks: MenuItem[] = [
  {
    to: "/fournisseurs",
    label: "Fournisseurs",
    icon: "bi-truck",
  },
  {
    to: "/entrees",
    label: "Entrées",
    icon: "bi-box-arrow-in-down",
  },
];

const demandeLinks: MenuItem[] = [
  {
    to: "/demandes",
    label: "Demandes",
    icon: "bi-file-earmark-text",
  },
  {
    to: "/nouvelle-demande",
    label: "Nouvelle demande",
    icon: "bi-file-earmark-plus",
  },
  {
    to: "/validations",
    label: "Validations",
    icon: "bi-check2-square",
  },
];

const mouvementLinks: MenuItem[] = [
  {
    to: "/mouvements",
    label: "Mouvements",
    icon: "bi-arrow-left-right",
  },
  {
    to: "/sorties",
    label: "Sorties",
    icon: "bi-box-arrow-up",
  },
  {
    to: "/retours",
    label: "Retours",
    icon: "bi-arrow-return-left",
  },
];

function MenuLink({ item }: { item: MenuItem }) {
  return (
    <div className="menu-item">
      <NavLink
        to={item.to}
        end={item.to === "/"}
        className={({ isActive }) =>
          `menu-link ${isActive ? "active" : ""}`
        }
      >
        <div className="menu-icon">
          <i className={`bi ${item.icon}`}></i>
        </div>

        <div className="menu-text">
          {item.label}
        </div>
      </NavLink>
    </div>
  );
}

function MenuSection({
  title,
  icon,
  items,
}: MenuSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className={`menu-section ${open ? "open" : ""}`}>
      <button
        type="button"
        className="menu-link menu-button"
        onClick={() => setOpen(!open)}
      >
        <div className="menu-icon">
          <i className={`bi ${icon}`}></i>
        </div>

        <div className="menu-text">
          {title}
        </div>

        <div className="menu-caret">
          <i
            className={`bi ${
              open ? "bi-chevron-down" : "bi-chevron-right"
            }`}
          ></i>
        </div>
      </button>

      {open && (
        <div className="menu-submenu">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `submenu-link ${isActive ? "active" : ""}`
              }
            >
              <i className={`bi ${item.icon}`}></i>

              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="smmc-sidebar">

      {/* =========================
          HEADER
      ========================= */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <img
            src={logoSmmc}
            alt="Logo SMMC"
          />
        </div>

        <button
          type="button"
          className="sidebar-close"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* =========================
          UTILISATEUR
      ========================= */}
      <div className="sidebar-user">

        <div className="user-avatar">
          <i className="bi bi-person"></i>
        </div>

        <div className="user-info">
          <div className="user-name">
            Sylvain
          </div>

          <div className="user-role">
            <span className="status-dot"></span>
            Responsable stock
          </div>
        </div>

      </div>

      {/* =========================
          MENU
      ========================= */}
      <nav className="sidebar-menu">

        {/* TABLEAU DE BORD */}
        <div className="menu-section-title">
          PRINCIPAL
        </div>

        <MenuLink
          item={{
            to: "/",
            label: "Tableau de bord",
            icon: "bi-speedometer2",
          }}
        />

        {/* GESTION DU STOCK */}
        <MenuSection
          title="Gestion du stock"
          icon="bi-box-seam"
          items={stockLinks}
        />

        {/* APPROVISIONNEMENT */}
        <MenuSection
          title="Approvisionnement"
          icon="bi-truck"
          items={approvisionnementLinks}
        />

        {/* DEMANDES */}
        <MenuSection
          title="Demandes"
          icon="bi-file-earmark-text"
          items={demandeLinks}
        />

        {/* MOUVEMENTS */}
        <MenuSection
          title="Mouvements"
          icon="bi-arrow-left-right"
          items={mouvementLinks}
        />

        {/* AUTRES */}
        <div className="menu-section-title">
          AUTRES
        </div>

        <MenuLink
          item={{
            to: "/inventaire",
            label: "Inventaire",
            icon: "bi-clipboard-check",
          }}
        />

        <MenuLink
          item={{
            to: "/rapports",
            label: "Rapports",
            icon: "bi-graph-up",
          }}
        />

        <MenuLink
          item={{
            to: "/profil",
            label: "Mon profil",
            icon: "bi-person-circle",
          }}
        />

      </nav>

      {/* =========================
          FOOTER
      ========================= */}
      <div className="sidebar-footer">
        <div>SMMC</div>
        <small>
          Gestion du stock
        </small>
      </div>

    </aside>
  );
}