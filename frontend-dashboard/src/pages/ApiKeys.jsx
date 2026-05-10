import React, { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, Trash2, Edit2, Copy, Check, Key } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser, regenerateKey, getPolicies } from '../services/api.js';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-gray-700 transition-colors">
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-gray-500" />}
    </button>
  );
}

export default function ApiKeys() {
  const [users, setUsers] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'user', ratePolicyId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, pRes] = await Promise.all([getUsers({ limit: 100 }), getPolicies()]);
      setUsers(uRes.data.users || []);
      setPolicies(pRes.data || []);
    } catch (e) {
      setError('Failed to load data. Is the gateway running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ name: '', email: '', role: 'user', ratePolicyId: policies[0]?._id || '' });
    setEditUser(null);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, role: u.role, ratePolicyId: u.ratePolicyId?._id || '' });
    setEditUser(u);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      if (editUser) {
        await updateUser(editUser._id, form);
      } else {
        await createUser(form);
      }
      setShowModal(false);
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user and revoke their API key?')) return;
    await deleteUser(id);
    load();
  };

  const handleRegenerate = async (id) => {
    if (!confirm('Regenerate API key? The old key will stop working immediately.')) return;
    const res = await regenerateKey(id);
    alert(`New API Key:\n${res.data.apiKey}`);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">API Keys</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage users and their access credentials</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={15} /> New User
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-5 py-3 font-medium">API Key</th>
                <th className="text-left px-5 py-3 font-medium">Role</th>
                <th className="text-left px-5 py-3 font-medium">Policy</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-600">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-600">No users yet. Create one to get started.</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u._id} className="table-row">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-200">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                          {u.apiKey ? `${u.apiKey.slice(0, 16)}…` : '—'}
                        </span>
                        {u.apiKey && <CopyButton text={u.apiKey} />}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge ${u.role === 'admin' ? 'badge-yellow' : 'badge-blue'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {u.ratePolicyId?.name || 'Default'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-gray-700 transition-colors" title="Edit">
                          <Edit2 size={13} className="text-gray-400" />
                        </button>
                        <button onClick={() => handleRegenerate(u._id)} className="p-1.5 rounded hover:bg-gray-700 transition-colors" title="Regenerate key">
                          <RefreshCw size={13} className="text-blue-400" />
                        </button>
                        <button onClick={() => handleDelete(u._id)} className="p-1.5 rounded hover:bg-gray-700 transition-colors" title="Delete">
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={editUser ? 'Edit User' : 'Create User'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Name</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            {!editUser && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Rate Policy</label>
              <select className="input" value={form.ratePolicyId} onChange={e => setForm(f => ({ ...f, ratePolicyId: e.target.value }))}>
                <option value="">Default</option>
                {policies.map(p => <option key={p._id} value={p._id}>{p.name} ({p.requestsPerWindow} req/{p.windowSeconds}s)</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSubmit} disabled={saving} className="btn btn-primary flex-1">
                {saving ? 'Saving…' : editUser ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
