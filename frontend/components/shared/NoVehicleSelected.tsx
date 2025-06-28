import React from 'react';
import { motion } from 'framer-motion'; // Keep for button's whileHover/whileTap
import { Icons } from '../Icon';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '@mui/material';

const NoVehicleSelected: React.FC<{ onAddVehicle: () => void }> = ({ onAddVehicle }) => {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col items-center justify-center h-full text-center p-4 md:p-8 bg-[#1c1c1c] rounded-lg shadow-2xl border border-[#333333]"
    >
      <div> {/* Was motion.div, removed initial/animate */}
        <Icons.Car className="w-20 h-20 md:w-28 md:h-28 text-[#404040] mb-4 md:mb-6" strokeWidth={0.5} />
      </div>
      <h2  className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-3 font-heading uppercase tracking-wide"> {/* Was motion.h2, removed initial/animate */}
        {t('noVehicleSelected.welcomeTitle', { appName: t('app.name') })}
      </h2>
      <p className="text-[#cfcfcf] text-sm md:text-base mb-6 md:mb-8 max-w-md"> {/* Was motion.p, removed initial/animate */}
        {t('noVehicleSelected.description')}
      </p>
      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={<Icons.PlusCircle className="w-5 h-5 md:w-6 md:h-6 me-2 md:me-2.5" strokeWidth={2}/>} 
        onClick={onAddVehicle}
        aria-label={t('noVehicleSelected.addFirstVehicleAria')}
        sx={{ fontWeight: 'bold', borderRadius: 2, py: 2.5, px: 6, fontSize: { xs: '1rem', md: '1.25rem' } }}
      >
        {t('noVehicleSelected.addFirstVehicleButton')}
      </Button>
    </div>
  );
};

export default NoVehicleSelected;
