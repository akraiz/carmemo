#!/usr/bin/env node

/**
 * CarMemo Comprehensive Test Suite
 * Automated testing for the car maintenance application
 */

const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  frontendUrl: 'http://localhost:5173',
  backendUrl: 'http://localhost:3001',
  testTimeout: 10000,
  retryAttempts: 3
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  details: []
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'     // Reset
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retry = async (fn, attempts = CONFIG.retryAttempts) => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
};

// Test runner
class TestRunner {
  constructor() {
    this.currentTest = '';
  }

  async runTest(name, testFn) {
    this.currentTest = name;
    testResults.total++;
    
    try {
      log(`🧪 Running: ${name}`, 'info');
      await testFn();
      testResults.passed++;
      log(`✅ PASSED: ${name}`, 'success');
      testResults.details.push({ name, status: 'PASSED', error: null });
    } catch (error) {
      testResults.failed++;
      log(`❌ FAILED: ${name} - ${error.message}`, 'error');
      testResults.details.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async runTestSuite(name, tests) {
    log(`\n📋 Starting Test Suite: ${name}`, 'info');
    for (const [testName, testFn] of Object.entries(tests)) {
      await this.runTest(`${name} - ${testName}`, testFn);
    }
  }
}

// API Tests
const apiTests = {
  async 'Backend Health Check'() {
    const response = await retry(async () => {
      const res = await axios.get(`${CONFIG.backendUrl}/api/vin-lookup`, {
        timeout: CONFIG.testTimeout,
        validateStatus: () => true // Accept any status code
      });
      return res;
    });
    
    if (response.status === 404) {
      // 404 is expected for GET request to POST endpoint
      return;
    }
    
    if (response.status >= 500) {
      throw new Error(`Backend server error: ${response.status}`);
    }
  },

  async 'VIN Lookup API'() {
    const testVin = '1HGBH41JXMN109186';
    const response = await retry(async () => {
      return await axios.post(`${CONFIG.backendUrl}/api/vin-lookup`, {
        vin: testVin
      }, {
        timeout: CONFIG.testTimeout
      });
    });

    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid response format');
    }

    if (!response.data.vin) {
      throw new Error('VIN not returned in response');
    }
  },

  async 'VIN Lookup Validation'() {
    const invalidVins = ['', '123', '123456789012345678'];
    
    for (const vin of invalidVins) {
      try {
        await axios.post(`${CONFIG.backendUrl}/api/vin-lookup`, {
          vin: vin
        }, {
          timeout: CONFIG.testTimeout
        });
        throw new Error(`Expected error for invalid VIN: ${vin}`);
      } catch (error) {
        if (error.response && error.response.status === 400) {
          // Expected validation error
          continue;
        }
        throw error;
      }
    }
  },

  async 'Maintenance Schedule API'() {
    const testVin = '1HGBH41JXMN109186';
    const response = await retry(async () => {
      return await axios.post(`${CONFIG.backendUrl}/api/maintenance-schedule`, {
        vin: testVin
      }, {
        timeout: CONFIG.testTimeout
      });
    });

    if (!response.data) {
      throw new Error('No response data received');
    }
  },

  async 'Baseline Schedule Enrichment'() {
    const testData = {
      make: 'Toyota',
      model: 'Camry',
      year: 2020
    };
    
    const response = await retry(async () => {
      return await axios.post(`${CONFIG.backendUrl}/api/enrich-baseline`, testData, {
        timeout: CONFIG.testTimeout
      });
    });

    if (!response.data || !response.data.schedule) {
      throw new Error('Invalid baseline schedule response');
    }
  }
};

// Frontend Tests
const frontendTests = {
  async 'Frontend Accessibility'() {
    const response = await retry(async () => {
      return await axios.get(CONFIG.frontendUrl, {
        timeout: CONFIG.testTimeout
      });
    });

    if (response.status !== 200) {
      throw new Error(`Frontend returned status ${response.status}`);
    }

    const html = response.data;
    
    // Basic HTML structure checks
    if (!html.includes('<!DOCTYPE html>')) {
      throw new Error('Missing DOCTYPE declaration');
    }
    
    if (!html.includes('<html')) {
      throw new Error('Missing HTML tag');
    }
    
    if (!html.includes('<head>')) {
      throw new Error('Missing head section');
    }
    
    if (!html.includes('<body>')) {
      throw new Error('Missing body section');
    }
  },

  async 'Frontend Assets Loading'() {
    const response = await retry(async () => {
      return await axios.get(`${CONFIG.frontendUrl}/assets/index-BSnXxQKl.js`, {
        timeout: CONFIG.testTimeout
      });
    });

    if (response.status !== 200) {
      throw new Error('Frontend JavaScript bundle not accessible');
    }
  }
};

// Build Tests
const buildTests = {
  async 'TypeScript Compilation'() {
    return new Promise((resolve, reject) => {
      exec('cd frontend && npx tsc --noEmit', (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`TypeScript compilation failed: ${stderr}`));
        } else {
          resolve();
        }
      });
    });
  },

  async 'ESLint Validation'() {
    return new Promise((resolve, reject) => {
      exec('cd frontend && npm run lint', (error, stdout, stderr) => {
        if (error) {
          // Count errors and warnings
          const lines = stdout.split('\n');
          const errorCount = lines.filter(line => line.includes('error')).length;
          const warningCount = lines.filter(line => line.includes('warning')).length;
          
          if (errorCount > 0) {
            reject(new Error(`ESLint found ${errorCount} errors and ${warningCount} warnings`));
          } else {
            resolve();
          }
        } else {
          resolve();
        }
      });
    });
  },

  async 'Production Build'() {
    return new Promise((resolve, reject) => {
      exec('cd frontend && npm run build', (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Build failed: ${stderr}`));
        } else {
          // Check if dist folder was created
          const distPath = path.join(__dirname, 'frontend', 'dist');
          if (!fs.existsSync(distPath)) {
            reject(new Error('Dist folder not created after build'));
          } else {
            resolve();
          }
        }
      });
    });
  }
};

// File System Tests
const fileSystemTests = {
  async 'Required Files Exist'() {
    const requiredFiles = [
      'frontend/package.json',
      'frontend/tsconfig.json',
      'frontend/vite.config.ts',
      'frontend/App.tsx',
      'frontend/types.ts',
      'backend/package.json',
      'backend/proxy-server.ts',
      'backend/types.ts',
      'README.md'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
  },

  async 'Configuration Files Valid'() {
    // Test package.json files
    const frontendPkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
    const backendPkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));

    if (!frontendPkg.name || !backendPkg.name) {
      throw new Error('Package.json files missing name field');
    }

    if (!frontendPkg.scripts || !backendPkg.scripts) {
      throw new Error('Package.json files missing scripts section');
    }
  }
};

// Performance Tests
const performanceTests = {
  async 'Backend Response Time'() {
    const startTime = Date.now();
    
    await retry(async () => {
      await axios.post(`${CONFIG.backendUrl}/api/vin-lookup`, {
        vin: '1HGBH41JXMN109186'
      }, {
        timeout: CONFIG.testTimeout
      });
    });

    const responseTime = Date.now() - startTime;
    
    if (responseTime > 5000) {
      throw new Error(`Backend response too slow: ${responseTime}ms`);
    }
  },

  async 'Frontend Load Time'() {
    const startTime = Date.now();
    
    await retry(async () => {
      await axios.get(CONFIG.frontendUrl, {
        timeout: CONFIG.testTimeout
      });
    });

    const loadTime = Date.now() - startTime;
    
    if (loadTime > 3000) {
      throw new Error(`Frontend load too slow: ${loadTime}ms`);
    }
  }
};

// Main test execution
async function runAllTests() {
  const runner = new TestRunner();
  
  log('🚀 Starting CarMemo Comprehensive Test Suite', 'info');
  log(`Frontend URL: ${CONFIG.frontendUrl}`, 'info');
  log(`Backend URL: ${CONFIG.backendUrl}`, 'info');
  
  try {
    // Run test suites
    await runner.runTestSuite('File System', fileSystemTests);
    await runner.runTestSuite('Build Process', buildTests);
    await runner.runTestSuite('Backend API', apiTests);
    await runner.runTestSuite('Frontend', frontendTests);
    await runner.runTestSuite('Performance', performanceTests);
    
    // Generate test report
    generateTestReport();
    
  } catch (error) {
    log(`💥 Test suite execution failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

function generateTestReport() {
  log('\n📊 Test Results Summary', 'info');
  log('='.repeat(50), 'info');
  log(`Total Tests: ${testResults.total}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  log(`Skipped: ${testResults.skipped}`, 'warning');
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'success' : 'warning');
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', 'error');
    testResults.details
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        log(`  - ${test.name}: ${test.error}`, 'error');
      });
  }
  
  log('\n📋 Detailed Results:', 'info');
  testResults.details.forEach(test => {
    const status = test.status === 'PASSED' ? '✅' : '❌';
    log(`${status} ${test.name}`, test.status === 'PASSED' ? 'success' : 'error');
  });
  
  // Save detailed report to file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      successRate: parseFloat(successRate)
    },
    details: testResults.details
  };
  
  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  log('\n📄 Detailed report saved to: test-report.json', 'info');
  
  // Exit with appropriate code
  if (testResults.failed > 0) {
    log('\n💥 Some tests failed!', 'error');
    process.exit(1);
  } else {
    log('\n🎉 All tests passed!', 'success');
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`💥 Test suite failed to start: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  TestRunner,
  runAllTests,
  testResults
}; 