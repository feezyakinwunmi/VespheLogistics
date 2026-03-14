import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { businessApi } from '../../services/api';
import { supabase } from '../../services/supabase';
import { FlutterwavePayment } from '../../components/FlutterwavePayment';
import { useAuth } from '../../hooks/useAuth';

type PaymentMethod = 'card' | 'transfer';

// Generate unique reference for payment
const generateReference = () => {
  return `VESPHE-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`.toUpperCase();
};

export function PaymentScreen({ navigation, route }: any) {
  const { id, amount } = route.params;
  const { user } = useAuth();
  
  const [request, setRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [showFlutterwave, setShowFlutterwave] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      const data = await businessApi.getRequestDetails(id);
      setRequest(data);
    } catch (error) {
      console.error('Error fetching request:', error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardPayment = () => {
    setProcessing(true);
    const reference = generateReference();
    setPaymentReference(reference);
    setShowFlutterwave(true);
    setProcessing(false);
  };

  const handleTransferPayment = () => {
    Alert.alert(
      'Bank Transfer',
      'Make payment to the account below and click confirm when done.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm Payment', 
          onPress: () => verifyTransferPayment() 
        },
      ]
    );
  };

  const verifyTransferPayment = async () => {
    setProcessing(true);
    
    try {
      // In a real app, you'd verify the transfer via webhook
      // For now, we'll simulate a successful payment
      const reference = `TRF-${Date.now()}`;
      
      const { error } = await supabase
        .from('business_logistics')
        .update({
          payment_status: 'paid',
          status: 'paid',
          payment_reference: reference,
          paid_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert(
        'Payment Successful',
        'Your payment has been confirmed. You can now track your delivery.',
        [
          {
            text: 'Track Delivery',
            onPress: () => {
              navigation.replace('TrackDelivery', { id });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error confirming payment:', error);
      Alert.alert('Error', 'Failed to confirm payment');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    console.log('Payment success:', response);
    setShowFlutterwave(false);
    
    try {
      const { error } = await supabase
        .from('business_logistics')
        .update({
          payment_status: 'paid',
          status: 'paid',
          payment_reference: response.tx_ref || paymentReference,
          paid_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert(
        'Payment Successful',
        'Your payment has been confirmed. You can now track your delivery.',
        [
          {
            text: 'Track Delivery',
            onPress: () => {
              navigation.replace('TrackDelivery', { id });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error updating payment status:', error);
      Alert.alert('Error', 'Payment was successful but failed to update status. Please contact support.');
    }
  };

  const handlePaymentClose = () => {
    setShowFlutterwave(false);
    Alert.alert('Payment Cancelled', 'You cancelled the payment');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Request Not Found</Text>
        <Text style={styles.errorText}>This delivery request may have been cancelled</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Make Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Amount Card */}
        <LinearGradient
          colors={['#f97316', '#f43f5e']}
          style={styles.amountCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.amountLabel}>Amount Due</Text>
          <Text style={styles.amountValue}>₦{amount?.toLocaleString()}</Text>
          <Text style={styles.requestNumber}>
            Request: {request.request_number}
          </Text>
        </LinearGradient>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Package</Text>
            <Text style={styles.summaryValue}>{request.package_name}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Weight</Text>
            <Text style={styles.summaryValue}>{request.weight_kg} kg</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>{request.distance_km} km</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelTotal}>Delivery Fee</Text>
            <Text style={styles.summaryValueTotal}>₦{amount?.toLocaleString()}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.methodsCard}>
          <Text style={styles.methodsTitle}>Select Payment Method</Text>

          <TouchableOpacity
            style={[
              styles.methodItem,
              paymentMethod === 'card' && styles.methodItemSelected,
            ]}
            onPress={() => setPaymentMethod('card')}
          >
            <View style={styles.methodLeft}>
              <View style={[styles.methodIcon, { backgroundColor: 'rgba(249,115,22,0.1)' }]}>
                <Feather name="credit-card" size={20} color="#f97316" />
              </View>
              <View>
                <Text style={styles.methodName}>Card Payment</Text>
                <Text style={styles.methodDesc}>Pay with debit/credit card</Text>
              </View>
            </View>
            <View style={[
              styles.methodRadio,
              paymentMethod === 'card' && styles.methodRadioSelected,
            ]}>
              {paymentMethod === 'card' && <View style={styles.methodRadioInner} />}
            </View>
          </TouchableOpacity>
{/* 
          <TouchableOpacity
            style={[
              styles.methodItem,
              paymentMethod === 'transfer' && styles.methodItemSelected,
            ]}
            onPress={() => setPaymentMethod('transfer')}
          >
            <View style={styles.methodLeft}>
              <View style={[styles.methodIcon, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                <Feather name="smartphone" size={20} color="#10b981" />
              </View>
              <View>
                <Text style={styles.methodName}>Bank Transfer</Text>
                <Text style={styles.methodDesc}>Pay via bank transfer</Text>
              </View>
            </View>
            <View style={[
              styles.methodRadio,
              paymentMethod === 'transfer' && styles.methodRadioSelected,
            ]}>
              {paymentMethod === 'transfer' && <View style={styles.methodRadioInner} />}
            </View>
          </TouchableOpacity> */}

          {paymentMethod === 'transfer' && (
            <View style={styles.transferInfo}>
              <Text style={styles.transferInfoTitle}>Bank Transfer Details</Text>
              <View style={styles.transferDetailRow}>
                <Text style={styles.transferDetailLabel}>Bank:</Text>
                <Text style={styles.transferDetailValue}>GTBank</Text>
              </View>
              <View style={styles.transferDetailRow}>
                <Text style={styles.transferDetailLabel}>Account Number:</Text>
                <Text style={styles.transferDetailValue}>0123456789</Text>
              </View>
              <View style={styles.transferDetailRow}>
                <Text style={styles.transferDetailLabel}>Account Name:</Text>
                <Text style={styles.transferDetailValue}>Vesphe Logistics Ltd</Text>
              </View>
              <View style={styles.transferNote}>
                <Feather name="info" size={14} color="#666" />
                <Text style={styles.transferNoteText}>
                  Use your request number ({request.request_number}) as reference
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {paymentMethod === 'card' ? (
            <TouchableOpacity
              style={styles.payButton}
              onPress={handleCardPayment}
              disabled={processing}
            >
              <LinearGradient
                colors={['#f97316', '#f43f5e']}
                style={styles.payGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="lock" size={18} color="#fff" />
                    <Text style={styles.payText}>Pay ₦{amount?.toLocaleString()}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleTransferPayment}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>I've Made the Transfer</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Flutterwave Payment Modal */}
      {showFlutterwave && user && (
        <FlutterwavePayment
          visible={showFlutterwave}
          amount={amount}
          email={user.email}
          reference={paymentReference}
          customerName={user.name}
          phone={user.phone}
          onSuccess={handlePaymentSuccess}
          onClose={handlePaymentClose}
        />
      )}
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
  errorButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 14,
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
  amountCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  amountValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  requestNumber: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  summaryCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
  },
  summaryValue: {
    fontSize: 13,
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 8,
  },
  summaryLabelTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  summaryValueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f97316',
  },
  methodsCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  methodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  methodItemSelected: {
    borderColor: '#f97316',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  methodDesc: {
    fontSize: 11,
    color: '#666',
  },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodRadioSelected: {
    borderColor: '#f97316',
  },
  methodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f97316',
  },
  transferInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 8,
  },
  transferInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
    marginBottom: 8,
  },
  transferDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  transferDetailLabel: {
    fontSize: 12,
    color: '#666',
  },
  transferDetailValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  transferNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  transferNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#666',
  },
  actionContainer: {
    padding: 16,
    gap: 8,
  },
  payButton: {
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  payGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    height: 56,
    backgroundColor: '#10b981',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
  },
});