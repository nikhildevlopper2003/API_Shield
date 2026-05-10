import axios from 'axios';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000';
const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || '';

const gatewayApi = axios.create({
  baseURL: GATEWAY_URL,
  headers: { 'x-api-key': ADMIN_KEY },
});

const analyticsApi = axios.create({
  baseURL: ANALYTICS_URL,
});

// ── Users ──────────────────────────────────────────────────────────────────────
export const getUsers = (params) =>
  gatewayApi.get('/admin/users', { params }).then(r => r.data);

export const createUser = (data) =>
  gatewayApi.post('/admin/users', data).then(r => r.data);

export const updateUser = (id, data) =>
  gatewayApi.put(`/admin/users/${id}`, data).then(r => r.data);

export const deleteUser = (id) =>
  gatewayApi.delete(`/admin/users/${id}`).then(r => r.data);

export const regenerateKey = (id) =>
  gatewayApi.post(`/admin/users/${id}/regenerate-key`).then(r => r.data);

// ── Rate Policies ──────────────────────────────────────────────────────────────
export const getPolicies = () =>
  gatewayApi.get('/admin/policies').then(r => r.data);

export const createPolicy = (data) =>
  gatewayApi.post('/admin/policies', data).then(r => r.data);

export const updatePolicy = (id, data) =>
  gatewayApi.put(`/admin/policies/${id}`, data).then(r => r.data);

export const deletePolicy = (id) =>
  gatewayApi.delete(`/admin/policies/${id}`).then(r => r.data);

// ── Blocked IPs ────────────────────────────────────────────────────────────────
export const getBlockedIPs = (params) =>
  gatewayApi.get('/admin/blocked-ips', { params }).then(r => r.data);

export const blockIP = (data) =>
  gatewayApi.post('/admin/blocked-ips', data).then(r => r.data);

export const unblockIP = (ip) =>
  gatewayApi.delete(`/admin/blocked-ips/${ip}`).then(r => r.data);

// 🔥 THIS IS THE ONLY MISSING FUNCTION
export const unblockAllIPs = () =>
  gatewayApi.delete('/admin/blocked-ips').then(r => r.data);

// ── Analytics ──────────────────────────────────────────────────────────────────
export const getLiveMetrics = () =>
  analyticsApi.get('/metrics/live').then(r => r.data);

export const getMetricsHistory = (params) =>
  analyticsApi.get('/metrics/history', { params }).then(r => r.data);

export const getLogs = (params) =>
  analyticsApi.get('/logs', { params }).then(r => r.data);

export const getAbuseLogs = (params) =>
  analyticsApi.get('/logs/abuse', { params }).then(r => r.data);

// ── System ─────────────────────────────────────────────────────────────────────
export const getSystemStats = () =>
  gatewayApi.get('/admin/stats').then(r => r.data);

export const getHealth = () =>
  gatewayApi.get('/health').then(r => r.data);