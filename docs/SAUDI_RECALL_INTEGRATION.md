# Saudi Recall Integration Guide

This guide explains how to integrate CarMemo with the official Saudi recall system at [recalls.sa](https://recalls.sa).

## Overview

CarMemo now supports real Saudi vehicle recall data through multiple integration methods:

1. **Official API** (if available from recalls.sa)
2. **Web Scraping** via server-side proxy
3. **AI Simulation** as fallback

## Current Implementation

### 1. Official Saudi Recall System Integration

The app now prioritizes the official Saudi recall system:

```typescript
// Primary source: recalls.sa
const officialRecalls = await SaudiRecallService.getRecallsFromOfficialSystem(vin, make, model);
```

### 2. Multi-Source Fallback System

```typescript
// 1. Try official recalls.sa API
// 2. Try web scraping via proxy
// 3. Try Ministry of Commerce (MOC)
// 4. Fall back to AI simulation
```

## Setup Instructions

### Step 1: Environment Configuration

Add these variables to your `.env.local`:

```env
# Official Saudi Recall System
SAUDI_RECALLS_API_KEY=your_recalls_sa_api_key_here
RECALLS_SA_API_URL=https://recalls.sa/api

# Alternative Saudi Government APIs
MOC_API_KEY=your_moc_api_key_here
SASO_API_KEY=your_saso_api_key_here
CUSTOMS_API_KEY=your_customs_api_key_here

# Fallback AI
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 2: Server-Side Proxy Setup (Recommended)

To avoid CORS issues and enable web scraping, set up a server-side proxy:

#### Option A: Express.js Server

Create a new file `server/recallsProxy.js`:

```javascript
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(express.json());

// Proxy endpoint for recalls.sa
app.post('/api/recalls-sa', async (req, res) => {
  try {
    const { vin, make, model, action } = req.body;
    
    if (action === 'search') {
      // Make request to recalls.sa
      const response = await axios.get('https://recalls.sa/search', {
        params: { vin, manufacturer: make, model },
        headers: {
          'User-Agent': 'CarMemo/1.0 (Saudi Vehicle Recall Service)'
        }
      });
      
      // Parse HTML response
      const $ = cheerio.load(response.data);
      const recalls = [];
      
      // Extract recall information from HTML
      $('.recall-item').each((index, element) => {
        recalls.push({
          title: $(element).find('.recall-title').text().trim(),
          description: $(element).find('.recall-description').text().trim(),
          manufacturer: $(element).find('.manufacturer').text().trim(),
          model: $(element).find('.model').text().trim(),
          category: $(element).find('.category').text().trim(),
          riskLevel: $(element).find('.risk-level').text().trim(),
          datePublished: $(element).find('.date-published').text().trim(),
          status: $(element).find('.status').text().trim()
        });
      });
      
      res.json({ recalls });
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch recalls' });
  }
});

app.listen(3001, () => {
  console.log('Recalls proxy server running on port 3001');
});
```

#### Option B: Vite Proxy Configuration

Update your `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api/recalls-sa': {
        target: 'https://recalls.sa',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/recalls-sa/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('User-Agent', 'CarMemo/1.0 (Saudi Vehicle Recall Service)');
          });
        }
      }
    }
  }
});
```

### Step 3: Testing the Integration

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test with a Saudi VIN:**
   - Open the app
   - Add a vehicle with a Saudi VIN
   - Check the browser console for integration logs

3. **Monitor the logs:**
   ```
   Checking official Saudi recall system (recalls.sa)...
   Found X recalls from official Saudi system
   ```

## API Documentation

### Saudi Recall Service Methods

```typescript
// Get recalls for a specific VIN
const recalls = await SaudiRecallManager.getAllSaudiRecalls(vin, make, model);

// Check if vehicle has active recalls
const hasRecalls = await SaudiRecallManager.hasActiveRecalls(vin);

// Get recall statistics
const stats = await SaudiRecallManager.getSaudiRecallStats();
```

### Configuration

```typescript
// Check available services
const services = getAvailableSaudiServices();
console.log(services); // ['Official Recalls (recalls.sa)', 'MOC', 'SASO']

// Check if any Saudi APIs are available
const hasAccess = hasSaudiAPIAccess();
```

## Data Sources Priority

1. **recalls.sa Official API** (highest priority)
2. **recalls.sa Web Scraping** (via proxy)
3. **Ministry of Commerce (MOC)**
4. **SASO (Saudi Standards)**
5. **AI Simulation** (fallback)

## Error Handling

The system gracefully handles:
- API unavailability
- Network errors
- CORS restrictions
- Invalid VINs
- Missing data

## Legal Considerations

1. **Terms of Service**: Review recalls.sa terms before scraping
2. **Rate Limiting**: Respect website rate limits
3. **Attribution**: Properly credit data sources
4. **Data Privacy**: Ensure compliance with Saudi data protection laws

## Troubleshooting

### Common Issues

1. **CORS Errors**: Use server-side proxy
2. **No Data Found**: Check VIN format and try make/model search
3. **API Errors**: Verify API keys and endpoints
4. **Network Issues**: Check internet connection and firewall settings

### Debug Mode

Enable debug logging:

```typescript
// In your environment
DEBUG_SAUDI_RECALLS=true
```

This will show detailed logs of the recall fetching process.

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live recall notifications
2. **Push Notifications**: Alert users when new recalls are found
3. **Recall History**: Track recall resolution status
4. **Multi-language Support**: Arabic and English recall descriptions
5. **Geolocation**: Location-based recall filtering

## Support

For issues with Saudi recall integration:
1. Check the browser console for error messages
2. Verify API keys and configuration
3. Test with known Saudi VINs
4. Contact the development team

---

**Note**: This integration is designed to work with the official Saudi recall system while providing fallback options for reliability and testing purposes. 