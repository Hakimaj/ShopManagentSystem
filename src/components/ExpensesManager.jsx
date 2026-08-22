import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { expensesApi } from '../services/expensesApi';
import {
  Plus, Trash2, Edit2, Save, X, Receipt, Tag, AlertCircle, CheckCircle
} from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

export const ExpensesManager = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [categories, setCategories]     = useState([]);
  const [expenses, setExpenses]         = useState([]);
  const [total, setTotal]               = useState(0);
  const [pages, setPages]               = useState(1);
  const [page, setPage]                 = useState(1);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');

  // filters
  const [period, setPeriod]             = useState('all');
  const [customDate, setCustomDate]     = useState(today());
  const [filterCatId, setFilterCatId]   = useState('');

  // category management
  const [newCatName, setNewCatName]     = useState('');
  const [editCat, setEditCat]           = useState(null); // { id, name }
  const [catLoading, setCatLoading]     = useState(false);

  // expense form
  const [showForm, setShowForm]         = useState(false);
  const [editingExp, setEditingExp]     = useState(null);
  const [form, setForm]                 = useState({
    category_id: '', amount: '', expense_date: today(), description: ''
  });
  const [formError, setFormError]       = useState('');
  const [saving, setSaving]             = useState(false);

  const loadCategories = useCallback(async () => {
    try { setCategories(await expensesApi.listCategories()); }
    catch { /* ignore */ }
  }, []);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = { period, page, size: 50 };
      if (period === 'custom') params.custom_date = customDate;
      if (filterCatId) params.category_id = filterCatId;
      const res = await expensesApi.list(params);
      setExpenses(res.items || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e) {
      setError(e.message || 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [period, customDate, filterCatId, page]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  // ── Category CRUD ─────────────────────────────────────────────────────────

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setCatLoading(true);
    try {
      const cat = await expensesApi.createCategory(newCatName.trim());
      setCategories(prev => [...prev, cat]);
      setNewCatName('');
    } catch (e) { setError(e.message); }
    finally { setCatLoading(false); }
  };

  const handleUpdateCategory = async () => {
    if (!editCat?.name?.trim()) return;
    setCatLoading(true);
    try {
      const updated = await expensesApi.updateCategory(editCat.id, editCat.name.trim());
      setCategories(prev => prev.map(c => c.id === editCat.id ? updated : c));
      setEditCat(null);
    } catch (e) { setError(e.message); }
    finally { setCatLoading(false); }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"? All expenses in this category must be reassigned first.`)) return;
    try {
      await expensesApi.deleteCategory(cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    } catch (e) { setError(e.message); }
  };

  // ── Expense CRUD ──────────────────────────────────────────────────────────

  const openAddForm = () => {
    setEditingExp(null);
    setForm({ category_id: categories[0]?.id || '', amount: '', expense_date: today(), description: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (exp) => {
    setEditingExp(exp);
    setForm({
      category_id: exp.category_id,
      amount: exp.amount,
      expense_date: exp.expense_date,
      description: exp.description || ''
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!form.category_id || !form.amount || !form.expense_date) {
      setFormError('Category, amount and date are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        category_id: Number(form.category_id),
        amount: Number(form.amount),
        expense_date: form.expense_date,
        description: form.description || null
      };
      if (editingExp) {
        const updated = await expensesApi.update(editingExp.id, payload);
        setExpenses(prev => prev.map(ex => ex.id === editingExp.id ? updated : ex));
      } else {
        await expensesApi.create(payload);
        await loadExpenses();
      }
      setShowForm(false);
    } catch (ex) { setFormError(ex.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDeleteExpense = async (exp) => {
    if (!window.confirm(`Delete this expense of ${fmt(exp.amount)} ETB?`)) return;
    try {
      await expensesApi.delete(exp.id);
      setExpenses(prev => prev.filter(ex => ex.id !== exp.id));
    } catch (e) { setError(e.message); }
  };

  const totalLoaded = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1 className="view-title">Expenses</h1>
          <p className="view-subtitle">Track business expenses and see their impact on net profit.</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={openAddForm}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={18} /><span>Log Expense</span>
          </button>
        )}
      </div>

      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--danger-bg)',
          color:'var(--danger)', padding:'0.7rem 1rem', borderRadius:'10px', fontSize:'0.85rem', fontWeight:600 }}>
          <AlertCircle size={16} />{error}
          <button onClick={() => setError('')} style={{ marginLeft:'auto', background:'none', border:'none',
            cursor:'pointer', color:'var(--danger)' }}><X size={14}/></button>
        </div>
      )}

      {/* ── Summary card ─────────────────────────────────────── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background:'var(--danger-bg)', color:'var(--danger)' }}>
            <Receipt size={24}/>
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">Total Expenses (loaded)</span>
            <span className="kpi-value" style={{ color:'var(--danger)' }}>
              {fmt(totalLoaded)} ETB
            </span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background:'var(--accent-glow)', color:'var(--accent-primary)' }}>
            <Tag size={24}/>
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">Total Records</span>
            <span className="kpi-value">{total}</span>
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div style={{ background:'var(--bg-card)', borderRadius:'14px', border:'1px solid var(--border-color)',
        padding:'0.85rem 1.25rem', display:'flex', flexWrap:'wrap', gap:'0.75rem', alignItems:'center' }}>
        <span style={{ fontWeight:700, fontSize:'0.88rem', whiteSpace:'nowrap' }}>Filter:</span>
        <div className="category-pills">
          {['all','daily','monthly','half_year','yearly','custom'].map(p => (
            <button key={p} className={`pill-btn ${period === p ? 'active' : ''}`}
              onClick={() => { setPeriod(p); setPage(1); }}
              style={{ fontSize:'0.8rem' }}>
              {p === 'all' ? 'All Time' : p === 'daily' ? 'Today' : p === 'monthly' ? 'This Month' :
               p === 'half_year' ? '6 Months' : p === 'yearly' ? 'Yearly' : 'Custom Day'}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <input type="date" value={customDate}
            onChange={e => { setCustomDate(e.target.value); setPage(1); }}
            className="form-input" style={{ width:'160px' }}/>
        )}
        <select value={filterCatId} onChange={e => { setFilterCatId(e.target.value); setPage(1); }}
          className="form-input" style={{ width:'160px' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* ── Expense table ────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-scroll-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th style={{ textAlign:'right' }}>Amount (ETB)</th>
                {isAdmin && <th style={{ textAlign:'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={isAdmin ? 6 : 5}>
                    <div className="skeleton skeleton-text" style={{ width:'100%', height:'1rem' }}/>
                  </td></tr>
                ))
              ) : expenses.length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Receipt size={28}/></div>
                    <div style={{ fontWeight:700 }}>No expenses found</div>
                    <div style={{ fontSize:'0.85rem' }}>Adjust filters or log a new expense.</div>
                  </div>
                </td></tr>
              ) : expenses.map((exp, idx) => (
                <tr key={exp.id}>
                  <td style={{ fontWeight:700, fontFamily:'monospace', color:'var(--text-muted)' }}>
                    {(page - 1) * 50 + idx + 1}
                  </td>
                  <td>{exp.expense_date}</td>
                  <td>
                    <span style={{ background:'var(--bg-main)', padding:'0.2rem 0.6rem',
                      borderRadius:'6px', border:'1px solid var(--border-color)', fontSize:'0.78rem', fontWeight:600 }}>
                      {exp.category?.name || '—'}
                    </span>
                  </td>
                  <td style={{ color:'var(--text-secondary)', maxWidth:'200px',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {exp.description || '—'}
                  </td>
                  <td style={{ textAlign:'right', fontWeight:800, color:'var(--danger)' }}>
                    {fmt(exp.amount)}
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign:'right' }}>
                      <div style={{ display:'flex', gap:'0.4rem', justifyContent:'flex-end' }}>
                        <button className="icon-btn" style={{ width:32, height:32, display:'inline-flex' }}
                          onClick={() => openEditForm(exp)} title="Edit">
                          <Edit2 size={15}/>
                        </button>
                        <button className="icon-btn"
                          style={{ width:32, height:32, display:'inline-flex', background:'var(--danger)', color:'#fff' }}
                          onClick={() => handleDeleteExpense(exp)} title="Delete">
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem', padding:'1rem' }}>
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              ← Prev
            </button>
            <span style={{ padding:'0.5rem 0.75rem', fontWeight:700 }}>
              Page {page} / {pages}
            </span>
            <button className="btn-secondary" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Category management (Admin only) ─────────────────── */}
      {isAdmin && (
        <div className="table-card" style={{ padding:'1.25rem' }}>
          <h3 style={{ fontWeight:700, marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Tag size={18} color="var(--accent-primary)"/>Expense Categories
          </h3>
          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>
            <input type="text" className="form-input" placeholder="New category name…"
              value={newCatName} onChange={e => setNewCatName(e.target.value)}
              style={{ flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}/>
            <button className="btn-primary" onClick={handleAddCategory} disabled={catLoading || !newCatName.trim()}
              style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
              <Plus size={16}/> Add
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:'0.5rem',
                background:'var(--bg-main)', borderRadius:'8px', padding:'0.5rem 0.75rem',
                border:'1px solid var(--border-color)' }}>
                {editCat?.id === cat.id ? (
                  <>
                    <input type="text" className="form-input" value={editCat.name}
                      onChange={e => setEditCat({ ...editCat, name: e.target.value })}
                      style={{ flex:1 }}/>
                    <button className="icon-btn" style={{ width:28, height:28, display:'inline-flex' }}
                      onClick={handleUpdateCategory} disabled={catLoading}>
                      <CheckCircle size={14} color="var(--success)"/>
                    </button>
                    <button className="icon-btn" style={{ width:28, height:28, display:'inline-flex' }}
                      onClick={() => setEditCat(null)}>
                      <X size={14}/>
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ flex:1, fontWeight:600 }}>{cat.name}</span>
                    <button className="icon-btn" style={{ width:28, height:28, display:'inline-flex' }}
                      onClick={() => setEditCat({ id: cat.id, name: cat.name })}>
                      <Edit2 size={13}/>
                    </button>
                    <button className="icon-btn"
                      style={{ width:28, height:28, display:'inline-flex', background:'var(--danger)', color:'#fff' }}
                      onClick={() => handleDeleteCategory(cat)}>
                      <Trash2 size={13}/>
                    </button>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>No categories yet. Add one above.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Add/Edit Expense Modal ────────────────────────────── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingExp ? 'Edit Expense' : 'Log New Expense'}</div>
              <button className="icon-btn" onClick={() => setShowForm(false)}
                style={{ border:'none', background:'transparent' }}><X size={18}/></button>
            </div>
            <form onSubmit={handleSaveExpense}>
              <div className="modal-body">
                {formError && (
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem',
                    background:'var(--danger-bg)', color:'var(--danger)',
                    padding:'0.6rem 0.8rem', borderRadius:'8px', fontSize:'0.82rem', fontWeight:600 }}>
                    <AlertCircle size={16}/>{formError}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-input" value={form.category_id}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                    <option value="">Select category…</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Amount (ETB) *</label>
                    <input type="number" className="form-input" min="0.01" step="0.01"
                      value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00" required/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-input"
                      value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                      required/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <textarea className="form-input" rows={2} maxLength={500}
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="What was this expense for?"/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}
                  style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <Save size={16}/>{saving ? 'Saving…' : editingExp ? 'Update' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
