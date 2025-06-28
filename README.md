# CarMemo - Vehicle Maintenance Tracker

A comprehensive vehicle maintenance tracking application with separated backend and frontend architecture.

## 🏗️ Project Structure

```
carmemo/
├── 📁 docs/                    # Documentation
│   ├── 📄 README.md           # Documentation index
│   ├── 📄 VIN_LOOKUP_SETUP.md # VIN integration guide
│   ├── 📄 SAUDI_RECALL_INTEGRATION.md # Recall system docs
│   └── 📄 ...                 # Other documentation files
├── 📁 tests/                   # Testing
│   ├── 📄 README.md           # Test documentation
│   └── 📄 test-suite.js       # Automated test suite
├── 📁 backend/                 # Backend services and API
│   ├── 📁 services/           # Backend service files
│   ├── 📄 proxy-server.ts     # Main backend server
│   ├── 📄 package.json        # Backend dependencies
│   └── 📄 baselineMaintenance.json # Maintenance data
├── 📁 frontend/               # React frontend application
│   ├── 📁 components/         # React components
│   ├── 📁 hooks/             # Custom React hooks
│   ├── 📁 contexts/          # React contexts
│   ├── 📁 services/          # Frontend service files
│   ├── 📁 utils/             # Utility functions
│   ├── 📁 locales/           # Internationalization files
│   ├── 📄 App.tsx            # Main React app
│   ├── 📄 package.json       # Frontend dependencies
│   └── 📄 vite.config.ts     # Vite configuration
├── 📄 package.json           # Root package.json with workspace scripts
├── 📄 .gitignore             # Git ignore rules
└── 📄 README.md             # This file
```

## 📚 Documentation

### **📁 docs/** - Comprehensive Documentation
- **[Documentation Index](./docs/README.md)** - Complete documentation overview
- **[VIN Lookup Setup](./docs/VIN_LOOKUP_SETUP.md)** - VIN integration guide
- **[Saudi Recall Integration](./docs/SAUDI_RECALL_INTEGRATION.md)** - Recall system documentation
- **[Improvements Summary](./docs/IMPROVEMENTS_SUMMARY.md)** - Development progress and fixes
- **[Test Plan](./docs/TEST_PLAN.md)** - Testing strategy and procedures

### **🧪 tests/** - Testing Framework
- **[Test Documentation](./tests/README.md)** - How to run and extend tests
- **[Automated Test Suite](./tests/test-suite.js)** - Comprehensive testing framework

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd carmemo
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file in backend directory
   cd backend
   echo "API_NINJAS_KEY=your_api_key_here" > .env
   cd ..
   ```

4. **Start both backend and frontend**
   ```bash
   npm run dev
   ```

This will start:
- Backend server on `http://localhost:3001`
- Frontend development server on `http://localhost:5173`

## 📁 Available Scripts

### Root Level (from project root)
- `npm run dev` - Start both backend and frontend in development mode
- `npm run dev:backend` - Start only backend server
- `npm run dev:frontend` - Start only frontend development server
- `npm run build` - Build frontend for production
- `npm run install:all` - Install dependencies for all workspaces
- `npm run test:vin` - Test VIN lookup functionality

### Backend (from backend/ directory)
- `npm run dev` - Start backend server in development mode
- `npm start` - Start backend server in production mode
- `npm run test:vin` - Test VIN lookup functionality

### Frontend (from frontend/ directory)
- `npm run dev` - Start frontend development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔧 Development

### Backend Development
The backend is a Node.js Express server that provides:
- VIN lookup API endpoints
- Proxy services for external APIs
- Saudi recall data integration
- Local storage management

### Frontend Development
The frontend is a React application built with:
- TypeScript for type safety
- Vite for fast development
- Framer Motion for animations
- Tailwind CSS for styling
- Internationalization support (Arabic/English)

## 🌐 Features

- **Vehicle Management**: Add, edit, and delete vehicles
- **Maintenance Tracking**: Schedule and track maintenance tasks
- **VIN Decoding**: Automatic vehicle information from VIN
- **Recall Information**: Integration with NHTSA and Saudi recall databases
- **Multi-language Support**: English and Arabic interfaces
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Modern dark theme optimized for readability

## 🔒 Environment Variables

### Backend (.env file in backend/ directory)
```
API_NINJAS_KEY=your_api_ninjas_key_here
```

## 📦 Dependencies

### Backend Dependencies
- Express.js - Web server framework
- Axios - HTTP client
- CORS - Cross-origin resource sharing
- Dotenv - Environment variable management

### Frontend Dependencies
- React - UI library
- TypeScript - Type safety
- Vite - Build tool and dev server
- Framer Motion - Animation library
- Lucide React - Icon library
- Tailwind CSS - Utility-first CSS framework

## 🧪 Testing

### VIN Lookup Testing
```bash
npm run test:vin
```

This will test the VIN lookup functionality with sample VINs.

## 📝 API Documentation

### VIN Lookup Endpoint
- **URL**: `POST /api/vin-lookup`
- **Body**: `{ "vin": "1FM5K8D84KGB31890" }`
- **Response**: Vehicle data from API Ninjas

### Saudi Recall Endpoint
- **URL**: `POST /api/saudi-recalls`
- **Body**: `{ "vin": "1FM5K8D84KGB31890" }`
- **Response**: Saudi recall data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository.

---

**CarMemo** - Your vehicle maintenance companion 🚗✨
