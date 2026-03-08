/**
 * ============================================
 * API-TRACK STRESS TEST
 * Tests server capacity for 50+ concurrent users
 * ============================================
 * 
 * Usage: node tests/stress-test.js
 * 
 * Options (via environment variables):
 *   CONCURRENT_USERS=50   Number of simulated users
 *   REQUESTS_PER_USER=10  Requests each user makes
 *   BASE_URL=http://localhost:5000
 */

const http = require('http');
const https = require('https');

// Configuration
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 50,
  requestsPerUser: parseInt(process.env.REQUESTS_PER_USER) || 10,
  endpoints: [
    { method: 'GET', path: '/api/health' },
    { method: 'GET', path: '/api/metrics' },
    { method: 'GET', path: '/api/bobines' },
    { method: 'GET', path: '/api/lots' },
    { method: 'GET', path: '/api/tubes' },
    { method: 'GET', path: '/api/grades' },
    { method: 'GET', path: '/api/nuances' },
    { method: 'GET', path: '/api/fournisseurs' },
    { method: 'GET', path: '/api/dashboard/stats' },
  ]
};

// Results tracking
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  errors: [],
  statusCodes: {},
  startTime: null,
  endTime: null,
};

/**
 * Make a single HTTP request
 */
function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.path, config.baseUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    const start = Date.now();
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: endpoint.method,
      headers: {
        'x-user-id': '1',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };
    
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          duration,
          endpoint: endpoint.path,
          error: null,
        });
      });
    });
    
    req.on('error', (error) => {
      const duration = Date.now() - start;
      resolve({
        success: false,
        statusCode: 0,
        duration,
        endpoint: endpoint.path,
        error: error.message,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        statusCode: 0,
        duration: 30000,
        endpoint: endpoint.path,
        error: 'Request timeout',
      });
    });
    
    req.end();
  });
}

/**
 * Simulate a single user making multiple requests
 */
async function simulateUser(userId) {
  const userResults = [];
  
  for (let i = 0; i < config.requestsPerUser; i++) {
    // Pick a random endpoint
    const endpoint = config.endpoints[Math.floor(Math.random() * config.endpoints.length)];
    const result = await makeRequest(endpoint);
    userResults.push(result);
    
    // Small random delay between requests (50-200ms)
    await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
  }
  
  return userResults;
}

/**
 * Run the stress test
 */
async function runStressTest() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           🧪 API-TRACK STRESS TEST                         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║   📊 Concurrent Users:    ${String(config.concurrentUsers).padEnd(5)}                          ║`);
  console.log(`║   📨 Requests per User:   ${String(config.requestsPerUser).padEnd(5)}                          ║`);
  console.log(`║   📝 Total Requests:      ${String(config.concurrentUsers * config.requestsPerUser).padEnd(5)}                          ║`);
  console.log(`║   🎯 Target URL:          ${config.baseUrl.padEnd(25)}    ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n⏳ Starting stress test...\n');
  
  results.startTime = Date.now();
  
  // Create user promises
  const userPromises = [];
  for (let i = 0; i < config.concurrentUsers; i++) {
    userPromises.push(simulateUser(i + 1));
  }
  
  // Progress tracking
  let completedUsers = 0;
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - results.startTime) / 1000;
    const progress = Math.round((results.totalRequests / (config.concurrentUsers * config.requestsPerUser)) * 100);
    process.stdout.write(`\r   🔄 Progress: ${progress}% | Requests: ${results.totalRequests} | Elapsed: ${elapsed.toFixed(1)}s`);
  }, 500);
  
  // Track results as they come in
  const allResults = await Promise.all(
    userPromises.map(async (promise, index) => {
      const userResults = await promise;
      completedUsers++;
      
      userResults.forEach((result) => {
        results.totalRequests++;
        
        if (result.success) {
          results.successfulRequests++;
        } else {
          results.failedRequests++;
          if (result.error) {
            results.errors.push({ endpoint: result.endpoint, error: result.error });
          }
        }
        
        results.totalResponseTime += result.duration;
        results.minResponseTime = Math.min(results.minResponseTime, result.duration);
        results.maxResponseTime = Math.max(results.maxResponseTime, result.duration);
        
        results.statusCodes[result.statusCode] = (results.statusCodes[result.statusCode] || 0) + 1;
      });
      
      return userResults;
    })
  );
  
  clearInterval(progressInterval);
  results.endTime = Date.now();
  
  // Print results
  printResults();
}

/**
 * Print test results
 */
function printResults() {
  const totalTime = (results.endTime - results.startTime) / 1000;
  const avgResponseTime = results.totalResponseTime / results.totalRequests;
  const requestsPerSecond = results.totalRequests / totalTime;
  const successRate = (results.successfulRequests / results.totalRequests) * 100;
  
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 TEST RESULTS                         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║   ⏱️  Total Time:          ${totalTime.toFixed(2)}s                           ║`);
  console.log(`║   📨 Total Requests:      ${results.totalRequests}                             ║`);
  console.log(`║   ✅ Successful:          ${results.successfulRequests}                             ║`);
  console.log(`║   ❌ Failed:              ${results.failedRequests}                              ║`);
  console.log(`║   📈 Success Rate:        ${successRate.toFixed(1)}%                          ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║                  ⚡ PERFORMANCE METRICS                    ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║   🚀 Requests/Second:     ${requestsPerSecond.toFixed(1)}                            ║`);
  console.log(`║   ⏱️  Avg Response Time:   ${avgResponseTime.toFixed(0)}ms                           ║`);
  console.log(`║   🐢 Min Response Time:   ${results.minResponseTime}ms                            ║`);
  console.log(`║   🐌 Max Response Time:   ${results.maxResponseTime}ms                           ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║                  📋 STATUS CODES                           ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  
  Object.entries(results.statusCodes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([code, count]) => {
      const emoji = code >= 200 && code < 300 ? '✅' : code >= 400 ? '❌' : '⚠️';
      console.log(`║   ${emoji} HTTP ${code}:            ${String(count).padEnd(5)}                          ║`);
    });
  
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Verdict
  console.log('\n');
  if (successRate >= 99 && avgResponseTime < 500) {
    console.log('✅ VERDICT: EXCELLENT - Server handles 50+ users smoothly!');
  } else if (successRate >= 95 && avgResponseTime < 1000) {
    console.log('🟢 VERDICT: GOOD - Server performs well under load.');
  } else if (successRate >= 90) {
    console.log('🟡 VERDICT: ACCEPTABLE - Minor issues under heavy load.');
  } else {
    console.log('🔴 VERDICT: NEEDS IMPROVEMENT - Server struggles under load.');
  }
  
  // Print errors if any
  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    const uniqueErrors = [...new Set(results.errors.map(e => `${e.endpoint}: ${e.error}`))];
    uniqueErrors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    if (uniqueErrors.length > 10) {
      console.log(`   ... and ${uniqueErrors.length - 10} more errors`);
    }
  }
  
  console.log('\n');
}

// Run the test
runStressTest().catch(console.error);
