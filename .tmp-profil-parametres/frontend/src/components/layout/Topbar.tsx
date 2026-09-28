import { getSessionUser, logout } from "../../services/auth";
import { authFetch } from "../../services/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_URL || "/api/stock").replace(/\/$/, "");
interface Notification { id: string; type: "warning" | "success" | "info"; title: string; message: string; created_at: string; link: string; }
interface NotificationResponse { count: number; results: Notification[]; }
interface TopbarProps { onMenuClick?: () => void; }

function relativeDate(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "À l’instant";
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
  return `Il y a ${Math.floor(seconds / 86400)} j`;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const navigate = useNavigate();
  const currentUser = getSessionUser();
  const displayName = [currentUser?.prenom, currentUser?.nom].filter(Boolean).join(" ") || currentUser?.matricule || "Utilisateur SMMC";
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationError, setNotificationError] = useState("");

  const loadNotifications = async () => {
    try {
      const response = await authFetch(`${API_URL}/notifications/`);
      if (!response.ok) throw new Error("Impossible de charger les notifications.");
      const data = await response.json() as NotificationResponse;
      setNotifications(data.results || []); setNotificationError("");
    } catch (cause) { setNotificationError(cause instanceof Error ? cause.message : "Erreur de chargement."); }
  };

  useEffect(() => { void loadNotifications(); }, []);
  const openNotifications = () => { setNotificationOpen((open) => !open); setProfileOpen(false); };
  const icon = (type: Notification["type"]) => type === "warning" ? "bi-exclamation-triangle" : type === "success" ? "bi-check-circle" : "bi-clipboard-check";

  return <header className="smmc-topbar">
    <div className="topbar-left"><button className="mobile-menu-button" onClick={onMenuClick}><i className="bi bi-list" /></button><div className="topbar-search"><i className="bi bi-search" /><input type="text" placeholder="Rechercher dans le stock..." /><span className="search-shortcut">Ctrl K</span></div></div>
    <div className="topbar-right"><div className="topbar-dropdown"><button className="topbar-icon-button" onClick={openNotifications} aria-label="Notifications"><i className="bi bi-bell" />{notifications.length > 0 && <span className="notification-badge">{notifications.length > 9 ? "9+" : notifications.length}</span>}</button>{notificationOpen && <div className="notification-panel"><div className="dropdown-header"><div><strong>Notifications</strong><small>{notifications.length} notification{notifications.length > 1 ? "s" : ""} issue{notifications.length > 1 ? "s" : ""} des données</small></div><button onClick={() => void loadNotifications()}>Actualiser</button></div>{notificationError ? <div className="notification-item"><div><strong>Erreur</strong><p>{notificationError}</p></div></div> : notifications.length === 0 ? <div className="notification-item"><div><strong>Aucune notification</strong><p>Aucune alerte n’a été trouvée dans la base de données.</p></div></div> : notifications.map((notification) => <button className="notification-item" key={notification.id} onClick={() => { setNotificationOpen(false); navigate(notification.link); }}><div className={`notification-icon ${notification.type}`}><i className={`bi ${icon(notification.type)}`} /></div><div><strong>{notification.title}</strong><p>{notification.message}</p><small>{relativeDate(notification.created_at)}</small></div></button>)}</div>}</div><div className="topbar-separator" /><div className="topbar-dropdown"><button className="topbar-profile" onClick={() => { setProfileOpen((open) => !open); setNotificationOpen(false); }}><div className="topbar-avatar"><i className="bi bi-person-fill" /></div><div className="topbar-user"><strong>{displayName}</strong><span>{currentUser?.matricule ? `Matricule ${currentUser.matricule}` : "Compte SMMC"}</span></div><i className={`bi ${profileOpen ? "bi-chevron-up" : "bi-chevron-down"}`} /></button>{profileOpen && <div className="profile-dropdown"><button onClick={() => navigate("/profil")}><i className="bi bi-person" />Mon profil</button><button onClick={() => { setProfileOpen(false); navigate("/parametres"); }}><i className="bi bi-gear" />Paramètres</button><div className="dropdown-divider" /><button className="logout-button" onClick={() => { logout(); navigate("/login", { replace: true }); }}><i className="bi bi-box-arrow-right" />Déconnexion</button></div>}</div></div>
  </header>;
}
