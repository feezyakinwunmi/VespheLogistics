import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { useAuth } from '../../hooks/useAuth';
import { useRiderDeliveries } from '../../hooks/useRiderDeliveries';
import { supabase } from '../../services/supabase';

interface BankDetails {
  id?: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_default?: boolean;
}

export function WithdrawScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { stats, refresh } = useRiderDeliveries(user?.id || '');

  const availableBalance = stats?.availableBalance ?? 0;

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bank_name: '',
    account_number: '',
    account_name: '',
  });
  const [bankDetailsId, setBankDetailsId] = useState<string | null>(null);
  const [savingBankDetails, setSavingBankDetails] = useState(false);
  const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    } else {
      setFetching(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (stats?.pendingBalance && stats.pendingBalance > 0) {
      setHasPendingWithdrawal(true);
    }
  }, [stats]);

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      setFetching(true);
      setFetchError(null);

      // 1. Pending withdrawals check
      const { data: withdrawals, error: wError } = await supabase
        .from('withdrawals')
        .select('id')
        .eq('user_id', user.id)
        .eq('user_type', 'rider')
        .eq('status', 'pending')
        .limit(1);

      if (wError) throw wError;
      setHasPendingWithdrawal(!!withdrawals?.length);

      // 2. Default bank details
      const { data: bankData, error: bError } = await supabase
        .from('bank_details')
        .select('*')
        .eq('user_id', user.id)
        .eq('user_type', 'rider')
        .eq('is_default', true)
        .maybeSingle();

      if (bError) throw bError;

      if (bankData) {
        setBankDetails({
          id: bankData.id,
          bank_name: bankData.bank_name || '',
          account_number: bankData.account_number || '',
          account_name: bankData.account_name || '',
        });
        setBankDetailsId(bankData.id);
      }
    } catch (error: any) {
      setFetchError(error.message || 'Failed to load data');
      Toast.show({
        type: 'error',
        text1: 'Failed to load withdrawal info',
        text2: 'Please check your connection',
        position: 'bottom',
      });
    } finally {
      setFetching(false);
    }
  };

  const saveBankDetails = async () => {
    if (!user?.id) return;

    const { bank_name, account_number, account_name } = bankDetails;

    if (!bank_name || !account_number || !account_name) {
      Toast.show({ type: 'error', text1: 'Please fill all bank details', position: 'bottom' });
      return;
    }

    if (account_number.length !== 10) {
      Toast.show({ type: 'error', text1: 'Account number must be 10 digits', position: 'bottom' });
      return;
    }

    setSavingBankDetails(true);

    try {
      const payload = {
        user_id: user.id,
        user_type: 'rider',
        bank_name,
        account_number,
        account_name,
        is_default: true,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (bankDetailsId) {
        result = await supabase
          .from('bank_details')
          .update(payload)
          .eq('id', bankDetailsId)
          .select();
      } else {
        result = await supabase
          .from('bank_details')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select();
      }

      if (result.error) throw result.error;

      if (result.data?.[0]?.id) {
        setBankDetailsId(result.data[0].id);
      }

      Toast.show({
        type: 'success',
        text1: 'Bank details saved',
        position: 'bottom',
        visibilityTime: 2000,
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to save bank details',
        text2: error.message || 'Please try again',
        position: 'bottom',
      });
    } finally {
      setSavingBankDetails(false);
    }
  };

  const handleWithdraw = () => {
    if (hasPendingWithdrawal) {
      Toast.show({
        type: 'info',
        text1: 'Pending Withdrawal',
        text2: 'You already have a request in progress',
        position: 'bottom',
      });
      return;
    }

    const withdrawAmount = parseFloat(amount);

    if (!amount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount', position: 'bottom' });
      return;
    }

    if (withdrawAmount < 1000) {
      Toast.show({ type: 'error', text1: 'Minimum ₦1,000', position: 'bottom' });
      return;
    }

    if (withdrawAmount > availableBalance) {
      Toast.show({ type: 'error', text1: 'Insufficient balance', position: 'bottom' });
      return;
    }

    if (!bankDetails.bank_name || !bankDetails.account_number || !bankDetails.account_name) {
      Toast.show({ type: 'error', text1: 'Save bank details first', position: 'bottom' });
      return;
    }

    Toast.show({
      type: 'info',
      text1: 'Confirm Withdrawal',
      text2: `₦${withdrawAmount.toLocaleString()} will be deducted immediately`,
      position: 'bottom',
      visibilityTime: 6000,
      onPress: () => processWithdrawal(withdrawAmount),
    });
  };

  const processWithdrawal = async (withdrawAmount: number) => {
    setLoading(true);

    try {
      const reference = `WD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

      // 1. Pending negative earnings record
      const { error: eError } = await supabase
        .from('rider_earnings')
        .insert({
          rider_id: user?.id,
          order_id: `WITHDRAWAL-${reference}`,
          amount: -withdrawAmount,
          order_type: 'withdrawal',
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (eError) throw eError;

      // 2. Withdrawal record
      const { error: wError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user?.id,
          user_type: 'rider',
          amount: withdrawAmount,
          bank_name: bankDetails.bank_name,
          account_number: bankDetails.account_number,
          account_name: bankDetails.account_name,
          status: 'pending',
          reference,
          created_at: new Date().toISOString(),
        });

      if (wError) {
        // Rollback earnings record
        await supabase
          .from('rider_earnings')
          .delete()
          .eq('order_id', `WITHDRAWAL-${reference}`);
        throw wError;
      }

      await refresh();
      await fetchData();

      Toast.show({
        type: 'success',
        text1: 'Withdrawal Requested',
        text2: `₦${withdrawAmount.toLocaleString()} pending • Processing within 24 hrs`,
        position: 'bottom',
      });

      setAmount('');
      navigation.goBack();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Withdrawal Failed',
        text2: error.message || 'Please try again',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading
  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading withdrawal info...</Text>
      </View>
    );
  }

  // Error
  if (fetchError) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Failed to load</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No user
  if (!user?.id) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="user-x" size={48} color="#f97316" />
        <Text style={styles.errorTitle}>Not logged in</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.retryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw Earnings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance */}
        <LinearGradient
          colors={['#f97316', '#f43f5e']}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₦{availableBalance.toLocaleString()}</Text>
          <Text style={styles.balanceNote}>Minimum withdrawal: ₦1,000</Text>
        </LinearGradient>

        {/* Pending Warning */}
        {hasPendingWithdrawal && (
          <View style={styles.pendingCard}>
            <Feather name="alert-circle" size={20} color="#f59e0b" />
            <Text style={styles.pendingText}>
              You have a pending withdrawal. Amount reserved until processed.
            </Text>
          </View>
        )}

        {/* Amount Input */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Withdrawal Amount</Text>

          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₦</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="numeric"
              editable={!hasPendingWithdrawal && !loading}
            />
          </View>

          <TouchableOpacity
            onPress={() => setAmount(availableBalance.toString())}
            disabled={hasPendingWithdrawal || loading}
          >
            <Text style={[
              styles.maxAmountText,
              (hasPendingWithdrawal || loading) && styles.disabledText,
            ]}>
              Use max amount
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bank Details */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Bank Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank Name</Text>
            <View style={styles.inputContainer}>
              <Feather name="credit-card" size={16} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={bankDetails.bank_name}
                onChangeText={text => setBankDetails({ ...bankDetails, bank_name: text })}
                placeholder="e.g., GTBank"
                placeholderTextColor="#666"
                editable={!hasPendingWithdrawal && !savingBankDetails}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Number</Text>
            <View style={styles.inputContainer}>
              <Feather name="hash" size={16} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={bankDetails.account_number}
                onChangeText={text => setBankDetails({ ...bankDetails, account_number: text })}
                placeholder="10-digit account number"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={10}
                editable={!hasPendingWithdrawal && !savingBankDetails}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Name</Text>
            <View style={styles.inputContainer}>
              <Feather name="user" size={16} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={bankDetails.account_name}
                onChangeText={text => setBankDetails({ ...bankDetails, account_name: text })}
                placeholder="Name on account"
                placeholderTextColor="#666"
                editable={!hasPendingWithdrawal && !savingBankDetails}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveBankDetails}
            disabled={savingBankDetails || hasPendingWithdrawal}
          >
            {savingBankDetails ? (
              <ActivityIndicator color="#f97316" />
            ) : (
              <Text style={styles.saveButtonText}>
                {bankDetailsId ? 'Update Bank Details' : 'Save Bank Details'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={handleWithdraw}
          disabled={loading || availableBalance < 1000 || hasPendingWithdrawal}
        >
          <LinearGradient
            colors={
              availableBalance >= 1000 && !hasPendingWithdrawal
                ? ['#10b981', '#059669']
                : ['#4b5563', '#374151']
            }
            style={styles.withdrawGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.withdrawButtonText}>
                {hasPendingWithdrawal
                  ? 'Withdrawal Pending'
                  : availableBalance >= 1000
                  ? 'Request Withdrawal'
                  : 'Insufficient Balance'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoCard}>
          <Feather name="info" size={16} color="#f97316" />
          <Text style={styles.infoText}>
            Withdrawals processed within 24 hours. Amount deducted immediately from available balance. Rejected requests refunded to balance.
          </Text>
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
  errorContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  balanceCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  balanceNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
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
  pendingText: {
    flex: 1,
    fontSize: 13,
    color: '#f59e0b',
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    marginTop: 0,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 20,
    color: '#666',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
  },
  maxAmountText: {
    color: '#f97316',
    fontSize: 13,
    textAlign: 'right',
  },
  disabledText: {
    opacity: 0.5,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  saveButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f97316',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  withdrawGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249,115,22,0.1)',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});