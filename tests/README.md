# CarMemo Testing & Health Check System

This directory contains a comprehensive testing and monitoring system for the CarMemo application.

## 🚀 Quick Start

### Run All Tests
```bash
./tests/run-tests.sh
```

### Run Individual Tests
```bash
# Health check
./tests/health-check.sh

# API testing
./tests/api-test.sh

# Real-time monitoring
./tests/monitor-dashboard.sh
```

## 📋 Test Components

### 1. Health Check (`health-check.sh`)
Comprehensive health checks for all CarMemo services:
- ✅ Backend service status
- ✅ Frontend service status
- ✅ VIN decoding API functionality
- ✅ External API connectivity
- ✅ Environment configuration
- ✅ File system checks

**Usage:**
```bash
./tests/health-check.sh
```

### 2. API Test (`api-test.sh`)
Detailed API endpoint testing:
- ✅ Valid VIN decoding
- ✅ Invalid VIN handling
- ✅ Error response validation
- ✅ Performance testing
- ✅ Edge case testing
- ✅ CORS validation

**Usage:**
```bash
./tests/api-test.sh
```

### 3. Monitoring Dashboard (`monitor-dashboard.sh`)
Real-time monitoring with interactive dashboard:
- 📊 Live service status
- 📈 Performance metrics
- 🚨 Alert system
- 📝 Activity logs
- ⏱️ Response time tracking

**Usage:**
```bash
./tests/monitor-dashboard.sh
```

**Interactive Commands:**
- `h` - Show help
- `q` - Quit monitoring
- `r` - Refresh immediately
- `l` - Show full logs
- `s` - Show system info

### 4. Test Runner (`run-tests.sh`)
Complete test suite execution:
- 🔄 Runs all test components
- 📊 Generates comprehensive reports
- 🎯 Provides recommendations
- 📈 Success rate calculation

**Usage:**
```bash
./tests/run-tests.sh
```

## 🔧 Configuration

### Environment Setup
Ensure your services are running:
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Required Dependencies
```bash
# Install system dependencies
brew install jq bc  # macOS
# or
sudo apt-get install jq bc  # Ubuntu/Debian
```

### API Keys
Ensure your `.env` file contains:
```env
API_KEY=your_gemini_api_key
API_NINJAS_KEY=your_api_ninjas_key
```

## 📊 Test Results

### Health Check Results
- **Backend Health**: ✅/❌
- **Frontend Health**: ✅/❌
- **API Functionality**: ✅/❌
- **External APIs**: ✅/❌
- **Environment**: ✅/❌

### API Test Results
- **Valid VIN Tests**: X/Y passed
- **Invalid VIN Tests**: X/Y passed
- **Error Handling**: X/Y passed
- **Performance**: X/Y passed
- **Edge Cases**: X/Y passed

### Performance Metrics
- **Average Response Time**: X.Xs
- **Success Rate**: XX%
- **Uptime**: XX%

## 🚨 Alerting System

### Failure Thresholds
- Response time > 5 seconds
- Error rate > 10%
- Service unavailable > 2 minutes
- Consecutive failures > 3

### Alert Channels
- Console output with color coding
- Log files with timestamps
- GitHub Actions notifications
- Slack/Discord webhooks (configurable)

## 📈 Monitoring Dashboard

### Real-Time Metrics
```
🚗 CarMemo Real-Time Monitoring Dashboard
=============================================
📊 Current Status
==================================
Backend:     ✅
Frontend:    ✅
API:         ✅

📈 Statistics
==================================
Total Checks:     15
Backend Checks:   15
Frontend Checks:  15
API Checks:       15

📉 Failure Rates
==================================
Backend Uptime:   100.0%
Frontend Uptime:  100.0%
API Uptime:       100.0%

⏱️ Performance
==================================
Backend Response: 0.15s
Frontend Response: 0.08s
Monitor Uptime:   00:05:30
```

## 🔄 Continuous Integration

### GitHub Actions Workflow
Automated testing runs:
- Every 15 minutes (scheduled)
- On every push/PR
- Manual trigger available

**Workflow Jobs:**
1. **Health Check & Testing**
   - Service health validation
   - API endpoint testing
   - Linting and type checking

2. **Performance Testing**
   - Response time validation
   - Load testing
   - Performance metrics

3. **Security Check**
   - Dependency audit
   - Secret scanning
   - File permission checks

4. **Deployment Readiness**
   - Build validation
   - Production readiness check
   - Deployment summary

### Secrets Required
Set these in your GitHub repository:
- `GEMINI_API_KEY`: Your Google Gemini API key
- `API_NINJAS_KEY`: Your API Ninjas key
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications (optional)

## 📝 Logging

### Log Files
- `health-check-YYYYMMDD-HHMMSS.log`
- `api-test-YYYYMMDD-HHMMSS.log`
- `monitor-YYYYMMDD-HHMMSS.log`
- `test-report-YYYYMMDD-HHMMSS.md`

### Log Format
```
2024-01-15 14:30:25 - PASS: Backend health check
2024-01-15 14:30:26 - PASS: Frontend health check
2024-01-15 14:30:27 - FAIL: API health check
```

## 🎯 Best Practices

### Daily Operations
1. **Morning Check**: Run health check before starting work
2. **Continuous Monitoring**: Use dashboard during development
3. **Pre-Deployment**: Run full test suite
4. **Post-Deployment**: Verify all services are healthy

### Maintenance
1. **Weekly**: Review performance metrics
2. **Monthly**: Update test VINs and scenarios
3. **Quarterly**: Review and update alert thresholds

### Troubleshooting
1. **Service Down**: Check if backend/frontend are running
2. **API Failures**: Verify API keys and external service status
3. **Performance Issues**: Check system resources and network
4. **Test Failures**: Review logs for specific error details

## 🛠️ Customization

### Adding New Tests
1. Create new test script in `tests/` directory
2. Make it executable: `chmod +x tests/new-test.sh`
3. Add to `run-tests.sh` if needed
4. Update this README

### Modifying Test Scenarios
Edit the test scripts to:
- Add new VINs to test
- Modify performance thresholds
- Add new API endpoints
- Customize alert conditions

### Environment-Specific Config
Create environment-specific configurations:
```bash
# Development
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"

# Staging
BACKEND_URL="https://staging-api.carmemo.com"
FRONTEND_URL="https://staging.carmemo.com"

# Production
BACKEND_URL="https://api.carmemo.com"
FRONTEND_URL="https://carmemo.com"
```

## 📞 Support

### Common Issues
1. **Permission Denied**: Run `chmod +x tests/*.sh`
2. **Service Not Found**: Ensure backend/frontend are running
3. **API Key Errors**: Check `.env` file configuration
4. **Network Issues**: Verify internet connectivity

### Getting Help
1. Check the logs for detailed error messages
2. Review the health check plan in `health-check-plan.md`
3. Run individual tests to isolate issues
4. Check GitHub Actions for automated test results

## 🎉 Success Criteria

Your CarMemo application is considered healthy when:
- ✅ All health checks pass
- ✅ API tests show 100% success rate
- ✅ Performance meets targets (< 2s response time)
- ✅ No security vulnerabilities detected
- ✅ Build process completes successfully
- ✅ All services are responsive and functional

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Maintainer**: CarMemo Development Team