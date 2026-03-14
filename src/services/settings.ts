import { supabase } from './supabase';

export interface PlatformSettings {
  id: number;
  platform_fee_percentage: number;
  delivery_fee_per_km: number;
  weight_rate_per_kg: number;
  min_delivery_fee: number;
  max_delivery_fee: number;
  updated_at: string;
  updated_by: string | null;
}

export const settingsService = {
  async getSettings(): Promise<PlatformSettings | null> {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return null;
    }
  },

  // Helper to calculate estimated fee
  calculateEstimatedFee(
    weightKg: number,
    packageType: string,
    settings: PlatformSettings
  ): number {
    const baseDistance = 5; // Default 5km for estimate
    
    let fee = (baseDistance * settings.delivery_fee_per_km) + 
              (weightKg * settings.weight_rate_per_kg);
    
    // Apply type multipliers
    const multipliers: Record<string, number> = {
      fragile: 1.5,
      electronics: 1.3,
      documents: 0.8,
      food: 1.0,
      other: 1.0,
    };
    
    fee *= multipliers[packageType] || 1.0;
    
    // Apply min/max
    if (fee < settings.min_delivery_fee) fee = settings.min_delivery_fee;
    if (fee > settings.max_delivery_fee) fee = settings.max_delivery_fee;
    
    return Math.round(fee);
  },
};