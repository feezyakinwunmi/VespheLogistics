// src/screens/rider/DeliveryDetailsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { riderApi } from '../../services/api';
import { supabase } from '../../services/supabase';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  options?: any[];
  image_url?: string | null;
}

interface DeliveryDetails {
  discount: number;
  delivery_fee: any;
  id: string;
  request_number: string;
  order_type: 'business' | 'normal';
  
  // Business info
  business_name: string;
  business_phone?: string;
  
  // Package details
  package_name: string;
  package_type: string;
  weight_kg?: number;
  quantity: number;
  package_description?: string;
  handling_instructions?: string;
  
  // For normal orders - items
  items?: OrderItem[];
  
  // Pickup
  pickup_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  pickup_instructions?: string;
  
  // Delivery
  delivery_address: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  delivery_instructions?: string;
  
  // Receiver
  receiver_phone?: string;
  
  // Pricing
  distance_km?: number;
  calculated_fee: number;
  rider_share: number;
  subtotal?: number;
  total?: number;
  
  // Status
  status: string;
  assigned_at?: string;
  picked_up_at?: string;
  in_transit_at?: string;
  delivered_at?: string;
  created_at: string;
  
  // Additional details for normal orders
  vendor?: any;
  customer?: any;
  payment_method?: string;
}

export function DeliveryDetailsScreen({ navigation, route }: any) {
  const { id, orderType = 'business' } = route.params || {};
  const { user, isLoading: authLoading } = useAuth();
  
  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hasShownAlert, setHasShownAlert] = useState(false);


  // Add this function inside your component (before the updateStatus function)
