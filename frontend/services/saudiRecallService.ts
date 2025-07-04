import { RecallInfo, SaudiRecallInfo } from '../types';
import { RecallsSaCrawler } from './recallsSaCrawler';

// Saudi Standards, Metrology and Quality Organization (SASO) Integration
export interface SASORecallData {
  campaignNumber: string;
  manufacturer: string;
  model: string;
  year: string;
  component: string;
  description: string;
  risk: string;
  remedy: string;
  dateAnnounced: string;
  affectedVINs?: string[];
}

// Official Saudi Recall System Integration (recalls.sa)
export interface SaudiRecallNotice {
  id: string;
  title: string;
  description: string;
  manufacturer: string;
  model: string;
  year?: string;
  category: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  affectedVINs?: string[];
  affectedModels?: string[];
  datePublished: string;
  dateUpdated: string;
  status: 'ACTIVE' | 'RESOLVED' | 'EXPIRED';
  contactInfo?: string;
  remedy?: string;
  consequences?: string;
}

export class SaudiRecallService {
  private static readonly RECALLS_SA_BASE_URL = 'https://recalls.sa';
  private static readonly RECALLS_SA_API_URL = 'https://recalls.sa/api'; // If API exists
  private static readonly API_KEY = process.env.SAUDI_RECALLS_API_KEY;

  /**
   * Fetch recalls from the official Saudi recall system (recalls.sa)
   */
  static async getRecallsFromOfficialSystem(vin: string, make?: string, model?: string): Promise<RecallInfo[] | null> {
    try {
      console.log(`Fetching recalls from official Saudi system for VIN: ${vin}`);
      
      // Try API first if available
      const apiRecalls = await this.getRecallsFromAPI(vin, make, model);
      if (apiRecalls && apiRecalls.length > 0) {
        return apiRecalls.map(r => ({
          id: r.id,
          consequence: undefined,
          remedy: undefined,
          reportReceivedDate: r.reportReceivedDate,
          nhtsaCampaignNumber: undefined,
        }));
      }

      // Fallback to web scraping
      const scrapedRecalls = await this.scrapeRecallsFromWebsite(vin, make, model);
      if (scrapedRecalls && scrapedRecalls.length > 0) {
        return scrapedRecalls.map(r => ({
          id: r.id,
          consequence: undefined,
          remedy: undefined,
          reportReceivedDate: r.reportReceivedDate,
          nhtsaCampaignNumber: undefined,
        }));
      }

      return null;

    } catch (error) {
      console.error('Error fetching from official Saudi recall system:', error);
      return null;
    }
  }

  /**
   * Try to fetch recalls from recalls.sa API (if available)
   */
  private static async getRecallsFromAPI(vin: string, make?: string, model?: string): Promise<SaudiRecallInfo[] | null> {
    try {
      if (!this.API_KEY) {
        console.log('No API key available for recalls.sa, trying web scraping...');
        return null;
      }

      // Try VIN-specific search first
      const vinResponse = await fetch(`${this.RECALLS_SA_API_URL}/recalls/vin/${vin}`, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'ar-SA'
        }
      });

      if (vinResponse.ok) {
        const data: SaudiRecallNotice[] = await vinResponse.json();
        return this.convertSaudiRecallsToSaudiRecallInfo(data);
      }

      // If VIN search fails, try make/model search
      if (make && model) {
        const searchParams = new URLSearchParams({
          manufacturer: make,
          model: model,
          status: 'ACTIVE'
        });

        const searchResponse = await fetch(`${this.RECALLS_SA_API_URL}/recalls/search?${searchParams}`, {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json',
            'Accept-Language': 'ar-SA'
          }
        });

