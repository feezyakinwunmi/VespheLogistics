import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import Toast from 'react-native-toast-message';

import { useAuth } from '../../hooks/useAuth';
import { riderApi } from '../../services/api';
import { supabase } from '../../services/supabase';
import { BusinessRequest } from '../../types';

const { width, height } = Dimensions.get('window');

const LAGOS_CENTER = { latitude: 6.5244, longitude: 3.3792 };
// types.ts (or inside this file)
interface NormalOrderDetails {
  id: string;
  order_number?: string;
  rider_id?: string | null;           // ← add this
  assigned_rider_id?: string | null;  // ← add this too if it exists
  rider?: string | null;              // ← in case it's named differently
  status: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  vendors?: { name?: string };
  // add other fields you actually use
}

export function TrackDeliveryScreen({ navigation, route }: any) {
  const { id, orderType } = route.params || {};
  const { user, isLoading: authLoading } = useAuth();
const mapRef = useRef<any>(null);
  const [delivery, setDelivery] = useState<BusinessRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [riderLocation, setRiderLocation] = useState<{
    latitude: number;
    longitude: number;
    timestamp: string;
  } | null>(null);

  const [pickupCoord, setPickupCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deliveryCoord, setDeliveryCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  const currentUserId = user?.id || null;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      Toast.show({ type: 'error', text1: 'You must be logged in' });
      navigation.goBack();
      return;
    }
    if (!id) {
      Toast.show({ type: 'error', text1: 'No delivery ID provided' });
      navigation.goBack();
      return;
    }

    fetchDeliveryDetails();
  }, [id, user, authLoading]);

  // Realtime rider location subscription
  useEffect(() => {
    const effectiveRiderId = riderId || currentUserId;
    if (!effectiveRiderId) return;

    // Initial fetch
    fetchRiderLocation(effectiveRiderId);

    const channel = supabase
      .channel(`rider-location-${effectiveRiderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${effectiveRiderId}`,
        },
        (payload: any) => {
          if (payload.new.current_latitude && payload.new.current_longitude) {
            setRiderLocation({
              latitude: Number(payload.new.current_latitude),
              longitude: Number(payload.new.current_longitude),
              timestamp: payload.new.last_location_update || new Date().toISOString(),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderId, currentUserId]);

  // Fit map when coordinates change
  useEffect(() => {
    if (delivery && (pickupCoord || deliveryCoord || riderLocation)) {
      fitMapToCoordinates();
    }
  }, [delivery, riderLocation, pickupCoord, deliveryCoord]);

  const fetchDeliveryDetails = async () => {
    try {
      setIsLoading(true);

      let data: any = null;
      let extractedRiderId: string | null = null;

      // 1. Business logistics
      const { data: businessData, error: bError } = await supabase
        .from('business_logistics_view')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!bError && businessData) {
        data = businessData;
        extractedRiderId = businessData.rider_id;

        setPickupCoord(
          businessData.pickup_latitude && businessData.pickup_longitude
            ? { latitude: Number(businessData.pickup_latitude), longitude: Number(businessData.pickup_longitude) }
            : LAGOS_CENTER
        );

        setDeliveryCoord(
          businessData.delivery_latitude && businessData.delivery_longitude
            ? { latitude: Number(businessData.delivery_latitude), longitude: Number(businessData.delivery_longitude) }
            : LAGOS_CENTER
        );
      } else {
        // 2. Normal order
        try {
const orderData = await riderApi.getOrderDetails(id, user!.id) as NormalOrderDetails;      
    data = orderData;

          extractedRiderId =
            orderData.rider_id ||
            orderData.assigned_rider_id ||
            orderData.rider ||
            null;

          setPickupCoord(
            orderData.pickup_latitude && orderData.pickup_longitude
              ? { latitude: Number(orderData.pickup_latitude), longitude: Number(orderData.pickup_longitude) }
              : LAGOS_CENTER
          );

          setDeliveryCoord(
            orderData.delivery_latitude && orderData.delivery_longitude
              ? { latitude: Number(orderData.delivery_latitude), longitude: Number(orderData.delivery_longitude) }
              : LAGOS_CENTER
          );
        } catch (orderErr) {
          // Silent fail - handled below
        }
      }

      if (!data) {
        Toast.show({ type: 'error', text1: 'Delivery not found' });
        navigation.goBack();
        return;
      }

      setDelivery(data);
      setRiderId(extractedRiderId || currentUserId);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load delivery',
        text2: 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRiderLocation = async (targetRiderId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('current_latitude, current_longitude, last_location_update')
        .eq('id', targetRiderId)
        .single();

      if (error) throw error;

      if (data?.current_latitude && data?.current_longitude) {
        setRiderLocation({
          latitude: Number(data.current_latitude),
          longitude: Number(data.current_longitude),
          timestamp: data.last_location_update || new Date().toISOString(),
        });
      }
    } catch {
      // Silent fail - realtime will catch updates
    }
  };

  const fitMapToCoordinates = () => {
    if (!mapRef.current) return;

    const points = [];
    if (pickupCoord) points.push(pickupCoord);
    if (deliveryCoord) points.push(deliveryCoord);
    if (riderLocation) points.push({ latitude: riderLocation.latitude, longitude: riderLocation.longitude });

   
  };

  const handleNavigate = (lat?: number, lng?: number) => {
    if (!lat || !lng) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() =>
      Toast.show({ type: 'error', text1: 'Could not open maps' })
    );
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() =>
      Toast.show({ type: 'error', text1: 'Could not open phone dialer' })
    );
  };

  const handleWhatsApp = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() =>
      Toast.show({ type: 'error', text1: 'Could not open WhatsApp' })
    );
  };

  const getStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      assigned: '#f97316',
      picked_up: '#f97316',
      in_transit: '#f97316',
      delivered: '#10b981',
    };
    return colors[status || ''] || '#666';
  };

  const getNextAction = () => {
    if (!delivery) return null;

    if (delivery.status === 'assigned' && pickupCoord) {
      return {
        text: 'Go to Pickup',
        action: () => handleNavigate(pickupCoord.latitude, pickupCoord.longitude),
      };
    }
    if ((delivery.status === 'picked_up' || delivery.status === 'in_transit') && deliveryCoord) {
      return {
        text: 'Go to Delivery',
        action: () => handleNavigate(deliveryCoord.latitude, deliveryCoord.longitude),
      };
    }
    return null;
  };

  const formatLastUpdate = (ts?: string) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (authLoading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>
          {authLoading ? 'Checking login...' : 'Loading delivery...'}
        </Text>
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Delivery Not Found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nextAction = getNextAction();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Delivery</Text>
        <TouchableOpacity onPress={fitMapToCoordinates} style={styles.centerButton}>
          <Feather name="target" size={20} color="#f97316" />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
    <WebView
  ref={mapRef}
  originWhitelist={['*']}
  style={styles.map}
  source={{
    html: `
<!DOCTYPE html>
<html>

<head>

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<link rel="stylesheet"
href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>

<style>
html,body{margin:0;padding:0}
#map{height:100vh;width:100vw}
</style>

</head>

<body>

<div id="map"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<script>


// Custom marker icons

var vendorIcon = new L.Icon({
  iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -35]
});

var riderIcon = new L.Icon({
  iconUrl: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -35]
});

var deliveryIcon = new L.Icon({
  iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -35]
});




var map = L.map('map').setView([6.5244,3.3792],12);

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{ attribution:'© OpenStreetMap contributors'}
).addTo(map);

var pickup = ${JSON.stringify(pickupCoord)};
var delivery = ${JSON.stringify(deliveryCoord)};
var rider = ${JSON.stringify(riderLocation)};

var bounds = [];

if(pickup){
var pickupMarker=L.marker([pickup.latitude,pickup.longitude], {icon: vendorIcon}).addTo(map);

pickupMarker.bindPopup(
"<b>PICKUP</b><br>${delivery?.pickup_address || ""}"
);

bounds.push([pickup.latitude,pickup.longitude]
);
}

if(delivery){
var deliveryMarker=L.marker([delivery.latitude,delivery.longitude],{icon: deliveryIcon}).addTo(map);

deliveryMarker.bindPopup(
"<b>DELIVERY</b><br>${delivery?.delivery_address || ""}"
);

bounds.push([delivery.latitude,delivery.longitude]);
}

if(rider){
var riderMarker=L.marker([rider.latitude,rider.longitude],  {icon: riderIcon}
).addTo(map);

riderMarker.bindPopup(
"<b>RIDER LOCATION</b>"
);

bounds.push([rider.latitude,rider.longitude]);
}

if(rider && delivery){
var line=L.polyline([
[rider.latitude,rider.longitude],
[delivery.latitude,delivery.longitude]
],
{color:'#f97316',weight:5}
).addTo(map);
}

if(bounds.length>0){
map.fitBounds(bounds);
}

</script>

</body>
</html>
`
  }}
/>

        {/* Map Legend */}
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Pickup</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
            <Text style={styles.legendText}>Delivery</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Rider</Text>
          </View>
        </View>

        {/* Last Updated Indicator */}
        {riderLocation && (
          <View style={styles.lastUpdated}>
            <Feather name="clock" size={12} color="#aaa" />
            <Text style={styles.lastUpdatedText}>
              Live • {formatLastUpdate(riderLocation.timestamp)}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Info Card */}
      <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={styles.infoCardGradient}>
        <ScrollView style={styles.infoCardScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status) + '20' }]}>
              <Feather name="circle" size={8} color={getStatusColor(delivery.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(delivery.status) }]}>
                {delivery.status?.replace('_', ' ').toUpperCase() || 'Unknown'}
              </Text>
            </View>
            <Text style={styles.requestNumber}>{delivery.request_number || id.slice(0, 8)}</Text>
          </View>

          <View style={styles.packageRow}>
            <Feather name="package" size={18} color="#f97316" />
            <Text style={styles.packageName}>{delivery.package_name || 'Delivery'}</Text>
            <Text style={styles.packageWeight}>{delivery.weight_kg ?? '?'} kg</Text>
          </View>

          <View style={styles.locations}>
            <View style={styles.locationItem}>
              <Feather name="map-pin" size={18} color="#10b981" />
              <View style={styles.locationContent}>
                <Text style={styles.locationType}>PICKUP</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {delivery.pickup_address || '—'}
                </Text>
                <Text style={styles.locationContact}>
                  {delivery.pickup_contact_name || '—'} • {delivery.pickup_contact_phone || '—'}
                </Text>
              </View>
            </View>

            <View style={styles.locationItem}>
              <Feather name="flag" size={18} color="#f97316" />
              <View style={styles.locationContent}>
                <Text style={styles.locationType}>DELIVERY</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {delivery.delivery_address || '—'}
                </Text>
                <Text style={styles.locationContact}>
                  {delivery.delivery_contact_name || '—'} • {delivery.delivery_contact_phone || '—'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleCall(delivery.business_phone)}
            >
              <Feather name="phone" size={16} color="#10b981" />
              <Text style={styles.contactText}>Call Business</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleWhatsApp(delivery.business_phone)}
            >
              <Feather name="message-circle" size={16} color="#25D366" />
              <Text style={styles.contactText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {nextAction && (
            <TouchableOpacity style={styles.actionButton} onPress={nextAction.action}>
              <LinearGradient colors={['#f97316', '#f43f5e']} style={styles.actionGradient}>
                <Feather name="navigation" size={20} color="#fff" />
                <Text style={styles.actionText}>{nextAction.text}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={styles.earningsPreview}>
            <Feather name="dollar-sign" size={16} color="#10b981" />
            <Text style={styles.earningsText}>
              You'll earn ₦{(delivery.rider_share ?? 0).toLocaleString()}
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#666', marginTop: 12, fontSize: 14 },
  errorContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 12 },
  errorButton: { backgroundColor: '#f97316', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 },
  errorButtonText: { color: '#fff', fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  centerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },

  mapContainer: { height: height * 0.45, position: 'relative' },
  map: { flex: 1 },

  marker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  pickupMarker: { backgroundColor: '#10b981' },
  deliveryMarker: { backgroundColor: '#f97316' },
  riderMarker: { backgroundColor: '#3b82f6' },

  callout: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    minWidth: 220,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  calloutTitle: { fontSize: 12, fontWeight: '700', color: '#f97316', marginBottom: 4 },
  calloutAddress: { fontSize: 13, color: '#fff', marginBottom: 6 },
  calloutContact: { fontSize: 11, color: '#888', marginBottom: 8 },
  calloutButton: {
    backgroundColor: '#f97316',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  calloutButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },

  mapLegend: {
    position: 'absolute',
    bottom: 70,
    right: 16,
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#ddd' },

  lastUpdated: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  lastUpdatedText: { color: '#aaa', fontSize: 11 },

  infoCardGradient: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  infoCardScroll: { flex: 1, padding: 16 },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
  statusText: { fontSize: 12, fontWeight: '700' },
  requestNumber: { fontSize: 12, color: '#666' },

  packageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  packageName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff' },
  packageWeight: { fontSize: 13, color: '#666' },

  locations: { gap: 18, marginBottom: 20 },
  locationItem: { flexDirection: 'row', gap: 12 },
  locationContent: { flex: 1 },
  locationType: { fontSize: 10, color: '#666', marginBottom: 2 },
  locationAddress: { fontSize: 13.5, color: '#fff', marginBottom: 3 },
  locationContact: { fontSize: 12, color: '#777' },

  contactRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  contactText: { color: '#fff', fontSize: 13.5, fontWeight: '500' },

  actionButton: { height: 58, borderRadius: 14, overflow: 'hidden', marginVertical: 10 },
  actionGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionText: { color: '#fff', fontSize: 16.5, fontWeight: '700' },

  earningsPreview: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  earningsText: { color: '#10b981', fontSize: 13.5, fontWeight: '600' },
});