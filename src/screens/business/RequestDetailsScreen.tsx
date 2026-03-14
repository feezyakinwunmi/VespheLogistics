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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { businessApi } from '../../services/api';
import { BusinessRequest } from '../../types';



// export interface BusinessRequest {
//   id: string;
//   request_number: string;
//   business_id: string;
//   business_name: string;
//   business_phone: string;
//   business_email: string;
  
//   // Package details
//   package_name: string;
//   package_type: string;
//   weight_kg: number;
//   quantity: number;
//   package_description?: string;
//   declared_value?: number;
//   handling_instructions?: string;
//   package_image_url?: string;
  
//   // Pickup location
//   pickup_address: string;
//   pickup_latitude?: number;
//   pickup_longitude?: number;
//   pickup_contact_name: string;
//   pickup_contact_phone: string;
//   pickup_instructions?: string;
  
//   // Delivery location
//   delivery_address: string;
//   delivery_latitude?: number;
//   delivery_longitude?: number;
//   delivery_contact_name: string;
//   delivery_contact_phone: string;
//   delivery_instructions?: string;
  
//   // Receiver
//   receiver_phone: string;
  
//   // Pricing
//   distance_km?: number;
//   calculated_fee?: number;
//   rider_share?: number;
//   platform_share?: number;
//   rider_percentage?: number;
  
//   // Status
//   status: 'pending' | 'accepted' | 'paid' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
//   payment_status: 'pending' | 'paid' | 'failed';
//   payment_reference?: string;
//   paid_at?: string;
  
//   // Assignment
//   rider_id?: string;
//   rider_name?: string;
//   rider_phone?: string;
//   rider_vehicle?: string;
//   assigned_by?: string;
//   assigned_at?: string;
  
//   // Notes - ADD THESE LINES
//   admin_notes?: string;
//   business_notes?: string;
  
//   // Timestamps
//   created_at: string;
//   updated_at: string;
//   completed_at?: string;
//   picked_up_at?: string;
//   in_transit_at?: string;
//   delivered_at?: string;
  
//   // Who updated - ADD THIS IF NEEDED
//   updated_by?: string;
// }



