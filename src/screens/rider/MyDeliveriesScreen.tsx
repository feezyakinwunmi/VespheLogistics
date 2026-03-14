import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { useAuth } from '../../hooks/useAuth';
import { useRiderDeliveries } from '../../hooks/useRiderDeliveries';

type TabType = 'active' | 'completed';

export function MyDeliveriesScreen({ navigation }: any) {
  const { user } = useAuth();
  const {
    activeDeliveries,
    deliveryHistory,
    isLoading,
    refreshing,
    refresh,
  } = useRiderDeliveries(user?.id || '');

  const [activeTab, setActiveTab] = useState<TabType>('active');

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      assigned: '#f97316',
      picked_up: '#f97316',
      in_transit: '#f97316',
      delivered: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status: string): keyof typeof Feather.glyphMap => {
    const icons: Record<string, keyof typeof Feather.glyphMap> = {
      assigned: 'truck',
      picked_up: 'package',
      in_transit: 'navigation',
      delivered: 'check-circle',
      cancelled: 'x-circle',
    };
    return icons[status] || 'clock';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderDeliveryCard = (delivery: any) => (
    <TouchableOpacity
      key={delivery.id}
      style={styles.deliveryCard}
      onPress={() =>
        navigation.navigate('DeliveryDetails', {
          id: delivery.id,
          orderType: delivery.order_type,
        })
      }
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.requestNumber}>{delivery.request_number || delivery.id.slice(0, 8)}</Text>
          <Text style={styles.packageName}>{delivery.package_name || 'Delivery'}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(delivery.status) + '20' },
          ]}
        >
          <Feather
            name={getStatusIcon(delivery.status)}
            size={10}
            color={getStatusColor(delivery.status)}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(delivery.status) }]}
          >
            {delivery.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.businessRow}>
        <Feather name="briefcase" size={14} color="#666" />
        <Text style={styles.businessName}>{delivery.business_name || '—'}</Text>
      </View>

      <View style={styles.locations}>
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={12} color="#10b981" />
          <Text style={styles.locationText} numberOfLines={1}>
            Pickup: {delivery.pickup_address || '—'}
          </Text>
        </View>
        <View style={styles.locationRow}>
          <Feather name="flag" size={12} color="#f97316" />
          <Text style={styles.locationText} numberOfLines={1}>
            Delivery: {delivery.delivery_address || '—'}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Feather name="calendar" size={12} color="#666" />
          <Text style={styles.dateText}>
            {delivery.status === 'delivered'
              ? formatDate(delivery.delivered_at || delivery.updated_at)
              : `Assigned ${formatDate(delivery.assigned_at)}`}
          </Text>
        </View>

        <View style={styles.earningContainer}>
          <Feather name="dollar-sign" size={12} color="#10b981" />
          <Text style={styles.earningText}>
            ₦{(delivery.rider_share ?? 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {delivery.status === 'assigned' && (
        <LinearGradient
          colors={['#f97316', '#f43f5e']}
          style={styles.actionPrompt}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Feather name="navigation" size={14} color="#fff" />
          <Text style={styles.actionPromptText}>Tap to start delivery</Text>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Deliveries</Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={20} color="#f97316" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active ({activeDeliveries.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed ({deliveryHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      {(activeTab === 'active' && activeDeliveries.length > 0) && (
        <View style={styles.statsSummary}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeDeliveries.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              ₦{activeDeliveries.reduce((sum, d) => sum + (d.rider_share ?? 0), 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Potential Earnings</Text>
          </View>
        </View>
      )}

      {(activeTab === 'completed' && deliveryHistory.length > 0) && (
        <View style={styles.statsSummary}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{deliveryHistory.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              ₦{deliveryHistory.reduce((sum, d) => sum + (d.rider_share ?? 0), 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#f97316" />
        }
      >
        {activeTab === 'active' ? (
          activeDeliveries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="truck" size={48} color="#666" />
              <Text style={styles.emptyTitle}>No Active Deliveries</Text>
              <Text style={styles.emptyText}>
                Accept a delivery to get started
              </Text>
              <TouchableOpacity
                style={styles.findButton}
                onPress={() => navigation.navigate('Available')}
              >
                <Text style={styles.findButtonText}>Find Deliveries</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeDeliveries.map(renderDeliveryCard)
          )
        ) : (
          deliveryHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="clock" size={48} color="#666" />
              <Text style={styles.emptyTitle}>No Completed Deliveries Yet</Text>
              <Text style={styles.emptyText}>
                Your finished deliveries will appear here
              </Text>
            </View>
          ) : (
            deliveryHistory.map(renderDeliveryCard)
          )
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#f97316',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#f97316',
  },
  statsSummary: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f97316',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  deliveryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestNumber: {
    fontSize: 12,
    color: '#f97316',
    marginBottom: 2,
  },
  packageName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  businessName: {
    fontSize: 13,
    color: '#666',
  },
  locations: {
    gap: 4,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#666',
  },
  earningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  earningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionPromptText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    marginTop: 16,
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