import React, { useEffect, useState, useCallback } from 'react';
import { ShieldOff, Plus, Trash2, AlertCircle } from 'lucide-react';
import { getBlockedIPs, blockIP, unblockIP, unblockAllIPs } from '../services/api.js';
import { formatDistanceToNow } from 'date-fns';

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

const REASON_MAP = {
  MANUAL: { label: 'Manual',          color: 'badge-yellow' },
  RATE_LIMIT_ABUSE: { label: 'Rate Abuse',    color: 'badge-red' },
  SUSPICIOUS_ACTIVITY: { label: 'Suspicious', color: 'badge-red' },
  AUTH_ABUSE: { label: 'Auth Abuse',   color: 'badge-red' },
};

export default function BlockedIPs() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false); // 🔥 NEW
  const [form, setForm] = useState({ ip: '', reason: 'MANUAL', notes: '', durationHours: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBlockedIPs({ limit: 100 });
      setRecords(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setError('Failed to load blocked IPs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBlock = async () => {
    setSaving(true);
    setError('');
    try {
      await blockIP({
        ip: form.ip,
        reason: form.reason,
        notes: form.notes,
        durationHours: form.durationHours ? parseInt(form.durationHours) : null,
      });
      setShowModal(false);
      setForm({ ip: '', reason: 'MANUAL', notes: '', durationHours: '' });
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to block IP');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (ip) => {
    if (!confirm(`Unblock ${ip}?`)) return;
    await unblockIP(ip);
    load();
  };

  // 🔥 NEW
  const handleUnblockAll = async () => {
    setSaving(true);
    try {
      await unblockAllIPs();
      setConfirmAll(false);
      load();
    } catch {
      setError('Failed to unblock all IPs');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Blocked IPs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} active blocks</p>
        </div>

        {/* 🔥 UPDATED BUTTON GROUP */}
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmAll(true)}
            className="btn btn-ghost border border-red-700 text-red-400 hover:bg-red-900/20"
          >
            <Trash2 size={14} /> Unblock All
          </button>

          <button onClick={() => setShowModal(true)} className="btn btn-danger">
            <ShieldOff size={15} /> Block IP
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400 flex gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-5 py-3 font-medium">IP Address</th>
                <th className="text-left px-5 py-3 font-medium">Reason</th>
                <th className="text-left px-5 py-3 font-medium">Violations</th>
                <th className="text-left px-5 py-3 font-medium">Blocked By</th>
                <th className="text-left px-5 py-3 font-medium">Expires</th>
                <th className="text-left px-5 py-3 font-medium">Age</th>
                <th className="text-left px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-600">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-600">No blocked IPs — system is clean 🎉</td></tr>
              ) : (
                records.map(r => {
                  const meta = REASON_MAP[r.reason] || { label: r.reason, color: 'badge-gray' };
                  return (
                    <tr key={r._id} className="table-row">
                      <td className="px-5 py-3 font-mono text-red-300">{r.ip}</td>
                      <td className="px-5 py-3">
                        <span className={`badge ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 font-mono">{r.violationCount}</td>
                      <td className="px-5 py-3 text-gray-400">{r.blockedBy}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {r.expiresAt
                          ? new Date(r.expiresAt).toLocaleString()
                          : <span className="badge badge-red">Permanent</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleUnblock(r.ip)}
                          className="btn btn-ghost py-1 px-3 text-xs"
                        >
                          <Trash2 size={12} /> Unblock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔥 NEW CONFIRM MODAL */}
      {confirmAll && (
        <Modal title="Unblock All IPs" onClose={() => setConfirmAll(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Are you sure you want to unblock <b>ALL</b> IPs?
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleUnblockAll}
                disabled={saving}
                className="btn btn-danger flex-1"
              >
                {saving ? 'Unblocking…' : 'Yes, Unblock All'}
              </button>

              <button
                onClick={() => setConfirmAll(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal title="Block IP Address" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">IP Address *</label>
              <input className="input font-mono" value={form.ip} onChange={e => setForm(f => ({ ...f, ip: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleBlock} disabled={saving || !form.ip} className="btn btn-danger flex-1">
                {saving ? 'Blocking…' : 'Block IP'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}