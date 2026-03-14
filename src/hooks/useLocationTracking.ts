import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../services/supabase';
import { Alert } from 'react-native';

interface LocationTrackingOptions {
  riderId: string;
  orderId?: string; // Optional – currently unused but kept for future
  updateInterval?: number; // ms, default 10 seconds
}

export function useLocationTracking({
  riderId,
  orderId, // unused for now – can be removed later if not needed
  updateInterval = 10000,
}: LocationTrackingOptions) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const watchSubscription = useRef<Location.LocationSubscription | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize when riderId is valid
  useEffect(() => {
    if (!riderId || riderId === 'undefined' || riderId.length < 10) {
      console.log('⏳ Waiting for valid rider ID...');
      return;
    }

    console.log('✅ Rider ID ready:', riderId);
    setIsReady(true);
    requestPermissions();

    // Cleanup on unmount or riderId change
    return () => {
      stopTracking();
    };
  }, [riderId]);

  // Request foreground permission (background permission handled separately if needed)
  const requestPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Location permission denied');
        setPermissionGranted(false);
        Alert.alert('Permission Required', 'Location access is needed for live tracking');
        return;
      }

      setPermissionGranted(true);
      console.log('Location permission granted');
    } catch (err) {
      console.error('Permission request failed:', err);
      setErrorMsg('Failed to request location permission');
    }
  };

  // Start foreground tracking (good for when app is open)
  const startTracking = async () => {
    if (!isReady || !riderId || !permissionGranted) {
      console.warn('Cannot start tracking: preconditions not met');
      return;
    }

    setIsTracking(true);
    console.log('Starting location tracking...');

    // Get and send initial location
    try {
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(initial);
      await updateRiderLocation(initial);
    } catch (err) {
      console.error('Initial location fetch failed:', err);
    }

    // Watch for changes (foreground only)
    try {
      watchSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 8000,       // ~8 seconds
          distanceInterval: 15,     // or 15 meters
        },
        (newLoc) => {
          setLocation(newLoc);
        }
      );

      // Database update interval
      intervalRef.current = setInterval(async () => {
        if (location) {
          await updateRiderLocation(location);
        }
      }, updateInterval);

      console.log('Foreground tracking active');
    } catch (err) {
      console.error('Watch position failed:', err);
      setIsTracking(false);
    }
  };

  // Core update function – only updates users table
  const updateRiderLocation = async (loc: Location.LocationObject) => {
    if (!riderId || !isReady) return;

    try {
      console.log('📍 Sending location update for rider:', riderId);

      const { error } = await supabase
        .from('users')
        .update({
          current_latitude: loc.coords.latitude,
          current_longitude: loc.coords.longitude,
          last_location_update: new Date().toISOString(),
        })
        .eq('id', riderId);

      if (error) throw error;

      console.log('Location updated successfully at', new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to update rider location:', err);
    }
  };

  // Stop everything
  const stopTracking = () => {
    setIsTracking(false);

    if (watchSubscription.current) {
      watchSubscription.current.remove();
      watchSubscription.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    console.log('Tracking stopped');
  };

  // Manual force update (useful for refresh button)
  const forceUpdate = async () => {
    if (!location || !isReady || !riderId) {
      console.warn('Cannot force update: no location or rider not ready');
      return;
    }
    await updateRiderLocation(location);
  };

  return {
    location,
    errorMsg,
    isTracking,
    permissionGranted,
    isReady,
    startTracking,
    stopTracking,
    forceUpdate,
  };
}