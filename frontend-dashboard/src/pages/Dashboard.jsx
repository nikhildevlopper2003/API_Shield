import React, { useEffect, useState } from 'react';
import {
  Activity, Zap, AlertTriangle, Shield,
  Users, Server, Clock, TrendingUp
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket.js';
import StatCard from '../components/ui/StatCard.jsx';
import LatencyChart from '../components/charts/LatencyChart.jsx';
import RequestsChart from '../components/charts/RequestsChart.jsx';
import ErrorRateChart from '../components/charts/ErrorRateChart.jsx';
import { getSystemStats } from '../services/api.js';

export default function Dashboard() {
  const { connected, metrics, metricsHistory, recentLogs } = useSocket();
  const [sysStats, setSysStats] = useState(null);

  useEffect(() => {
    getSystemStats()
      .then(r => setSysStats(r.data))
      .catch(() => {});
  }, []);

  const m = metrics || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Real-Time Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live gateway metrics — 60s rolling window</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pulse-dot ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-400">{connected ? 'Live' : 'Reconnecting…'}</span>
        </div>
      </div>

      {/* Stat cards row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Requests / sec"
          value={m.requestsPerSecond ?? '0'}
          icon={Activity}
          color="blue"
          sub={`${m.requestsTotal ?? 0} total in window`}
        />
        <StatCard
          label="Avg Latency"
          value={m.avgLatencyMs?.toFixed(1) ?? '—'}
          unit="ms"
          icon={Clock}
          color="purple"
          sub={`P95: ${m.p95LatencyMs ?? '—'}ms · P99: ${m.p99LatencyMs ?? '—'}ms`}
        />
        <StatCard
          label="Error Rate"
          value={m.errorRate ?? '0'}
          unit="%"
          icon={AlertTriangle}
          color={m.errorRate > 10 ? 'red' : 'green'}
          sub={`${m.requestsError ?? 0} errors in window`}
        />
        <StatCard
          label="Rate Limit Hits"
          value={m.rateLimitHits ?? '0'}
          icon={Shield}
          color="yellow"
          sub={`${m.uniqueIPs ?? 0} unique IPs`}
        />
      </div>

      {/* Stat cards row 2 — system */}
      {sysStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Users"   value={sysStats.activeUsers}   icon={Users}      color="blue" />
          <StatCard label="Rate Policies"  value={sysStats.ratePolicies}  icon={TrendingUp} color="purple" />
          <StatCard label="Queue Depth"    value={sysStats.queueDepth}    icon={Server}     color="yellow" sub="Redis event queue" />
          <StatCard label="Uptime"         value={Math.floor(sysStats.uptime / 60)} unit="min" icon={Zap} color="green" />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LatencyChart data={metricsHistory} />
        <RequestsChart data={metricsHistory} />
      </div>

      <ErrorRateChart data={metricsHistory} />

      {/* Recent request log */}
      <div className="card">
        <p className="card-header">Recent Requests (live)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-2 pr-4 font-medium">Time</th>
                <th className="text-left py-2 pr-4 font-medium">Method</th>
                <th className="text-left py-2 pr-4 font-medium">Path</th>
                <th className="text-left py-2 pr-4 font-medium">Status</th>
                <th className="text-left py-2 pr-4 font-medium">Latency</th>
                <th className="text-left py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">
                    Waiting for requests…
                  </td>
                </tr>
              ) : (
                recentLogs.slice(0, 20).map((log, i) => (
                  <tr key={i} className="table-row">
                    <td className="py-2 pr-4 font-mono text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`badge ${
                        log.method === 'GET' ? 'badge-blue' :
                        log.method === 'POST' ? 'badge-green' :
                        log.method === 'DELETE' ? 'badge-red' : 'badge-gray'
                      }`}>{log.method}</span>
                    </td>
                    <td className="py-2 pr-4 font-mono text-gray-300 max-w-[180px] truncate">
                      {log.path}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`badge ${
                        log.statusCode < 300 ? 'badge-green' :
                        log.statusCode < 400 ? 'badge-yellow' : 'badge-red'
                      }`}>{log.statusCode}</span>
                    </td>
                    <td className="py-2 pr-4 font-mono text-gray-400">
                      {log.latencyMs?.toFixed(1)}ms
                    </td>
                    <td className="py-2 font-mono text-gray-500">{log.ip}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
