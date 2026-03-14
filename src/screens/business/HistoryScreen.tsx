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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../hooks/useAuth';
import { businessApi } from '../../services/api';
import { BusinessRequest } from '../../types';

type FilterPeriod = 'week' | 'month' | 'year' | 'all';

export function HistoryScreen({ navigation }: any) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<BusinessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('month');
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalDeliveries: 0,
    avgCost: 0,
  });

  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    }
  }, [user]);

  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery, selectedPeriod]);

  const fetchHistory = async () => {
    if (!user?.id) return;
    
    try {
      // Fix: Pass all required parameters to getMyRequests
      const data = await businessApi.getMyRequests(user.id, 1, 100); // page 1, 100 items per page
      
      // Only show delivered and cancelled requests in history
      const historyData = data.filter(r => 
        r.status === 'delivered' || r.status === 'cancelled'
      );
      
      setRequests(historyData);
      calculateStats(historyData);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Load History',
        text2: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const calculateStats = (data: BusinessRequest[]) => {
    const totalSpent = data
      .filter(r => r.status === 'delivered' && r.calculated_fee)
      .reduce((sum, r) => sum + (r.calculated_fee || 0), 0);
    
    const totalDeliveries = data.filter(r => r.status === 'delivered').length;
    
    setStats({
      totalSpent,
      totalDeliveries,
      avgCost: totalDeliveries > 0 ? Math.round(totalSpent / totalDeliveries) : 0,
    });
  };

  const filterRequests = () => {
    let filtered = [...requests];

    // Apply period filter
    if (selectedPeriod !== 'all') {
      const now = new Date();
      const periodMap = {
        week: 7,
        month: 30,
        year: 365,
      };
      
      const daysAgo = periodMap[selectedPeriod];
      const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
      
      filtered = filtered.filter(r => new Date(r.created_at) >= cutoffDate);
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

    // Sort by date (newest first)
    filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setFilteredRequests(filtered);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const getStatusColor = (status: string) => {
    return status === 'delivered' ? '#10b981' : '#ef4444';
  };

  const getStatusIcon = (status: string): keyof typeof Feather.glyphMap => {
    return status === 'delivered' ? 'check-circle' : 'x-circle';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery History</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Feather 
            name="refresh-cw" 
            size={20} 
            color="#f97316" 
          />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={['#f97316', '#f43f5e']}
          style={styles.statsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.statsValue}>{formatCurrency(stats.totalSpent)}</Text>
          <Text style={styles.statsLabel}>Total Spent</Text>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{formatCurrency(stats.avgCost)}</Text>
            <Text style={styles.statLabel}>Avg. Cost</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search history..."
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

      {/* Period Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        <View style={styles.filters}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedPeriod === 'week' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[
              styles.filterChipText,
              selectedPeriod === 'week' && styles.filterChipTextActive,
            ]}>This Week</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedPeriod === 'month' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[
              styles.filterChipText,
              selectedPeriod === 'month' && styles.filterChipTextActive,
            ]}>This Month</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedPeriod === 'year' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedPeriod('year')}
          >
            <Text style={[
              styles.filterChipText,
              selectedPeriod === 'year' && styles.filterChipTextActive,
            ]}>This Year</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedPeriod === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedPeriod('all')}
          >
            <Text style={[
              styles.filterChipText,
              selectedPeriod === 'all' && styles.filterChipTextActive,
            ]}>All Time</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredRequests.length} {filteredRequests.length === 1 ? 'delivery' : 'deliveries'} found
        </Text>
      </View>

      {/* History List */}
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
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Feather name="clock" size={32} color="#666" />
            </View>
            <Text style={styles.emptyTitle}>No history found</Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'Try adjusting your search' 
                : 'Completed deliveries will appear here'}
            </Text>
            {searchQuery && (
              <TouchableOpacity style={styles.clearSearchButton} onPress={handleClearSearch}>
                <Text style={styles.clearSearchText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.historyCard}
              onPress={() => navigation.navigate('RequestDetails', { id: request.id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.requestNumber}>#{request.request_number}</Text>
                  <Text style={styles.packageName}>{request.package_name}</Text>
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
                    {request.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={12} color="#666" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    From: {request.pickup_address}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <Feather name="flag" size={12} color="#666" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    To: {request.delivery_address}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.footerLeft}>
                  <Feather name="calendar" size={12} color="#666" />
                  <Text style={styles.dateText}>{formatDate(request.created_at)}</Text>
                </View>
                
                {request.calculated_fee ? (
                  <View style={styles.feeContainer}>
                    <Text style={styles.feeLabel}>Amount:</Text>
                    <Text style={styles.feeAmount}>{formatCurrency(request.calculated_fee)}</Text>
                  </View>
                ) : null}
              </View>

              {request.completed_at && (
                <View style={styles.completedBadge}>
                  <Feather name="check-circle" size={12} color="#10b981" />
                  <Text style={styles.completedText}>
                    Completed {formatDate(request.completed_at)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
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
  statsContainer: {
    padding: 16,
    gap: 12,
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
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
  historyCard: {
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
    marginBottom: 12,
  },
  cardLeft: {
    flex: 1,
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
  cardBody: {
    marginBottom: 12,
    gap: 6,
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
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  completedText: {
    fontSize: 10,
    color: '#10b981',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
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
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  clearSearchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
  },
  clearSearchText: {
    fontSize: 13,
    color: '#f97316',
  },
  bottomPadding: {
    height: 20,
  },
});