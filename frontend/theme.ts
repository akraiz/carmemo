import { createTheme, alpha } from '@mui/material/styles';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FFD02F', // Brand Yellow
      light: '#FFD54F',
      dark: '#F57F17',
      contrastText: '#121212', // Dark Surface for contrast
    },
    secondary: {
      main: '#4F378B', // M3 deep purple
      light: '#7C4DFF',
      dark: '#311B92',
      contrastText: '#ffffff',
    },
    background: {
      default: '#121212', // Dark Surface
      paper: '#1E1E1E', // Neutral Gray
    },
    error: {
      main: '#E74C3C', // Red for delete actions
      light: '#F44336',
      dark: '#D32F2F',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#F9A825',
      light: '#FFB74D',
      dark: '#F57C00',
      contrastText: '#121212',
    },
    info: {
      main: '#2196F3',
      light: '#64B5F6',
      dark: '#1976D2',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2ECC71', // Green for complete actions
      light: '#81C784',
      dark: '#388E3C',
      contrastText: '#ffffff',
    },
    text: {
      primary: '#FFFFFF', // White
      secondary: '#888888', // Lighter gray for de-emphasized text
      disabled: '#666666',
    },
    divider: '#404040',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Lato", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E1E1E', // Neutral Gray
          border: '1px solid #404040',
          borderRadius: 12,
          '&:hover': {
            borderColor: '#FFD02F', // Brand Yellow
            boxShadow: '0 4px 20px rgba(255, 208, 47, 0.15)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          minHeight: '48px', // Minimum touch target size
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          },
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 600,
        },
        outlined: {
          borderWidth: 2,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFD02F', // Brand Yellow
          color: '#121212', // Dark Surface
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            backgroundColor: '#FFD54F',
            transform: 'scale(1.05)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E1E1E', // Neutral Gray
          borderTop: '1px solid #404040',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#888888', // Lighter gray for inactive
          '&.Mui-selected': {
            color: '#FFD02F', // Brand Yellow for active
          },
        },
      },
    },
  },
});

export default darkTheme; 