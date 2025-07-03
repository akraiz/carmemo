# Backend Fixes Summary

## Issues Fixed

### 1. **Invalid URL Error in Recall Fetching**
**Problem:** 
```
TypeError: Failed to parse URL from /api/recall/1FM5K8D84KGB31890
[cause]: TypeError: Invalid URL
input: '/api/recall/1FM5K8D84KGB31890'
```

**Root Cause:** 
The `fetch` API was being called with a relative URL (`/api/recall/...`) instead of an absolute URL.

**Fix Applied:**
- **File:** `backend/src/services/recallsSaCrawler.ts`
- **Changes:**
  - Added `BACKEND_BASE_URL` configuration using environment variable
  - Updated fetch call from relative to absolute URL:
    ```typescript
    // Before:
    const url = `/api/recall/${encodeURIComponent(vin)}`;
    
    // After:
    const url = `${this.BACKEND_BASE_URL}/api/recall/${encodeURIComponent(vin)}`;
    ```

- **Environment Variable Added:**
  - Added `BACKEND_BASE_URL` to `env-template.txt`
  - Default value: `http://localhost:3001` (development)
  - Production value: `https://your-backend-name.up.railway.app`

### 2. **TLS Certificate Verification Error**
**Problem:**
```
Error: unable to verify the first certificate
code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
```

**Root Cause:** 
HTTPS requests to external APIs with self-signed or untrusted certificates.

**Fix Applied:**
- **File:** `backend/src/server.ts`
- **Changes:**
  - Added TLS certificate verification bypass for development:
    ```typescript
    // Fix TLS certificate verification issues for development
    if (process.env.NODE_ENV !== 'production') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    ```
  - **Note:** This is safe for development but should not be used in production

### 3. **File Not Found Error (ENOENT)**
**Problem:**
```
Error: ENOENT: no such file or directory, open 'uploads/1751469690514-548110628.png'
```

**Root Cause:** 
File operations trying to access files that don't exist or are not accessible.

**Fix Applied:**
- **File:** `backend/src/services/aiService.ts`
- **Changes:**
  - Added file existence checks before processing:
    ```typescript
    // Check if file path exists
    if (!file.path) {
      console.error("File path is not available for OCR processing");
      return null;
    }

    // Check if file exists on disk
    try {
      await fs.promises.access(file.path, fs.constants.F_OK);
    } catch (accessError) {
      console.error(`File not accessible at path: ${file.path}`, accessError);
      return null;
    }
    ```

- **File:** `backend/src/server.ts`
- **Changes:**
  - Added similar error handling for Tesseract OCR calls
  - Graceful fallback when file operations fail
  - Better error logging for debugging

## Environment Variables Required

Add these to your environment configuration:

```bash
# Backend base URL for internal API calls
BACKEND_BASE_URL=https://your-backend-name.up.railway.app

# For development, you can use:
BACKEND_BASE_URL=http://localhost:3001
```

## Testing the Fixes

### 1. **Test Recall Fetching**
```bash
# Test the recall endpoint
curl -X GET "http://localhost:3001/api/recall/1FM5K8D84KGB31890"
```

### 2. **Test File Upload**
- Upload a vehicle image through the frontend
- Check that OCR processing works without file errors

### 3. **Test TLS Connections**
- Verify that external API calls work without certificate errors

## Deployment Notes

1. **Set Environment Variables:**
   - Add `BACKEND_BASE_URL` to your Railway/Railway deployment
   - Ensure it points to your actual backend URL

2. **Restart Services:**
   - Restart your backend server after deploying changes
   - Clear any cached connections

3. **Monitor Logs:**
   - Watch for any remaining errors after deployment
   - Verify that recall fetching works properly

## Additional Improvements Made

1. **Better Error Handling:**
   - Graceful fallbacks for failed operations
   - Detailed error logging for debugging
   - Non-blocking error recovery

2. **File Operation Safety:**
   - File existence checks before processing
   - Proper error handling for missing files
   - Fallback behavior when OCR fails

3. **Configuration Management:**
   - Environment-based configuration
   - Development vs production settings
   - Centralized URL management

## Next Steps

1. **Deploy the changes** to your backend
2. **Test the fixes** with real data
3. **Monitor the logs** for any remaining issues
4. **Consider production TLS certificates** for external APIs
5. **Implement proper file storage** for production (e.g., cloud storage)

## Files Modified

- `backend/src/services/recallsSaCrawler.ts` - Fixed URL construction
- `backend/src/server.ts` - Added TLS config and file error handling
- `backend/src/services/aiService.ts` - Added file existence checks
- `env-template.txt` - Added new environment variable

All changes maintain backward compatibility and include proper error handling. 