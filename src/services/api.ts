import { supabase } from './supabase';
import { BusinessRequest, RiderDelivery, RiderStats } from '../types';

export const businessApi = {
  // Get all requests for a business
  async getMyRequests(businessId: string, currentPage: number, p0: number) {
    const { data, error } = await supabase
      .from('business_logistics_view')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as BusinessRequest[];
  },

  // Get single request details
  async getRequestDetails(requestId: string) {
    const { data, error } = await supabase
      .from('business_logistics_view')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error) throw error;
    return data as BusinessRequest;
  },

  // Create new logistics request
  async createRequest(businessId: string, requestData: any) {
    const { data, error } = await supabase
      .from('business_logistics')
      .insert({
        business_id: businessId,
        ...requestData,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Track active delivery
  async trackDelivery(requestId: string) {
    const { data, error } = await supabase
      .from('business_logistics_view')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error) throw error;
    return data as BusinessRequest;
  },

  // Cancel request
  async cancelRequest(requestId: string) {
    const { error } = await supabase
      .from('business_logistics')
      .update({ status: 'cancelled' })
      .eq('id', requestId);

    if (error) throw error;
    return true;
  },
};

export const riderApi = {
  // Get available deliveries for rider
 // Add this to your riderApi object in src/services/api.ts

// Get available deliveries from both normal orders and business logistics
async getAvailableDeliveries(riderId: string) {
  try {
    // 1. Fetch available business logistics orders
    const { data: businessOrders, error: businessError } = await supabase
      .from('business_logistics_view')
      .select('*')
      .eq('status', 'paid')
      .is('rider_id', null)
      .order('created_at', { ascending: true });

    if (businessError) throw businessError;

    // 2. Fetch available normal orders from the main app
    // These are orders with status 'ready' and no rider assigned
    const { data: normalOrders, error: normalError } = await supabase
      .from('orders')
      .select(`
        *,
        vendors (
          name,
          phone,
          address,
          lat,
          lng
        ),
        customer:users!orders_customer_id_fkey (
          name,
          phone
        )
      `)
      .eq('status', 'ready')
      .is('rider_id', null)
      .order('created_at', { ascending: true });

    if (normalError) throw normalError;

    // 3. Format normal orders to match the BusinessRequest interface
    const formattedNormalOrders = (normalOrders || []).map(order => ({
      id: order.id,
      request_number: order.order_number || order.id,
      order_type: 'normal',
      business_name: order.vendors?.name || 'Restaurant',
      business_phone: order.vendors?.phone,
      package_name: 'Food Order',
      package_type: 'food',
      weight_kg: 1,
      quantity: order.items?.length || 1,
      pickup_address: order.vendors?.address || 'Restaurant address',
      pickup_contact_name: order.vendors?.name || 'Restaurant',
      pickup_contact_phone: order.vendors?.phone,
      delivery_address: order.delivery_address?.street || 'Customer address',
      delivery_contact_name: order.customer?.name || 'Customer',
      delivery_contact_phone: order.customer?.phone,
      receiver_phone: order.customer?.phone,
      distance_km: 5, // Calculate based on coordinates
      calculated_fee: order.delivery_fee || 1000,
      rider_share: order.delivery_fee ? order.delivery_fee * 0.5 : 500,
      status: 'paid', // Treat as available
      created_at: order.created_at,
    }));

    // 4. Combine both types and sort by created_at
    const allAvailable = [...(businessOrders || []), ...formattedNormalOrders]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return allAvailable;
  } catch (error) {
    console.error('Error fetching available deliveries:', error);
    throw error;
  }
},


// Add this to your riderApi object in src/services/api.ts

// Get single order details with product images
// In src/services/api.ts, update the getOrderDetails function:

async getOrderDetails(orderId: string, riderId: string) {
  try {
    // Fetch the order with all relations
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        vendors:vendor_id (
          id,
          name,
          phone,
          address,
          lat,
          lng,
          image_url,
          cover_image_url
        ),
        customer:users!orders_customer_id_fkey (
          id,
          name,
          phone,
          email,
          avatar_url
        )
      `)
      .eq('id', orderId)
      .eq('rider_id', riderId)
      .single();

    if (error) throw error;
    if (!order) throw new Error('Order not found');

    // Parse items
    let items = [];
    if (order.items) {
      if (typeof order.items === 'string') {
        items = JSON.parse(order.items);
      } else if (Array.isArray(order.items)) {
        items = order.items;
      }
    }

    // Fetch product images for each item using product_id
    const productIds = items.map((item: any) => item.product_id).filter(Boolean);
    
    let productImages: Record<string, string> = {};
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, image_url')
        .in('id', productIds);

      console.log('Fetched products:', products);
      
      if (products) {
        products.forEach((product: any) => {
          productImages[product.id] = product.image_url;
        });
      }
    }

    // Parse delivery address
    let deliveryAddress = order.delivery_address;
    if (typeof deliveryAddress === 'string') {
      try {
        deliveryAddress = JSON.parse(deliveryAddress);
      } catch (e) {
        deliveryAddress = { street: deliveryAddress };
      }
    }

    // Format the order with all details
    const formattedOrder = {
      id: order.id,
      request_number: order.order_number || order.id,
      order_type: 'normal',
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      
      // Business/Restaurant info
      business_name: order.vendors?.name || 'Restaurant',
      business_phone: order.vendors?.phone,
      
      // Package info
      package_name: 'Food Order',
      package_type: 'food',
      weight_kg: 1,
      quantity: items.length,
      package_description: items.map((i: any) => i.name).join(', '),
      
      // Pickup location (vendor)
      pickup_address: order.vendors?.address || 'Restaurant',
      pickup_latitude: order.vendors?.lat || order.vendors?.latitude,
      pickup_longitude: order.vendors?.lng || order.vendors?.longitude,
      pickup_contact_name: order.vendors?.name || 'Restaurant',
      pickup_contact_phone: order.vendors?.phone,
      
      // Delivery location (customer)
      delivery_address: deliveryAddress?.street || 'Customer address',
      delivery_latitude: deliveryAddress?.latitude,
      delivery_longitude: deliveryAddress?.longitude,
      delivery_contact_name: order.customer?.name || 'Customer',
      delivery_contact_phone: order.customer?.phone,
      receiver_phone: order.customer?.phone,
      
      // Pricing
      distance_km: order.distance_km || 5,
      calculated_fee: order.delivery_fee || 1000,
      rider_share: order.delivery_fee ? order.delivery_fee * 0.5 : 500,
      subtotal: order.subtotal || 0,
      delivery_fee: order.delivery_fee || 0,
      discount: order.discount || 0,
      total: order.total || 0,
      
      // Items with images
      items: items.map((item: any) => ({
        id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        options: item.options || [],
        image_url: productImages[item.product_id] || null,
      })),
      
      // Timestamps
      assigned_at: order.accepted_at || order.updated_at,
      picked_up_at: order.picked_up_at,
      in_transit_at: order.status === 'in_transit' ? order.updated_at : null,
      delivered_at: order.delivered_at,
      
      // Payment
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      
      // Vendor details for reference
      vendor: order.vendors ? {
        id: order.vendors.id,
        name: order.vendors.name,
        phone: order.vendors.phone,
        address: order.vendors.address,
        latitude: order.vendors.lat || order.vendors.latitude,
        longitude: order.vendors.lng || order.vendors.longitude,
        image: order.vendors.image_url,
        cover_image: order.vendors.cover_image_url,
      } : null,

      // Customer details
      customer: order.customer ? {
        id: order.customer.id,
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
        avatar: order.customer.avatar_url,
      } : null,
    };

    console.log('Formatted order with images:', formattedOrder.items);
    return formattedOrder;
  } catch (error) {
    console.error('Error fetching order details:', error);
    throw error;
  }
},

  // Get assigned deliveries for rider
  async getMyDeliveries(riderId: string) {
    const { data, error } = await supabase
      .from('business_logistics_view')
      .select('*')
      .eq('rider_id', riderId)
      .in('status', ['assigned', 'picked_up', 'in_transit'])
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data as BusinessRequest[];
  },

  // Get delivery history
  async getDeliveryHistory(riderId: string) {
    const { data, error } = await supabase
      .from('business_logistics_view')
      .select('*')
      .eq('rider_id', riderId)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false });

    if (error) throw error;
    return data as BusinessRequest[];
  },

  // Get single delivery details
  async getDeliveryDetails(deliveryId: string, riderId: string) {
    const { data, error } = await supabase
      .from('business_logistics_view')
      .select('*')
      .eq('id', deliveryId)
      .eq('rider_id', riderId)
      .single();

    if (error) throw error;
    return data as BusinessRequest;
  },

  // Accept delivery
  async acceptDelivery(deliveryId: string, riderId: string) {
    const { data, error } = await supabase
      .from('business_logistics')
      .update({
        rider_id: riderId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .eq('status', 'paid')
      .is('rider_id', null)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update delivery status
  async updateDeliveryStatus(deliveryId: string, status: string, updates: any = {}) {
    const { data, error } = await supabase
      .from('business_logistics')
      .update({
        status,
        ...updates,
        ...(status === 'picked_up' && { picked_up_at: new Date().toISOString() }),
        ...(status === 'in_transit' && { in_transit_at: new Date().toISOString() }),
        ...(status === 'delivered' && { 
          delivered_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get rider earnings
  async getEarnings(riderId: string) {
    const { data, error } = await supabase
      .from('rider_earnings')
      .select('*')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get rider stats
  async getStats(riderId: string): Promise<RiderStats> {
    // Get today's deliveries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayData } = await supabase
      .from('business_logistics')
      .select('*')
      .eq('rider_id', riderId)
      .eq('status', 'delivered')
      .gte('delivered_at', today.toISOString());

    // Get all deliveries
    const { data: allData } = await supabase
      .from('business_logistics')
      .select('*')
      .eq('rider_id', riderId)
      .eq('status', 'delivered');

    // Get earnings
    const { data: earnings } = await supabase
      .from('rider_earnings')
      .select('*')
      .eq('rider_id', riderId);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);

    const todayEarnings = earnings?.filter(e => 
      new Date(e.created_at) >= today
    ).reduce((sum, e) => sum + e.amount, 0) || 0;

    const monthEarnings = earnings
    ?.filter(e => new Date(e.created_at) >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0) || 0;

  const yearEarnings = earnings
    ?.filter(e => new Date(e.created_at) >= yearStart)
    .reduce((sum, e) => sum + e.amount, 0) || 0;

  // Total withdrawn = sum of positive withdrawals (or negative earnings from withdrawal type)
  const totalWithdrawn = earnings
    ?.filter(e => e.order_type === 'withdrawal' && e.amount < 0)
    .reduce((sum, e) => sum + Math.abs(e.amount), 0) || 0;

    const totalEarnings = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const pendingEarnings = earnings?.filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0) || 0;

 return {
    todayEarnings,
    todayDeliveries: todayData?.length || 0,
    weekEarnings: 0,              // still stubbed — add real week calc if needed
    weekDeliveries: 0,
    monthEarnings,
    monthDeliveries: allData?.length || 0,
    yearDeliveries : allData?.length || 0,
    yearEarnings,
    totalEarnings,
    totalDeliveries: allData?.length || 0,
    rating: 4.8,                  // later: real average from reviews
    availableBalance: totalEarnings - pendingEarnings,
    pendingBalance: pendingEarnings,
    totalWithdrawn,               // ← added
  };
  },
};

export const adminApi = {
  // Get all pending requests
  async getPendingRequests() {
    const { data, error } = await supabase
      .from('business_logistics_view')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as BusinessRequest[];
  },

  // Get all requests
  async getAllRequests() {
    const { data, error } = await supabase
      .from('business_logistics_view')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as BusinessRequest[];
  },

  // Accept request and set fee
  async acceptRequest(requestId: string, fee: number, distance: number) {
    const { error } = await supabase
      .from('business_logistics')
      .update({
        status: 'accepted',
        calculated_fee: fee,
        distance_km: distance,
      })
      .eq('id', requestId);

    if (error) throw error;
    return true;
  },

  // Assign rider to request
  async assignRider(requestId: string, riderId: string, adminId: string) {
    const { error } = await supabase
      .from('business_logistics')
      .update({
        rider_id: riderId,
        status: 'assigned',
        assigned_by: adminId,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'paid');

    if (error) throw error;
    return true;
  },

  // Get available riders
  async getAvailableRiders() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'rider')
      .eq('is_available', true)
      .eq('is_suspended', false);

    if (error) throw error;
    return data;
  },
};