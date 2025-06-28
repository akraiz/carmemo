import React from 'react';
import { motion } from 'framer-motion';
import { Icons } from '../Icon';
import { useTranslation } from '../../hooks/useTranslation';

interface LoadingScreenProps {
  message?: string;
  progress?: number;
  showProgress?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'loadingScreen.openingGarage', 
  progress = 0,
  showProgress = false 
}) => {
  const { t } = useTranslation();

  return (
    <motion.div
      className="fixed inset-0 bg-[#0f0f0f] z-50 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative w-full h-full">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-[#F7C843]/10 via-transparent to-[#F7C843]/5" />
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#F7C843]/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-[#F7C843]/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          {/* Logo/Icon */}
          <motion.div
            className="mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="relative">
              <motion.div
                className="w-24 h-24 bg-[#F7C843] rounded-full flex items-center justify-center shadow-2xl"
                animate={{ 
                  boxShadow: [
                    "0 0 20px rgba(247, 200, 67, 0.3)",
                    "0 0 40px rgba(247, 200, 67, 0.6)",
                    "0 0 20px rgba(247, 200, 67, 0.3)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Icons.Car className="w-12 h-12 text-[#0f0f0f]" strokeWidth={2} />
              </motion.div>
              
              {/* Rotating gear effect */}
              <motion.div
                className="absolute -top-2 -right-2 w-8 h-8 bg-[#1c1c1c] rounded-full flex items-center justify-center border-2 border-[#F7C843]"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Icons.Settings2 className="w-4 h-4 text-[#F7C843]" />
              </motion.div>
            </div>
          </motion.div>

          {/* Loading text */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-[#F7C843] font-heading uppercase tracking-wider mb-2">
              {t('app.name')}
            </h1>
            <p className="text-lg text-[#a0a0a0] font-medium">
              {t(message)}
            </p>
          </motion.div>

          {/* Progress bar */}
          {showProgress && (
            <motion.div
              className="w-64 max-w-xs mb-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <div className="w-full bg-[#2a2a2a] rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-2 bg-[#F7C843] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <p className="text-xs text-[#707070] mt-2 text-center">
                {Math.round(progress)}%
              </p>
            </motion.div>
          )}

          {/* Loading dots */}
          <motion.div
            className="flex space-x-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-[#F7C843] rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </motion.div>

          {/* Subtle hint */}
          <motion.p
            className="absolute bottom-8 text-xs text-[#707070] text-center max-w-md px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            {t('loadingScreen.hint')}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
