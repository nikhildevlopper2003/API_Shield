import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/ui/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ApiKeys from './pages/ApiKeys.jsx';
import BlockedIPs from './pages/BlockedIPs.jsx';
import AbuseLogs from './pages/AbuseLogs.jsx';
import RatePolicies from './pages/RatePolicies.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>

        {/* Default */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Core Pages */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/api-keys" element={<ApiKeys />} />
        <Route path="/blocked-ips" element={<BlockedIPs />} />
        <Route path="/abuse-logs" element={<AbuseLogs />} />
        <Route path="/rate-policies" element={<RatePolicies />} />

        {/* 🔥 NEW: Fallback (prevents blank screen on bad route) */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Route>
    </Routes>
  );
}