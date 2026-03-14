export type UserRole = 'business' | 'rider' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
  is_available?: boolean;
  is_suspended?: boolean;
  created_at: string;
}

export interface BusinessRequest {
  id: string;
  request_number: string;
  business_id: string;
  business_name: string;
  business_phone: string;
  business_email: string;
  
  // Package details
  package_name: string;
  package_type: string;
  weight_kg: number;
  quantity: number;
  package_description?: string;
  declared_value?: number;
  handling_instructions?: string;
  package_image_url?: string;
  
  // Pickup location
  pickup_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  pickup_instructions?: string;
  
  // Delivery location
  delivery_address: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  delivery_instructions?: string;
  
  // Receiver
  receiver_phone: string;
  
  // Pricing
  distance_km?: number;
  calculated_fee?: number;
  rider_share?: number;
  platform_share?: number;
  rider_percentage?: number;
  
  // Status
  status: 'pending' | 'accepted' | 'paid' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  payment_reference?: string;
  paid_at?: string;
  
  // Assignment
  rider_id?: string;
  rider_name?: string;
  rider_phone?: string;
  rider_vehicle?: string;
  assigned_by?: string;
  assigned_at?: string;
  
  // Notes - ADD THESE LINES
  admin_notes?: string;
  business_notes?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
  picked_up_at?: string;
  in_transit_at?: string;
  delivered_at?: string;
  
  // Who updated - ADD THIS IF NEEDED
  updated_by?: string;
}

export interface RiderDelivery {
  id: string;
  request_number: string;
  business_name: string;
  business_phone: string;
  package_name: string;
  package_type: string;
  weight_kg: number;
  quantity: number;
  handling_instructions?: string;
  
  // Pickup
  pickup_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  pickup_instructions?: string;
  
  // Delivery
  delivery_address: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  delivery_instructions?: string;
  
  // Receiver
  receiver_phone: string;
  
  // Earnings
  distance_km?: number;
  calculated_fee: number;
  rider_share: number;
  
  // Status
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
  assigned_at: string;
  picked_up_at?: string;
  in_transit_at?: string;
  delivered_at?: string;
  
  created_at: string;
}

export interface RiderEarning {
  id: string;
  rider_id: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'paid';
  created_at: string;
  paid_at?: string;
}

export interface RiderStats {
  yearEarnings: any;
  monthEarnings: any;
  todayEarnings: number;
  todayDeliveries: number;
  weekEarnings: number;
  weekDeliveries: number;
  totalEarnings: number;
  totalDeliveries: number;
  monthDeliveries: number;
   yearDeliveries:number;
  rating: number;
  availableBalance: number;
  pendingBalance: number;
    totalWithdrawn: number;  // Add this line

}