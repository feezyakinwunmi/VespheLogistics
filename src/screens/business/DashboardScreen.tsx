import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { useAuth } from '../../hooks/useAuth';
import { businessApi } from '../../services/api';
import { BusinessRequest } from '../../types';

const { width } = Dimensions.get('window');

export function BusinessDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchRequests();
    }
  }, [user?.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchRequests();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchRequests = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await businessApi.getMyRequests(user.id, 1, 50);
      setRequests(data || []);
    } catch (err) {
      setError('Failed to load requests');
      Toast.show({
        type: 'error',
        text1: 'Failed to load dashboard',
        text2: 'Pull down to retry',
        position: 'top',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    active: requests.filter(r => ['accepted', 'paid', 'assigned', 'picked_up', 'in_transit'].includes(r.status)).length,
    delivered: requests.filter(r => r.status === 'delivered').length,
    totalSpent: requests.reduce((sum, r) => sum + (r.calculated_fee || 0), 0),
  };

  const recentRequests = requests.slice(0, 3);
  const hasActiveDelivery = requests.some(r => ['assigned', 'picked_up', 'in_transit'].includes(r.status));

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      accepted: '#3B82F6',
      paid: '#8B5CF6',
      assigned: '#10B981',
      picked_up: '#F97316',
      in_transit: '#F97316',
      delivered: '#10B981',
      cancelled: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusIcon = (status: string): keyof typeof Feather.glyphMap => {
    const icons: Record<string, keyof typeof Feather.glyphMap> = {
      pending: 'clock',
      accepted: 'check-circle',
      paid: 'credit-card',
      assigned: 'user-check',
      picked_up: 'package',
      in_transit: 'navigation',
      delivered: 'check',
      cancelled: 'x-circle',
    };
    return icons[status] || 'clock';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F97316"
          />
        }
      >
        {/* Premium Header */}
        <LinearGradient
          colors={['#F97316', '#F43F5E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.businessName}>{user?.name || 'Business'}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'B'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Quick Stats Pills */}
          <View style={styles.pillcont}>
            <View style={styles.statsPills}>
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>{requests.length}</Text>
                <Text style={styles.statPillLabel}>Total</Text>
              </View>
              <View style={styles.statPillDivider} />
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>{stats.active}</Text>
                <Text style={styles.statPillLabel}>Active</Text>
              </View>
              <View style={styles.statPillDivider} />
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>{stats.delivered}</Text>
                <Text style={styles.statPillLabel}>Delivered</Text>
              </View>
            </View>

            <Image
              source={require('../../assets/logo.png')}
              style={{ width: 80, height: 60 }}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>

        {/* Total Spent */}
        <View style={styles.spentCard}>
          <Text style={styles.spentLabel}>Total Spent</Text>
          <Text style={styles.spentAmount}>₦{stats.totalSpent.toLocaleString()}</Text>
          <Text style={styles.spentPeriod}>Last 30 days</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Feather name="clock" size={20} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="truck" size={20} color="#F97316" />
            <Text style={styles.statNumber}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="check-circle" size={20} color="#10B981" />
            <Text style={styles.statNumber}>{stats.delivered}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateRequest')}
          >
            <LinearGradient
              colors={['#F97316', '#F43F5E']}
              style={styles.actionIcon}
            >
              <Feather name="plus" size={24} color="#FFF" />
            </LinearGradient>
            <Text style={styles.actionTitle}>New Request</Text>
            <Text style={styles.actionDesc}>Create delivery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Requests')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#1F2A3A' }]}>
              <Feather name="list" size={24} color="#F97316" />
            </View>
            <Text style={styles.actionTitle}>All Requests</Text>
            <Text style={styles.actionDesc}>View history</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              const active = requests.find(r => ['assigned', 'picked_up', 'in_transit'].includes(r.status));
              if (active) {
                navigation.navigate('TrackDelivery', { id: active.id });
              }
            }}
            disabled={!hasActiveDelivery}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#1F2A3A' }]}>
              <Feather name="map" size={24} color={hasActiveDelivery ? '#10B981' : '#666'} />
            </View>
            <Text style={[
              styles.actionTitle,
              !hasActiveDelivery && { color: '#666' }
            ]}>
              Track
            </Text>
            <Text style={[
              styles.actionDesc,
              !hasActiveDelivery && { color: '#666' }
            ]}>
              Live delivery
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Deliveries */}
        {stats.active > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Deliveries</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Requests', { tab: 'active' })}>
                <Text style={styles.seeAllLink}>See All →</Text>
              </TouchableOpacity>
            </View>

            {requests
              .filter(r => ['assigned', 'picked_up', 'in_transit'].includes(r.status))
              .slice(0, 2)
              .map(request => (
                <TouchableOpacity
                  key={request.id}
                  style={styles.activeCard}
                  onPress={() => navigation.navigate('TrackDelivery', { id: request.id })}
                >
                  <View style={styles.activeCardHeader}>
                    <View>
                      <Text style={styles.activeNumber}>{request.request_number}</Text>
                      <Text style={styles.activePackage}>{request.package_name}</Text>
                    </View>
                    <View style={[
                      styles.activeStatus,
                      { backgroundColor: getStatusColor(request.status) + '20' }
                    ]}>
                      <Feather
                        name={getStatusIcon(request.status)}
                        size={10}
                        color={getStatusColor(request.status)}
                      />
                      <Text style={[styles.activeStatusText, { color: getStatusColor(request.status) }]}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.locationContainer}>
                    <View style={styles.locationRow}>
                      <View style={[styles.locationDot, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {request.pickup_address}
                      </Text>
                    </View>
                    <View style={styles.locationRow}>
                      <View style={[styles.locationDot, { backgroundColor: '#F97316' }]} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {request.delivery_address}
                      </Text>
                    </View>
                  </View>

                  {request.rider_name && (
                    <View style={styles.riderRow}>
                      <Feather name="user" size={12} color="#9CA3AF" />
                      <Text style={styles.riderName}>Rider: {request.rider_name}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Recent Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Requests</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Requests')}>
              <Text style={styles.seeAllLink}>See All →</Text>
            </TouchableOpacity>
          </View>

          {recentRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="package" size={48} color="#374151" />
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptyDesc}>Create your first delivery</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateRequest')}
              >
                <Text style={styles.createButtonText}>New Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentRequests.map(request => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => navigation.navigate('RequestDetails', { id: request.id })}
              >
                <View style={styles.requestCardHeader}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestNumber}>{request.request_number}</Text>
                    <Text style={styles.requestPackage}>{request.package_name}</Text>
                  </View>
                  <View style={[
                    styles.requestBadge,
                    { backgroundColor: getStatusColor(request.status) + '20' }
                  ]}>
                    <Feather
                      name={getStatusIcon(request.status)}
                      size={10}
                      color={getStatusColor(request.status)}
                    />
                    <Text style={[styles.requestBadgeText, { color: getStatusColor(request.status) }]}>
                      {request.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestFooter}>
                  <Text style={styles.requestDate}>
                    {new Date(request.created_at).toLocaleDateString()}
                  </Text>
                  {request.calculated_fee ? (
                    <Text style={styles.requestFee}>₦{request.calculated_fee.toLocaleString()}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Support CTA */}
        <TouchableOpacity
          style={styles.supportCard}
          onPress={() => navigation.navigate('Support')}
        >
          <View style={styles.supportIcon}>
            <Feather name="headphones" size={24} color="#F97316" />
          </View>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportDesc}>Contact support team</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#4B5563" />
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F97316',
  },
  pillcont: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsPills: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 100,
    padding: 4,
    alignSelf: 'flex-start',
  },
  statPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  statPillValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statPillLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  statPillDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  spentCard: {
    backgroundColor: '#1A1A1A',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  spentLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  spentAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F97316',
    marginBottom: 4,
  },
  spentPeriod: {
    fontSize: 11,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
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
    color: '#FFFFFF',
  },
  seeAllLink: {
    fontSize: 13,
    color: '#F97316',
  },
  activeCard: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  activeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  activeNumber: {
    fontSize: 12,
    color: '#F97316',
    marginBottom: 2,
  },
  activePackage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  activeStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  locationContainer: {
    gap: 8,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: '#9CA3AF',
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  riderName: {
    fontSize: 11,
    color: '#10B981',
  },
  requestCard: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestNumber: {
    fontSize: 12,
    color: '#F97316',
    marginBottom: 2,
  },
  requestPackage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  requestBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  requestDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  requestFee: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F97316',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1F2A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  supportDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bottomPadding: {
    height: 20,
  },
});