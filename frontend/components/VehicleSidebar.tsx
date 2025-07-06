import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vehicle } from '../types';
import { Icons } from './Icon';
import VehicleCard from './VehicleCard';
import { useTranslation } from '../hooks/useTranslation';
import { Button, IconButton } from '@mui/material';

interface VehicleSidebarProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  onAddVehicle: () => void;
  onDeleteVehicle: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const sidebarVariants = {
  hidden: { x: "-100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 110, damping: 22, duration: 0.4 }
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: { duration: 0.25, ease: "anticipate" as const }
  }
};

const rtlSidebarVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 110, damping: 22, duration: 0.4 }
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: 0.25, ease: "anticipate" as const }
  }
};

const VehicleSidebar: React.FC<VehicleSidebarProps> = ({ vehicles, selectedVehicleId, onSelectVehicle, onAddVehicle, onDeleteVehicle, isOpen, onClose }) => {
  const { t, language } = useTranslation();

  const currentSidebarVariants = language === 'ar' ? rtlSidebarVariants : sidebarVariants;
  const isRTL = language === 'ar';

  const sidebarContent = (
    <>
      <div className="flex flex-row items-center mb-3 p-1 md:p-0 px-2">
        <h2 className={`flex-1 text-xl font-bold border-b border-[#333333] pb-3 mb-3 text-white font-heading uppercase tracking-wider ${isRTL ? 'text-end' : 'text-start'}`}>{t('sidebar.myGarageTitle')}</h2>
        <IconButton
          onClick={onClose}
          className="md:hidden p-2 text-[#a0a0a0] hover:text-[#F7C843] rounded-full hover:bg-[#2a2a2a]"
          size="small"
        >
          <Icons.XMark className="w-6 h-6" />
        </IconButton>
      </div>
      <div className={`flex-grow space-y-2.5 pe-1 scrollbar-thin scrollbar-thumb-[#404040] scrollbar-track-[#2a2a2a] overflow-y-auto -me-1 w-full`}>
        {vehicles.length === 0 && <p className="flex flex-col items-center text-sm text-[#a0a0a0] px-1 py-4 text-center"><span className="text-4xl mb-2">🚗</span>{t('sidebar.garageEmpty')}</p>}
        <AnimatePresence mode="popLayout">
          {vehicles.map((vehicle, _index) => (
            <motion.div
              key={vehicle.id}
              layout
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            >
              <VehicleCard
                vehicle={vehicle}
                isSelected={vehicle.id === selectedVehicleId}
                onSelect={() => onSelectVehicle(vehicle.id)}
                onDelete={(e) => { e.stopPropagation(); onDeleteVehicle(vehicle.id); }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
      {isOpen && (
        <motion.div
            key="mobile-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-40 bg-black bg-opacity-70 backdrop-blur-sm md:hidden" 
            onClick={onClose}
        ></motion.div>
      )}
      </AnimatePresence>
      
      {/* Mobile Drawer Sidebar */}
      <motion.aside
        key="mobile-drawer"
        variants={currentSidebarVariants}
        initial="hidden"
        animate={isOpen ? "visible" : "hidden"}
        className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-full w-72 bg-[#1c1c1c] text-white p-5 space-y-4 flex flex-col shadow-2xl z-50 md:hidden ${isRTL ? 'text-end' : ''}`}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        {...(isRTL ? { dir: 'rtl' } : {})}
      >
        {sidebarContent}
        {/* Logo section - move to top of bottom area, above Add Vehicle */}
        <div className="flex justify-center items-center mb-2 py-1.5 px-3">
          <img
            src="/levers-logo.png"
            alt="Levers Logo"
            style={{ maxWidth: 180, maxHeight: 60, objectFit: 'contain', opacity: 0.5 }}
          />
        </div>
        {/* Separator below logo */}
        <div className="w-full border-t border-[#333333] my-4" />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          startIcon={<Icons.PlusCircle className="w-5 h-5 me-2 rtl:ms-2 rtl:me-0" strokeWidth={2.5}/>} 
          onClick={onAddVehicle}
          aria-label={t('sidebar.addVehicleAria')}
          sx={{ fontWeight: 'bold', borderRadius: 2 }}
        >
          {t('sidebar.addVehicleButton')}
        </Button>
        <p className="text-xs text-[#F7C843] mt-1 text-center">{t('sidebar.addVehicleHint')}</p>
      </motion.aside>

      {/* Desktop Sidebar */}
      <motion.aside
        className={`hidden md:flex w-72 bg-[#1c1c1c] text-white p-5 space-y-4 flex-col shadow-xl ${isRTL ? 'border-s border-[#333333] text-end' : 'border-e border-[#333333]'}`}
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1, transition: { type: "spring" as const, stiffness: 100, damping: 20, delay: 0.1, duration: 0.3 } }}
        style={{ pointerEvents: 'auto' }}
        {...(isRTL ? { dir: 'rtl' } : {})}
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
};

export default VehicleSidebar;
