import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getSessionUser, logout } from '../../services/auth';
import './chef.css';
const menu = [
  { path:'/chef', end:true, icon:'bi-grid-1x2', label:'Tableau de bord' },
  { path:'/chef/demandes', end:false, icon:'bi-clipboard-check', label:'À valider' },
  { path:'/chef/historique', end:false, icon:'bi-clock-history', label:'Historique' },
  { path:'/chef/profil', end:false, icon:'bi-person-circle', label:'Mon profil' },
  { path:'/chef/parametres', end:false, icon:'bi-gear', label:'Paramètres' },
];
export default function ChefLayout() {
  const user = getSessionUser(); const navigate = useNavigate(); const [open, setOpen] = useState(false);
  return <div className="chef-app">
    {open && <button className="chef-overlay" onClick={()=>setOpen(false)} aria-label="Fermer la navigation" />}
    <aside className={`chef-sidebar ${open?'show':''}`}><div className="chef-logo"><img src="/images/Logo_smmc.jpeg" alt="SMMC" /><span>PORT DE TOAMASINA</span></div><div className="chef-nav-label">ESPACE DÉPARTEMENT</div><nav aria-label="Navigation chef de département">{menu.map(item=><NavLink key={item.path} to={item.path} end={item.end} className={({isActive})=>`chef-nav-item ${isActive?'active':''}`} onClick={()=>setOpen(false)}><i className={`bi ${item.icon}`} />{item.label}</NavLink>)}</nav><div className="chef-side-bottom"><div className="chef-side-user"><span className="chef-avatar">{(user?.nom || user?.matricule || 'C')[0].toUpperCase()}</span><span><strong>{[user?.prenom,user?.nom].filter(Boolean).join(' ') || user?.matricule}</strong><small>Chef de département</small></span></div><button onClick={()=>{logout();navigate('/login',{replace:true});}}><i className="bi bi-box-arrow-right" /> Se déconnecter</button></div></aside>
    <div className="chef-main"><header className="chef-topbar"><button className="chef-menu-button" onClick={()=>setOpen(true)} aria-label="Ouvrir la navigation"><i className="bi bi-list" /></button><div className="chef-topbar-title"><span>Gestion des fournitures</span><strong>Chef de département</strong></div><div className="chef-top-user"><span className="chef-top-user-name">{[user?.prenom,user?.nom].filter(Boolean).join(' ') || user?.matricule}</span><span className="chef-avatar">{(user?.nom || user?.matricule || 'C')[0].toUpperCase()}</span></div></header><main className="chef-content"><Outlet /></main></div>
  </div>;
}
