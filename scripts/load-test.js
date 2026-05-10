#!/usr/bin/env node
/**
 * APIShield Pro — Load Testing Script
 * Uses autocannon for HTTP benchmarking
 *
 * Usage:
 *   npm install -g autocannon
 *   API_KEY=ask_your_key node scripts/load-test.js
 *
 * Options (env vars):
 *   GATEWAY_URL   - Target (default: http://localhost:3000)
 *   API_KEY       - API key to use
 *   CONNECTIONS   - Concurrent connections (default: 10)
 *   DURATION      - Test duration in seconds (default: 30)
 *   PIPELINING    - HTTP pipelining factor (default: 1)
 */

const autocannon = require('autocannon');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const API_KEY     = process.env.API_KEY || 'ask_your_api_key_here';
const CONNECTIONS = parseInt(process.env.CONNECTIONS || '10');
const DURATION    = parseInt(process.env.DURATION || '30');
const PIPELINING  = parseInt(process.env.PIPELINING || '1');

if (!API_KEY || API_KEY === 'ask_your_api_key_here') {
  console.error('❌ Set API_KEY environment variable first.');
  console.error('   Run: npm run seed   to generate keys.');
  process.exit(1);
}

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║    APIShield Pro — Load Test Runner      ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');
console.log(`Target:      ${GATEWAY_URL}`);
console.log(`Connections: ${CONNECTIONS}`);
console.log(`Duration:    ${DURATION}s`);
console.log(`API Key:     ${API_KEY.slice(0, 16)}...`);
console.log('');

async function runTest(label, url, method = 'GET', body = null) {
  console.log(`\n▶ Running: ${label}`);

  const opts = {
    url,
    method,
    connections: CONNECTIONS,
    duration: DURATION,
    pipelining: PIPELINING,
    headers: {
      'x-api-key': API_KEY,
      'content-type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  return new Promise((resolve, reject) => {
    const instance = autocannon(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    autocannon.track(instance, { renderProgressBar: true });
  });
}

function printResult(label, result) {
  console.log('');
  console.log(`📊 Results: ${label}`);
  console.log('─'.repeat(50));
  console.log(`  Requests/sec:  ${result.requests.mean.toFixed(1)} avg  (${result.requests.max} max)`);
  console.log(`  Throughput:    ${(result.throughput.mean / 1024).toFixed(1)} KB/s`);
  console.log(`  Latency avg:   ${result.latency.mean.toFixed(2)} ms`);
  console.log(`  Latency P95:   ${result.latency.p97_5.toFixed(2)} ms`);
  console.log(`  Latency P99:   ${result.latency.p99.toFixed(2)} ms`);
  console.log(`  Latency max:   ${result.latency.max.toFixed(2)} ms`);
  console.log(`  2xx:           ${result['2xx']}`);
  console.log(`  Non-2xx:       ${result.non2xx}`);
  console.log(`  Errors:        ${result.errors}`);
  console.log(`  Timeouts:      ${result.timeouts}`);
  console.log('');
}

async function main() {
  const results = [];

  // Test 1: Ping (auth + blockCheck + rateLimit pipeline)
  try {
    const r = await runTest('Gateway Ping', `${GATEWAY_URL}/gateway/ping`);
    printResult('Gateway Ping', r);
    results.push({ label: 'Gateway Ping', ...r });
  } catch (e) {
    console.error('Ping test failed:', e.message);
  }

  // Test 2: Proxy/echo endpoint
  try {
    const r = await runTest('Gateway Proxy', `${GATEWAY_URL}/gateway/proxy`);
    printResult('Gateway Proxy', r);
    results.push({ label: 'Gateway Proxy', ...r });
  } catch (e) {
    console.error('Proxy test failed:', e.message);
  }

  // Test 3: No auth (should get 401s fast)
  try {
    const noAuthInstance = autocannon({
      url: `${GATEWAY_URL}/gateway/ping`,
      connections: CONNECTIONS,
      duration: 10,
      headers: {},
    });
    autocannon.track(noAuthInstance, { renderProgressBar: true });
    const r = await new Promise((res, rej) => noAuthInstance.on('done', res).on('error', rej));
    console.log(`\n▶ No-auth test: ${r.non2xx} non-2xx (expected 401s)`);
  } catch (e) {
    // ignore
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║             SUMMARY                      ║');
  console.log('╚══════════════════════════════════════════╝');
  results.forEach(r => {
    console.log(`  ${r.label.padEnd(25)} ${r.requests.mean.toFixed(1).padStart(8)} req/s   P99: ${r.latency.p99.toFixed(1)}ms`);
  });
  console.log('');
}

main().catch(err => {
  console.error('Load test error:', err);
  process.exit(1);
});
