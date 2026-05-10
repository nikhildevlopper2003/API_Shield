import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ label, value, unit = '', sub, trend, icon: Icon, color = 'blue' }) {
  const colorMap = {
    blue:    { icon: 'text-blue-400',    bg: 'bg-blue-900/30',    border: 'border-blue-800/50' },
    green:   { icon: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-800/50' },
    red:     { icon: 'text-red-400',     bg: 'bg-red-900/30',     border: 'border-red-800/50' },
    yellow:  { icon: 'text-yellow-400',  bg: 'bg-yellow-900/30',  border: 'border-yellow-800/50' },
    purple:  { icon: 'text-purple-400',  bg: 'bg-purple-900/30',  border: 'border-purple-800/50' },
  };
  const c = colorMap[color] || colorMap.blue;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-gray-500';

  return (
    <div className="card animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <p className="card-header mb-0">{label}</p>
        {Icon && (
          <div className={`p-2 rounded-lg ${c.bg} border ${c.border}`}>
            <Icon size={16} className={c.icon} />
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="stat-value">{value ?? '—'}</span>
        {unit && <span className="text-sm text-gray-400 mb-1">{unit}</span>}
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 mb-1 ${trendColor}`}>
            <TrendIcon size={13} />
            <span className="text-xs font-medium">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      {sub && <p className="text-xs text-gray-500 mt-1.5">{sub}</p>}
    </div>
  );
}
