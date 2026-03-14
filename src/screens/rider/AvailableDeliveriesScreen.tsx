// src/screens/rider/AvailableDeliveriesScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

interface AvailableDelivery {
  business_image: string | undefined;
  items: any;
  package_image: any;
  id: string;
  request_number: string;
  order_type?: 'business' | 'normal';
  business_name: string;
  business_phone?: string;
  package_name: string;
  package_type: string;
  weight_kg: number;
  quantity: number;
  pickup_address: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  delivery_address: string;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  receiver_phone?: string;
  distance_km?: number;
  calculated_fee: number;
  rider_share: number;
  status: string;
  created_at: string;
}

export function AvailableDeliveriesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<AvailableDelivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<AvailableDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'business' | 'normal'>('all');

  useEffect(() => {
    fetchAvailableDeliveries();
  }, []);

  useEffect(() => {
    filterDeliveries();
  }, [deliveries, searchQuery, filterType]);

  const fetchAvailableDeliveries = async () => {
    try {
      // 1. Fetch business logistics orders
      const { data: businessData, error: businessError } = await supabase
        .from('business_logistics_view')
        .select('*')
        .eq('status', 'paid')
        .is('rider_id', null)
        .order('created_at', { ascending: true });

      if (businessError) throw businessError;

      // 2. Fetch normal orders from orders table
      const { data: normalData, error: normalError } = await supabase
        .from('orders')
        .select(`
          *,
          vendors (
            name,
            phone,
            address
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

      // 3. Format normal orders
      const formattedNormal = (normalData || []).map(order => ({
        id: order.id,
        request_number: order.order_number || order.id,
        order_type: 'normal' as const,
        business_name: order.vendors?.name || 'Restaurant',
        package_name: 'Food Delivery',
        package_type: 'food',
        weight_kg: 1,
        quantity: order.items?.length || 1,
        pickup_address: order.vendors?.address || 'Restaurant',
        pickup_contact_name: order.vendors?.name || 'Restaurant',
        pickup_contact_phone: order.vendors?.phone,
        delivery_address: order.delivery_address?.street || 'Customer address',
        delivery_contact_name: order.customer?.name || 'Customer',
        delivery_contact_phone: order.customer?.phone,
        receiver_phone: order.customer?.phone,
        distance_km: 5,
        calculated_fee: order.delivery_fee || 1000,
        rider_share: order.delivery_fee ? order.delivery_fee * 0.5 : 500,
        status: 'ready',
        created_at: order.created_at,
      }));

      // 4. Combine both types
      const allDeliveries = [...(businessData || []), ...formattedNormal];
      
      setDeliveries(allDeliveries);
    } catch (error) {
      console.error('Error fetching available deliveries:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load deliveries',
        text2: 'Please check your connection and try again',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAvailableDeliveries();
  };

  const filterDeliveries = () => {
    let filtered = [...deliveries];

    if (filterType !== 'all') {
      filtered = filtered.filter(d => d.order_type === filterType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.request_number?.toLowerCase().includes(query) ||
        d.business_name?.toLowerCase().includes(query) ||
        d.pickup_address?.toLowerCase().includes(query) ||
        d.delivery_address?.toLowerCase().includes(query)
      );
    }

    setFilteredDeliveries(filtered);
  };

  const handleAcceptDelivery = async (delivery: AvailableDelivery) => {
    if (!user?.id) return;

    setAcceptingId(delivery.id);
    
    try {
      let result;
      
      if (delivery.order_type === 'business') {
        result = await supabase
          .from('business_logistics')
          .update({
            rider_id: user.id,
            status: 'assigned',
            assigned_at: new Date().toISOString(),
          })
          .eq('id', delivery.id)
          .eq('status', 'paid')
          .is('rider_id', null)
          .select()
          .single();
      } else {
        result = await supabase
          .from('orders')
          .update({
            rider_id: user.id,
            status: 'picked_up',
            updated_at: new Date().toISOString(),
            picked_up_at: new Date().toISOString(),
          })
          .eq('id', delivery.id)
          .eq('status', 'ready')
          .is('rider_id', null)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Remove from list
      setDeliveries(prev => prev.filter(d => d.id !== delivery.id));

      // Success toast – pressable to view details
      Toast.show({
        type: 'success',
        text1: 'Delivery Accepted!',
        text2: 'Tap here to view details',
        visibilityTime: 6000,   // give time to read & tap
        position: 'top',
        onPress: () => {
          navigation.navigate('DeliveryDetails', { 
            id: delivery.id,
            orderType: delivery.order_type 
          });
          Toast.hide(); // optional: close toast after tap
        },
      });
    } catch (error) {
      console.error('Error accepting delivery:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to accept',
        text2: 'It may have been taken by another rider. Try refreshing.',
        visibilityTime: 5000,
      });
    } finally {
      setAcceptingId(null);
    }
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return 'Distance N/A';
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  const getOrderTypeIcon = (type?: string) => {
    return type === 'business' ? 'briefcase' : 'coffee';
  };

  const getOrderTypeColor = (type?: string) => {
    return type === 'business' ? '#f97316' : '#10b981';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Deliveries</Text>
        <TouchableOpacity onPress={fetchAvailableDeliveries} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={20} color="#f97316" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
            All ({deliveries.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'business' && styles.filterTabActive]}
          onPress={() => setFilterType('business')}
        >
          <Feather name="briefcase" size={14} color={filterType === 'business' ? '#f97316' : '#666'} />
          <Text style={[styles.filterText, filterType === 'business' && styles.filterTextActive]}>
            Business ({deliveries.filter(d => d.order_type === 'business').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'normal' && styles.filterTabActive]}
          onPress={() => setFilterType('normal')}
        >
          <Feather name="coffee" size={14} color={filterType === 'normal' ? '#10b981' : '#666'} />
          <Text style={[styles.filterText, filterType === 'normal' && styles.filterTextActive]}>
            Food ({deliveries.filter(d => d.order_type === 'normal').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by location, restaurant..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredDeliveries.length} deliveries available
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
        }
      >
        {filteredDeliveries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="package" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No deliveries available</Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'Try adjusting your search' 
                : 'Check back later for new delivery requests'}
            </Text>
          </View>
        ) : (
          filteredDeliveries.map((delivery) => (
            <View key={delivery.id} style={styles.deliveryCard}>
              {/* Order Type Badge */}
              <View style={[styles.typeBadge, { backgroundColor: getOrderTypeColor(delivery.order_type) + '20' }]}>
                <Feather name={getOrderTypeIcon(delivery.order_type)} size={12} color={getOrderTypeColor(delivery.order_type)} />
                <Text style={[styles.typeText, { color: getOrderTypeColor(delivery.order_type) }]}>
                  {delivery.order_type === 'business' ? 'BUSINESS' : 'FOOD'}
                </Text>
              </View>

              {/* Package Image */}
              <View style={styles.packageImageContainer}>
                {delivery.order_type === 'business' ? (
                  delivery.package_image ? (
                    <Image source={{ uri: delivery.package_image }} style={styles.packageImage} />
                  ) : (
                    <View style={[styles.packageImagePlaceholder, { backgroundColor: '#f9731620' }]}>
                      <Feather name="package" size={30} color="#f97316" />
                    </View>
                  )
                ) : (
                  delivery.items && delivery.items.length > 0 && delivery.items[0].image_url ? (
                    <Image source={{ uri: delivery.items[0].image_url }} style={styles.packageImage} />
                  ) : (
                    <View style={[styles.packageImagePlaceholder, { backgroundColor: '#10b98120' }]}>
                      <Feather name="shopping-bag" size={30} color="#10b981" />
                    </View>
                  )
                )}
              </View>

              {/* Business/Restaurant Info */}
              <View style={styles.businessHeader}>
                <View style={styles.businessAvatar}>
                  {delivery.business_image ? (
                    <Image source={{ uri: delivery.business_image }} style={styles.businessAvatarImage} />
                  ) : (
                    <Text style={styles.businessAvatarText}>
                      {delivery.business_name?.charAt(0).toUpperCase() || 'B'}
                    </Text>
                  )}
                </View>
                <View style={styles.businessInfo}>
                  <Text style={styles.businessName}>{delivery.business_name}</Text>
                  <Text style={styles.requestNumber}>{delivery.request_number}</Text>
                </View>
              </View>

              {/* Package Info */}
              <View style={styles.packageSection}>
                <Text style={styles.packageName}>{delivery.package_name}</Text>
                <View style={styles.packageDetails}>
                  <Text style={styles.packageDetail}>Weight: {delivery.weight_kg}kg</Text>
                  <Text style={styles.packageDetail}>Items: {delivery.quantity}</Text>
                </View>
              </View>

              {/* Locations */}
              <View style={styles.locations}>
                <View style={styles.locationRow}>
                  <View style={[styles.locationDot, { backgroundColor: '#10b981' }]} />
                  <View style={styles.locationContent}>
                    <Text style={styles.locationLabel}>PICKUP</Text>
                    <Text style={styles.locationAddress} numberOfLines={1}>{delivery.pickup_address}</Text>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <View style={[styles.locationDot, { backgroundColor: '#f97316' }]} />
                  <View style={styles.locationContent}>
                    <Text style={styles.locationLabel}>DELIVERY</Text>
                    <Text style={styles.locationAddress} numberOfLines={1}>{delivery.delivery_address}</Text>
                  </View>
                </View>
              </View>

              {/* Distance & Earnings */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Feather name="map-pin" size={14} color="#666" />
                  <Text style={styles.statText}>{formatDistance(delivery.distance_km)}</Text>
                </View>
                <View style={styles.stat}>
                  <Feather name="dollar-sign" size={14} color="#10b981" />
                  <Text style={[styles.statText, styles.earningText]}>
                    ₦{delivery.rider_share?.toLocaleString() ?? '—'}
                  </Text>
                </View>
              </View>

              {/* Accept Button */}
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptDelivery(delivery)}
                disabled={acceptingId === delivery.id}
              >
                {acceptingId === delivery.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color="#fff" />
                    <Text style={styles.acceptButtonText}>Accept Delivery</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
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
  filterTabs: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterTabActive: {
    borderColor: '#f97316',
    backgroundColor: 'rgba(249,115,22,0.1)',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
  },
  filterTextActive: {
    color: '#f97316',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  resultsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 12,
    color: '#666',
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
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  packageImageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  packageImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#f97316',
  },
  packageImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  businessAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  businessAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  requestNumber: {
    fontSize: 11,
    color: '#666',
  },
  packageSection: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  packageName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  packageDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  packageDetail: {
    fontSize: 12,
    color: '#666',
  },
  locations: {
    gap: 12,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    color: '#fff',
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  earningText: {
    color: '#10b981',
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#f97316',
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 15,
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
  },
  bottomPadding: {
    height: 20,
  },
});