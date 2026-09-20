import { NavLink } from "react-router-dom";

type MenuItem = {
  to: string;
  label: string;
  icon: string;
};

const mainLinks: MenuItem[] = [
  {
    to: "/",
    label: "Tableau de bord",
    icon: "bi-speedometer2",
  },
];

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
    icon: "bi-bar-chart",
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

const demandesLinks: MenuItem[] = [
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
    icon: "bi-check-circle",
  },
];

const mouvementsLinks: MenuItem[] = [
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

const autresLinks: MenuItem[] = [
  {
    to: "/inventaire",
    label: "Inventaire",
    icon: "bi-clipboard-check",
  },
  {
    to: "/rapports",
    label: "Rapports",
    icon: "bi-graph-up",
  },
  {
    to: "/services",
    label: "Services",
    icon: "bi-building",
  },
  {
    to: "/departements",
    label: "Départements",
    icon: "bi-diagram-3",
  },
];

function MenuLink({ item }: { item: MenuItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `nav-link d-flex align-items-center ${
          isActive ? "active" : ""
        }`
      }
      style={({ isActive }) => ({
        color: isActive ? "#ffffff" : "#212529",
        backgroundColor: isActive ? "#1EA54C" : "transparent",
        borderRadius: "8px",
        padding: "9px 12px",
        marginBottom: "3px",
      })}
    >
      <i className={`bi ${item.icon} me-2`}></i>
      <span>{item.label}</span>
    </NavLink>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-uppercase small fw-bold mt-3 mb-2 px-2"
      style={{ color: "#0F7A3D" }}
    >
      {children}
    </div>
  );
}

export default function Topbar() {
  return (
    <header
      className="bg-white border-bottom"
      style={{
        borderTop: "4px solid #FDB913",
      }}
    >
      <div className="container-fluid px-4 py-3">
        <div className="d-flex justify-content-between align-items-center">
          
          {/* Partie gauche */}
          <div>
            <h5
              className="mb-1 fw-bold"
              style={{ color: "#0F7A3D" }}
            >
              Gestion du stock — SMMC
            </h5>

            <small className="text-muted">
              Système de gestion des stocks
            </small>
          </div>

          {/* Partie droite */}
          <div className="d-flex align-items-center gap-3">

            {/* Notification */}
            <button
              type="button"
              className="btn btn-light position-relative"
            >
              <i
                className="bi bi-bell"
                style={{ color: "#1EA54C" }}
              ></i>

              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill"
                style={{
                  backgroundColor: "#FDB913",
                  color: "#212529",
                }}
              >
                3
              </span>
            </button>

            {/* Utilisateur */}
            <div className="d-flex align-items-center gap-2">
              <i
                className="bi bi-person-circle fs-3"
                style={{ color: "#1EA54C" }}
              ></i>

              <div>
                <div className="fw-semibold">
                  Sylvain
                </div>

                <div className="text-muted small">
                  Responsable stock
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-3">

          {/* PRINCIPAL */}
          <SectionTitle>PRINCIPAL</SectionTitle>

          {mainLinks.map((item) => (
            <MenuLink
              key={item.to}
              item={item}
            />
          ))}

          {/* STOCK */}
          <SectionTitle>GESTION DU STOCK</SectionTitle>

          {stockLinks.map((item) => (
            <MenuLink
              key={item.to}
              item={item}
            />
          ))}

          {/* APPROVISIONNEMENT */}
          <SectionTitle>APPROVISIONNEMENT</SectionTitle>

          {approvisionnementLinks.map((item) => (
            <MenuLink
              key={item.to}
              item={item}
            />
          ))}

          {/* DEMANDES */}
          <SectionTitle>DEMANDES</SectionTitle>

          {demandesLinks.map((item) => (
            <MenuLink
              key={item.to}
              item={item}
            />
          ))}

          {/* MOUVEMENTS */}
          <SectionTitle>MOUVEMENTS</SectionTitle>

          {mouvementsLinks.map((item) => (
            <MenuLink
              key={item.to}
              item={item}
            />
          ))}

          {/* AUTRES */}
          <SectionTitle>AUTRES</SectionTitle>

          {autresLinks.map((item) => (
            <MenuLink
              key={item.to}
              item={item}
            />
          ))}

        </nav>
      </div>
    </header>
  );
}