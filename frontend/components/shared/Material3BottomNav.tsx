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
    return (
      <BottomNavigation
        className={className}
        value={activeTabKey}
        onChange={(event, newValue) => onTabChange(newValue)}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`,
          '& .MuiBottomNavigationAction-root': {
            color: theme.palette.text.secondary,
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            },
          },
        }}
      >
        {items.map((item) => (
          <BottomNavigationAction
            key={item.key}
            label={item.label}
            value={item.key}
            icon={item.icon}
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