// Saudi API Configuration
export interface SaudiAPIConfig {
  recallsSa: {
    baseUrl: string;
    apiKey?: string;
    enabled: boolean;
  };
  saso: {
    baseUrl: string;
    apiKey?: string;
    enabled: boolean;
  };
  moc: {
    baseUrl: string;
    apiKey?: string;
    enabled: boolean;
  };
  customs: {
    baseUrl: string;
    apiKey?: string;
    enabled: boolean;
  };
}

// Default configuration
export const saudiConfig: SaudiAPIConfig = {
  recallsSa: {
    baseUrl: process.env.RECALLS_SA_API_URL || 'https://recalls.sa/api',
    apiKey: process.env.SAUDI_RECALLS_API_KEY,
    enabled: !!process.env.SAUDI_RECALLS_API_KEY,
  },
  saso: {
    baseUrl: process.env.SASO_API_URL || 'https://www.saso.gov.sa/api',
    apiKey: process.env.SASO_API_KEY,
    enabled: !!process.env.SASO_API_KEY,
  },
  moc: {
    baseUrl: process.env.MOC_API_URL || 'https://moc.gov.sa/api',
    apiKey: process.env.MOC_API_KEY,
    enabled: !!process.env.MOC_API_KEY,
  },
  customs: {
    baseUrl: process.env.CUSTOMS_API_URL || 'https://customs.gov.sa/api',
    apiKey: process.env.CUSTOMS_API_KEY,
    enabled: !!process.env.CUSTOMS_API_KEY,
  },
};

// Check if any Saudi APIs are available
export const hasSaudiAPIAccess = (): boolean => {
  return saudiConfig.recallsSa.enabled || saudiConfig.saso.enabled || saudiConfig.moc.enabled || saudiConfig.customs.enabled;
};

// Get available Saudi services
export const getAvailableSaudiServices = (): string[] => {
  const services: string[] = [];
  if (saudiConfig.recallsSa.enabled) services.push('Official Recalls (recalls.sa)');
  if (saudiConfig.saso.enabled) services.push('SASO');
  if (saudiConfig.moc.enabled) services.push('MOC');
  if (saudiConfig.customs.enabled) services.push('Customs');
  return services;
}; 