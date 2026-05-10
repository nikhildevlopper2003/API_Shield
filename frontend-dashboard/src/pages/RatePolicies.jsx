import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit2, Settings } from 'lucide-react';
import { getPolicies, createPolicy, updatePolicy, deletePolicy } from '../services/api.js';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const DEFAULTS = { name: '', description: '', requestsPerWindow: 100, windowSeconds: 60, violationsBeforeBlock: 5, isDefault: false };

export default function RatePolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [form, setForm] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPolicies();
      setPolicies(res.data || []);
    } catch { setError('Failed to load policies'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(DEFAULTS); setEditPolicy(null); setShowModal(true); };
  const openEdit = (p) => {
    setForm({ name: p.name, description: p.description, requestsPerWindow: p.requestsPerWindow, windowSeconds: p.windowSeconds, violationsBeforeBlock: p.violationsBeforeBlock, isDefault: p.isDefault });
    setEditPolicy(p);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      if (editPolicy) await updatePolicy(editPolicy._id, form);
      else await createPolicy(form);
      setShowModal(false);
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this policy? Users assigned to it will fall back to defaults.')) return;
    await deletePolicy(id);
    load();
  };

  const f = (key) => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })) });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Rate Policies</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure request limits per user tier</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary"><Plus size={15} /> New Policy</button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-gray-600 text-sm">Loading…</p>
        ) : policies.length === 0 ? (
          <p className="text-gray-600 text-sm col-span-3">No policies yet.</p>
        ) : (
          policies.map(p => (
            <div key={p._id} className="card relative">
              {p.isDefault && (
                <span className="absolute top-3 right-3 badge badge-green">Default</span>
              )}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-white">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.description || 'No description'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">Requests</p>
                  <p className="text-lg font-bold text-white font-mono">{p.requestsPerWindow.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">Window</p>
                  <p className="text-lg font-bold text-white font-mono">{p.windowSeconds}s</p>
                </div>
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">Req/sec</p>
                  <p className="text-lg font-bold text-blue-400 font-mono">
                    {(p.requestsPerWindow / p.windowSeconds).toFixed(1)}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">Block After</p>
                  <p className="text-lg font-bold text-yellow-400 font-mono">{p.violationsBeforeBlock}x</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className="btn btn-ghost py-1.5 flex-1 text-xs"><Edit2 size={12} /> Edit</button>
                <button onClick={() => handleDelete(p._id)} className="btn btn-ghost py-1.5 flex-1 text-xs text-red-400 hover:text-red-300"><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <Modal title={editPolicy ? 'Edit Policy' : 'New Rate Policy'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Policy Name</label>
              <input className="input" placeholder="Free / Pro / Enterprise" {...f('name')} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Description</label>
              <input className="input" placeholder="Optional description" {...f('description')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Requests / Window</label>
                <input className="input" type="number" {...f('requestsPerWindow')} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Window (seconds)</label>
                <input className="input" type="number" {...f('windowSeconds')} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Violations before auto-block</label>
              <input className="input" type="number" {...f('violationsBeforeBlock')} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isDefault" className="rounded" checked={form.isDefault} onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))} />
              <label htmlFor="isDefault" className="text-xs text-gray-400">Set as default policy</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSubmit} disabled={saving} className="btn btn-primary flex-1">
                {saving ? 'Saving…' : editPolicy ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
