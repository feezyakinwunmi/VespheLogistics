import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../hooks/useAuth';
import { businessApi } from '../../services/api';
import { BusinessRequest } from '../../types';

type FilterStatus = 'all' | 'pending' | 'accepted' | 'paid' | 'assigned' | 'delivered';

export function RequestsListScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<BusinessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>(
    route.params?.tab || 'all'
  );

  useEffect(() => {
    if (user?.id) {
      fetchRequests();
    }
  }, [user]);

  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery, activeFilter]);

  const fetchRequests = async () => {
    if (!user?.id) return;
    
    try {
      // Fix: Pass all required parameters to getMyRequests
      const data = await businessApi.getMyRequests(user.id, 1, 50); // page 1, 50 items per page
      setRequests(data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Load Requests',
        text2: error instanceof Error ? error.message : 'Please try again',
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

  const filterRequests = () => {
    let filtered = [...requests];

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(r => r.status === activeFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.request_number?.toLowerCase().includes(query) ||
        r.package_name?.toLowerCase().includes(query) ||
        r.pickup_address?.toLowerCase().includes(query) ||
        r.delivery_address?.toLowerCase().includes(query)
      );
    }

    setFilteredRequests(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      accepted: '#3b82f6',
      paid: '#8b5cf6',
      assigned: '#10b981',
      picked_up: '#f97316',
      in_transit: '#f97316',
      delivered: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status: string): keyof typeof Feather.glyphMap => {
    const icons: Record<string, keyof typeof Feather.glyphMap> = {
      pending: 'clock',
      accepted: 'check-circle',
      paid: 'credit-card',
      assigned: 'truck',
      picked_up: 'package',
      in_transit: 'navigation',
      delivered: 'check',
      cancelled: 'x-circle',
    };
    return icons[status] || 'clock';
  };

  const getStatusLabel = (status: string): string => {
    return status.replace('_', ' ').toUpperCase();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const filters: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Paid', value: 'paid' },
    { label: 'Assigned', value: 'assigned' },
    { label: 'Delivered', value: 'delivered' },
  ];

  const stats = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    paid: requests.filter(r => r.status === 'paid').length,
    assigned: requests.filter(r => ['assigned', 'picked_up', 'in_transit'].includes(r.status)).length,
    delivered: requests.filter(r => r.status === 'delivered').length,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateRequest')}
        >
          <Feather name="plus" size={24} color="#f97316" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by number, package, address..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={18} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filtersContainer}
      >
        <View style={styles.filters}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                activeFilter === filter.value && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter.value)}
            >
              <Text style={[
                styles.filterChipText,
                activeFilter === filter.value && styles.filterChipTextActive,
              ]}>
                {filter.label} ({stats[filter.value]})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          Showing {filteredRequests.length} of {requests.length} requests
        </Text>
      </View>

      {/* Requests List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#f97316"
            colors={["#f97316"]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="package" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'Try adjusting your search' 
                : activeFilter !== 'all' 
                ? `No ${activeFilter} requests` 
                : 'Create your first delivery request'}
            </Text>
            {!searchQuery && activeFilter === 'all' && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('CreateRequest')}
              >
                <Text style={styles.emptyButtonText}>Create Request</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => navigation.navigate('RequestDetails', { id: request.id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.requestNumber}>{request.request_number}</Text>
                  <Text style={styles.requestPackage}>{request.package_name}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(request.status) + '20' }
                ]}>
                  <Feather 
                    name={getStatusIcon(request.status)} 
                    size={10} 
                    color={getStatusColor(request.status)} 
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                    {getStatusLabel(request.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={14} color="#10b981" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    Pickup: {request.pickup_address}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <Feather name="flag" size={14} color="#f97316" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    Delivery: {request.delivery_address}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.footerLeft}>
                  <Feather name="calendar" size={12} color="#666" />
                  <Text style={styles.dateText}>
                    {new Date(request.created_at).toLocaleDateString()}
                  </Text>
                </View>
                
                {request.calculated_fee ? (
                  <View style={styles.feeContainer}>
                    <Text style={styles.feeLabel}>Fee:</Text>
                    <Text style={styles.feeAmount}>₦{request.calculated_fee.toLocaleString()}</Text>
                  </View>
                ) : request.status === 'pending' ? (
                  <View style={styles.pendingFeeContainer}>
                    <Feather name="clock" size={12} color="#f59e0b" />
                    <Text style={styles.pendingFeeText}>Awaiting quote</Text>
                  </View>
                ) : null}
              </View>

              {/* Payment Status Indicator */}
              {request.payment_status === 'paid' && (
                <View style={styles.paidIndicator}>
                  <Feather name="check-circle" size={12} color="#10b981" />
                  <Text style={styles.paidText}>Paid</Text>
                </View>
              )}

              {/* Rider Assignment Indicator */}
              {request.rider_name && (
                <View style={styles.riderIndicator}>
                  <Feather name="user" size={12} color="#f97316" />
                  <Text style={styles.riderText}>Rider: {request.rider_name}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Quick Stats Summary */}
      <LinearGradient
        colors={['#f97316', '#f43f5e']}
        style={styles.statsBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.accepted + stats.paid}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.assigned}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.delivered}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
      </LinearGradient>
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: 12,
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
  filtersContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderColor: '#f97316',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#f97316',
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
  requestCard: {
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
    alignItems: 'center',
    marginBottom: 12,
  },
  requestNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
    marginBottom: 2,
  },
  requestPackage: {
    fontSize: 15,
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
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feeLabel: {
    fontSize: 11,
    color: '#666',
  },
  feeAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
  },
  pendingFeeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingFeeText: {
    fontSize: 11,
    color: '#f59e0b',
  },
  paidIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paidText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },
  riderIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  riderText: {
    fontSize: 11,
    color: '#f97316',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
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
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bottomPadding: {
    height: 20,
  },
});