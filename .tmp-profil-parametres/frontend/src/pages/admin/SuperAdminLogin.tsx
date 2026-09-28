import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { adminLogin, isAdminSession } from '../../services/auth';
import '../auth/login.css';
export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  if (isAdminSession()) return <Navigate to="/super-admin" replace />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('');
    try { await adminLogin(username, password); navigate('/super-admin', { replace: true }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Connexion impossible.'); }
    finally { setLoading(false); }
  }
  return <div className="login-shell">
    <section className="login-brand-panel"><div className="login-brand-top"><img src="/images/Logo_smmc.jpeg" alt="SMMC" /><span>PORT DE TOAMASINA</span></div><div className="login-brand-copy"><span className="login-eyebrow">Administration SMMC</span><h1>Les accès<br /><em>entre vos mains.</em></h1><p>Créez le compte du responsable du stock et gérez les accès du personnel depuis un espace dédié.</p><div className="login-brand-line" /><span className="login-brand-foot"><i className="bi bi-shield-lock" /> Super administration</span></div><div className="login-brand-bottom">Société de Manutention des Marchandises Conventionnelles</div></section>
    <main className="login-form-panel"><div className="login-mobile-logo"><img src="/images/Logo_smmc.jpeg" alt="SMMC" /></div><div className="login-card"><span className="login-kicker"><span className="login-kicker-dot" /> Accès administrateur</span><h2>Administration</h2><p className="login-intro">Connectez-vous avec le nom d’utilisateur et le mot de passe de votre compte superutilisateur Django.</p><form onSubmit={submit}><label htmlFor="admin-username">Nom d’utilisateur</label><div className="login-input-wrap"><i className="bi bi-person-lock" /><input id="admin-username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required /></div><label htmlFor="admin-password">Mot de passe</label><div className="login-input-wrap"><i className="bi bi-lock" /><input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></div>{error && <div role="alert" className="login-error">{error}</div>}<button className="login-submit" disabled={loading}>{loading ? 'Connexion…' : 'Accéder à l’administration'} <i className="bi bi-arrow-right" /></button></form><p className="login-help"><Link to="/login">Retour à la connexion du personnel</Link></p></div></main>
  </div>;
}