// Add this function inside your component (before the updateStatus function)
const addToVendorWallet = async (vendorId: string, amount: number) => {
  try {
    console.log('💰 Adding to vendor wallet:', { vendorId, amount });
    
    // Convert amount to number explicitly
    const amountToAdd = Number(amount);
    
    // First, check if wallet exists
    const { data: existingWallet, error: fetchError } = await supabase
      .from('vendor_wallets')
      .select('balance, total_earned')
      .eq('vendor_id', vendorId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching wallet:', fetchError);
      return;
    }
    
    if (existingWallet) {
      // CRITICAL: Force conversion to numbers
      const currentBalance = Number(existingWallet.balance);
      const currentTotalEarned = Number(existingWallet.total_earned);
      
      const newBalance = currentBalance + amountToAdd;
      const newTotalEarned = currentTotalEarned + amountToAdd;
      
      console.log('Wallet update:', {
        currentBalance,
        amountToAdd,
        newBalance,
        currentTotalEarned,
        newTotalEarned
      });
      
      // Update existing wallet with numeric addition
      const { error: updateError } = await supabase
        .from('vendor_wallets')
        .update({
          balance: newBalance,
          total_earned: newTotalEarned,
          updated_at: new Date().toISOString()
        })
        .eq('vendor_id', vendorId);
      
      if (updateError) {
        console.error('Error updating wallet:', updateError);
      } else {
        console.log(`✅ Added ₦${amountToAdd} to vendor ${vendorId} wallet`);
        console.log(`   New balance: ₦${newBalance}`);
      }
    } else {
      // Create new wallet
      const { error: insertError } = await supabase
        .from('vendor_wallets')
        .insert({
          vendor_id: vendorId,
          balance: amountToAdd,
          total_earned: amountToAdd,
          pending_balance: 0,
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error creating wallet:', insertError);
      } else {
        console.log(`✅ Created new wallet for vendor ${vendorId} with ₦${amountToAdd}`);
      }
    }
  } catch (error) {
    console.error('Error in addToVendorWallet:', error);
  }
};


  useEffect(() => {
    
    if (authLoading) return;

    if (!id) {
      if (!hasShownAlert) {
        setHasShownAlert(true);
        Alert.alert('Error', 'No delivery ID provided', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
      return;
    }

    if (!user?.id) {
      if (!hasShownAlert) {
        setHasShownAlert(true);
        Alert.alert('Error', 'You must be logged in', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
      return;
    }

    fetchDeliveryDetails();
  }, [id, orderType, user?.id, authLoading]);

const fetchDeliveryDetails = async () => {
  try {
    setIsLoading(true);

    let data;
    if (orderType === 'business') {
      const { data: businessData, error } = await supabase
        .from('business_logistics_view')
        .select('*')
        .eq('id', id)
        .eq('rider_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      if (!businessData) {
        setDelivery(null);
        return;
      }
      data = businessData;
    } else {
      data = await riderApi.getOrderDetails(id, user?.id || '');
    }

    // ──── VERY IMPORTANT FIX ────
    data.order_type = orderType || 'business';  // ← Add this line
    // If you navigate with orderType='business' → force it here
    // If orderType is missing → default to 'business' (or detect by table)

  
    setDelivery(data);
  } catch (error) {
    console.error('Error fetching delivery:', error);
    if (!hasShownAlert) {
      setHasShownAlert(true);
      Alert.alert('Error', 'Failed to load delivery details');
    }
  } finally {
    setIsLoading(false);
  }
};

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const formattedNumber = phoneNumber.replace(/\+/g, '').replace(/\s/g, '');
    Linking.openURL(`https://wa.me/${formattedNumber}`);
  };

  const handleNavigate = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  };

const updateStatus = async (newStatus: string) => {
  if (!delivery) return;

  setUpdating(true);
  try {
    const updates: any = { status: newStatus };
    const now = new Date().toISOString();

    // Add timestamps based on status
    if (newStatus === 'picked_up') {
      updates.picked_up_at = now;
    } else if (newStatus === 'in_transit') {
      updates.in_transit_at = now;
    } else if (newStatus === 'delivered') {
      updates.delivered_at = now;
      if (delivery.order_type === 'business') {
        updates.completed_at = now;
      }
      
      // For normal orders (food), add to vendor wallet
      if (delivery.order_type !== 'business') {
        // Get the order details to get vendor_id and vendor_payout
        const { data: orderDetails, error: orderError } = await supabase
          .from('orders')
          .select('vendor_id, vendor_payout')
          .eq('id', id)
          .single();
        
        if (orderError) {
          console.error('Error fetching order details:', orderError);
        } else if (orderDetails && orderDetails.vendor_payout) {
          console.log('💰 Adding to vendor wallet:', {
            vendorId: orderDetails.vendor_id,
            amount: orderDetails.vendor_payout
          });
          await addToVendorWallet(orderDetails.vendor_id, orderDetails.vendor_payout);
        }
      }
    }

    // Update the order status
    let result;
    if (delivery.order_type === 'business') {
      result = await supabase
        .from('business_logistics')
        .update(updates)
        .eq('id', id)
        .eq('rider_id', user?.id)
        .select();
    } else {
      const orderUpdates: any = { 
        status: newStatus,
        updated_at: now 
      };
      
      if (newStatus === 'in_transit') {
        orderUpdates.in_transit_at = now;
      } else if (newStatus === 'delivered') {
        orderUpdates.delivered_at = now;
      }
      
      result = await supabase
        .from('orders')
        .update(orderUpdates)
        .eq('id', id)
        .eq('rider_id', user?.id)
        .select();
    }

    if (result.error) {
      console.error('Update error:', result.error);
      throw result.error;
    }

    Alert.alert('Success', `Delivery marked as ${newStatus.replace('_', ' ')}`);
    
    // Refresh the delivery details
    await fetchDeliveryDetails();
    
  } catch (error: any) {
    console.error('Error updating status:', error);
    Alert.alert('Error', `Failed to update delivery status: ${error.message || 'Unknown error'}`);
  } finally {
    setUpdating(false);
  }
};


const getStatusActions = () => {
  if (!delivery) return [];

  const actions = [];

  // For business orders
  if (delivery.order_type === 'business') {

    if (delivery.status === 'assigned') {
      actions.push(
        <TouchableOpacity
          key="picked_up"
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => updateStatus('picked_up')}
          disabled={updating}
        >
          <Feather name="package" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Mark as Picked Up</Text>
        </TouchableOpacity>
      );
    }

    if (delivery.status === 'picked_up') {
      actions.push(
        <TouchableOpacity
          key="in_transit"
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => updateStatus('in_transit')}
          disabled={updating}
        >
          <Feather name="navigation" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Start Trip</Text>
        </TouchableOpacity>
      );
    }

    if (delivery.status === 'in_transit') {
      actions.push(
        <TouchableOpacity
          key="delivered"
          style={[styles.actionButton, styles.successAction]}
          onPress={() => updateStatus('delivered')}
          disabled={updating}
        >
          <Feather name="check-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Mark as Delivered</Text>
        </TouchableOpacity>
      );
    }
  } 
  // For normal orders
  else {
    if (delivery.status === 'confirmed' || delivery.status === 'preparing' || delivery.status === 'ready') {
      actions.push(
        <TouchableOpacity
          key="picked_up"
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => updateStatus('picked_up')}
          disabled={updating}
        >
          <Feather name="package" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Mark as Picked Up</Text>
        </TouchableOpacity>
      );
    }

    if (delivery.status === 'picked_up') {
      actions.push(
        <TouchableOpacity
          key="in_transit"
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => updateStatus('in_transit')}
          disabled={updating}
        >
          <Feather name="navigation" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Start Trip</Text>
        </TouchableOpacity>
      );
    }

    if (delivery.status === 'in_transit') {
      actions.push(
        <TouchableOpacity
          key="delivered"
          style={[styles.actionButton, styles.successAction]}
          onPress={() => updateStatus('delivered')}
          disabled={updating}
        >
          <Feather name="check-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Mark as Delivered</Text>
        </TouchableOpacity>
      );
    }
  }

  return actions;
};
  const renderOrderItems = () => {
    if (!delivery?.items || delivery.items.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="shopping-bag" size={18} color="#f97316" />
          <Text style={styles.sectionTitle}>Order Items</Text>
        </View>

        {delivery.items.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.itemImage} />
            ) : (
              <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                <Feather name="image" size={20} color="#666" />
              </View>
            )}
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
              <Text style={styles.itemPrice}>₦{(item.price * item.quantity).toLocaleString()}</Text>
            </View>
          </View>
        ))}

        {delivery.subtotal && delivery.total && (
          <View style={styles.orderTotal}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>₦{delivery.subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Delivery Fee</Text>
              <Text style={styles.totalValue}>₦{delivery.delivery_fee?.toLocaleString()}</Text>
            </View>
            {delivery.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.discountValue}>-₦{delivery.discount.toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabelBold}>Total</Text>
              <Text style={styles.totalValueBold}>₦{delivery.total.toLocaleString()}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (authLoading || (isLoading && !delivery)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Delivery Not Found</Text>
        <Text style={styles.errorText}>This delivery may have been completed or cancelled</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const actions = getStatusActions();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Details</Text>
        <TouchableOpacity onPress={fetchDeliveryDetails} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={20} color="#f97316" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <LinearGradient
          colors={['#f97316', '#f43f5e']}
          style={styles.statusBanner}
        >
          <View style={styles.statusIcon}>
            <Feather name="truck" size={24} color="#fff" />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text style={styles.statusValue}>
              {delivery.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <View style={styles.requestNumber}>
            <Text style={styles.requestNumberLabel}>Request #</Text>
            <Text style={styles.requestNumberValue}>{delivery.request_number}</Text>
          </View>
        </LinearGradient>

        {/* Action Buttons */}
        {actions.length > 0 && (
          <View style={styles.actionContainer}>
            {actions}
            {updating && (
              <View style={styles.updatingOverlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.updatingText}>Updating...</Text>
              </View>
            )}
          </View>
        )}

        {/* Business Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="briefcase" size={18} color="#f97316" />
            <Text style={styles.sectionTitle}>
              {delivery.order_type === 'business' ? 'Business' : 'Restaurant'}
            </Text>
          </View>
          <Text style={styles.businessName}>{delivery.business_name}</Text>
          {delivery.business_phone && (
            <View style={styles.contactRow}>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => handleCall(delivery.business_phone || '')}
              >
                <Feather name="phone" size={16} color="#10b981" />
                <Text style={styles.contactText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => handleWhatsApp(delivery.business_phone || '')}
              >
                <Feather name="message-circle" size={16} color="#25D366" />
                <Text style={styles.contactText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Package Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="package" size={18} color="#f97316" />
            <Text style={styles.sectionTitle}>Package</Text>
          </View>
          
          <View style={styles.packageCard}>
            <Text style={styles.packageName}>{delivery.package_name}</Text>
            {delivery.package_type && (
              <View style={styles.packageBadge}>
                <Text style={styles.packageType}>{delivery.package_type}</Text>
              </View>
            )}
            
            <View style={styles.packageDetails}>
              {delivery.weight_kg && (
                <View style={styles.packageDetail}>
                  <Text style={styles.detailLabel}>Weight</Text>
                  <Text style={styles.detailValue}>{delivery.weight_kg} kg</Text>
                </View>
              )}
              <View style={styles.packageDetail}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>{delivery.quantity}</Text>
              </View>
            </View>

            {delivery.package_description && (
              <Text style={styles.packageDescription}>{delivery.package_description}</Text>
            )}

            {delivery.handling_instructions && (
              <View style={styles.instructionsBox}>
                <Feather name="alert-triangle" size={14} color="#f97316" />
                <Text style={styles.instructionsText}>{delivery.handling_instructions}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Items (for normal orders) */}
        {renderOrderItems()}

        {/* Pickup Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="map-pin" size={18} color="#10b981" />
            <Text style={styles.sectionTitle}>Pickup Location</Text>
          </View>

          <View style={styles.locationCard}>
            <Text style={styles.address}>{delivery.pickup_address}</Text>
            
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{delivery.pickup_contact_name}</Text>
              <Text style={styles.contactPhone}>{delivery.pickup_contact_phone}</Text>
            </View>

            {delivery.pickup_instructions && (
              <View style={styles.instructionNote}>
                <Feather name="info" size={12} color="#666" />
                <Text style={styles.instructionNoteText}>{delivery.pickup_instructions}</Text>
              </View>
            )}

            <View style={styles.locationActions}>
              {delivery.pickup_latitude && delivery.pickup_longitude && (
                <TouchableOpacity 
                  style={styles.navigateButton}
                  onPress={() => handleNavigate(delivery.pickup_latitude!, delivery.pickup_longitude!)}
                >
                  <Feather name="navigation" size={16} color="#fff" />
                  <Text style={styles.navigateText}>Navigate</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.callButton}
                onPress={() => handleCall(delivery.pickup_contact_phone)}
              >
                <Feather name="phone" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Delivery Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="flag" size={18} color="#f97316" />
            <Text style={styles.sectionTitle}>Delivery Location</Text>
          </View>

          <View style={styles.locationCard}>
            <Text style={styles.address}>{delivery.delivery_address}</Text>
            
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{delivery.delivery_contact_name}</Text>
              <Text style={styles.contactPhone}>{delivery.delivery_contact_phone}</Text>
            </View>

            {delivery.receiver_phone && (
              <View style={styles.receiverInfo}>
                <Feather name="phone" size={12} color="#666" />
                <Text style={styles.receiverText}>Receiver: {delivery.receiver_phone}</Text>
              </View>
            )}

            {delivery.delivery_instructions && (
              <View style={styles.instructionNote}>
                <Feather name="info" size={12} color="#666" />
                <Text style={styles.instructionNoteText}>{delivery.delivery_instructions}</Text>
              </View>
            )}

            <View style={styles.locationActions}>
              {delivery.delivery_latitude && delivery.delivery_longitude && (
                <TouchableOpacity 
                  style={styles.navigateButton}
                  onPress={() => handleNavigate(delivery.delivery_latitude!, delivery.delivery_longitude!)}
                >
                  <Feather name="navigation" size={16} color="#fff" />
                  <Text style={styles.navigateText}>Navigate</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.callButton}
                onPress={() => handleCall(delivery.delivery_contact_phone)}
              >
                <Feather name="phone" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Earnings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="dollar-sign" size={18} color="#10b981" />
            <Text style={styles.sectionTitle}>Earnings</Text>
          </View>

          <LinearGradient
            colors={['#1a1a1a', '#0a0a0a']}
            style={styles.earningsCard}
          >
            {/* <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Delivery Fee</Text>
              <Text style={styles.earningsValue}>₦{delivery.calculated_fee?.toLocaleString()}</Text>
            </View> */}
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Your Earn </Text>
              <Text style={styles.earningsHighlight}>₦{delivery.rider_share?.toLocaleString()}</Text>
            </View>
            {delivery.status === 'delivered' && (
              <View style={styles.earningsBadge}>
                <Feather name="check-circle" size={14} color="#10b981" />
                <Text style={styles.earningsBadgeText}>Earnings recorded</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Payment Info (for normal orders) */}
        {delivery.payment_method && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="credit-card" size={18} color="#f97316" />
              <Text style={styles.sectionTitle}>Payment</Text>
            </View>
            <View style={styles.paymentCard}>
              <Text style={styles.paymentMethod}>
                Method: {delivery.payment_method === 'cash' ? 'Cash on Delivery' : delivery.payment_method}
              </Text>
              {delivery.payment_method === 'cash' && (
                <View style={styles.cashNote}>
                  <Feather name="info" size={14} color="#f59e0b" />
                  <Text style={styles.cashNoteText}>
                    Collect ₦{delivery.total?.toLocaleString()} from customer
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  requestNumber: {
    alignItems: 'flex-end',
  },
  requestNumberLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  requestNumberValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  actionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
  },
  actionButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryAction: {
    backgroundColor: '#f97316',
  },
  successAction: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  updatingText: {
    color: '#fff',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  contactText: {
    fontSize: 13,
    color: '#fff',
  },
  packageCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  packageBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  packageType: {
    fontSize: 11,
    color: '#f97316',
    textTransform: 'capitalize',
  },
  packageDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  packageDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
  },
  packageDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 6,
  },
  instructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#f97316',
  },
  orderItem: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemImagePlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
  },
  orderTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 13,
    color: '#666',
  },
  totalValue: {
    fontSize: 13,
    color: '#fff',
  },
  discountValue: {
    fontSize: 13,
    color: '#f43f5e',
  },
  totalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 6,
  },
  totalLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  totalValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f97316',
  },
  locationCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
  },
  address: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  contactInfo: {
    marginBottom: 8,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  contactPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  receiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  receiverText: {
    fontSize: 12,
    color: '#f97316',
  },
  instructionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    marginBottom: 12,
  },
  instructionNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  locationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  navigateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#f97316',
    borderRadius: 6,
  },
  navigateText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  callButton: {
    width: 44,
    height: 44,
    backgroundColor: '#10b981',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsCard: {
    padding: 12,
    borderRadius: 8,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  earningsLabel: {
    fontSize: 13,
    color: '#666',
  },
  earningsValue: {
    fontSize: 13,
    color: '#fff',
  },
  earningsHighlight: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
  },
  earningsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  earningsBadgeText: {
    fontSize: 11,
    color: '#10b981',
  },
  paymentCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  cashNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 6,
  },
  cashNoteText: {
    fontSize: 12,
    color: '#f59e0b',
  },
});