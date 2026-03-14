// src/hooks/useRiderDeliveries.ts

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { BusinessRequest, RiderStats } from '../types';

interface CombinedDelivery {
  id: string;
  request_number: string;
  order_type: 'business' | 'normal';
  business_name: string;
  business_phone?: string;
  package_name: string;
  package_type: string;
  weight_kg: number;
  quantity: number;
  package_description?: string;
  pickup_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  pickup_instructions?: string;
  delivery_address: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  delivery_instructions?: string;
  receiver_phone?: string;
  distance_km?: number;
  calculated_fee: number;
  rider_share: number;
  status: string;
  assigned_at?: string;
  picked_up_at?: string;
  in_transit_at?: string;
  delivered_at?: string;
  completed_at?: string;
  created_at: string;
}

const isValidUUID = (id: string | undefined): id is string =>
  !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function useRiderDeliveries(riderId: string | undefined) {
  const [activeDeliveries, setActiveDeliveries] = useState<CombinedDelivery[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<CombinedDelivery[]>([]);
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!riderId || !isValidUUID(riderId)) {
      setIsLoading(false);
      return;
    }

    fetchAll();
    const unsubscribe = subscribeToUpdates();
    fetchRiderStatus();

    return unsubscribe;
  }, [riderId]);

  const fetchRiderStatus = async () => {
    if (!riderId || !isValidUUID(riderId)) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_available')
        .eq('id', riderId)
        .single();

      if (error) throw error;
      setIsOnline(data?.is_available ?? false);
    } catch {
      // silent fail in production
    }
  };

  const fetchAll = async () => {
    if (!riderId || !isValidUUID(riderId)) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setRefreshing(true);

    try {
      // ── Active Business ──
      const { data: businessActive } = await supabase
        .from('business_logistics_view')
        .select('*')
        .eq('rider_id', riderId)
        .in('status', ['assigned', 'picked_up', 'in_transit'])
        .order('assigned_at', { ascending: false });

      // ── Active Normal ──
      const { data: normalActive } = await supabase
        .from('orders')
        .select(`
          *,
          vendors:vendor_id (name, phone, address, lat, lng),
          customer:users!orders_customer_id_fkey (name, phone)
        `)
        .eq('rider_id', riderId)
        .in('status', ['confirmed', 'preparing', 'ready', 'picked_up', 'in_transit'])
        .order('updated_at', { ascending: false });

      // Format normal active
      const formattedNormalActive = (normalActive || []).map(order => {
        let deliveryAddress = order.delivery_address;
        if (typeof deliveryAddress === 'string') {
          try {
            deliveryAddress = JSON.parse(deliveryAddress);
          } catch {}
        }

        return {
          id: order.id,
          request_number: order.order_number || order.id,
          order_type: 'normal' as const,
          business_name: order.vendors?.name || 'Restaurant',
          business_phone: order.vendors?.phone,
          package_name: 'Food Order',
          package_type: 'food',
          weight_kg: 1,
          quantity: Array.isArray(order.items) ? order.items.length : 1,
          package_description: Array.isArray(order.items)
            ? order.items.map((i: any) => i.name).join(', ')
            : '',
          pickup_address: order.vendors?.address || 'Restaurant',
          pickup_latitude: order.vendors?.lat,
          pickup_longitude: order.vendors?.lng,
          pickup_contact_name: order.vendors?.name || 'Restaurant',
          pickup_contact_phone: order.vendors?.phone,
          delivery_address: deliveryAddress?.street || 'Customer address',
          delivery_latitude: deliveryAddress?.latitude,
          delivery_longitude: deliveryAddress?.longitude,
          delivery_contact_name: order.customer?.name || 'Customer',
          delivery_contact_phone: order.customer?.phone,
          receiver_phone: order.customer?.phone,
          distance_km: order.distance_km || 5,
          calculated_fee: order.delivery_fee || 1000,
          rider_share: order.delivery_fee ? order.delivery_fee * 0.5 : 500,
          status: order.status,
          assigned_at: order.accepted_at || order.updated_at,
          picked_up_at: order.picked_up_at,
          in_transit_at: order.status === 'in_transit' ? order.updated_at : null,
          created_at: order.created_at,
        } as CombinedDelivery;
      });

      // Sort active (null assigned_at last)
      const allActive = [...(businessActive || []), ...formattedNormalActive].sort((a, b) => {
        const timeA = a.assigned_at ? new Date(a.assigned_at).getTime() : -Infinity;
        const timeB = b.assigned_at ? new Date(b.assigned_at).getTime() : -Infinity;
        return timeB - timeA;
      });

      setActiveDeliveries(allActive);

      // ── History ──
      const { data: businessHistory } = await supabase
        .from('business_logistics_view')
        .select('*')
        .eq('rider_id', riderId)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false });

      const { data: normalHistory } = await supabase
        .from('orders')
        .select(`
          *,
          vendors:vendor_id (name, phone),
          customer:users!orders_customer_id_fkey (name, phone)
        `)
        .eq('rider_id', riderId)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false });

      const formattedNormalHistory = (normalHistory || []).map(order => {
        let deliveryAddress = order.delivery_address;
        if (typeof deliveryAddress === 'string') {
          try {
            deliveryAddress = JSON.parse(deliveryAddress);
          } catch {}
        }

        return {
          id: order.id,
          request_number: order.order_number || order.id,
          order_type: 'normal' as const,
          business_name: order.vendors?.name || 'Restaurant',
          business_phone: order.vendors?.phone,
          package_name: 'Food Order',
          package_type: 'food',
          weight_kg: 1,
          quantity: Array.isArray(order.items) ? order.items.length : 1,
          pickup_address: order.vendors?.address || 'Restaurant',
          delivery_address: deliveryAddress?.street || 'Customer address',
          delivery_contact_name: order.customer?.name || 'Customer',
          calculated_fee: order.delivery_fee || 1000,
          rider_share: order.delivery_fee ? order.delivery_fee * 0.5 : 500,
          status: order.status,
          delivered_at: order.delivered_at || order.updated_at,
          created_at: order.created_at,
        } as CombinedDelivery;
      });

      const allHistory = [...(businessHistory || []), ...formattedNormalHistory].sort((a, b) => {
        const timeA = a.delivered_at ? new Date(a.delivered_at).getTime() : -Infinity;
        const timeB = b.delivered_at ? new Date(b.delivered_at).getTime() : -Infinity;
        return timeB - timeA;
      });

      setDeliveryHistory(allHistory);

      // Calculate stats
      await calculateStats(allActive, allHistory);
    } catch {
      // silent fail in production
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = async (active: CombinedDelivery[], history: CombinedDelivery[]) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);

      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);

      // Withdrawals
      const { data: pendingW } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('user_id', riderId)
        .eq('user_type', 'rider')
        .eq('status', 'pending');

      const { data: completedW } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('user_id', riderId)
        .eq('user_type', 'rider')
        .eq('status', 'completed');

      const pendingWithdrawals = pendingW?.reduce((s, w) => s + (w.amount ?? 0), 0) ?? 0;
      const totalWithdrawn = completedW?.reduce((s, w) => s + (w.amount ?? 0), 0) ?? 0;

      // Earnings & deliveries from history
      const totalEarnings = history.reduce((s, d) => s + (d.rider_share ?? 0), 0);

      const todayEarnings = history
        .filter(d => new Date(d.delivered_at || d.created_at) >= today)
        .reduce((s, d) => s + (d.rider_share ?? 0), 0);

      const todayDeliveries = history.filter(d => new Date(d.delivered_at || d.created_at) >= today).length;

      const weekEarnings = history
        .filter(d => new Date(d.delivered_at || d.created_at) >= weekAgo)
        .reduce((s, d) => s + (d.rider_share ?? 0), 0);

      const weekDeliveries = history.filter(d => new Date(d.delivered_at || d.created_at) >= weekAgo).length;

      const monthEarnings = history
        .filter(d => new Date(d.delivered_at || d.created_at) >= monthAgo)
        .reduce((s, d) => s + (d.rider_share ?? 0), 0);

      const monthDeliveries = history.filter(d => new Date(d.delivered_at || d.created_at) >= monthAgo).length;

      const yearEarnings = history
        .filter(d => new Date(d.delivered_at || d.created_at) >= yearAgo)
        .reduce((s, d) => s + (d.rider_share ?? 0), 0);

      const yearDeliveries = history.filter(d => new Date(d.delivered_at || d.created_at) >= yearAgo).length;

      const availableBalance = totalEarnings - totalWithdrawn - pendingWithdrawals;

      setStats({
        todayEarnings,
        todayDeliveries,
        weekEarnings,
        weekDeliveries,
        monthEarnings,
        monthDeliveries,
        yearEarnings,
        yearDeliveries,
        totalEarnings,
        totalDeliveries: history.length,
        rating: 4.8,
        availableBalance,
        pendingBalance: pendingWithdrawals,
        totalWithdrawn,
      });
    } catch {
      // silent fail
    }
  };

  const subscribeToUpdates = () => {
    if (!riderId || !isValidUUID(riderId)) return () => {};

    const businessChannel = supabase
      .channel(`rider-business-${riderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_logistics', filter: `rider_id=eq.${riderId}` }, fetchAll)
      .subscribe();

    const ordersChannel = supabase
      .channel(`rider-orders-${riderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `rider_id=eq.${riderId}` }, fetchAll)
      .subscribe();

    return () => {
      businessChannel.unsubscribe();
      ordersChannel.unsubscribe();
    };
  };

  const refresh = () => {
    setRefreshing(true);
    fetchAll();
    fetchRiderStatus();
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string, orderType?: 'business' | 'normal') => {
    try {
      const now = new Date().toISOString();
      const updates: any = { status: newStatus };

      if (newStatus === 'picked_up') updates.picked_up_at = now;
      if (newStatus === 'in_transit') updates.in_transit_at = now;
      if (newStatus === 'delivered') {
        updates.delivered_at = now;
        updates.completed_at = now;
      }

      let error;

      if (orderType === 'business') {
        ({ error } = await supabase
          .from('business_logistics')
          .update(updates)
          .eq('id', deliveryId)
          .eq('rider_id', riderId));
      } else {
        ({ error } = await supabase
          .from('orders')
          .update({
            status: newStatus,
            updated_at: now,
            ...(newStatus === 'picked_up' && { picked_up_at: now }),
            ...(newStatus === 'delivered' && { delivered_at: now }),
          })
          .eq('id', deliveryId)
          .eq('rider_id', riderId));
      }

      if (error) throw error;

      // Record earning for business delivery on complete
      if (newStatus === 'delivered' && orderType === 'business') {
        const delivery = activeDeliveries.find(d => d.id === deliveryId);
        if (delivery?.rider_share) {
          await supabase.from('rider_earnings').insert({
            rider_id: riderId,
            order_id: deliveryId,
            amount: delivery.rider_share,
            order_type: 'business',
            status: 'pending',
            created_at: now,
          });
        }
      }

      await fetchAll();
      return { success: true };
    } catch {
      return { success: false };
    }
  };

  const toggleOnlineStatus = async (online: boolean) => {
    if (!online && activeDeliveries.length > 0) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_available: online })
        .eq('id', riderId);

      if (error) throw error;
      setIsOnline(online);
      return true;
    } catch {
      return false;
    }
  };

  const acceptDelivery = async (deliveryId: string, orderType?: 'business' | 'normal') => {
    try {
      let result;

      if (orderType === 'business') {
        result = await supabase
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
      } else {
        result = await supabase
          .from('orders')
          .update({
            rider_id: riderId,
            status: 'assigned',
            updated_at: new Date().toISOString(),
          })
          .eq('id', deliveryId)
          .eq('status', 'ready')
          .is('rider_id', null)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      await fetchAll();
      return { success: true };
    } catch {
      return { success: false };
    }
  };

  return {
    activeDeliveries,
    deliveryHistory,
    stats,
    isLoading,
    refreshing,
    isOnline,
    refresh,
    updateDeliveryStatus,
    toggleOnlineStatus,
    acceptDelivery,
  };
}