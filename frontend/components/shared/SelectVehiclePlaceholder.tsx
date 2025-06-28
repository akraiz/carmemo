

import React from 'react';
import { motion } from 'framer-motion';
import { Icons } from '../Icon';
import { useTranslation } from '../../hooks/useTranslation';

const SelectVehiclePlaceholder: React.FC = () => {
  const { t } = useTranslation();
  return (
    <motion.div 
      className="flex flex-col items-center justify-center h-full text-center p-4 md:p-8 bg-[#1c1c1c] rounded-lg shadow-2xl border border-[#333333]"
      initial={{ opacity: 0 }} // Simplified to opacity only
      animate={{ opacity: 1, transition: { duration: 0.3, ease: "easeOut" } }}
    >
      <motion.div initial={{opacity:0, scale:0.7}} animate={{opacity:1, scale:1, transition:{delay:0.05, duration:0.4, type: "spring", stiffness:150, damping:12}}}> {/* Spring for icon */}
        <Icons.Car className="w-20 h-20 md:w-28 md:h-28 text-[#404040] mb-4 md:mb-6" strokeWidth={0.5}/>
      </motion.div>
      <motion.h2 
        className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-3 font-heading uppercase tracking-wide"
        initial={{opacity:0, y:-8}} animate={{opacity:1, y:0, transition:{delay:0.1, duration:0.3, ease: "easeOut"}}} // Faster delay, less y
      >
        {t('selectVehiclePlaceholder.title')}
      </motion.h2>
      <motion.p 
        className="text-[#cfcfcf] text-sm md:text-base mb-6 max-w-md"
        initial={{opacity:0, y:8}} animate={{opacity:1, y:0, transition:{delay:0.15, duration:0.3, ease: "easeOut"}}} // Faster delay, less y
      >
        {t('selectVehiclePlaceholder.description')}
      </motion.p>
    </motion.div>
  );
};

export default SelectVehiclePlaceholder;
