import { SaudiRecallInfo } from '../types.js';

// Interface for the recalls.sa response structure
export interface RecallsSaResponse {
  recalls: RecallsSaRecall[];
  totalCount: number;
}

export interface RecallsSaRecall {
  number: string;
  date: string;
  manufacturer: string;
  title?: string;
  description?: string;
  component?: string;
  risk?: string;
  remedy?: string;
}

export class RecallsSaCrawler {
  private static readonly BASE_URL = 'https://recalls.sa';
  private static readonly SEARCH_URL = 'https://recalls.sa/Recall/FindRecallsBySerial/';
  private static readonly BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:3001';

  /**
   * Fetch recalls using the new backend endpoint that returns structured JSON
   */
  static async fetchRecallsByVIN(vin: string): Promise<SaudiRecallInfo[]> {
    try {
      console.log(`🔍 Fetching recalls from local proxy for VIN: ${vin}`);
      const url = `${this.BACKEND_BASE_URL}/api/recall/${encodeURIComponent(vin)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Proxy error! status: ${response.status}`);
      }
      const recalls = await response.json();
      // Map to SaudiRecallInfo structure, preserving all fields
      return recalls.map((recall: any) => ({
        id: recall.reference || recall.id,
        vin: vin,
        manufacturer: recall.brand || recall.manufacturer,
        model: recall.model,
        year: recall.date ? (recall.date.split('/')[2] || '') : '',
        recallDate: recall.date ? this.normalizeSaudiDate(recall.date) : '',
        reportReceivedDate: recall.date ? this.normalizeSaudiDate(recall.date) : '',
        description: recall.description || '',
        severity: recall.severity || '',
        status: recall.status,
        source: 'recalls.sa'
      }));
    } catch (error) {
      console.error('❌ Error fetching recalls from local proxy:', error);
      return [];
    }
  }

  /**
   * Fetch recalls as text (fallback method)
   */
  private static async fetchRecallsAsText(vin: string): Promise<string> {
    const url = `${this.SEARCH_URL}?serial=${encodeURIComponent(vin)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar-SA,en-US;q=0.9,en;q=0.8',
        'User-Agent': 'CarMemo/1.0 (Saudi Vehicle Recall Service)',
        'Referer': 'https://recalls.sa/',
        'Origin': 'https://recalls.sa'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  }

  /**
   * Parse the JSON response from recalls.sa
   */
  private static parseRecallsResponse(data: any, vin: string): SaudiRecallInfo[] {
    const recalls: SaudiRecallInfo[] = [];

    try {
      console.log('Parsing JSON response:', data);

      // Handle different response structures
      let recallsData: any[] = [];
      
      if (Array.isArray(data)) {
        recallsData = data;
      } else if (data.recalls && Array.isArray(data.recalls)) {
        recallsData = data.recalls;
      } else if (data.data && Array.isArray(data.data)) {
        recallsData = data.data;
      } else if (data.results && Array.isArray(data.results)) {
        recallsData = data.results;
      } else {
        console.log('No recognizable array structure found in response');
        return [];
      }

      recallsData.forEach((recall, index) => {
        const recallInfo: SaudiRecallInfo = {
          id: recall.number || recall.id || `SA-RECALL-${index}`,
          vin: vin,
          manufacturer: recall.manufacturer || recall.make || recall.brand || 'غير محدد',
          model: recall.model || recall.name || 'غير محدد',
          year: recall.year || new Date().getFullYear().toString(),
          recallDate: this.normalizeSaudiDate(recall.date) || new Date().toISOString().split('T')[0],
          reportReceivedDate: this.normalizeSaudiDate(recall.date) || new Date().toISOString().split('T')[0],
          description: recall.description || recall.reason || 'استدعاء أمان للمركبة',
          severity: recall.severity || 'متوسط',
          status: recall.status || 'نشط',
          source: 'recalls.sa'
        };

        recalls.push(recallInfo);
      });

    } catch (error) {
      console.error('Error parsing JSON response:', error);
    }

    return recalls;
  }

  /**
   * Parse text/HTML response from recalls.sa
   */
  private static parseTextResponse(responseText: string, vin: string): SaudiRecallInfo[] {
    console.log('🔍 Parsing text response...');
    
    const recalls: SaudiRecallInfo[] = [];
    
    // Remove extra whitespace and normalize
    const cleanText = responseText.replace(/\s+/g, ' ').trim();
    console.log(`📝 Cleaned text (first 500 chars): ${cleanText.substring(0, 500)}`);
    
    // Look for common patterns in Arabic recall responses
    const patterns = [
      // Pattern 1: Direct recall information
      /(?:استدعاء|سحب|تحديث).*?(?:سيارة|مركبة|عربة).*?(?:VIN|رقم الهيكل|الرقم التسلسلي).*?(\d{17})/gi,
      
      // Pattern 2: Recall details with dates
      /(?:تاريخ الاستدعاء|تاريخ السحب).*?(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      
      // Pattern 3: Manufacturer information
      /(?:الشركة المصنعة|المصنع).*?([^\s]+)/gi,
      
      // Pattern 4: Model information
      /(?:الموديل|النوع).*?([^\s]+)/gi,
      
      // Pattern 5: Reason for recall
      /(?:سبب الاستدعاء|السبب).*?([^\.]+)/gi
    ];
    
    // Check if the response contains any recall-related keywords
    const recallKeywords = [
      'استدعاء', 'سحب', 'تحديث', 'عيوب', 'مشاكل', 'أمان', 'سلامة',
      'recall', 'withdrawal', 'update', 'defect', 'safety', 'issue'
    ];
    
    const hasRecallContent = recallKeywords.some(keyword => 
      cleanText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    console.log(`🔍 Has recall content: ${hasRecallContent}`);
    
    if (!hasRecallContent) {
      // Check if it's a "no recalls found" response
      const noRecallKeywords = [
        'لا توجد استدعاءات', 'لا يوجد استدعاء', 'لم يتم العثور على استدعاءات',
        'no recalls found', 'no recall', 'not found'
      ];
      
      const isNoRecallResponse = noRecallKeywords.some(keyword => 
        cleanText.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isNoRecallResponse) {
        console.log('✅ No recalls found for this VIN');
        return [];
      }
    }
    
    // Extract VIN matches
    const vinMatches = cleanText.match(/\b[A-Z0-9]{17}\b/g);
    console.log(`🔍 VIN matches found:`, vinMatches);
    
    // Extract date patterns
    const dateMatches = cleanText.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);
    console.log(`📅 Date matches found:`, dateMatches);
    
    // Extract manufacturer/model patterns
    const manufacturerMatches = cleanText.match(/(?:الشركة المصنعة|المصنع|manufacturer).*?([^\s]+)/gi);
    console.log(`🏭 Manufacturer matches found:`, manufacturerMatches);
    
    // If we found some structured data, create a recall entry
    if (vinMatches && vinMatches.length > 0) {
      const recall: SaudiRecallInfo = {
        id: `recall_${Date.now()}`,
        vin: vinMatches[0],
        manufacturer: manufacturerMatches?.[0]?.replace(/(?:الشركة المصنعة|المصنع|manufacturer):\s*/i, '') || 'غير محدد',
        model: 'غير محدد',
        year: new Date().getFullYear().toString(),
        recallDate: this.normalizeSaudiDate(dateMatches?.[0] || '' ) || new Date().toISOString().split('T')[0],
        reportReceivedDate: this.normalizeSaudiDate(dateMatches?.[0] || '' ) || new Date().toISOString().split('T')[0],
        description: this.extractRecallDescription(cleanText),
        severity: 'متوسط',
        status: 'نشط',
        source: 'recalls.sa'
      };
      
      recalls.push(recall);
      console.log('✅ Created recall entry from text parsing:', recall);
    } else {
      // If no structured data found, create a generic entry based on the response
      const recall: SaudiRecallInfo = {
        id: `recall_${Date.now()}`,
        vin: vin,
        manufacturer: 'غير محدد',
        model: 'غير محدد',
        year: new Date().getFullYear().toString(),
        recallDate: this.normalizeSaudiDate(new Date().toLocaleDateString('ar-SA')) || new Date().toISOString().split('T')[0],
        reportReceivedDate: this.normalizeSaudiDate(new Date().toLocaleDateString('ar-SA')) || new Date().toISOString().split('T')[0],
        description: this.extractRecallDescription(cleanText),
        severity: 'متوسط',
        status: 'نشط',
        source: 'recalls.sa'
      };
      
      recalls.push(recall);
      console.log('✅ Created generic recall entry:', recall);
    }
    
    return recalls;
  }
  
  /**
   * Extract recall description from text
   */
  private static extractRecallDescription(text: string): string {
    // Look for description patterns
    const descriptionPatterns = [
      /(?:سبب الاستدعاء|السبب|الوصف|description).*?([^\.]+)/i,
      /(?:مشكلة|عيوب|defect|issue).*?([^\.]+)/i,
      /(?:تفاصيل|details).*?([^\.]+)/i
    ];
    
    for (const pattern of descriptionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no specific description found, return a generic one
    return 'تم العثور على استدعاء لهذه المركبة. يرجى التواصل مع الوكيل للحصول على مزيد من التفاصيل.';
  }

  /**
   * Parse date from various formats
   */
  private static parseDate(dateString: string): string {
    if (!dateString) return new Date().toISOString().split('T')[0];

    try {
      // Handle DD/MM/YYYY format
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      // Handle other date formats
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      // If all else fails, return today's date
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.warn('Error parsing date:', dateString, error);
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Search recalls by manufacturer and model
   */
  static async searchRecallsByMakeModel(make: string, model: string): Promise<SaudiRecallInfo[]> {
    try {
      console.log(`Searching recalls.sa for ${make} ${model}`);
      
      // Try different search endpoints
      const searchUrl = `${this.BASE_URL}/Recall/Search?manufacturer=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ar-SA,en-US;q=0.9,en;q=0.8',
          'User-Agent': 'CarMemo/1.0 (Saudi Vehicle Recall Service)',
          'Referer': 'https://recalls.sa/'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.parseRecallsResponse(data, '');

    } catch (error) {
      console.error('Error searching recalls by make/model:', error);
      return [];
    }
  }

  /**
   * Get recent recalls from recalls.sa
   */
  static async getRecentRecalls(limit: number = 10): Promise<SaudiRecallInfo[]> {
    try {
      console.log(`Fetching ${limit} recent recalls from recalls.sa`);
      
      const recentUrl = `${this.BASE_URL}/Recall/Recent?limit=${limit}`;
      
      const response = await fetch(recentUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ar-SA,en-US;q=0.9,en;q=0.8',
          'User-Agent': 'CarMemo/1.0 (Saudi Vehicle Recall Service)',
          'Referer': 'https://recalls.sa/'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const recalls = this.parseRecallsResponse(data, '');
      
      return recalls.slice(0, limit);

    } catch (error) {
      console.error('Error fetching recent recalls:', error);
      return [];
    }
  }

  /**
   * Test the connection to recalls.sa
   */
  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.BASE_URL, {
        method: 'GET',
        headers: {
          'User-Agent': 'CarMemo/1.0 (Saudi Vehicle Recall Service)'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  private static normalizeSaudiDate(dateStr: string): string {
    if (!dateStr || !dateStr.includes('/')) return dateStr;
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return dateStr;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
} 