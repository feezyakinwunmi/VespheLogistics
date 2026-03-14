import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { useAuth } from '../../hooks/useAuth';
import { useRiderDeliveries } from '../../hooks/useRiderDeliveries';
import { supabase } from '../../services/supabase';

type Period = 'day' | 'week' | 'month' | 'year';
type StatusFilter = 'all' | 'completed' | 'pending';
type DateFilter = 'all' | 'today' | 'month' | 'year';

interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal';
  order_type?: 'business' | 'normal';
  amount: number;
  status?: string;
  created_at: string;
  description: string;
  bank_name?: string;
  account_number?: string;
  request_number?: string;
}
const ITEMS_PER_PAGE = 15;

export function EarningsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { stats, isLoading, refreshing, refresh } = useRiderDeliveries(user?.id || '');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
const availableBalance = stats?.availableBalance ?? 0;


useEffect(() => {
    if (user?.id) {
      fetchAllTransactions();
      checkWithdrawEligibility();
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refresh();
      fetchAllTransactions();
      checkWithdrawEligibility();
    });
    return unsubscribe;
  }, [navigation]);

const fetchAllTransactions = async () => {
    if (!user?.id) return;
    setIsLoadingTransactions(true);

    try {
      const allTransactions: Transaction[] = [];

      // Business + Normal orders logic (same as before)
      const { data: businessDeliveries } = await supabase
        .from('business_logistics_view')
        .select('id, request_number, rider_share, created_at, delivered_at, business_name')
        .eq('rider_id', user.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      businessDeliveries?.forEach(d => {
        allTransactions.push({
          id: d.id,
          type: 'earning',
          order_type: 'business',
          amount: d.rider_share ?? 0,
          status: 'paid',
          created_at: d.delivered_at || d.created_at,
          description: `Business Delivery - ${d.business_name || 'Business'}`,
          request_number: d.request_number,
        });
      });

      const { data: normalOrders } = await supabase
        .from('orders')
        .select(`
          id, order_number, delivery_fee, delivered_at, created_at,
          vendors:vendor_id (name)
        `)
        .eq('rider_id', user.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      normalOrders?.forEach(order => {
        const riderShare = order.delivery_fee ? order.delivery_fee * 0.5 : 0;
        const vendorName = order.vendors?.[0]?.name ?? 'Restaurant';

        allTransactions.push({
          id: order.id,
          type: 'earning',
          order_type: 'normal',
          amount: riderShare,
          status: 'paid',
          created_at: order.delivered_at || order.created_at,
          description: `Food Delivery - ${vendorName}`,
          request_number: order.order_number || order.id,
        });
      });

      const { data: withdrawalsData } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .eq('user_type', 'rider')
        .order('created_at', { ascending: false });

      withdrawalsData?.forEach(w => {
        allTransactions.push({
          id: w.id,
          type: 'withdrawal',
          amount: w.amount ?? 0,
          status: w.status,
          created_at: w.created_at,
          description: `Withdrawal to ${w.bank_name ?? 'Bank'}`,
          bank_name: w.bank_name,
          account_number: w.account_number,
        });
      });

      allTransactions.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load earnings',
        text2: 'Please check your connection',
        position: 'top',
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const checkWithdrawEligibility = () => {
    const today = new Date();
    setCanWithdraw(today.getDay() === 0); // Sunday = 0
  };

  const onRefresh = async () => {
    await refresh();
    await fetchAllTransactions();
    checkWithdrawEligibility();
  };

  const handleWithdrawPress = () => {
    const balance = stats?.availableBalance || 0;

    if (!canWithdraw) {
      Toast.show({
        type: 'info',
        text1: 'Withdrawals only on Sundays',
        text2: 'Come back on Sunday to request withdrawal',
        position: 'top',
      });
      return;
    }

    if (balance < 1000) {
      Toast.show({
        type: 'error',
        text1: 'Minimum withdrawal ₦1,000',
        text2: `Your available balance is ₦${balance.toLocaleString()}`,
        position: 'top',
      });
      return;
    }

    const pendingTotal = transactions
      .filter(t => t.type === 'withdrawal' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    if (pendingTotal > 0) {
      Toast.show({
        type: 'info',
        text1: 'Withdrawal already pending',
        text2: `₦${pendingTotal.toLocaleString()} is being processed`,
        position: 'top',
      });
      return;
    }

    navigation.navigate('Withdraw', { availableBalance: balance });
  };

  // ── NEW: Filtered & Paginated Transactions ──
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.request_number?.toLowerCase().includes(q) ||
        t.bank_name?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => {
        const isCompleted = t.status === 'paid' || t.status === 'completed';
        return statusFilter === 'completed' ? isCompleted : !isCompleted;
      });
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(t => {
        const d = new Date(t.created_at);
        if (dateFilter === 'today') {
          return d.toDateString() === now.toDateString();
        }
        if (dateFilter === 'month') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (dateFilter === 'year') {
          return d.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    return filtered;
  }, [transactions, searchQuery, statusFilter, dateFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getPeriodEarnings = () => {
    if (!stats) return 0;
    const values = {
      day: stats.todayEarnings || 0,
      week: stats.weekEarnings || 0,
      month: stats.monthEarnings || 0,
      year: stats.yearEarnings || 0,
    };
    return values[selectedPeriod] || 0;
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      default: return 'This Week';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getOrderTypeIcon = (type?: string) => (type === 'business' ? 'briefcase' : 'coffee');
  const getOrderTypeColor = (type?: string) => (type === 'business' ? '#f97316' : '#10b981');

  if (isLoading || isLoadingTransactions) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  const pendingWithdrawalsTotal = transactions
    .filter(t => t.type === 'withdrawal' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f97316"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Earnings</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Feather name="refresh-cw" size={20} color="#f97316" />
          </TouchableOpacity>
        </View>

        {/* Period Selector - can be made sticky with stickyHeaderIndices if needed */}
        <View style={styles.periodSelector}>
          {(['day', 'week', 'month', 'year'] as Period[]).map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Card */}
        <LinearGradient
          colors={['#f97316', '#f43f5e']}
          style={styles.summaryCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.summaryLabel}>{getPeriodLabel()} Earnings</Text>
          <Text style={styles.summaryAmount}>
            ₦{getPeriodEarnings().toLocaleString()}
          </Text>
        </LinearGradient>

        {/* Income / Withdrawn */}
        <View style={styles.balanceCards}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Total Income</Text>
            <Text style={styles.balanceValue}>
              ₦{(stats?.totalEarnings ?? 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Withdrawn</Text>
            <Text style={[styles.balanceValue, { color: '#ef4444' }]}>
              {stats?.totalWithdrawn
                ? `-₦${stats.totalWithdrawn.toLocaleString()}`
                : '₦0'}
            </Text>
          </View>
        </View>

        {/* Pending Withdrawals */}
        {pendingWithdrawalsTotal > 0 && (
          <View style={styles.pendingCard}>
            <Feather name="alert-circle" size={20} color="#f59e0b" />
            <View style={styles.pendingContent}>
              <Text style={styles.pendingTitle}>Pending Withdrawals</Text>
              <Text style={styles.pendingAmount}>₦{pendingWithdrawalsTotal.toLocaleString()}</Text>
              <Text style={styles.pendingNote}>Being processed (reserved from balance)</Text>
            </View>
          </View>
        )}

        {/* Available Balance */}
        <View style={styles.availableCard}>
          <Text style={styles.availableLabel}>Available Balance</Text>
          <Text style={styles.availableValue}>
            ₦{(stats?.availableBalance ?? 0).toLocaleString()}
          </Text>
          <Text style={styles.availableNote}>
            {canWithdraw
              ? 'You can withdraw today (Sunday)'
              : 'Withdrawals only available on Sundays'}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Feather name="truck" size={20} color="#f97316" />
            <Text style={styles.statValue}>{stats?.totalDeliveries ?? 0}</Text>
            <Text style={styles.statLabel}>Completed Deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="star" size={20} color="#fbbf24" />
            <Text style={styles.statValue}>{stats?.rating ?? '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Withdraw Button */}
      {/* Withdraw Button */}
<TouchableOpacity
  style={styles.withdrawButton}
  onPress={handleWithdrawPress}
  disabled={!canWithdraw || availableBalance < 1000 || pendingWithdrawalsTotal > 0}
>
  <LinearGradient
    colors={
      canWithdraw && availableBalance >= 1000 && pendingWithdrawalsTotal === 0
        ? ['#10b981', '#059669']
        : ['#4b5563', '#374151']
    }
    style={styles.withdrawGradient}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
  >
    <Feather name="download" size={20} color="#fff" />
    <Text style={styles.withdrawText}>
      {pendingWithdrawalsTotal > 0
        ? 'Withdrawal Pending'
        : !canWithdraw
        ? 'Withdraw on Sundays Only'
        : availableBalance < 1000
        ? 'Minimum ₦1,000'
        : `Withdraw ₦${availableBalance.toLocaleString()}`}
    </Text>
  </LinearGradient>
</TouchableOpacity>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <Text style={styles.historyTitle}>Recent Transactions</Text>


{/* Search */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#666"
            />
          </View>

          {/* Filters */}
          <View style={styles.filterRow}>
            {/* Status Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterButtons}>
                {(['all', 'completed', 'pending'] as StatusFilter[]).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                    onPress={() => setStatusFilter(s)}
                  >
                    <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date</Text>
              <View style={styles.filterButtons}>
                {(['all', 'today', 'month', 'year'] as DateFilter[]).map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.filterChip, dateFilter === d && styles.filterChipActive]}
                    onPress={() => setDateFilter(d)}
                  >
                    <Text style={[styles.filterChipText, dateFilter === d && styles.filterChipTextActive]}>
                      {d === 'all' ? 'All' : d === 'today' ? 'Today' : d.charAt(0).toUpperCase() + d.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>








        {paginatedTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="dollar-sign" size={48} color="#666" />
              <Text style={styles.emptyTitle}>No transactions found</Text>
            </View>
          ) : (
           paginatedTransactions.map(transaction => (
              <View key={transaction.id} style={styles.transactionCard}>
                {transaction.type === 'earning' ? (
                  <>
                    <View
                      style={[
                        styles.transactionIcon,
                        { backgroundColor: getOrderTypeColor(transaction.order_type) + '20' },
                      ]}
                    >
                      <Feather
                        name={getOrderTypeIcon(transaction.order_type)}
                        size={20}
                        color={getOrderTypeColor(transaction.order_type)}
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle}>{transaction.description}</Text>
                      <Text style={styles.transactionDate}>{formatDate(transaction.created_at)}</Text>
                      {transaction.request_number && (
                        <Text style={styles.transactionRef}>Ref: {transaction.request_number}</Text>
                      )}
                      <View style={styles.transactionStatus}>
                        <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                        <Text style={[styles.statusText, { color: '#10b981' }]}>Completed</Text>
                      </View>
                    </View>
                    <Text style={[styles.transactionAmount, { color: '#10b981' }]}>
                      +₦{transaction.amount.toLocaleString()}
                    </Text>
                  </>
                ) : (
                  <>
                    <View
                      style={[
                        styles.transactionIcon,
                        {
                          backgroundColor:
                            transaction.status === 'pending' ? '#f59e0b20' : '#ef444420',
                        },
                      ]}
                    >
                      <Feather
                        name="download"
                        size={20}
                        color={transaction.status === 'pending' ? '#f59e0b' : '#ef4444'}
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle}>{transaction.description}</Text>
                      <Text style={styles.transactionDate}>{formatDate(transaction.created_at)}</Text>
                      {transaction.bank_name && (
                        <Text style={styles.transactionBank}>
                          {transaction.bank_name} • {transaction.account_number}
                        </Text>
                      )}
                      <View style={styles.transactionStatus}>
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor:
                                transaction.status === 'completed' ? '#10b981' : '#f59e0b',
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color: transaction.status === 'completed' ? '#10b981' : '#f59e0b',
                            },
                          ]}
                        >
                          {transaction.status === 'completed' ? 'Completed' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.transactionAmount,
                        {
                          color: transaction.status === 'pending' ? '#f59e0b' : '#ef4444',
                        },
                      ]}
                    >
                      -₦{transaction.amount.toLocaleString()}
                    </Text>
                  </>
                )}
              </View>
            ))
          )}


          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={styles.pageButton}
                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <Feather name="chevron-left" size={20} color={currentPage === 1 ? '#444' : '#fff'} />
              </TouchableOpacity>

              <Text style={styles.pageText}>
                Page {currentPage} of {totalPages}
              </Text>

              <TouchableOpacity
                style={styles.pageButton}
                onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <Feather name="chevron-right" size={20} color={currentPage === totalPages ? '#444' : '#fff'} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.bottomPadding} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
scrollView: { flex: 1 },

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
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },

  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 16,
  },
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderColor: '#f97316',
  },
  filterChipText: {
    fontSize: 12,
    color: '#aaa',
  },
  filterChipTextActive: {
    color: '#f97316',
    fontWeight: '600',
  },

  transactionsSection: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },

  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageText: {
    fontSize: 14,
    color: '#aaa',
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
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  periodButtonActive: {
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderColor: '#f97316',
  },
  periodText: {
    fontSize: 12,
    color: '#666',
  },
  periodTextActive: {
    color: '#f97316',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  balanceCards: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  pendingCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245,158,11,0.1)',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 2,
  },
  pendingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 2,
  },
  pendingNote: {
    fontSize: 11,
    color: '#666',
  },
  availableCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  availableLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  availableValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10b981',
  },
  availableNote: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
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
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  withdrawButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  withdrawGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  withdrawText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  transactionDate: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  transactionRef:{
    color:'white',
    fontSize:10,
  },
  transactionBank: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  transactionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
  },
  transactionAmount: {
    fontSize: 16,
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
    marginTop: 8,
  },
  bottomPadding: {
    height: 40,
  },
});