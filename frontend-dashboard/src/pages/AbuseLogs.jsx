import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getAbuseLogs, getLogs } from '../services/api.js';
import { formatDistanceToNow } from 'date-fns';

const TYPE_META = {
  REQUEST:              { color: 'badge-blue',   label: 'Request' },
  RATE_LIMIT_EXCEEDED:  { color: 'badge-red',    label: 'Rate Limit' },
  AUTH_FAILURE:         { color: 'badge-yellow', label: 'Auth Fail' },
  BLOCK_HIT:            { color: 'badge-red',    label: 'Block Hit' },
};

export default function AbuseLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('RATE_LIMIT_EXCEEDED');
  const [page, setPage] = useState(1);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLogs({ type: filter || undefined, page, limit });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Abuse Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total events</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input w-auto text-xs"
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Events</option>
            <option value="RATE_LIMIT_EXCEEDED">Rate Limit Exceeded</option>
            <option value="AUTH_FAILURE">Auth Failures</option>
            <option value="BLOCK_HIT">Block Hits</option>
            <option value="REQUEST">All Requests</option>
          </select>
          <button onClick={load} className="btn btn-ghost py-2">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">IP</th>
                <th className="text-left px-4 py-3 font-medium">Method</th>
                <th className="text-left px-4 py-3 font-medium">Path</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Latency</th>
                <th className="text-left px-4 py-3 font-medium">Count/Limit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-600">Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-600">No events found for this filter.</td></tr>
              ) : (
                logs.map((log, i) => {
                  const meta = TYPE_META[log.type] || { color: 'badge-gray', label: log.type };
                  return (
                    <tr key={i} className="table-row">
                      <td className="px-4 py-2.5 font-mono text-gray-500">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`badge ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-400">{log.ip || '—'}</td>
                      <td className="px-4 py-2.5">
                        {log.method && (
                          <span className="badge badge-gray">{log.method}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-300 max-w-[160px] truncate">{log.path || '—'}</td>
                      <td className="px-4 py-2.5">
                        {log.statusCode && (
                          <span className={`badge ${log.statusCode < 400 ? 'badge-green' : 'badge-red'}`}>
                            {log.statusCode}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-500">
                        {log.latencyMs != null ? `${log.latencyMs.toFixed(1)}ms` : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-500">
                        {log.count != null ? `${log.count}/${log.limit}` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / limit)}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-ghost py-1 px-3 text-xs"
              >Prev</button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
                className="btn btn-ghost py-1 px-3 text-xs"
              >Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
