import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'system' | 'promo';
  read: boolean;
  created_at: string;
  data?: { orderId: string; orderType: 'business' | 'normal' };
}

export function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();
    const unsubscribe = subscribeToNotifications();

    return () => unsubscribe();
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // 1. Generate base notifications (same as before)
      const baseNotifications: Notification[] = [];

      // Earnings
      const { data: earnings } = await supabase
        .from('rider_earnings')
        .select('*')
        .eq('rider_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      earnings?.forEach(e => {
        baseNotifications.push({
          id: `earning-${e.id}`,
          title: e.amount > 0 ? 'Payment Received' : 'Withdrawal Processed',
          message: e.amount > 0
            ? `You earned ₦${(e.amount ?? 0).toLocaleString()}`
            : `Withdrawal of ₦${Math.abs(e.amount ?? 0).toLocaleString()} processed`,
          type: 'payment',
          read: false, // will be overridden
          created_at: e.created_at ?? new Date().toISOString(),
        });
      });

      // Business deliveries (assigned)
      const { data: deliveries } = await supabase
        .from('business_logistics_view')
        .select('*')
        .eq('rider_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      deliveries?.forEach(d => {
        if (d.status === 'assigned') {
          baseNotifications.push({
            id: `delivery-${d.id}`,
            title: 'New Delivery Assigned',
            message: `Assigned to deliver ${d.package_name ?? 'package'}`,
            type: 'order',
            read: false,
            created_at: d.assigned_at || d.created_at,
            data: { orderId: d.id, orderType: 'business' },
          });
        }
      });

      // Normal orders (picked_up as example)
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('rider_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      orders?.forEach(o => {
        if (o.status === 'picked_up') {
          baseNotifications.push({
            id: `order-${o.id}`,
            title: 'Order Picked Up',
            message: `Picked up from ${o.vendors?.name ?? 'restaurant'}`,
            type: 'order',
            read: false,
            created_at: o.picked_up_at || o.created_at,
            data: { orderId: o.id, orderType: 'normal' },
          });
        }
      });

      // Sort newest first
      baseNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // 2. Fetch read status from DB
      const { data: readStatuses } = await supabase
        .from('notification_reads')
        .select('notification_id, read')
        .eq('user_id', user.id)
        .in('notification_id', baseNotifications.map(n => n.id));

      // 3. Merge read status
      const readMap = new Map(readStatuses?.map(r => [r.notification_id, r.read]) ?? []);

      const finalNotifications = baseNotifications.map(n => ({
        ...n,
        read: readMap.get(n.id) ?? false,
      }));

      setNotifications(finalNotifications);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load notifications',
        position: 'top',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user?.id) return () => {};

    const channel = supabase
      .channel(`rider-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'business_logistics',
          filter: `rider_id=eq.${user.id}`,
        },
        payload => {
          if (payload.new.status === 'assigned') {
            const newNotif: Notification = {
              id: `delivery-${payload.new.id}`,
              title: 'New Delivery Assigned',
              message: 'Check your active deliveries',
              type: 'order',
              read: false,
              created_at: new Date().toISOString(),
              data: { orderId: payload.new.id, orderType: 'business' },
            };

            setNotifications(prev => {
              // Avoid duplicates
              if (prev.some(n => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });

            Toast.show({
              type: 'info',
              text1: 'New Delivery Assigned!',
              position: 'top',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (id: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('notification_reads')
        .upsert(
          {
            user_id: user.id,
            notification_id: id,
            read: true,
          },
          { onConflict: 'user_id, notification_id' }
        );

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // silent fail - will sync next refresh
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id || notifications.length === 0) return;

    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);

      if (unreadIds.length === 0) return;

      // Batch upsert
      const updates = unreadIds.map(id => ({
        user_id: user.id,
        notification_id: id,
        read: true,
      }));

      await supabase.from('notification_reads').upsert(updates, {
        onConflict: 'user_id, notification_id',
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

      Toast.show({
        type: 'success',
        text1: 'All marked as read',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Failed to mark as read',
        position: 'top',
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);

    if (notification.data?.orderId) {
      navigation.navigate('DeliveryDetails', {
        id: notification.data.orderId,
        orderType: notification.data.orderType,
      });
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'order': return 'truck';
      case 'payment': return 'dollar-sign';
      case 'system': return 'info';
      case 'promo': return 'gift';
      default: return 'bell';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'order': return '#f97316';
      case 'payment': return '#10b981';
      case 'system': return '#3b82f6';
      case 'promo': return '#8b5cf6';
      default: return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => !n.read);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markReadButton}>
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="bell-off" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>
              {filter === 'unread' ? 'All caught up' : 'Updates for assignments, payments & more'}
            </Text>
          </View>
        ) : (
          filteredNotifications.map(notification => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.read && styles.unreadCard,
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getColorForType(notification.type) + '20' },
                ]}
              >
                <Feather
                  name={getIconForType(notification.type)}
                  size={20}
                  color={getColorForType(notification.type)}
                />
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {notification.message}
                </Text>
                <Text style={styles.notificationTime}>
                  {formatDate(notification.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles (unchanged from your version - looks good)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  markReadButton: { paddingHorizontal: 12, paddingVertical: 6 },
  markReadText: { color: '#f97316', fontSize: 13, fontWeight: '500' },
  filterTabs: { flexDirection: 'row', padding: 16, gap: 8 },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterTabActive: { borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)' },
  filterText: { fontSize: 14, color: '#666', fontWeight: '500' },
  filterTextActive: { color: '#f97316' },
  content: { flex: 1, paddingHorizontal: 16 },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  unreadCard: { backgroundColor: 'rgba(249,115,22,0.08)', borderColor: '#f97316' },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: { flex: 1 },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316' },
  notificationMessage: { fontSize: 13, color: '#aaa', marginBottom: 6, lineHeight: 18 },
  notificationTime: { fontSize: 11, color: '#666' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  bottomPadding: { height: 20 },
});