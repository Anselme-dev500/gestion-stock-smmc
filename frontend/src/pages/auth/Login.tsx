import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getAccessToken, isAdminSession, login } from '../../services/auth';
import './login.css';
export default function Login() {
  const navigate = useNavigate(); const location = useLocation();
  const [matricule, setMatricule] = useState(''); const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const from = (location.state as { from?: string } | null)?.from || '/';
  if (isAdminSession()) return <Navigate to="/super-admin" replace />;
  if (getAccessToken()) return <Navigate to={from} replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true);
    try { await login(matricule, password); navigate(from, { replace: true }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Connexion impossible.'); }
    finally { setLoading(false); }
  }
  return <div className="login-shell">
    <div className="login-brand-panel">
      <div className="login-brand-top"><img src="/images/Logo_smmc.jpeg" alt="SMMC Port de Toamasina" /><span>PORT DE TOAMASINA</span></div>
      <div className="login-brand-copy"><span className="login-eyebrow">SMMC · Gestion interne</span><h1>Un stock clair.<br /><em>Des décisions sûres.</em></h1><p>Suivez les fournitures, les demandes et les mouvements depuis un espace de travail unique.</p><div className="login-brand-line" /><span className="login-brand-foot"><i className="bi bi-box-seam" /> Gestion du stock de fournitures</span></div>
      <div className="login-brand-bottom">Société de Manutention des Marchandises Conventionnelles</div>
    </div>
    <main className="login-form-panel"><div className="login-mobile-logo"><img src="/images/Logo_smmc.jpeg" alt="SMMC" /></div><div className="login-card">
      <span className="login-kicker"><span className="login-kicker-dot" /> Espace sécurisé</span>
      <h2>Bienvenue</h2><p className="login-intro">Connectez-vous avec votre matricule SMMC pour accéder à votre espace.</p>
      <form onSubmit={submit}>
        <label htmlFor="matricule">Numéro de matricule</label><div className="login-input-wrap"><i className="bi bi-person-badge" /><input id="matricule" name="matricule" autoComplete="username" placeholder="Ex. : 001234" value={matricule} onChange={e => setMatricule(e.target.value)} required autoFocus /></div>
        <label htmlFor="password">Mot de passe</label><div className="login-input-wrap"><i className="bi bi-lock" /><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Votre mot de passe" value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" className="login-eye" onClick={() => setVisible(!visible)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}><i className={`bi ${visible ? 'bi-eye-slash' : 'bi-eye'}`} /></button></div>
        {error && <div role="alert" className="login-error"><i className="bi bi-exclamation-circle" />{error}</div>}
        <button type="submit" className="login-submit" disabled={loading}>{loading ? 'Connexion en cours…' : 'Se connecter'} <i className="bi bi-arrow-right" /></button>
      </form><p className="login-help">Besoin d’accès ? Contactez l’administrateur de la SMMC.<br /><a href="/super-admin/login">Accès super administrateur</a></p>
    </div><span className="login-copyright">© 2026 SMMC · Port de Toamasina</span></main>
  </div>;
}
