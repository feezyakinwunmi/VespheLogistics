import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useAuth } from '../../hooks/useAuth';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { supabase } from '../../services/supabase';

interface ActiveDelivery {
  id: string;
  displayId: string;
  status: string;
  type: 'business' | 'normal';
}

export function LiveTrackingScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { orderId } = route.params || {};

  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(orderId);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setAuthReady(true);
    }
  }, [user]);

  const {
    location,
    isTracking,
    permissionGranted,
    isReady,
    startTracking,
    stopTracking,
    errorMsg,
  } = useLocationTracking({
    riderId: user?.id || '',
    orderId: selectedOrderId,
    updateInterval: 10000,
  });

  useEffect(() => {
    if (authReady) {
      fetchActiveDeliveries();
    }
  }, [authReady]);

  // Auto-start tracking when everything is ready and a delivery is selected
  useEffect(() => {
    if (permissionGranted && !isTracking && isReady && selectedOrderId) {
      startTracking();
    }
  }, [permissionGranted, isReady, selectedOrderId]);

  // Show any tracking errors as toast
  useEffect(() => {
    if (errorMsg) {
      Toast.show({
        type: 'error',
        text1: 'Tracking Error',
        text2: errorMsg,
        position: 'top',
        visibilityTime: 5000,
      });
    }
  }, [errorMsg]);

  const fetchActiveDeliveries = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data: businessActive, error: bError } = await supabase
        .from('business_logistics')
        .select('id, request_number, status')
        .eq('rider_id', user.id)
        .in('status', ['assigned', 'picked_up', 'in_transit']);

      if (bError) throw bError;

      const { data: normalActive, error: nError } = await supabase
        .from('orders')
        .select('id, order_number, status')
        .eq('rider_id', user.id)
        .in('status', ['picked_up', 'in_transit']);

      if (nError) throw nError;

      const allActive: ActiveDelivery[] = [
        ...(businessActive || []).map(d => ({
          id: d.id,
          displayId: d.request_number || d.id.slice(0, 8),
          status: d.status,
          type: 'business' as const,
        })),
        ...(normalActive || []).map(o => ({
          id: o.id,
          displayId: o.order_number || o.id.slice(0, 8),
          status: o.status,
          type: 'normal' as const,
        })),
      ];

      setActiveDeliveries(allActive);

      // Auto-select first if none pre-selected
      if (!selectedOrderId && allActive.length > 0) {
        setSelectedOrderId(allActive[0].id);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load active deliveries',
        text2: 'Pull to refresh or check your connection',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTracking = (value: boolean) => {
    if (value) {
      if (!selectedOrderId) {
        Toast.show({
          type: 'info',
          text1: 'Select a delivery first',
          text2: 'Choose an active delivery to start sharing location',
          position: 'top',
        });
        return;
      }
      startTracking();
    } else {
      stopTracking();
    }
  };

  const handleOrderSelect = (deliveryId: string) => {
    setSelectedOrderId(deliveryId);
    // Restart tracking with new order
    if (isTracking) {
      stopTracking();
      setTimeout(() => startTracking(), 600);
    }
  };

  if (!authReady || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading tracking...</Text>
      </View>
    );
  }

  const hasActiveDeliveries = activeDeliveries.length > 0;
  const canToggle = permissionGranted && !!selectedOrderId;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Permission Warning */}
        {!permissionGranted && (
          <View style={styles.permissionCard}>
            <Feather name="alert-circle" size={24} color="#ef4444" />
            <Text style={styles.permissionText}>
              Location permission required for live tracking
            </Text>
          </View>
        )}

        {/* Tracking Control Card */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.trackingTitle}>Live Location Sharing</Text>
              <Text style={styles.trackingSubtitle}>
                {hasActiveDeliveries
                  ? isTracking
                    ? 'Location shared every 10 seconds'
                    : selectedOrderId
                      ? 'Share live location for selected delivery'
                      : 'Select a delivery to enable sharing'
                  : 'No active deliveries — accept one to share location'}
              </Text>
            </View>

            <Switch
              value={isTracking}
              onValueChange={toggleTracking}
              trackColor={{ false: '#2a2a2a', true: '#f97316' }}
              thumbColor={isTracking ? '#fff' : '#666'}
              disabled={!canToggle}
            />
          </View>

          {/* Status Indicator */}
          {canToggle && (
            <View style={styles.trackingStatus}>
              <View
                style={[
                  styles.statusDot,
                  isTracking ? styles.statusDotActive : styles.statusDotInactive,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  isTracking ? styles.statusTextActive : styles.statusTextInactive,
                ]}
              >
                {isTracking ? 'Sharing live location' : 'Ready to share — toggle on'}
              </Text>
            </View>
          )}
        </View>

        {/* Active Deliveries */}
        {hasActiveDeliveries ? (
          <View style={styles.deliveriesCard}>
            <Text style={styles.deliveriesTitle}>Active Deliveries</Text>
            <Text style={styles.deliveriesSubtitle}>Select delivery to track</Text>

            {activeDeliveries.map(delivery => (
              <TouchableOpacity
                key={delivery.id}
                style={[
                  styles.deliveryItem,
                  selectedOrderId === delivery.id && styles.deliveryItemSelected,
                ]}
                onPress={() => handleOrderSelect(delivery.id)}
              >
                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryId}>{delivery.displayId}</Text>
                  <View style={styles.deliveryMeta}>
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: delivery.type === 'business' ? '#f9731620' : '#10b98120' },
                      ]}
                    >
                      <Feather
                        name={delivery.type === 'business' ? 'briefcase' : 'coffee'}
                        size={10}
                        color={delivery.type === 'business' ? '#f97316' : '#10b981'}
                      />
                      <Text
                        style={[
                          styles.typeText,
                          { color: delivery.type === 'business' ? '#f97316' : '#10b981' },
                        ]}
                      >
                        {delivery.type.toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            delivery.status === 'in_transit' ? '#f9731620' : '#f59e0b20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: delivery.status === 'in_transit' ? '#f97316' : '#f59e0b' },
                        ]}
                      >
                        {delivery.status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {selectedOrderId === delivery.id && (
                  <Feather name="check-circle" size={20} color="#10b981" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Feather name="package" size={40} color="#666" />
            <Text style={styles.emptyTitle}>No active deliveries</Text>
            <Text style={styles.emptyText}>
              Accept or start a delivery to enable live location sharing
            </Text>
          </View>
        )}

        {/* Info Note */}
        <View style={styles.infoCard}>
          <Feather name="info" size={16} color="#f97316" />
          <Text style={styles.infoText}>
            When enabled, your location is shared in real-time with the customer and vendor every 10 seconds. This improves transparency and trust.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    marginTop: 12,
    fontSize: 14,
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
  content: {
    flex: 1,
    padding: 16,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  permissionText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 13,
  },
  trackingCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  trackingSubtitle: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  trackingStatus: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotActive: {
    backgroundColor: '#10b981',
  },
  statusDotInactive: {
    backgroundColor: '#666',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#10b981',
  },
  statusTextInactive: {
    color: '#666',
  },
  deliveriesCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  deliveriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  deliveriesSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  deliveryItemSelected: {
    borderWidth: 1,
    borderColor: '#f97316',
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  deliveryMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
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
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249,115,22,0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#aaa',
    lineHeight: 18,
  },
});