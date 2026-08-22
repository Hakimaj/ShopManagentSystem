import React, { useState, useEffect } from 'react';
import { usersApi } from '../services/usersApi';
import { useAuth } from '../context/AuthContext';
import { Edit2, Save, X, ShieldCheck, User, AlertCircle } from 'lucide-react';

export const UserManager = () => {
  const { currentUser } = useAuth();
  const [users, setUsers]           = useState([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm]             = useState({ username: '', full_name: '', password: '', is_active: true });
  const [formError, setFormError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try { setUsers(await usersApi.list()); }
      catch (e) { setError(e.message || 'Failed to load users'); }
      finally { setIsLoading(false); }
    })();
  }, []);

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({ username: u.username, full_name: u.full_name || '', password: '', is_active: u.is_active });
    setFormError('');
    setSuccessMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.username.trim()) { setFormError('Username is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        full_name: form.full_name.trim() || null,
        is_active: form.is_active,
      };
      if (form.password.trim()) payload.password = form.password.trim();

      const updated = await usersApi.update(editingUser.id, payload);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? updated : u));
      setSuccessMsg(`User "${updated.username}" updated successfully.`);
      setEditingUser(null);
    } catch (ex) {
      setFormError(ex.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1 className="view-title">User Management</h1>
          <p className="view-subtitle">View and update credentials for Admin and Staff accounts.</p>
        </div>
      </div>

      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--danger-bg)',
          color:'var(--danger)', padding:'0.7rem 1rem', borderRadius:'10px', fontSize:'0.85rem', fontWeight:600 }}>
          <AlertCircle size={16}/>{error}
        </div>
      )}
      {successMsg && (
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--success-bg)',
          color:'var(--success)', padding:'0.7rem 1rem', borderRadius:'10px', fontSize:'0.85rem', fontWeight:600 }}>
          <ShieldCheck size={16}/>{successMsg}
          <button onClick={() => setSuccessMsg('')} style={{ marginLeft:'auto', background:'none',
            border:'none', cursor:'pointer', color:'var(--success)' }}><X size={14}/></button>
        </div>
      )}

      <div className="table-card">
        <div className="table-scroll-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign:'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}>
                    <div className="skeleton skeleton-text" style={{ width:'100%', height:'1rem' }}/>
                  </td></tr>
                ))
              ) : users.map(u => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <td style={{ fontFamily:'monospace', fontWeight:700 }}>{u.id}</td>
                  <td style={{ fontWeight:700 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                      <User size={14} color="var(--text-muted)"/>
                      {u.username}
                      {u.id === currentUser?.id && (
                        <span style={{ fontSize:'0.65rem', background:'var(--accent-glow)',
                          color:'var(--accent-primary)', padding:'0.1rem 0.4rem', borderRadius:'999px', fontWeight:700 }}>
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color:'var(--text-secondary)' }}>{u.full_name || '—'}</td>
                  <td>
                    <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.55rem',
                      borderRadius:'999px',
                      background: u.role === 'ADMIN' ? 'var(--accent-primary)' : 'var(--success)',
                      color:'#fff' }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.55rem',
                      borderRadius:'6px',
                      background: u.is_active ? 'var(--success-bg)' : 'var(--danger-bg)',
                      color: u.is_active ? 'var(--success)' : 'var(--danger)' }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign:'right' }}>
                    <button className="icon-btn" style={{ width:32, height:32, display:'inline-flex' }}
                      onClick={() => openEdit(u)} title="Edit credentials">
                      <Edit2 size={15}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit Credentials — {editingUser.username}</div>
              <button className="icon-btn" onClick={() => setEditingUser(null)}
                style={{ border:'none', background:'transparent' }}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {formError && (
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem',
                    background:'var(--danger-bg)', color:'var(--danger)',
                    padding:'0.6rem 0.8rem', borderRadius:'8px', fontSize:'0.82rem', fontWeight:600 }}>
                    <AlertCircle size={16}/>{formError}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input type="text" className="form-input" value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    required minLength={3} maxLength={50}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    maxLength={100}/>
                </div>
                <div className="form-group">
                  <label className="form-label">New Password (leave blank to keep current)</label>
                  <input type="password" className="form-input" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    minLength={6} maxLength={100} placeholder="••••••••"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={String(form.is_active)}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}
                  style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <Save size={16}/>{saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