        if (searchResponse.ok) {
          const data: SaudiRecallNotice[] = await searchResponse.json();
          return this.convertSaudiRecallsToSaudiRecallInfo(data);
        }
      }

      return null;

    } catch (error) {
      console.warn('API call to recalls.sa failed, falling back to web scraping:', error);
      return null;
    }
  }

  /**
   * Scrape recall data from recalls.sa website
   */
  private static async scrapeRecallsFromWebsite(vin: string, make?: string, model?: string): Promise<SaudiRecallInfo[] | null> {
    try {
      console.log('Scraping recall data from recalls.sa website...');
      
      // Use the direct crawler service
      const crawlerRecalls = await RecallsSaCrawler.fetchRecallsByVIN(vin);
      if (crawlerRecalls.length > 0) {
        console.log(`Found ${crawlerRecalls.length} recalls via crawler service`);
        return crawlerRecalls;
      }
      
      // If no VIN-specific recalls, try make/model search
      if (make && model) {
        const makeModelRecalls = await RecallsSaCrawler.searchRecallsByMakeModel(make, model);
        if (makeModelRecalls.length > 0) {
          console.log(`Found ${makeModelRecalls.length} recalls via make/model search`);
          return makeModelRecalls;
        }
      }
      
      // No real data found - return empty array for critical safety information
      console.log('No real Saudi recall data found - returning empty array');
      return [];

    } catch (error) {
      console.error('Error scraping recalls.sa:', error);
      return []; // Return empty array on error - no simulated data
    }
  }

  /**
   * Convert scraped data to SaudiRecallInfo format
   */
  private static convertScrapedDataToSaudiRecallInfo(scrapedData: SaudiRecallInfo[]): SaudiRecallInfo[] {
    // The data is already in SaudiRecallInfo format from the crawler
    return scrapedData;
  }

  /**
   * Convert Saudi recall notices to our SaudiRecallInfo format
   */
  private static convertSaudiRecallsToSaudiRecallInfo(saudiRecalls: SaudiRecallNotice[]): SaudiRecallInfo[] {
    return saudiRecalls.map(recall => ({
      id: recall.id,
      vin: '', // Will be filled by the calling method
      manufacturer: recall.manufacturer,
      model: recall.model,
      year: recall.year || new Date().getFullYear().toString(),
      recallDate: recall.datePublished,
      description: recall.description,
      severity: recall.riskLevel === 'HIGH' ? 'عالية' : recall.riskLevel === 'MEDIUM' ? 'متوسط' : 'منخفضة',
      status: recall.status === 'ACTIVE' ? 'نشط' : recall.status === 'RESOLVED' ? 'محلول' : 'منتهي الصلاحية',
      source: 'recalls.sa'
    }));
  }

  /**
   * Check if a specific VIN is affected by a recall
   */
  static async checkVINAffected(vin: string, campaignNumber: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.RECALLS_SA_API_URL}/recalls/${campaignNumber}/check-vin/${vin}`, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Saudi recalls API error: ${response.status}`);
      }

      const result = await response.json();
      return result.affected || false;

    } catch (error) {
      console.error('Error checking VIN affected status:', error);
      return false;
    }
  }

  /**
   * Get recent recalls from Saudi system
   */
  static async getRecentRecalls(limit: number = 10): Promise<SaudiRecallInfo[]> {
    try {
      const response = await fetch(`${this.RECALLS_SA_API_URL}/recalls/recent?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'ar-SA'
        }
      });

      if (!response.ok) {
        throw new Error(`Saudi recalls API error: ${response.status}`);
      }

      const data: SaudiRecallNotice[] = await response.json();
      return this.convertSaudiRecallsToSaudiRecallInfo(data);

    } catch (error) {
      console.error('Error fetching recent Saudi recalls:', error);
      return [];
    }
  }
}

// Ministry of Commerce Integration
export class MOCRecallService {
  private static readonly MOC_BASE_URL = 'https://moc.gov.sa/api'; // Example URL
  private static readonly API_KEY = process.env.MOC_API_KEY;

  /**
   * Fetch consumer complaints and recalls from MOC
   */
  static async getMOCRecalls(vin: string): Promise<SaudiRecallInfo[] | null> {
    try {
      const response = await fetch(`${this.MOC_BASE_URL}/consumer-protection/recalls/${vin}`, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'ar-SA'
        }
      });

      if (!response.ok) {
        throw new Error(`MOC API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((recall: any) => ({
        id: recall.id,
        vin: vin,
        manufacturer: recall.manufacturer || 'غير محدد',
        model: recall.model || 'غير محدد',
        year: recall.year || new Date().getFullYear().toString(),
        recallDate: recall.dateReported || new Date().toLocaleDateString('ar-SA'),
        description: recall.description || 'استدعاء من وزارة التجارة',
        severity: recall.severity || 'متوسط',
        status: 'نشط',
        source: 'moc.gov.sa'
      }));

    } catch (error) {
      console.error('Error fetching MOC recalls:', error);
      return null;
    }
  }
}

