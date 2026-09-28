import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { authFetch, logout } from "../services/auth";
type Profile = {
  matricule: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  fonction: string;
  service: string;
  departement: string;
  role: string;
  actif: boolean;
  derniere_connexion: string | null;
  activites: { id: string; action: string; details: string; date: string }[];
};
async function api<T>(url: string, init?: RequestInit) {
  const r = await authFetch(url, init);
  const b: unknown = await r.json().catch(() => null);
  if (!r.ok)
    throw new Error(
      b && typeof b === "object"
        ? Object.values(b as Record<string, unknown>)
            .flat()
            .join(" ")
        : "Erreur serveur.",
    );
  return b as T;
}
export default function Profil() {
  const [p, setP] = useState<Profile | null>(null),
    [f, setF] = useState({ telephone: "", email: "", adresse: "" }),
    [pwd, setPwd] = useState({
      ancien_mot_de_passe: "",
      nouveau_mot_de_passe: "",
    }),
    [error, setError] = useState(""),
    [ok, setOk] = useState("");
  const load = async () => {
    try {
      setError("");
      const x = await api<Profile>("/api/account/profile/");
      setP(x);
      setF({ telephone: x.telephone, email: x.email, adresse: x.adresse });
    } catch (e) {
      setError(String(e));
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      await api("/api/account/profile/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      setOk("Vos coordonnées ont été enregistrées.");
      void load();
    } catch (e) {
      setError(String(e));
    }
  };
  const password = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      await api("/api/account/password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pwd),
      });
      logout();
      location.assign("/login");
    } catch (e) {
      setError(String(e));
    }
  };
  return (
    <main className="smmc-page account-page">
      <header className="account-hero">
        <div>
          <p className="page-breadcrumb">Mon espace</p>
          <h1>Mon profil</h1>
          <p>
            Gérez vos informations professionnelles, vos coordonnées et la
            sécurité de votre compte.
          </p>
        </div>
        <Link className="account-hero-action" to="/parametres">
          <i className="bi bi-sliders2" /> Paramètres
        </Link>
      </header>
      {error && <div className="smmc-alert smmc-alert-danger">{error}</div>}
      {ok && <div className="smmc-alert smmc-alert-success">{ok}</div>}
      {p && (
        <div className="profile-layout">
          <section className="profile-overview">
            <div className="profile-cover" />
            <div className="profile-identity">
              <span className="profile-monogram">
                {`${p.prenom[0] || ""}${p.nom[0] || ""}`.toUpperCase()}
              </span>
              <div>
                <span
                  className={
                    p.actif ? "account-status" : "account-status inactive"
                  }
                >
                  <i className="bi bi-circle-fill" />
                  {p.actif ? "Compte actif" : "Compte inactif"}
                </span>
                <h2>
                  {p.prenom} {p.nom}
                </h2>
                <p>Matricule {p.matricule}</p>
              </div>
            </div>
            <div className="profile-facts">
              <div>
                <i className="bi bi-briefcase" />
                <span>
                  Fonction<strong>{p.fonction || "Non renseignée"}</strong>
                </span>
              </div>
              <div>
                <i className="bi bi-diagram-3" />
                <span>
                  Service<strong>{p.service || "Non renseigné"}</strong>
                </span>
              </div>
              <div>
                <i className="bi bi-shield-check" />
                <span>
                  Rôle<strong>{p.role || "Non renseigné"}</strong>
                </span>
              </div>
            </div>
            <div className="profile-last">
              <i className="bi bi-clock-history" /> Dernière connexion :{" "}
              {p.derniere_connexion
                ? new Date(p.derniere_connexion).toLocaleString("fr-FR")
                : "Non disponible"}
            </div>
          </section>
          <div className="profile-content">
            <section className="account-card">
              <div className="account-card-title">
                <span>
                  <i className="bi bi-person-lines-fill" />
                </span>
                <div>
                  <h2>Coordonnées</h2>
                  <p>Vos informations de contact.</p>
                </div>
              </div>
              <form className="account-form" onSubmit={save}>
                {(["telephone", "email", "adresse"] as const).map((k) => (
                  <label key={k}>
                    {k === "telephone"
                      ? "Téléphone"
                      : k === "email"
                        ? "Adresse email"
                        : "Adresse"}
                    <input
                      type={k === "email" ? "email" : "text"}
                      value={f[k]}
                      onChange={(e) => setF({ ...f, [k]: e.target.value })}
                    />
                  </label>
                ))}
                <button className="smmc-btn smmc-btn-primary">
                  <i className="bi bi-check2" /> Enregistrer
                </button>
              </form>
            </section>
            <section className="account-card">
              <div className="account-card-title">
                <span className="gold">
                  <i className="bi bi-key" />
                </span>
                <div>
                  <h2>Sécurité</h2>
                  <p>Le changement de mot de passe déconnecte vos accès.</p>
                </div>
              </div>
              <form className="account-form" onSubmit={password}>
                <label>
                  Mot de passe actuel
                  <input
                    type="password"
                    required
                    value={pwd.ancien_mot_de_passe}
                    onChange={(e) =>
                      setPwd({ ...pwd, ancien_mot_de_passe: e.target.value })
                    }
                  />
                </label>
                <label>
                  Nouveau mot de passe
                  <input
                    type="password"
                    minLength={8}
                    required
                    value={pwd.nouveau_mot_de_passe}
                    onChange={(e) =>
                      setPwd({ ...pwd, nouveau_mot_de_passe: e.target.value })
                    }
                  />
                </label>
                <button className="smmc-btn smmc-btn-outline">
                  <i className="bi bi-shield-lock" /> Mettre à jour
                </button>
              </form>
            </section>
            <section className="account-card activity-card">
              <div className="account-card-title">
                <span>
                  <i className="bi bi-activity" />
                </span>
                <div>
                  <h2>Activité récente</h2>
                  <p>Les dernières opérations associées à votre compte.</p>
                </div>
              </div>
              <div className="activity-list">
                {p.activites.length ? (
                  p.activites.map((a) => (
                    <article key={a.id}>
                      <i className="bi bi-check-circle" />
                      <div>
                        <strong>{a.action}</strong>
                        <p>{a.details}</p>
                      </div>
                      <time>{new Date(a.date).toLocaleString("fr-FR")}</time>
                    </article>
                  ))
                ) : (
                  <p className="account-empty">Aucune activité récente.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