export function RequestDetailsScreen({ navigation, route }: any) {
  const { id } = route.params;
  const [request, setRequest] = useState<BusinessRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      const data = await businessApi.getRequestDetails(id);
      setRequest(data);
    } catch (error) {
      console.error('Error fetching request details:', error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequestDetails();
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const formattedNumber = phoneNumber.replace(/\+/g, '').replace(/\s/g, '');
    Linking.openURL(`https://wa.me/${formattedNumber}`);
  };

  const handleTrack = () => {
    navigation.navigate('TrackDelivery', { id: request?.id });
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this delivery request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await businessApi.cancelRequest(id);
              Alert.alert('Success', 'Request cancelled successfully');
              fetchRequestDetails();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel request');
            }
          },
        },
      ]
    );
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

  const canCancel = () => {
    return request?.status === 'pending' || request?.status === 'accepted';
  };

  const canTrack = () => {
    return ['assigned', 'picked_up', 'in_transit'].includes(request?.status || '');
  };

  const canPay = () => {
    return request?.status === 'accepted' && request?.calculated_fee && request?.payment_status !== 'paid';
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
        <Text style={styles.errorText}>This delivery request may have been deleted</Text>
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
        <Text style={styles.headerTitle}>Request Details</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={20} color="#f97316" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <LinearGradient
          colors={[getStatusColor(request.status), getStatusColor(request.status) + '80']}
          style={styles.statusBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statusIcon}>
            <Feather name={getStatusIcon(request.status)} size={24} color="#fff" />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text style={styles.statusValue}>{getStatusLabel(request.status)}</Text>
          </View>
          <View style={styles.requestNumber}>
            <Text style={styles.requestNumberLabel}>Request #</Text>
            <Text style={styles.requestNumberValue}>{request.request_number}</Text>
          </View>
        </LinearGradient>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {canTrack() && (
            <TouchableOpacity style={styles.trackButton} onPress={handleTrack}>
              <Feather name="map" size={20} color="#fff" />
              <Text style={styles.trackButtonText}>Track Delivery</Text>
            </TouchableOpacity>
          )}

          {canPay() && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => navigation.navigate('Payment', { 
                id: request.id, 
                amount: request.calculated_fee 
              })}
            >
              <Feather name="credit-card" size={20} color="#fff" />
              <Text style={styles.payButtonText}>Pay ₦{request.calculated_fee?.toLocaleString()}</Text>
            </TouchableOpacity>
          )}

          {canCancel() && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Feather name="x-circle" size={20} color="#ef4444" />
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Package Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="package" size={18} color="#f97316" />
            <Text style={styles.sectionTitle}>Package Details</Text>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{request.package_name}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Type</Text>
              <View style={[styles.typeBadge, { backgroundColor: getStatusColor(request.package_type) + '20' }]}>
                <Text style={[styles.typeText, { color: getStatusColor(request.package_type) }]}>
                  {request.package_type}
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{request.weight_kg} kg</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Quantity</Text>
              <Text style={styles.detailValue}>{request.quantity}</Text>
            </View>
          </View>

          {request.package_description ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{request.package_description}</Text>
            </View>
          ) : null}

          {request.handling_instructions ? (
            <View style={styles.instructionsBox}>
              <Feather name="alert-triangle" size={14} color="#f97316" />
              <Text style={styles.instructionsText}>{request.handling_instructions}</Text>
            </View>
          ) : null}

          {request.declared_value ? (
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>Declared Value</Text>
              <Text style={styles.valueAmount}>₦{request.declared_value.toLocaleString()}</Text>
            </View>
          ) : null}
        </View>

        {/* Pickup Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="map-pin" size={18} color="#10b981" />
            <Text style={styles.sectionTitle}>Pickup Location</Text>
          </View>

          <Text style={styles.address}>{request.pickup_address}</Text>
          
          <View style={styles.contactRow}>
            <Feather name="user" size={14} color="#666" />
            <Text style={styles.contactName}>{request.pickup_contact_name}</Text>
          </View>
          
          <View style={styles.phoneRow}>
            <TouchableOpacity 
              style={styles.phoneButton}
              onPress={() => handleCall(request.pickup_contact_phone)}
            >
              <Feather name="phone" size={14} color="#10b981" />
              <Text style={styles.phoneText}>{request.pickup_contact_phone}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.whatsappButton}
              onPress={() => handleWhatsApp(request.pickup_contact_phone)}
            >
              <Feather name="message-circle" size={14} color="#25D366" />
            </TouchableOpacity>
          </View>

          {request.pickup_instructions ? (
            <View style={styles.instructionNote}>
              <Feather name="info" size={12} color="#666" />
              <Text style={styles.instructionNoteText}>{request.pickup_instructions}</Text>
            </View>
          ) : null}
        </View>

        {/* Delivery Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="flag" size={18} color="#f97316" />
            <Text style={styles.sectionTitle}>Delivery Location</Text>
          </View>

          <Text style={styles.address}>{request.delivery_address}</Text>
          
          <View style={styles.contactRow}>
            <Feather name="user" size={14} color="#666" />
            <Text style={styles.contactName}>{request.delivery_contact_name}</Text>
          </View>
          
          <View style={styles.phoneRow}>
            <TouchableOpacity 
              style={styles.phoneButton}
              onPress={() => handleCall(request.delivery_contact_phone)}
            >
              <Feather name="phone" size={14} color="#f97316" />
              <Text style={styles.phoneText}>{request.delivery_contact_phone}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.whatsappButton}
              onPress={() => handleWhatsApp(request.delivery_contact_phone)}
            >
              <Feather name="message-circle" size={14} color="#25D366" />
            </TouchableOpacity>
          </View>

          <View style={styles.receiverInfo}>
            <Feather name="phone" size={14} color="#666" />
            <Text style={styles.receiverText}>Receiver: {request.receiver_phone}</Text>
          </View>

          {request.delivery_instructions ? (
            <View style={styles.instructionNote}>
              <Feather name="info" size={12} color="#666" />
              <Text style={styles.instructionNoteText}>{request.delivery_instructions}</Text>
            </View>
          ) : null}
        </View>

        {/* Pricing Section */}
        {request.calculated_fee ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="dollar-sign" size={18} color="#f97316" />
              <Text style={styles.sectionTitle}>Pricing</Text>
            </View>

            <View style={styles.pricingCard}>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Distance</Text>
                <Text style={styles.pricingValue}>{request.distance_km} km</Text>
              </View>
              
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Delivery Fee</Text>
                <Text style={styles.pricingFee}>₦{request.calculated_fee.toLocaleString()}</Text>
              </View>

              <View style={styles.pricingDivider} />

              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabelTotal}>Total</Text>
                <Text style={styles.pricingValueTotal}>₦{request.calculated_fee.toLocaleString()}</Text>
              </View>

              {request.payment_status === 'paid' ? (
                <View style={styles.paymentStatusPaid}>
                  <Feather name="check-circle" size={16} color="#10b981" />
                  <Text style={styles.paymentStatusPaidText}>Payment Confirmed</Text>
                </View>
              ) : request.payment_status === 'pending' && request.status !== 'pending' ? (
                <View style={styles.paymentStatusPending}>
                  <Feather name="clock" size={16} color="#f59e0b" />
                  <Text style={styles.paymentStatusPendingText}>Awaiting Payment</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Admin Notes - Only show if exists */}
{request.admin_notes && (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Feather name="message-square" size={18} color="#f97316" />
      <Text style={styles.sectionTitle}>Admin Notes</Text>
    </View>
    <View style={styles.adminNotesCard}>
      <Feather name="info" size={16} color="#f97316" style={styles.adminNotesIcon} />
      <Text style={styles.adminNotesText}>{request.admin_notes}</Text>
    </View>
    {request.updated_by && (
      <Text style={styles.adminNotesMeta}>
        Last updated by admin • {new Date(request.updated_at || request.created_at).toLocaleString()}
      </Text>
    )}
  </View>
)}

        {/* Rider Information */}
        {request.rider_name && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="user" size={18} color="#10b981" />
              <Text style={styles.sectionTitle}>Rider Information</Text>
            </View>

            <View style={styles.riderCard}>
              <View style={styles.riderAvatar}>
                <Text style={styles.riderAvatarText}>
                  {request.rider_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{request.rider_name}</Text>
                <Text style={styles.riderVehicle}>{request.rider_vehicle}</Text>
              </View>

              <View style={styles.riderActions}>
                <TouchableOpacity 
                  style={styles.riderCallButton}
                  onPress={() => handleCall(request.rider_phone || '')}
                >
                  <Feather name="phone" size={18} color="#10b981" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.riderWhatsAppButton}
                  onPress={() => handleWhatsApp(request.rider_phone || '')}
                >
                  <Feather name="message-circle" size={18} color="#25D366" />
                </TouchableOpacity>
              </View>
            </View>

            {request.assigned_at && (
              <Text style={styles.assignedTime}>
                Assigned: {new Date(request.assigned_at).toLocaleString()}
              </Text>
            )}
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="clock" size={18} color="#666" />
            <Text style={styles.sectionTitle}>Timeline</Text>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Request Created</Text>
                <Text style={styles.timelineTime}>
                  {new Date(request.created_at).toLocaleString()}
                </Text>
              </View>
            </View>

            {request.assigned_at && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotActive]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Assigned to Rider</Text>
                  <Text style={styles.timelineTime}>
                    {new Date(request.assigned_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            {request.picked_up_at && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotActive]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Package Picked Up</Text>
                  <Text style={styles.timelineTime}>
                    {new Date(request.picked_up_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            {request.delivered_at && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotSuccess]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Delivered</Text>
                  <Text style={styles.timelineTime}>
                    {new Date(request.delivered_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </View>
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
    fontSize: 18,
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
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  trackButton: {
    flex: 1,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  payButton: {
    flex: 1,
    backgroundColor: '#f97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
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
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flex: 1,
    minWidth: '40%',
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  descriptionBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 8,
  },
  instructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#f97316',
  },
  valueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
  },
  valueLabel: {
    fontSize: 12,
    color: '#666',
  },
  valueAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
  },
  address: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contactName: {
    fontSize: 13,
    color: '#fff',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    fontSize: 13,
    color: '#666',
  },
  whatsappButton: {
    padding: 4,
  },
  instructionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: 6,
    marginTop: 4,
  },
  instructionNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  receiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  receiverText: {
    fontSize: 13,
    color: '#f97316',
  },
  pricingCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  pricingLabel: {
    fontSize: 13,
    color: '#666',
  },
  pricingValue: {
    fontSize: 13,
    color: '#fff',
  },
  pricingFee: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f97316',
  },
  pricingDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 6,
  },
  pricingLabelTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pricingValueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f97316',
  },
  adminNotesCard: {
  flexDirection: 'row',
  backgroundColor: 'rgba(249,115,22,0.1)',
  padding: 16,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: 'rgba(249,115,22,0.2)',
  gap: 12,
},
adminNotesIcon: {
  marginTop: 2,
},
adminNotesText: {
  flex: 1,
  fontSize: 14,
  color: '#fff',
  lineHeight: 20,
},
adminNotesMeta: {
  fontSize: 10,
  color: '#666',
  marginTop: 8,
  textAlign: 'right',
  fontStyle: 'italic',
},
  paymentStatusPaid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 6,
  },
  paymentStatusPaidText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  paymentStatusPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 6,
  },
  paymentStatusPendingText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  riderAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  riderVehicle: {
    fontSize: 12,
    color: '#666',
  },
  riderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  riderCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16,185,129,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderWhatsAppButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37,211,102,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignedTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
    marginRight: 12,
    marginTop: 2,
  },
  timelineDotActive: {
    backgroundColor: '#f97316',
  },
  timelineDotSuccess: {
    backgroundColor: '#10b981',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 11,
    color: '#666',
  },
});