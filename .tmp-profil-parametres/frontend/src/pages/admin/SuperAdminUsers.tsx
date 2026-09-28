import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authFetch, logout } from '../../services/auth';
import './admin.css';

type Person = { per_id: string; matricule: string; nom: string; prenom: string; compte_actif: boolean; profil_actif: boolean; role: string; departement_id: string | null };
type Fonction = { fn_id: string; fn_nom: string };
type Departement = { dep_id: string; dep_nom: string };
type Roles = { value: string; label: string };
type Data = { users: Person[]; fonctions: Fonction[]; departements: Departement[]; roles: Roles[] };
const initial = { matricule:'', nom:'', prenom:'', date_naissance:'', numero_cin:'', date_embauche:'', type_contrat:'CDI', fonction_id:'', departement_id:'', role:'responsable_stock', password:'' };
type Form = typeof initial;
async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const result = await response.json().catch(() => null) as T & { detail?: string };
  if (!response.ok) throw new Error(result?.detail || `Erreur HTTP ${response.status}`);
  return result;
}
export default function SuperAdminUsers() {
  const navigate = useNavigate(); const [data, setData] = useState<Data>({ users:[], fonctions:[], departements:[], roles:[] });
  const [form, setForm] = useState<Form>(initial); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(''); const [newPassword, setNewPassword] = useState<Record<string,string>>({});
  const load = async () => { try { setData(await api<Data>('/api/admin/stock-users/')); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Chargement impossible'); } };
  useEffect(() => { void load(); }, []);
  const change = (key: keyof Form, value: string) => setForm(old => ({...old,[key]:value}));
  async function create(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try { await api('/api/admin/stock-users/', { method:'POST', body:JSON.stringify(form) }); setSuccess('Compte créé. Le responsable peut maintenant se connecter avec son matricule.'); setForm(initial); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Création impossible.'); }
    finally { setBusy(false); }
  }
  async function update(person: Person, payload: Record<string,unknown>) {
    setBusy(true); setError(''); setSuccess('');
    try { await api(`/api/admin/stock-users/${person.per_id}/`, { method:'PATCH', body:JSON.stringify(payload) }); setSuccess(`Compte ${person.matricule} modifié.`); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Modification impossible.'); }
    finally { setBusy(false); }
  }
  const users = data.users.filter(p => `${p.matricule} ${p.nom} ${p.prenom}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="admin-shell"><header className="admin-top"><div className="admin-brand"><img src="/images/Logo_smmc.jpeg" alt="SMMC" /><span>Espace super administrateur</span></div><button onClick={() => {logout();navigate('/super-admin/login',{replace:true});}}><i className="bi bi-box-arrow-right" /> Déconnexion</button></header><main className="admin-main"><div className="admin-heading"><span className="admin-eyebrow">SMMC / Administration / Accès</span><h1>Gestion des utilisateurs</h1><Link to="/super-admin/parametres">Paramètres de l’application →</Link><p>Attribuez le rôle de responsable du stock et pilotez les accès au module.</p></div>
    {error && <div className="admin-message admin-error" role="alert">{error}</div>}{success && <div className="admin-message admin-success" role="status">{success}</div>}
    <div className="admin-grid"><section className="admin-card"><div className="admin-card-head"><i className="bi bi-person-plus" /><div><h2>Créer un utilisateur</h2><p>Un compte Django, une fiche Personnel et un profil Stock seront créés.</p></div></div><form className="admin-form" onSubmit={create}>
      <label>Matricule *<input value={form.matricule} onChange={e=>change('matricule',e.target.value)} required maxLength={30} /></label><div className="admin-row"><label>Nom *<input value={form.nom} onChange={e=>change('nom',e.target.value)} required /></label><label>Prénom<input value={form.prenom} onChange={e=>change('prenom',e.target.value)} /></label></div>
      <div className="admin-row"><label>Date de naissance *<input type="date" value={form.date_naissance} onChange={e=>change('date_naissance',e.target.value)} required /></label><label>Date d’embauche *<input type="date" value={form.date_embauche} onChange={e=>change('date_embauche',e.target.value)} required /></label></div><label>Numéro CIN *<input value={form.numero_cin} onChange={e=>change('numero_cin',e.target.value)} required maxLength={20} /></label>
      <div className="admin-row"><label>Type de contrat *<select value={form.type_contrat} onChange={e=>change('type_contrat',e.target.value)}><option value="CDI">CDI</option><option value="CDD">CDD</option><option value="LOUAGE">Louage</option><option value="STAGE">Stage</option></select></label><label>Fonction *<select value={form.fonction_id} onChange={e=>change('fonction_id',e.target.value)} required><option value="">Choisir…</option>{data.fonctions.map(fn=><option key={fn.fn_id} value={fn.fn_id}>{fn.fn_nom}</option>)}</select></label></div><label>Département {form.role==='chef_departement' && '*'}<select value={form.departement_id} required={form.role==='chef_departement'} onChange={e=>change('departement_id',e.target.value)}><option value="">Sélectionner un département…</option>{data.departements.map(d=><option key={d.dep_id} value={d.dep_id}>{d.dep_nom}</option>)}</select></label><label>Rôle dans le stock<select value={form.role} onChange={e=>change('role',e.target.value)}>{data.roles.filter(r=>r.value!=='super_admin').map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></label><label>Mot de passe initial *<input type="password" value={form.password} onChange={e=>change('password',e.target.value)} required minLength={8} autoComplete="new-password" /></label>
      <button className="admin-primary" disabled={busy || !data.fonctions.length}>{busy?'Enregistrement…':'Créer le compte'} <i className="bi bi-arrow-right" /></button>{!data.fonctions.length && <small>Créez d’abord une fonction RH dans Django Admin.</small>}</form></section>
      <section className="admin-card admin-list"><div className="admin-card-head"><i className="bi bi-people" /><div><h2>Utilisateurs du stock</h2><p>{data.users.length} compte(s) enregistré(s)</p></div></div><div className="admin-search"><i className="bi bi-search" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un matricule ou un nom…" /></div><div className="admin-people">{users.length===0?<div className="admin-empty">Aucun utilisateur trouvé.</div>:users.map(p=><article className="admin-person" key={p.per_id}><div className="admin-person-top"><span className="admin-avatar">{p.nom[0]?.toUpperCase()}</span><div><strong>{p.prenom} {p.nom}</strong><span>Matricule {p.matricule}</span></div><span className={p.profil_actif?'admin-status':'admin-status off'}>{p.profil_actif?'Actif':'Inactif'}</span></div><div className="admin-person-actions"><label>Département<select value={p.departement_id||''} onChange={e=>void update(p,{departement_id:e.target.value})} disabled={busy}><option value="">Sans département</option>{data.departements.map(d=><option key={d.dep_id} value={d.dep_id}>{d.dep_nom}</option>)}</select></label><label>Rôle<select value={p.role} onChange={e=>void update(p,{role:e.target.value})} disabled={busy}>{data.roles.filter(r=>r.value!=='super_admin').map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></label><button type="button" onClick={()=>void update(p,{actif:!p.profil_actif})} disabled={busy}>{p.profil_actif?'Désactiver':'Activer'}</button></div><div className="admin-reset"><input type="password" minLength={8} placeholder="Nouveau mot de passe" aria-label={`Nouveau mot de passe de ${p.matricule}`} value={newPassword[p.per_id]||''} onChange={e=>setNewPassword(old=>({...old,[p.per_id]:e.target.value}))} /><button type="button" disabled={busy || (newPassword[p.per_id]||'').length<8} onClick={()=>{void update(p,{password:newPassword[p.per_id]});setNewPassword(old=>({...old,[p.per_id]:''}));}}>Réinitialiser</button></div></article>)}</div></section></div></main></div>;
}
