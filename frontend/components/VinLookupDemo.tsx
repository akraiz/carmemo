import React, { useState } from 'react';
import { Vehicle } from '../types';
import { decodeVinMerged, validateVin, formatVin } from '../services/vinLookupService';
import { useTranslation } from '../hooks/useTranslation';
import { TextField, Button } from '@mui/material';

interface VinLookupDemoProps {
  onVehicleFound?: (vehicle: Partial<Vehicle>) => void;
}

const VinLookupDemo: React.FC<VinLookupDemoProps> = ({ onVehicleFound }) => {
  const { t: _t } = useTranslation();
  const [vin, setVin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicleData, setVehicleData] = useState<Partial<Vehicle> | null>(null);

  const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setVin(value);
    setError(null);
    setVehicleData(null);
  };

  const handleLookup = async () => {
    if (!vin.trim()) {
      setError('Please enter a VIN number');
      return;
    }

    if (!validateVin(vin.trim())) {
      setError('Invalid VIN format. VIN must be exactly 17 characters and contain only letters and numbers (excluding I, O, Q).');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVehicleData(null);

    try {
      const decodedVehicle = await decodeVinMerged(vin.trim());
      
      if (decodedVehicle && (decodedVehicle.year || decodedVehicle.make || decodedVehicle.model)) {
        setVehicleData(decodedVehicle);
        onVehicleFound?.(decodedVehicle);
      } else {
        setError('Could not decode VIN. Please check the VIN number.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while looking up the VIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLookup();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#1a1a1a] rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Vehicle Details Lookup</h2>
        <p className="text-[#cfcfcf]">Enter a 17-character VIN to get vehicle information</p>
      </div>

      {/* VIN Input */}
      <div className="mb-6">
        <label htmlFor="vin" className="block text-sm font-medium text-white mb-2">
          Vehicle Identification Number (VIN)
        </label>
        <div className="flex gap-2">
          <TextField
            fullWidth
            id="vin"
            value={vin}
            onChange={handleVinChange}
            onKeyPress={handleKeyPress}
            placeholder="Enter 17-character VIN"
            inputProps={{ maxLength: 17 }}
            disabled={isLoading}
            variant="outlined"
            size="small"
          />
          <Button
            onClick={handleLookup}
            disabled={isLoading || !vin.trim()}
            variant="contained"
            color="primary"
            sx={{ 
              px: 3, 
              py: 1.5, 
              fontWeight: 'bold',
              minWidth: '120px'
            }}
          >
            {isLoading ? 'Looking up...' : 'Lookup'}
          </Button>
        </div>
        {vin && (
          <p className="text-xs text-[#707070] mt-1">
            Formatted: {formatVin(vin)}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mb-6 p-6 bg-[#2a2a2a] rounded-lg text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F7C843]"></div>
          <p className="text-[#cfcfcf] mt-2">Looking up vehicle information...</p>
        </div>
      )}

      {/* Vehicle Details Card */}
      {vehicleData && (
        <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#404040]">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#F7C843] rounded-full flex items-center justify-center">
              <span className="text-black text-sm font-bold">✓</span>
            </span>
            Vehicle Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-3">
              <h4 className="text-[#F7C843] font-semibold text-sm uppercase tracking-wide">Basic Information</h4>
              
              <div>
                <label className="text-xs text-[#707070] uppercase tracking-wide">VIN</label>
                <p className="text-white font-mono text-sm">{formatVin(vehicleData.vin || '')}</p>
              </div>
              
              <div>
                <label className="text-xs text-[#707070] uppercase tracking-wide">Year</label>
                <p className="text-white font-semibold">{vehicleData.year}</p>
              </div>
              
              <div>
                <label className="text-xs text-[#707070] uppercase tracking-wide">Make</label>
                <p className="text-white font-semibold">{vehicleData.make}</p>
              </div>
              
              <div>
                <label className="text-xs text-[#707070] uppercase tracking-wide">Model</label>
                <p className="text-white font-semibold">{vehicleData.model}</p>
              </div>
              
              {vehicleData.trim && (
                <div>
                  <label className="text-xs text-[#707070] uppercase tracking-wide">Trim</label>
                  <p className="text-white">{vehicleData.trim}</p>
                </div>
              )}
            </div>

            {/* Technical Specifications */}
            <div className="space-y-3">
              <h4 className="text-[#F7C843] font-semibold text-sm uppercase tracking-wide">Technical Specifications</h4>
              
              {vehicleData.engineDisplacementL && (
                <div>
                  <label className="text-xs text-[#707070] uppercase tracking-wide">Engine</label>
                  <p className="text-white">{vehicleData.engineDisplacementL}</p>
                </div>
              )}
              
              {vehicleData.cylinders && (
                <div>
                  <label className="text-xs text-[#707070] uppercase tracking-wide">Cylinders</label>
                  <p className="text-white">{vehicleData.cylinders}</p>
                </div>
              )}
              
              {vehicleData.driveType && (
                <div>
                  <label className="text-xs text-[#707070] uppercase tracking-wide">Drive Type</label>
                  <p className="text-white">{vehicleData.driveType}</p>
                </div>
              )}
              
              {vehicleData.primaryFuelType && (
                <div>
                  <label className="text-xs text-[#707070] uppercase tracking-wide">Fuel Type</label>
                  <p className="text-white">{vehicleData.primaryFuelType}</p>
                </div>
              )}
              
              {vehicleData.transmissionStyle && (
                <div>
                  <label className="text-xs text-[#707070] uppercase tracking-wide">Transmission</label>
                  <p className="text-white">{vehicleData.transmissionStyle}</p>
                </div>
              )}
              
              {vehicleData.bodyClass && (
                <div>
                  <label className="text-xs text-[#707070] uppercase tracking-wide">Body Class</label>
                  <p className="text-white">{vehicleData.bodyClass}</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Details */}
          {(vehicleData.manufacturerName || vehicleData.plantCountry || vehicleData.plantCity) && (
            <div className="mt-6 pt-4 border-t border-[#404040]">
              <h4 className="text-[#F7C843] font-semibold text-sm uppercase tracking-wide mb-3">Manufacturing Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {vehicleData.manufacturerName && (
                  <div>
                    <label className="text-xs text-[#707070] uppercase tracking-wide">Manufacturer</label>
                    <p className="text-white">{vehicleData.manufacturerName}</p>
                  </div>
                )}
                {vehicleData.plantCountry && (
                  <div>
                    <label className="text-xs text-[#707070] uppercase tracking-wide">Country</label>
                    <p className="text-white">{vehicleData.plantCountry}</p>
                  </div>
                )}
                {vehicleData.plantCity && (
                  <div>
                    <label className="text-xs text-[#707070] uppercase tracking-wide">City</label>
                    <p className="text-white">{vehicleData.plantCity}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VinLookupDemo; 