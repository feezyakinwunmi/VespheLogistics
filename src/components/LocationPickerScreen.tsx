import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
  title: string;
}

export function LocationPicker({
  visible,
  onClose,
  onSelectLocation,
  initialLocation,
  title,
}: LocationPickerProps) {
  const mapRef = useRef<MapView>(null);

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialLocation || null);

  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const initialRegion = {
    latitude: initialLocation?.latitude || 6.5244,
    longitude: initialLocation?.longitude || 3.3792,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation(initialLocation);
      reverseGeocode(initialLocation.latitude, initialLocation.longitude);
    }
  }, [initialLocation]);

  /* ---------------- REVERSE GEOCODE ---------------- */

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'User-Agent': 'vespher-app',
          },
        }
      );

      const data = await response.json();

      if (data?.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress('Selected location');
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
      setAddress('Selected location');
    }
  };

  /* ---------------- MAP PRESS ---------------- */

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    setSelectedLocation({ latitude, longitude });

    reverseGeocode(latitude, longitude);
  };

  /* ---------------- CONFIRM LOCATION ---------------- */

  const handleConfirm = () => {
    if (selectedLocation && address) {
      onSelectLocation({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address,
      });

      onClose();
    } else {
      Alert.alert('Error', 'Please select a location on the map');
    }
  };

  /* ---------------- GET USER LOCATION ---------------- */

  const getUserLocation = async () => {
    setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      setSelectedLocation({ latitude, longitude });

      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        800
      );

      reverseGeocode(latitude, longitude);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SEARCH LOCATION ---------------- */

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`,
        {
          headers: {
            'User-Agent': 'vespher-app',
          },
        }
      );

      const data = await response.json();

      if (data.length > 0) {
        const result = data[0];

        const latitude = parseFloat(result.lat);
        const longitude = parseFloat(result.lon);

        setSelectedLocation({ latitude, longitude });
        setAddress(result.display_name);

        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          800
        );
      } else {
        Alert.alert('Not found', 'Location not found');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{title}</Text>

            <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color="#666" />

            <TextInput
              style={styles.searchInput}
              placeholder="Search address"
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchLocation}
              returnKeyType="search"
            />

            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={18} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Current Location */}
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={getUserLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#f97316" />
            ) : (
              <>
                <Feather name="navigation" size={18} color="#f97316" />
                <Text style={styles.currentLocationText}>
                  Use My Current Location
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Map */}
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={initialRegion}
            onPress={handleMapPress}
          >
            {selectedLocation && (
              <Marker
                coordinate={selectedLocation}
                draggable
                onDragEnd={(e) => handleMapPress(e)}
              >
                <Feather name="map-pin" size={28} color="#f97316" />
              </Marker>
            )}
          </MapView>

          {/* Address */}
          {address ? (
            <View style={styles.addressContainer}>
              <Feather name="map-pin" size={16} color="#f97316" />
              <Text style={styles.addressText} numberOfLines={2}>
                {address}
              </Text>
            </View>
          ) : null}

          {/* Instructions */}
          <View style={styles.instructions}>
            <Feather name="info" size={14} color="#666" />
            <Text style={styles.instructionsText}>
              Tap on the map or drag the pin to select a location
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  confirmButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    color: '#fff',
  },

  currentLocationButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f97316',
    backgroundColor: 'rgba(249,115,22,0.1)',
  },

  currentLocationText: {
    color: '#f97316',
    fontWeight: '500',
  },

  map: {
    flex: 1,
  },

  addressContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    backgroundColor: '#1a1a1a',
  },

  addressText: {
    color: '#fff',
    flex: 1,
    fontSize: 13,
  },

  instructions: {
    flexDirection: 'row',
    gap: 6,
    padding: 12,
    backgroundColor: '#1a1a1a',
  },

  instructionsText: {
    color: '#666',
    fontSize: 11,
  },
});