import { getSessionUser } from "../../services/auth";
import { useState } from "react";
import { NavLink } from "react-router-dom";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  label: string;
  icon: string;
  path: string;
}

interface MenuGroup {
  label: string;
  icon: string;
  key: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "Gestion du stock",
    icon: "bi-box-seam",
    key: "stock",
    items: [
      {
        label: "Articles",
        icon: "bi-box",
        path: "/articles",
      },
      {
        label: "Catégories",
        icon: "bi-tags",
        path: "/categories",
      },
      {
        label: "État du stock",
        icon: "bi-bar-chart-line",
        path: "/etat-stock",
      },
    ],
  },

  {
    label: "Approvisionnement",
    icon: "bi-truck",
    key: "approvisionnement",
    items: [
      {
        label: "Fournisseurs",
        icon: "bi-building",
        path: "/fournisseurs",
      },
      {
        label: "Entrées",
        icon: "bi-box-arrow-in-down",
        path: "/entrees",
      },
    ],
  },

  {
    label: "Demandes",
    icon: "bi-clipboard-check",
    key: "demandes",
    items: [
      {
        label: "Demandes",
        icon: "bi-file-earmark-text",
        path: "/demandes",
      },
      {
        label: "Nouvelle demande",
        icon: "bi-plus-circle",
        path: "/nouvelle-demande",
      },
      {
        label: "Validations",
        icon: "bi-check2-square",
        path: "/validations",
      },
    ],
  },

  {
    label: "Mouvements",
    icon: "bi-arrow-left-right",
    key: "mouvements",
    items: [
      {
        label: "Mouvements",
        icon: "bi-clock-history",
        path: "/mouvements",
      },
      {
        label: "Sorties",
        icon: "bi-box-arrow-up",
        path: "/sorties",
      },
      {
        label: "Retours",
        icon: "bi-arrow-return-left",
        path: "/retours",
      },
    ],
  },
];

export default function Sidebar({
  isOpen = true,
  onClose,
}: SidebarProps) {
  const currentUser = getSessionUser();
  const [openedGroups, setOpenedGroups] = useState<string[]>([
    "stock",
  ]);

  const toggleGroup = (key: string) => {
    setOpenedGroups((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      <aside
        className={`smmc-sidebar ${
          isOpen ? "sidebar-open" : ""
        }`}
      >
        {/* LOGO */}
        <div className="sidebar-brand">
          <NavLink to="/" className="brand-link">
            <img
              src="/images/Logo_smmc.jpeg"
              alt="SMMC"
              className="sidebar-logo"
            />
          </NavLink>
        </div>

        {/* PROFIL */}
        <div className="sidebar-profile">
          <div className="profile-avatar">
            <i className="bi bi-person-fill" />
          </div>

          <div className="profile-info">
            <strong>{[currentUser?.prenom, currentUser?.nom].filter(Boolean).join(" ") || currentUser?.matricule || "Personnel SMMC"}</strong>

            <span>
              <span className="online-dot" />
              Connecté
            </span>
          </div>
        </div>

        {/* MENU */}
        <nav className="sidebar-menu">

          <div className="menu-section-title">
            PRINCIPAL
          </div>

          {/* DASHBOARD */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? "active" : ""
              }`
            }
            onClick={onClose}
          >
            <span className="sidebar-icon">
              <i className="bi bi-grid-1x2-fill" />
            </span>

            <span>Tableau de bord</span>
          </NavLink>

          {/* GROUPES */}
          {menuGroups.map((group) => {
            const opened = openedGroups.includes(group.key);

            return (
              <div
                className="sidebar-group"
                key={group.key}
              >
                <button
                  type="button"
                  className={`sidebar-group-button ${
                    opened ? "opened" : ""
                  }`}
                  onClick={() =>
                    toggleGroup(group.key)
                  }
                >
                  <span className="sidebar-icon">
                    <i className={`bi ${group.icon}`} />
                  </span>

                  <span className="sidebar-group-label">
                    {group.label}
                  </span>

                  <i
                    className={`bi ${
                      opened
                        ? "bi-chevron-down"
                        : "bi-chevron-right"
                    } group-arrow`}
                  />
                </button>

                {opened && (
                  <div className="sidebar-submenu">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `sidebar-sub-link ${
                            isActive ? "active" : ""
                          }`
                        }
                        onClick={onClose}
                      >
                        <i
                          className={`bi ${item.icon}`}
                        />

                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="menu-section-title other-title">
            AUTRES
          </div>

          {/* INVENTAIRE */}
          <NavLink
            to="/inventaire"
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? "active" : ""
              }`
            }
            onClick={onClose}
          >
            <span className="sidebar-icon">
              <i className="bi bi-clipboard2-data" />
            </span>

            <span>Inventaire</span>
          </NavLink>

          {/* RAPPORTS */}
          <NavLink
            to="/rapports"
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? "active" : ""
              }`
            }
            onClick={onClose}
          >
            <span className="sidebar-icon">
              <i className="bi bi-file-earmark-bar-graph" />
            </span>

            <span>Rapports</span>
          </NavLink>

          {/* PROFIL */}
          <NavLink
            to="/profil"
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? "active" : ""
              }`
            }
            onClick={onClose}
          >
            <span className="sidebar-icon">
              <i className="bi bi-person-circle" />
            </span>

            <span>Mon profil</span>
          </NavLink>
        </nav>

        {/* FOOTER */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-logo">
            SMMC
          </div>

          <div>Gestion du stock</div>

          <small>Version 1.0</small>
        </div>
      </aside>
    </>
  );
}