import React from 'react';
import { 
  BottomNavigation, 
  BottomNavigationAction, 
  useTheme, 
  useMediaQuery,
  Box,
  Tabs as MuiTabs,
  Tab as MuiTab
} from '@mui/material';
import { 
  DirectionsCar as CarIcon,
  Timeline as TimelineIcon,
  BarChart as AnalyticsIcon,
  Settings as SettingsIcon,
  Build as BuildIcon
} from '@mui/icons-material';

interface TabItem {
  key: string;
  label: string;
  icon: React.ReactElement;
}

interface Material3BottomNavProps {
  items: TabItem[];
  activeTabKey: string;
  onTabChange: (key: string) => void;
  className?: string;
}

const Material3BottomNav: React.FC<Material3BottomNavProps> = ({ 
  items, 
  activeTabKey, 
  onTabChange,
  className
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // For mobile, use bottom navigation
  if (isMobile) {
    // When rendering navigation items, filter out the settings tab if present
    const filteredItems = items.filter(item => item.key !== 'settings');
    return (
      <BottomNavigation
        className={className}
        value={activeTabKey}
        onChange={(_, newValue) => onTabChange(newValue)}
        showLabels
        sx={{
          backgroundColor: '#232323',
          borderTop: '1px solid #333',
          height: 72,
          zIndex: 1000,
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        {filteredItems.map((item) => (
          <BottomNavigationAction
            key={item.key}
            label={item.label}
            icon={item.icon}
            value={item.key}
          />
        ))}
      </BottomNavigation>
    );
  }

  // For desktop, use horizontal tabs
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <MuiTabs
        value={activeTabKey}
        onChange={(event, newValue) => onTabChange(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            color: theme.palette.text.secondary,
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: theme.palette.primary.main,
          },
        }}
      >
        {items.map((item) => (
          <MuiTab
            key={item.key}
            label={item.label}
            value={item.key}
            icon={item.icon}
            iconPosition="start"
          />
        ))}
      </MuiTabs>
    </Box>
  );
};

export default Material3BottomNav; 