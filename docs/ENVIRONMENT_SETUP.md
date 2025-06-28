# 🔧 Environment Setup Guide

## Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# Server Configuration
PORT=3001

# Required API Keys
API_KEY=your_gemini_api_key_here
API_NINJAS_KEY=your_api_ninjas_key_here

# Optional Saudi Government APIs (for enhanced recall data)
SAUDI_RECALLS_API_KEY=your_saudi_recalls_api_key_here
SASO_API_KEY=your_saso_api_key_here
MOC_API_KEY=your_moc_api_key_here
CUSTOMS_API_KEY=your_customs_api_key_here

# API Base URLs (optional - defaults provided)
RECALLS_SA_API_URL=https://recalls.sa/api
SASO_API_URL=https://www.saso.gov.sa/api
MOC_API_URL=https://moc.gov.sa/api
CUSTOMS_API_URL=https://customs.gov.sa/api

# Development Settings
NODE_ENV=development
```

## Required API Keys

### 1. Gemini AI API Key (`API_KEY`)
- **Purpose**: AI-powered VIN decoding and receipt OCR
- **Get it**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Required**: Yes (for AI features)

### 2. API Ninjas Key (`API_NINJAS_KEY`)
- **Purpose**: VIN lookup service
- **Get it**: [API Ninjas](https://api-ninjas.com/)
- **Required**: Yes (for VIN decoding)

## Optional API Keys

### Saudi Government APIs
These are optional and only needed for enhanced Saudi recall data:

- `SAUDI_RECALLS_API_KEY` - Saudi recalls database
- `SASO_API_KEY` - Saudi Standards Organization
- `MOC_API_KEY` - Ministry of Commerce
- `CUSTOMS_API_KEY` - Saudi Customs

## Setup Instructions

1. **Create the .env file**:
   ```bash
   cd backend
   cp .env.example .env  # if .env.example exists
   # or create .env manually
   ```

2. **Add your API keys**:
   ```bash
   nano .env  # or use your preferred editor
   ```

3. **Restart the backend server**:
   ```bash
   npm run dev
   ```

## Verification

After setting up the environment variables, you should see:
```
✅ Gemini AI service initialized successfully
```

Instead of:
```
⚠️ API_KEY environment variable is not a string. Gemini AI features will be disabled.
```

## Security Notes

- **Never commit `.env` files** to version control
- **Use different keys** for development and production
- **Rotate keys regularly** for security
- **The `.env` file is already in `.gitignore`**

## Troubleshooting

### "API_KEY is undefined"
- Check that the `.env` file exists in the `backend/` directory
- Verify the variable name is exactly `API_KEY` (not `GEMINI_API_KEY`)
- Restart the backend server after making changes

### "API_NINJAS_KEY is undefined"
- Add your API Ninjas key to the `.env` file
- Restart the backend server

### Frontend can't connect to backend
- Ensure backend is running on port 3001
- Check that CORS is properly configured
- Verify the frontend is making requests to the correct URL

---

**Last Updated**: June 19, 2025 