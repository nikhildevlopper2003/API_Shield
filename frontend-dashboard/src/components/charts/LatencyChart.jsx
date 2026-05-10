import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2">{label}</p>
      {payload.map(({ name, value, color }) => (
        <p key={name} style={{ color }} className="font-mono">
          {name}: {typeof value === 'number' ? value.toFixed(2) : value}ms
        </p>
      ))}
    </div>
  );
};

export default function LatencyChart({ data = [] }) {
  return (
    <div className="card">
      <p className="card-header">Latency (ms) — Rolling 60s</p>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
          Waiting for data…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              unit="ms"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
            />
            <Line
              type="monotone" dataKey="avgLatencyMs" name="Avg"
              stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
            />
            <Line
              type="monotone" dataKey="p95LatencyMs" name="P95"
              stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
            />
            <Line
              type="monotone" dataKey="p99LatencyMs" name="P99"
              stroke="#f43f5e" strokeWidth={1.5} dot={false} strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
