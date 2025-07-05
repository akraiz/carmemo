import React from 'react';
import { motion } from 'framer-motion';
import { Vehicle } from '../types';
import { Icons } from './Icon';
import { DEFAULT_VEHICLE_IMAGE_URL } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import { IconButton } from '@mui/material';
import { SiFord, SiToyota, SiHonda, SiBmw, SiMercedes, SiChevrolet, SiHyundai, SiKia, SiNissan, SiVolkswagen, SiAudi, SiMazda, SiJeep, SiSubaru, SiTesla, SiPorsche, SiJaguar, SiLandrover, SiMitsubishi, SiPeugeot, SiRenault, SiSuzuki, SiFiat, SiVolvo, SiCitroen, SiRam, SiMini, SiInfiniti, SiAcura, SiCadillac, SiChrysler, SiGmx, SiAlfaromeo, SiSmart, SiSaturn } from 'react-icons/si';
import { IconType } from 'react-icons';


interface VehicleCardProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const cardItemVariants = {
  hover: {
    scale: 1.02, // More subtle scale
    borderColor: "rgba(247, 200, 67, 0.7)", // Slightly brighter accent
    boxShadow: "0px 5px 15px rgba(247, 200, 67, 0.2)", // Softer shadow
    transition: { duration: 0.15, type: "tween" as const, ease: "easeOut" as const } // Quicker tween
  },
  tap: {
    scale: 0.98 // More subtle tap
  }
};

const BACKEND_BASE_URL = 'http://localhost:3001';

const makeIconMap: Record<string, IconType> = {
  ford: SiFord,
  toyota: SiToyota,
  honda: SiHonda,
  bmw: SiBmw,
  mercedes: SiMercedes,
  chevrolet: SiChevrolet,
  hyundai: SiHyundai,
  kia: SiKia,
  nissan: SiNissan,
  volkswagen: SiVolkswagen,
  audi: SiAudi,
  mazda: SiMazda,
  jeep: SiJeep,
  subaru: SiSubaru,
  tesla: SiTesla,
  porsche: SiPorsche,
  jaguar: SiJaguar,
  landrover: SiLandrover,
  mitsubishi: SiMitsubishi,
  peugeot: SiPeugeot,
  renault: SiRenault,
  suzuki: SiSuzuki,
  fiat: SiFiat,
  volvo: SiVolvo,
  citroen: SiCitroen,
  ram: SiRam,
  mini: SiMini,
  infiniti: SiInfiniti,
  acura: SiAcura,
  cadillac: SiCadillac,
  chrysler: SiChrysler,
  gmc: SiGmx,
  alfaromeo: SiAlfaromeo,
  smart: SiSmart,
  saturn: SiSaturn,
};

const getBrandIcon = (make?: string) => {
  if (!make) return Icons.Car;
  const key = make.toLowerCase().replace(/[^a-z]/g, '');
  return makeIconMap[key] || Icons.Car;
};

const getVehicleImageUrl = (vehicle: Vehicle) => {
  if (vehicle.imageId) return `${BACKEND_BASE_URL}/api/vehicles/${vehicle._id}/image`;
  return null; // Use icon fallback
};

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, isSelected, onSelect, onDelete }) => {
  const { t } = useTranslation();

  const baseClasses = "p-3 md:p-3.5 rounded-lg cursor-pointer transition-all duration-200 group relative border";
  // Updated selected and non-selected classes for new theme
  const selectedClasses = "bg-[#F7C843]/20 border-[#F7C843] shadow-md ring-2 ring-[#F7C843]/80 focus:outline focus:ring-2 focus:ring-[#F7C843]";
  const nonSelectedClasses = "bg-gradient-to-br from-[#2a2a2a] to-[#222222]/80 border-[#333333] hover:from-[#333333] hover:to-[#2a2a2a]/70 hover:border-[#404040] focus:outline focus:ring-2 focus:ring-[#F7C843]";
  
  const imageUrl = getVehicleImageUrl(vehicle);
  const BrandIcon = getBrandIcon(vehicle.make);

  return (
    <motion.div
      layout 
      onClick={onSelect}
      className={`${baseClasses} ${isSelected ? selectedClasses : nonSelectedClasses}`}
      role="button"
      aria-pressed={isSelected}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      variants={cardItemVariants}
      whileHover={!isSelected ? "hover" : undefined} 
      whileTap="tap"
      // Removed initial and animate props to prevent double animation with parent
      exit={{ opacity: 0, y:-5, transition: {duration: 0.15} }}
    >
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={vehicle.nickname || vehicle.model}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-md object-cover border-2 transition-colors ${isSelected ? 'border-[#F7C843]/70' : 'border-[#404040] group-hover:border-[#F7C843]/50'}`}
            />
          ) : (
            <BrandIcon size={48} color="#9ca3af" />
          )}
          <div>
              <h3 className={`font-semibold text-sm md:text-base ${isSelected ? 'text-white' : 'text-white'}`}>{vehicle.nickname || `${vehicle.make} ${vehicle.model}`}</h3>
              <p className={`text-xs ${isSelected ? 'text-[#F7C843]/80' : 'text-[#a0a0a0] group-hover:text-[#cfcfcf]'} transition-colors`}>{vehicle.year} {vehicle.vin ? `• ${vehicle.vin.slice(-6)}` : ''}</p>
          </div>
      </div>
      <IconButton
        onClick={onDelete}
        className="absolute top-1 end-1 md:top-1.5 md:end-1.5 text-[#707070] hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 md:p-1.5 rounded-full hover:bg-red-500/20 focus-visible:ring-2 focus-visible:ring-red-500"
        aria-label={t('vehicleCard.deleteAria', { name: vehicle.nickname || vehicle.make })}
        title={t('vehicleCard.deleteTitle')}
        size="small"
        sx={{
          '&:hover': {
            transform: 'scale(1.15)',
          },
          '&:active': {
            transform: 'scale(0.9)',
          },
        }}
      >
        <Icons.Trash className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={1.5} />
      </IconButton>
    </motion.div>
  );
};
export default VehicleCard;
