import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getSessionUser, logout } from "../../services/auth";
import "./chef-layout.css";

const navigation = [
  { to: "/chef", end: true, icon: "bi-grid-1x2", label: "Tableau de bord" },
  { to: "/chef/demandes", icon: "bi-clipboard2-check", label: "Demandes à valider" },
  { to: "/chef/historique", icon: "bi-clock-history", label: "Historique" },
  { to: "/chef/services", icon: "bi-diagram-3", label: "Mes services" },
  { to: "/chef/profil", icon: "bi-person-circle", label: "Mon profil" },
];

export default function ChefLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = getSessionUser();
  const name = [user?.prenom, user?.nom].filter(Boolean).join(" ") || user?.matricule || "Chef de département";

  return <div className="chef-shell">
    {open && <button className="chef-overlay" onClick={() => setOpen(false)} aria-label="Fermer le menu" />}
    <aside className={`chef-sidebar ${open ? "open" : ""}`}>
      <div className="chef-brand"><img src="/images/Logo_smmc.jpeg" alt="SMMC" /><span>ESPACE DÉPARTEMENT</span></div>
      <div className="chef-user"><span className="chef-avatar">{name[0]?.toUpperCase()}</span><div><strong>{name}</strong><small>Chef de département</small></div></div>
      <nav><p>MON ESPACE</p>{navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}><i className={`bi ${item.icon}`} />{item.label}</NavLink>)}</nav>
      <div className="chef-side-footer"><button onClick={() => { logout(); navigate("/login", { replace: true }); }}><i className="bi bi-box-arrow-right" /> Déconnexion</button></div>
    </aside>
    <section className="chef-workspace"><header className="chef-topbar"><button onClick={() => setOpen(true)} className="chef-menu" aria-label="Ouvrir le menu"><i className="bi bi-list" /></button><div><small>Gestion des demandes</small><strong>Chef de département</strong></div><div className="chef-top-user"><span>{name}</span><b>{name[0]?.toUpperCase()}</b></div></header><main className="chef-content"><Outlet /></main></section>
  </div>;
}
