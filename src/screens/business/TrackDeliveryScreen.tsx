import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';import { businessApi } from '../../services/api';
import { supabase } from '../../services/supabase';
import { BusinessRequest } from '../../types';

const { width, height } = Dimensions.get('window');

export function TrackDeliveryScreen({ navigation, route }: any) {
  const { id } = route.params || {};
const mapRef = useRef<any>(null);
  const [request, setRequest] = useState<BusinessRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [riderLocation, setRiderLocation] = useState<{
    latitude: number;
    longitude: number;
    timestamp?: string;
  } | null>(null);

  // Use real coordinates from delivery data (will be set after fetch)
  const [pickupCoord, setPickupCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deliveryCoord, setDeliveryCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'No delivery ID provided');
      navigation.goBack();
      return;
    }

    fetchDeliveryDetails();
  }, [id]);

  // When we have riderId → fetch initial location + subscribe
  useEffect(() => {
    if (!riderId) return;

    // Initial location fetch
    fetchRiderLocation();

    // Realtime subscription to rider's location in users table
    const channel = supabase
      .channel(`rider-location-${riderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${riderId}`,
        },
        (payload: any) => {
          console.log('Rider location update received:', payload.new);

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
  }, [riderId]);

  // Fit map when coordinates change
  useEffect(() => {
    if (pickupCoord || deliveryCoord || riderLocation) {
      fitMapToCoordinates();
    }
  }, [pickupCoord, deliveryCoord, riderLocation]);

  const fetchDeliveryDetails = async () => {
    try {
      setIsLoading(true);

      // Fetch delivery details (adjust if your api returns different structure)
      const data = await businessApi.getRequestDetails(id);
      console.log('Fetched delivery data:', data);

      setRequest(data);

      // Set pickup & delivery coordinates
      if (data.pickup_latitude && data.pickup_longitude) {
        setPickupCoord({
          latitude: Number(data.pickup_latitude),
          longitude: Number(data.pickup_longitude),
        });
      }

      if (data.delivery_latitude && data.delivery_longitude) {
        setDeliveryCoord({
          latitude: Number(data.delivery_latitude),
          longitude: Number(data.delivery_longitude),
        });
      }

      // Get rider_id for location tracking
      if (data.rider_id) {
        setRiderId(data.rider_id);
        console.log('Rider ID found:', data.rider_id);
      } else {
        console.warn('No rider_id in delivery data – cannot track rider location');
      }
    } catch (error) {
      console.error('Error fetching delivery:', error);
      Alert.alert('Error', 'Failed to load delivery details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRiderLocation = async () => {
    if (!riderId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('current_latitude, current_longitude, last_location_update')
        .eq('id', riderId)
        .single();

      if (error) throw error;

      if (data?.current_latitude && data?.current_longitude) {
        setRiderLocation({
          latitude: Number(data.current_latitude),
          longitude: Number(data.current_longitude),
          timestamp: data.last_location_update || new Date().toISOString(),
        });
        console.log('Initial rider location loaded:', data);
      } else {
        console.log('Rider has no location data yet');
      }
    } catch (err) {
      console.error('Failed to fetch rider location:', err);
    }
  };

  const fitMapToCoordinates = () => {
    if (!mapRef.current) return;

    const coordinates = [];

    if (pickupCoord) coordinates.push(pickupCoord);
    if (deliveryCoord) coordinates.push(deliveryCoord);
    if (riderLocation) coordinates.push(riderLocation);

  
  };

  const handleCallRider = () => {
    if (request?.rider_phone) {
      Linking.openURL(`tel:${request.rider_phone}`);
    } else {
      Alert.alert('No phone', 'Rider phone number not available');
    }
  };

  const handleMessageRider = () => {
    if (request?.rider_phone) {
      const formatted = request.rider_phone.replace(/\+/g, '').replace(/\s/g, '');
      Linking.openURL(`https://wa.me/${formatted}`);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      assigned: '#10b981',
      picked_up: '#f97316',
      in_transit: '#f97316',
      delivered: '#10b981',
    };
    return colors[status] || '#666';
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
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
        <Text style={styles.errorTitle}>Delivery Not Found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
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
        <Text style={styles.headerTitle}>Track Delivery</Text>
        <TouchableOpacity onPress={fitMapToCoordinates} style={styles.centerButton}>
          <Feather name="target" size={20} color="#f97316" />
        </TouchableOpacity>
      </View>

      {/* Map */}
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
{ attribution:'© OpenStreetMap' }
).addTo(map);

var pickup = ${JSON.stringify(pickupCoord)};
var delivery = ${JSON.stringify(deliveryCoord)};
var rider = ${JSON.stringify(riderLocation)};

var bounds = [];

if(pickup){
  var pickupMarker = L.marker([pickup.latitude,pickup.longitude],{icon: vendorIcon}).addTo(map);
  pickupMarker.bindPopup("<b>PICKUP</b><br>${request?.pickup_address || ''}");
  bounds.push([pickup.latitude,pickup.longitude]);
}

if(delivery){
  var deliveryMarker = L.marker([delivery.latitude,delivery.longitude],  {icon: deliveryIcon}
).addTo(map);
  deliveryMarker.bindPopup("<b>DELIVERY</b><br>${request?.delivery_address || ''}");
  bounds.push([delivery.latitude,delivery.longitude]);
}

if(rider){
  var riderMarker = L.marker([rider.latitude,rider.longitude],  {icon: riderIcon}
).addTo(map);
  riderMarker.bindPopup("<b>RIDER</b><br>${request?.rider_name || 'Rider'}");
  bounds.push([rider.latitude,rider.longitude]);
}

if(rider && delivery){
  var line = L.polyline([
    [rider.latitude,rider.longitude],
    [delivery.latitude,delivery.longitude]
  ],{color:'#f97316',weight:4,dashArray:'5,5'}).addTo(map);
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

        {/* Legend */}
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
      </View>

      {/* Info Card */}
      <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={styles.infoCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
              <Feather name="circle" size={8} color={getStatusColor(request.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                {getStatusText(request.status)}
              </Text>
            </View>
          </View>

          {request.rider_name && (
            <View style={styles.riderInfo}>
              <Text style={styles.riderNameLabel}>Rider</Text>
              <Text style={styles.riderName}>{request.rider_name}</Text>
            </View>
          )}
        </View>

        {/* Progress Tracker */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, styles.progressDotCompleted]}>
              <Feather name="check" size={10} color="#fff" />
            </View>
            <Text style={styles.progressLabel}>Picked Up</Text>
          </View>

          <View style={[styles.progressLine, (request.status === 'picked_up' || request.status === 'in_transit' || request.status === 'delivered') && styles.progressLineActive]} />

          <View style={styles.progressStep}>
            <View style={[
              styles.progressDot,
              (request.status === 'in_transit' || request.status === 'delivered') && styles.progressDotActive
            ]}>
              {(request.status === 'in_transit' || request.status === 'delivered') && (
                <Feather name="navigation" size={10} color="#fff" />
              )}
            </View>
            <Text style={styles.progressLabel}>In Transit</Text>
          </View>

          <View style={[styles.progressLine, request.status === 'delivered' && styles.progressLineActive]} />

          <View style={styles.progressStep}>
            <View style={[
              styles.progressDot,
              request.status === 'delivered' && styles.progressDotCompleted
            ]}>
              {request.status === 'delivered' && <Feather name="check" size={10} color="#fff" />}
            </View>
            <Text style={styles.progressLabel}>Delivered</Text>
          </View>
        </View>

        {/* Locations */}
        <View style={styles.locations}>
          <View style={styles.locationItem}>
            <View style={styles.locationIcon}>
              <Feather name="map-pin" size={14} color="#10b981" />
            </View>
            <View style={styles.locationContent}>
              <Text style={styles.locationType}>PICKUP</Text>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {request.pickup_address}
              </Text>
            </View>
          </View>

          <View style={styles.locationItem}>
            <View style={styles.locationIcon}>
              <Feather name="flag" size={14} color="#f97316" />
            </View>
            <View style={styles.locationContent}>
              <Text style={styles.locationType}>DELIVERY</Text>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {request.delivery_address}
              </Text>
            </View>
          </View>
        </View>

        {/* Rider Actions */}
        {request.rider_phone && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.callButton} onPress={handleCallRider}>
              <Feather name="phone" size={18} color="#10b981" />
              <Text style={styles.callButtonText}>Call Rider</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.messageButton} onPress={handleMessageRider}>
              <Feather name="message-circle" size={18} color="#25D366" />
              <Text style={styles.messageButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Package */}
        <View style={styles.packageInfo}>
          <Feather name="package" size={16} color="#f97316" />
          <Text style={styles.packageText}>
            {request.package_name} • {request.weight_kg}kg • Qty: {request.quantity}
          </Text>
        </View>

        {/* Last Updated */}
        {riderLocation && riderLocation.timestamp && (
          <Text style={styles.lastUpdated}>
            Rider location updated {new Date(riderLocation.timestamp).toLocaleTimeString()}
          </Text>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

// Styles (mostly unchanged, minor tweaks for clarity)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a', padding: 20 },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 12 },
  errorText: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20 },
  errorButton: { backgroundColor: '#f97316', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  errorButtonText: { color: '#fff', fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  centerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },

  mapContainer: { height: height * 0.5, position: 'relative' },
  map: { flex: 1 },

  marker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupMarker: { backgroundColor: '#10b981' },
  deliveryMarker: { backgroundColor: '#f97316' },
  riderMarker: { backgroundColor: '#3b82f6' },

  callout: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    minWidth: 180,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  calloutTitle: { fontSize: 12, fontWeight: '700', color: '#f97316', marginBottom: 4 },
  calloutName: { fontSize: 13, color: '#fff', marginBottom: 4 },
  calloutAddress: { fontSize: 11, color: '#aaa', marginBottom: 4 },
  calloutContact: { fontSize: 11, color: '#888' },

  mapLegend: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(26,26,26,0.9)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#ddd' },

  infoCard: {
    flex: 1,
    padding: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusContainer: { flex: 1 },
  statusLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  riderInfo: { alignItems: 'flex-end' },
  riderNameLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  riderName: { fontSize: 14, fontWeight: '600', color: '#f97316' },

  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 8 },
  progressStep: { alignItems: 'center', flex: 1 },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressDotActive: { backgroundColor: '#f97316' },
  progressDotCompleted: { backgroundColor: '#10b981' },
  progressLabel: { fontSize: 10, color: '#aaa', textAlign: 'center' },
  progressLine: { flex: 1, height: 3, backgroundColor: '#2a2a2a', marginHorizontal: 4 },
  progressLineActive: { backgroundColor: '#f97316' },

  locations: { backgroundColor: '#111', borderRadius: 10, padding: 12, marginBottom: 16 },
  locationItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locationIcon: { width: 28, alignItems: 'center' },
  locationContent: { flex: 1 },
  locationType: { fontSize: 10, color: '#888', marginBottom: 2 },
  locationAddress: { fontSize: 13, color: '#fff' },

  actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  callButtonText: { color: '#10b981', fontSize: 14, fontWeight: '600' },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37,211,102,0.1)',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#25D366',
  },
  messageButtonText: { color: '#25D366', fontSize: 14, fontWeight: '600' },

  packageInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  packageText: { color: '#aaa', fontSize: 13 },

  lastUpdated: { fontSize: 11, color: '#666', textAlign: 'center', marginTop: 8 },
});