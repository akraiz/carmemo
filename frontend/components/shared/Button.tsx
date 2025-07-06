import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';

interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'medium', 
  children, 
  sx, 
  ...props 
}) => {
  const getButtonStyles = () => {
    const baseStyles = {
      fontWeight: 'bold',
      textTransform: 'none' as const,
      borderRadius: 2,
      ...sx
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          background: '#F7C843',
          color: '#232323',
          '&:hover': { 
            background: '#ffe082',
            color: '#232323'
          },
          '&:disabled': {
            background: '#404040',
            color: '#707070'
          }
        };
      case 'secondary':
        return {
          ...baseStyles,
          background: '#232323',
          color: '#fff',
          border: '1px solid #404040',
          '&:hover': { 
            background: '#2a2a2a',
            borderColor: '#F7C843'
          }
        };
      case 'outline':
        return {
          ...baseStyles,
          background: 'transparent',
          color: '#fff',
          border: '1px solid #707070',
          '&:hover': { 
            background: '#232323',
            borderColor: '#F7C843',
            color: '#F7C843'
          }
        };
      case 'text':
        return {
          ...baseStyles,
          background: 'transparent',
          color: '#a0a0a0',
          '&:hover': { 
            background: '#2a2a2a',
            color: '#F7C843'
          }
        };
      default:
        return baseStyles;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { padding: '6px 16px', fontSize: '0.875rem' };
      case 'large':
        return { padding: '12px 24px', fontSize: '1.125rem' };
      default:
        return { padding: '8px 20px', fontSize: '1rem' };
    }
  };

  return (
    <MuiButton
      variant={variant === 'outline' ? 'outlined' : variant === 'text' ? 'text' : 'contained'}
      size={size}
      sx={{
        ...getButtonStyles(),
        ...getSizeStyles()
      }}
      {...props}
    >
      {children}
    </MuiButton>
  );
};

export default Button; 