// Saudi Customs Integration
export class SaudiCustomsService {
  private static readonly CUSTOMS_BASE_URL = 'https://customs.gov.sa/api'; // Example URL
  private static readonly API_KEY = process.env.CUSTOMS_API_KEY;

  /**
   * Get vehicle registration and compliance data from Saudi Customs
   */
  static async getVehicleComplianceData(vin: string): Promise<any> {
    try {
      const response = await fetch(`${this.CUSTOMS_BASE_URL}/vehicles/${vin}/compliance`, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Customs API error: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error fetching customs data:', error);
      return null;
    }
  }
}

// Main service that combines all Saudi sources
export class SaudiRecallManager {
  /**
   * Fetch recalls from all available Saudi sources
   */
  static async getAllSaudiRecalls(vin: string, make?: string, model?: string): Promise<SaudiRecallInfo[]> {
    const allRecalls: SaudiRecallInfo[] = [];

    try {
      // Try official Saudi recall system first (recalls.sa) using direct crawler
      console.log('Checking official Saudi recall system (recalls.sa)...');
      const officialRecalls = await RecallsSaCrawler.fetchRecallsByVIN(vin);
      if (officialRecalls && officialRecalls.length > 0) {
        console.log(`Found ${officialRecalls.length} recalls from official Saudi system`);
        allRecalls.push(...officialRecalls);
      } else {
        // If no VIN-specific recalls, try make/model search
        if (make && model) {
          console.log('No VIN-specific recalls found, trying make/model search...');
          const makeModelRecalls = await RecallsSaCrawler.searchRecallsByMakeModel(make, model);
          if (makeModelRecalls && makeModelRecalls.length > 0) {
            console.log(`Found ${makeModelRecalls.length} recalls via make/model search`);
            allRecalls.push(...makeModelRecalls);
          }
        }
      }

      // Try MOC as secondary source
      if (process.env.MOC_API_KEY) {
        console.log('Checking Ministry of Commerce recalls...');
        const mocRecalls = await MOCRecallService.getMOCRecalls(vin);
        if (mocRecalls && mocRecalls.length > 0) {
          console.log(`Found ${mocRecalls.length} recalls from MOC`);
          allRecalls.push(...mocRecalls);
        }
      }

      // Remove duplicates based on ID
      const uniqueRecalls = allRecalls.filter((recall, index, self) => 
        index === self.findIndex(r => r.id === recall.id)
      );

      console.log(`Total unique Saudi recalls found: ${uniqueRecalls.length}`);
      return uniqueRecalls;

    } catch (error) {
      console.error('Error fetching all Saudi recalls:', error);
      return [];
    }
  }

  /**
   * Check if vehicle has any active recalls
   */
  static async hasActiveRecalls(vin: string): Promise<boolean> {
    const recalls = await this.getAllSaudiRecalls(vin);
    return recalls.length > 0;
  }

  /**
   * Get recall statistics for Saudi Arabia
   */
  static async getSaudiRecallStats(): Promise<{
    totalRecalls: number;
    activeRecalls: number;
    highRiskRecalls: number;
    recentRecalls: number;
  }> {
    try {
      const recentRecalls = await RecallsSaCrawler.getRecentRecalls(50);
      
      return {
        totalRecalls: recentRecalls.length,
        activeRecalls: recentRecalls.filter(r => r.status === 'نشط').length,
        highRiskRecalls: recentRecalls.filter(r => r.severity === 'عالية').length,
        recentRecalls: recentRecalls.filter(r => {
          const recallDate = new Date(r.recallDate);
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          return recallDate > threeMonthsAgo;
        }).length
      };
    } catch (error) {
      console.error('Error fetching Saudi recall stats:', error);
      return {
        totalRecalls: 0,
        activeRecalls: 0,
        highRiskRecalls: 0,
        recentRecalls: 0
      };
    }
  }

  /**
   * Test connection to recalls.sa
   */
  static async testRecallsSaConnection(): Promise<boolean> {
    return await RecallsSaCrawler.testConnection();
  }
} 