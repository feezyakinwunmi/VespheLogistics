import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { supabase } from '../../services/supabase';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRiderDeliveries } from '../../hooks/useRiderDeliveries';
import { useFocusEffect } from '@react-navigation/native';


export function RiderDashboardScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
const [unreadCount, setUnreadCount] = useState(0);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
  };

  const {
    activeDeliveries,
    stats,
    isLoading,
    refreshing,
    refresh,
    isOnline,
    toggleOnlineStatus,
  } = useRiderDeliveries(user?.id || '');

  const handleToggleOnline = () => {
    if (!isOnline && activeDeliveries.length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Go Offline',
        text2: 'You have active deliveries. Complete them before going offline.',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    toggleOnlineStatus(!isOnline);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      // Business logistics statuses
      assigned: '#f97316',
      picked_up: '#f97316',
      in_transit: '#f97316',
      // Normal order statuses
      confirmed: '#3b82f6',
      preparing: '#f97316',
      ready: '#10b981',
      delivered: '#10b981',
      cancelled: '#ef4444',
      scheduled: '#8b5cf6',
      pending: '#f59e0b',
    };
    return colors[status] || '#666';
  };

  // Fetch unread messages for customer
const fetchUnreadMessages = async () => {
  if (!user?.id) return;
  
  try {
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .contains('participants', [user.id]);

    if (convError || !conversations || conversations.length === 0) {
      setUnreadCount(0);
      return;
    }

    const conversationIds = conversations.map(c => c.id);

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('read', false)
      .neq('sender_id', user.id);

    if (!error) {
      setUnreadCount(count || 0);
    }
  } catch (error) {
    console.error('Error fetching unread messages:', error);
  }
};
// Fetch unread messages on mount
useEffect(() => {
  fetchUnreadMessages();
  
  // Real-time subscription for new messages
  const subscription = supabase
    .channel('customer-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      () => {
        fetchUnreadMessages();
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [user?.id]);

// Refresh unread count when screen comes into focus
useFocusEffect(
  React.useCallback(() => {
    fetchUnreadMessages();
  }, [])
);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#f97316" />
        }
      >
        {/* Header with Online Toggle */}
        <LinearGradient
          colors={['black', 'black']}
          style={styles.header}
        >
          <View>
            <Image
              source={require('../../assets/logistic.png')}
              style={{ width: 80, height: 60 }}
              resizeMode="contain"
            />
            
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.riderName}>{user?.name || 'Rider'}</Text>
           

     
            </View>
          </View>

          <View style={styles.headericon}>

          <TouchableOpacity
            style={[
              styles.onlineToggle,
              { backgroundColor: isOnline ? '#10b981' : '#ef4444' },
            ]}
            onPress={handleToggleOnline}
          >
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </TouchableOpacity>     
             <TouchableOpacity 
      onPress={() => navigation.navigate('Message')}
      style={styles.messageButton}
    >
      <Feather name="message-circle" size={22} color="#f97316" />
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
    </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Feather name="save" size={20} color="gold" />
            <Text style={styles.statValue}>
              ₦{(stats?.todayEarnings ?? 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>

          <View style={styles.statCard}>
            <Feather name="truck" size={20} color="gold" />
            <Text style={styles.statValue}>{stats?.todayDeliveries ?? 0}</Text>
            <Text style={styles.statLabel}>Deliveries Today</Text>
          </View>

          <View style={styles.statCard}>
            <Feather name="star" size={20} color="gold" />
            <Text style={styles.statValue}>{stats?.rating ?? 0}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceTitle}>Available Balance</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Earnings')}>
              <Text style={styles.viewAllText}>View Details</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceAmount}>
            ₦{(stats?.availableBalance ?? 0).toLocaleString()}
          </Text>

          <View style={styles.balanceFooter}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Pending</Text>
              <Text style={styles.balanceItemValue}>
                ₦{(stats?.pendingBalance ?? 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.balanceDivider} />

            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Total Earned</Text>
              <Text style={styles.balanceItemValue}>
                ₦{(stats?.totalEarnings ?? 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Available')}
          >
            <LinearGradient
              colors={['#f97316', 'black']}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="package" size={24} color="#fff" />
              <Text style={styles.actionText}>Find Deliveries</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('MyDeliveries')}
          >
            <View style={styles.actionBorder}>
              <Feather name="list" size={24} color="#f97316" />
              <Text style={styles.actionBorderText}>My Deliveries</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Active Deliveries Section */}
        {activeDeliveries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Deliveries</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyDeliveries')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {activeDeliveries.slice(0, 2).map((delivery) => (
              <TouchableOpacity
                key={delivery.id}
                style={styles.deliveryCard}
                onPress={() => {
                  navigation.navigate('DeliveryDetails', {
                    id: delivery.id,
                    orderType: delivery.order_type,
                  });
                }}
              >
                {/* Order type badge */}
                <View
                  style={[
                    styles.orderTypeBadge,
                    { backgroundColor: delivery.order_type === 'normal' ? 'transparent' : 'transparent' },
                  ]}
                >
                  <Feather
                    name={delivery.order_type === 'normal' ? 'coffee' : 'briefcase'}
                    size={12}
                    color={delivery.order_type === 'normal' ? 'gold' : '#10b981'}
                  />
                  <Text
                    style={[
                      styles.orderTypeText,
                      { color: delivery.order_type === 'normal' ? 'gold' : '#10b981' },
                    ]}
                  >
                    {delivery.order_type === 'normal' ? 'FOOD' : 'BUSINESS'}
                  </Text>
                </View>

                <View style={styles.deliveryHeader}>
                  <View>
                    <Text style={styles.deliveryNumber}>{delivery.request_number}</Text>
                    <Text style={styles.deliveryPackage}>{delivery.package_name}</Text>
                  </View>

                  <View
                    style={[
                      styles.deliveryStatus,
                      { backgroundColor: getStatusColor(delivery.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deliveryStatusText,
                        { color: getStatusColor(delivery.status) },
                      ]}
                    >
                      {delivery.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.deliveryInfo}>
                  <View style={styles.infoRow}>
                    <Feather name="map-pin" size={12} color="#10b981" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      Pickup: {delivery.pickup_address}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Feather name="flag" size={12} color="#f97316" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      Delivery: {delivery.delivery_address}
                    </Text>
                  </View>
                </View>

                <View style={styles.deliveryFooter}>
                  <View style={styles.feeContainer}>
                    <Text style={styles.feeLabel}>Earnings:</Text>
                    <Text style={styles.feeAmount}>
                      ₦{delivery.rider_share?.toLocaleString() ?? '—'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.trackButton}
                    onPress={() =>
                      navigation.navigate('TrackDelivery', {
                        id: delivery.id,
                        orderType: delivery.order_type,
                      })
                    }
                  >
                    <Text style={styles.trackButtonText}>Track</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Offline Message */}
        {!isOnline && activeDeliveries.length === 0 && (
          <View style={styles.offlineContainer}>
            <Feather name="wifi-off" size={48} color="#666" />
            <Text style={styles.offlineTitle}>You're Offline</Text>
            <Text style={styles.offlineText}>
              Go online to start receiving delivery requests
            </Text>
            <TouchableOpacity
              style={styles.goOnlineButton}
              onPress={() => toggleOnlineStatus(true)}
            >
              <Text style={styles.goOnlineButtonText}>Go Online</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* No Active Deliveries */}
        {isOnline && activeDeliveries.length === 0 && (
          <View style={styles.emptyContainer}>
            <Feather name="package" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No Active Deliveries</Text>
            <Text style={styles.emptyText}>
              Check available deliveries or wait for new requests
            </Text>
            <TouchableOpacity
              style={styles.findButton}
              onPress={() => navigation.navigate('Available')}
            >
              <Text style={styles.findButtonText}>Find Deliveries</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

    
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────
// Styles remain almost identical — only removed unused "locactionGradient"
// ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  headericon:{
flexDirection:'row',
gap:10
  },
  messageHeader: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  paddingHorizontal: 16,
  paddingVertical: 8,
  backgroundColor: '#0a0a0a',
},
messageButton: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: '#1a1a1a',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
},
unreadBadge: {
  position: 'absolute',
  top: -2,
  right: -2,
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  backgroundColor: '#ef4444',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 4,
},
unreadBadgeText: {
  fontSize: 10,
  fontWeight: 'bold',
  color: '#fff',
},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  riderName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  onlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  balanceCard: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceTitle: {
    fontSize: 14,
    color: '#666',
  },
  viewAllText: {
    fontSize: 12,
    color: '#f97316',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  balanceFooter: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceItemLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  balanceItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  balanceDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  actionGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  actionBorder: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f97316',
    backgroundColor: 'rgba(249,115,22,0.1)',
  },
  actionBorderText: {
    color: '#f97316',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  seeAll: {
    color: '#f97316',
    fontSize: 13,
  },
  deliveryCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  orderTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryNumber: {
    fontSize: 12,
    color: '#f97316',
    marginBottom: 2,
  },
  deliveryPackage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  deliveryStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deliveryStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  deliveryInfo: {
    gap: 6,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feeLabel: {
    fontSize: 12,
    color: '#666',
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  trackButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#f97316',
    borderRadius: 6,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineContainer: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
  },
  offlineText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  goOnlineButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goOnlineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  findButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  findButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },

 
});

export default RiderDashboardScreen;