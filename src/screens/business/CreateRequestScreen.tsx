import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { LocationPicker } from '../../components/LocationPickerScreen';
import { settingsService, PlatformSettings } from '../../services/settings';



type Step = 'package' | 'pickup' | 'delivery' | 'review';

interface PackageDetails {
  name: string;
  type: 'food' | 'documents' | 'electronics' | 'fragile' | 'other';
  weight: string;
  quantity: string;
  description: string;
  value: string;
  handling_instructions: string;
  image_uri?: string | null;
}

interface LocationDetails {
  address: string;
  latitude?: string;
  longitude?: string;
  contact_name: string;
  contact_phone: string;
  instructions: string;
}

interface FormData {
  package: PackageDetails;
  pickup: LocationDetails;
  delivery: LocationDetails;
  receiver_phone: string;
}

const packageTypes = [
  { id: 'food', label: 'Food', icon: 'coffee' },
  { id: 'documents', label: 'Documents', icon: 'file-text' },
  { id: 'electronics', label: 'Electronics', icon: 'smartphone' },
  { id: 'fragile', label: 'Fragile', icon: 'alert-triangle' },
  { id: 'other', label: 'Other', icon: 'package' },
];

export function CreateRequestScreen({ navigation }: any) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('package');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState<'pickup' | 'delivery' | null>(null);
 const [showPickupMap, setShowPickupMap] = useState(false);
const [showDeliveryMap, setShowDeliveryMap] = useState(false);
const [calculatingFee, setCalculatingFee] = useState(false);
const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
const [distance, setDistance] = useState<number | null>(null);
const [settings, setSettings] = useState<PlatformSettings | null>(null);
const [loadingSettings, setLoadingSettings] = useState(true);


useEffect(() => {
  loadSettings();
}, []);

const loadSettings = async () => {
  setLoadingSettings(true);
  const data = await settingsService.getSettings();
  setSettings(data);
  setLoadingSettings(false);
};

  const [formData, setFormData] = useState<FormData>({
    package: {
      name: '',
      type: 'food',
      weight: '',
      quantity: '1',
      description: '',
      value: '',
      handling_instructions: '',
      image_uri: null,
    },
    pickup: {
      address: '',
      contact_name: '',
      contact_phone: '',
      instructions: '',
    },
    delivery: {
      address: '',
      contact_name: '',
      contact_phone: '',
      instructions: '',
    },
    receiver_phone: '',
  });


const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Number((R * c).toFixed(2));
};

const calculateDeliveryFee = (
  distance: number,
  weight: number,
  packageType: string
): number => {
  const baseRate = 350; // per km
  const weightRate = 100; // per kg
  
  // Type multiplier
  let multiplier = 1.0;
  if (packageType === 'fragile') multiplier = 1.5;
  if (packageType === 'electronics') multiplier = 1.3;
  if (packageType === 'documents') multiplier = 0.8;
  
  let total = ((distance * baseRate) + (weight * weightRate)) * multiplier;
  
  // Apply min/max
  if (total < 500) total = 500;
  if (total > 50000) total = 50000;
  
  return Math.round(total);
};

// const calculateDeliveryFee = (
//   distance: number,
//   weight: number,
//   packageType: string
// ): number => {
//   const baseRate = 350; // per km
//   const weightRate = 100; // per kg
  
//   // Type multiplier
//   let multiplier = 1.0;
//   if (packageType === 'fragile') multiplier = 1.5;
//   if (packageType === 'electronics') multiplier = 1.3;
//   if (packageType === 'documents') multiplier = 0.8;
  
//   let total = ((distance * baseRate) + (weight * weightRate)) * multiplier;
  
//   // Apply min/max
//   if (total < 500) total = 500;
//   if (total > 50000) total = 50000;
  
//   return Math.round(total);
// };

useEffect(() => {
  const calculateEstimatedFee = async () => {
    if (
      formData.pickup.latitude && 
      formData.pickup.longitude && 
      formData.delivery.latitude && 
      formData.delivery.longitude &&
      formData.package.weight
    ) {
      setCalculatingFee(true);
      try {
        const dist = calculateDistance(
          parseFloat(formData.pickup.latitude),
          parseFloat(formData.pickup.longitude),
          parseFloat(formData.delivery.latitude),
          parseFloat(formData.delivery.longitude)
        );
        setDistance(dist);
        
        const fee = calculateDeliveryFee(
          dist,
          parseFloat(formData.package.weight),
          formData.package.type
        );
        setEstimatedFee(fee);
      } catch (error) {
        console.error('Error calculating fee:', error);
      } finally {
        setCalculatingFee(false);
      }
    }
  };

  calculateEstimatedFee();
}, [
  formData.pickup.latitude,
  formData.pickup.longitude,
  formData.delivery.latitude,
  formData.delivery.longitude,
  formData.package.weight,
  formData.package.type
]); // Make sure formData is NOT in the dependency array - use the individual properties instead




  useEffect(() => {
    // Request location permissions when component mounts
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is needed to use current location');
      }
    })();
  }, []);

  const updatePackage = (field: keyof PackageDetails, value: string) => {
    setFormData({
      ...formData,
      package: { ...formData.package, [field]: value },
    });
  };

 const updatePickup = (field: keyof LocationDetails, value: string) => {
  console.log('Updating pickup:', field, value); // Add this to debug
  setFormData(prev => ({
    ...prev,
    pickup: { ...prev.pickup, [field]: value },
  }));
};
const updateDelivery = (field: keyof LocationDetails, value: string) => {
  console.log('Updating delivery:', field, value); // Add this to debug
  setFormData(prev => ({
    ...prev,
    delivery: { ...prev.delivery, [field]: value },
  }));
};

const getCurrentLocation = async (type: 'pickup' | 'delivery') => {
  setGettingLocation(type);
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is needed to use current location');
        return;
      }
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    // Reverse geocode to get address
    const [address] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const formattedAddress = [
      address.street,
      address.district,
      address.city,
      address.region,
      address.country,
    ].filter(Boolean).join(', ');

    if (type === 'pickup') {
      updatePickup('address', formattedAddress || 'Current location');
      updatePickup('latitude', location.coords.latitude.toString());
      updatePickup('longitude', location.coords.longitude.toString());
    } else {
      updateDelivery('address', formattedAddress || 'Current location');
      updateDelivery('latitude', location.coords.latitude.toString());
      updateDelivery('longitude', location.coords.longitude.toString());
    }

    Alert.alert('Success', 'Current location added');
  } catch (error) {
    console.error('Error getting location:', error);
    Alert.alert('Error', 'Failed to get current location');
  } finally {
    setGettingLocation(null);
  }
};

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({
        ...formData,
        package: { ...formData.package, image_uri: result.assets[0].uri },
      });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permission');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({
        ...formData,
        package: { ...formData.package, image_uri: result.assets[0].uri },
      });
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!formData.package.image_uri) return null;

    setUploading(true);
    try {
      const response = await fetch(formData.package.image_uri);
      const blob = await response.blob();
      const fileExt = formData.package.image_uri.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('package-images')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('package-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload package image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validatePackage = (): boolean => {
    const { name, weight, quantity } = formData.package;
    
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter package name');
      return false;
    }
    
    if (!weight.trim() || isNaN(Number(weight)) || Number(weight) <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return false;
    }
    
    if (!quantity.trim() || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return false;
    }
    
    return true;
  };

  const validatePickup = (): boolean => {
    const { address, contact_name, contact_phone } = formData.pickup;
    
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter pickup address');
      return false;
    }
    
    if (!contact_name.trim()) {
      Alert.alert('Error', 'Please enter pickup contact name');
      return false;
    }
    
    if (!contact_phone.trim() || contact_phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid pickup contact phone');
      return false;
    }
    
    return true;
  };

  const validateDelivery = (): boolean => {
    const { address, contact_name, contact_phone } = formData.delivery;
    
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter delivery address');
      return false;
    }
    
    if (!contact_name.trim()) {
      Alert.alert('Error', 'Please enter delivery contact name');
      return false;
    }
    
    if (!contact_phone.trim() || contact_phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid delivery contact phone');
      return false;
    }
    
    if (!formData.receiver_phone.trim() || formData.receiver_phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid receiver phone number');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    Keyboard.dismiss();
    if (currentStep === 'package') {
      if (validatePackage()) {
        setCurrentStep('pickup');
      }
    } else if (currentStep === 'pickup') {
      if (validatePickup()) {
        setCurrentStep('delivery');
      }
    } else if (currentStep === 'delivery') {
      if (validateDelivery()) {
        setCurrentStep('review');
      }
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    if (currentStep === 'pickup') setCurrentStep('package');
    else if (currentStep === 'delivery') setCurrentStep('pickup');
    else if (currentStep === 'review') setCurrentStep('delivery');
    else navigation.goBack();
  };

 const handleSubmit = async () => {
  console.log('🚀 Submit started');
  setLoading(true);
  
  try {
    // Validate all required fields before submitting
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    console.log('📦 Form data:', formData);

    // Upload image first if exists
    let imageUrl = null;
    if (formData.package.image_uri) {
      console.log('📸 Uploading image...');
      imageUrl = await uploadImage();
      console.log('📸 Image uploaded:', imageUrl);
      
      if (!imageUrl) {
        throw new Error('Failed to upload package image');
      }
    }

    // Prepare request data
    const requestData = {
      business_id: user?.id,
      package_name: formData.package.name,
      package_type: formData.package.type,
      weight_kg: parseFloat(formData.package.weight) || 0,
      quantity: parseInt(formData.package.quantity) || 1,
      package_description: formData.package.description || null,
      package_image_url: imageUrl,
      declared_value: formData.package.value ? parseFloat(formData.package.value) : null,
      handling_instructions: formData.package.handling_instructions || null,
      
      pickup_address: formData.pickup.address,
      pickup_latitude: formData.pickup.latitude ? parseFloat(formData.pickup.latitude) : null,
      pickup_longitude: formData.pickup.longitude ? parseFloat(formData.pickup.longitude) : null,
      pickup_contact_name: formData.pickup.contact_name,
      pickup_contact_phone: formData.pickup.contact_phone,
      pickup_instructions: formData.pickup.instructions || null,
      
      delivery_address: formData.delivery.address,
      delivery_latitude: formData.delivery.latitude ? parseFloat(formData.delivery.latitude) : null,
      delivery_longitude: formData.delivery.longitude ? parseFloat(formData.delivery.longitude) : null,
      delivery_contact_name: formData.delivery.contact_name,
      delivery_contact_phone: formData.delivery.contact_phone,
      delivery_instructions: formData.delivery.instructions || null,
      
      receiver_phone: formData.receiver_phone,
      
      status: 'pending',
      payment_status: 'pending',
    };

    console.log('📤 Submitting request data:', requestData);

    const { data, error } = await supabase
      .from('business_logistics')
      .insert(requestData)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Request created successfully:', data);

    Alert.alert(
      'Success',
      'Your delivery request has been submitted successfully!',
      [
        {
          text: 'View Request',
          onPress: () => {
            navigation.replace('RequestDetails', { id: data.id });
          },
        },
        {
          text: 'Close',
          style: 'cancel',
        },
      ]
    );
  } catch (error: any) {
    console.error('❌ Error creating request:', error);
    
    // Show more specific error message
    let errorMessage = 'Failed to create request';
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    if (error.code === '23505') {
      errorMessage = 'A request with similar details already exists';
    } else if (error.code === '23502') {
      errorMessage = 'Please fill in all required fields';
    } else if (error.code === '42P01') {
      errorMessage = 'Database table not found';
    }
    
    Alert.alert('Error', errorMessage);
  } finally {
    setLoading(false);
    console.log('🏁 Submit finished');
  }
};

  const steps = [
    { key: 'package', label: 'Package', icon: 'package' },
    { key: 'pickup', label: 'Pickup', icon: 'map-pin' },
    { key: 'delivery', label: 'Delivery', icon: 'flag' },
    { key: 'review', label: 'Review', icon: 'check-circle' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  const renderPackageStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Package Details</Text>
      <Text style={styles.stepSubtitle}>Tell us about what you're sending</Text>

      <View style={styles.form}>
        {/* Package Image Upload */}
        <View style={styles.imageUploadSection}>
          <Text style={styles.label}>Package Image (Optional)</Text>
          <TouchableOpacity 
            style={styles.imageUploadButton}
            onPress={() => {
              Alert.alert(
                'Add Package Image',
                'Choose an option',
                [
                  { text: 'Take Photo', onPress: takePhoto },
                  { text: 'Choose from Gallery', onPress: pickImage },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          >
            {formData.package.image_uri ? (
              <Image 
                source={{ uri: formData.package.image_uri }} 
                style={styles.packageImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Feather name="camera" size={32} color="#666" />
                <Text style={styles.imagePlaceholderText}>Add Package Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {formData.package.image_uri && (
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => setFormData({
                ...formData,
                package: { ...formData.package, image_uri: null }
              })}
            >
              <Feather name="x-circle" size={20} color="#ef4444" />
              <Text style={styles.removeImageText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Package Name *</Text>
          <View style={styles.inputContainer}>
            <Feather name="package" size={18} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Birthday Cake, Documents"
              placeholderTextColor="#666"
              value={formData.package.name}
              onChangeText={(text) => updatePackage('name', text)}
            />
          </View>
        </View>

        <Text style={styles.label}>Package Type *</Text>
        <View style={styles.typeGrid}>
          {packageTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                formData.package.type === type.id && styles.typeCardActive,
              ]}
              onPress={() => updatePackage('type', type.id as any)}
            >
              <Feather 
                name={type.icon as any} 
                size={24} 
                color={formData.package.type === type.id ? '#f97316' : '#666'} 
              />
              <Text style={[
                styles.typeText,
                formData.package.type === type.id && styles.typeTextActive,
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Weight (kg) *</Text>
            <View style={styles.inputContainer}>
              <Feather name="tag" size={18} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0.0"
                placeholderTextColor="#666"
                value={formData.package.weight}
                onChangeText={(text) => updatePackage('weight', text)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Quantity *</Text>
            <View style={styles.inputContainer}>
              <Feather name="layers" size={18} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor="#666"
                value={formData.package.quantity}
                onChangeText={(text) => updatePackage('quantity', text)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="Describe the package contents..."
              placeholderTextColor="#666"
              value={formData.package.description}
              onChangeText={(text) => updatePackage('description', text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Declared Value (Optional)</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>₦</Text>
            <TextInput
              style={[styles.input, { paddingLeft: 30 }]}
              placeholder="0"
              placeholderTextColor="#666"
              value={formData.package.value}
              onChangeText={(text) => updatePackage('value', text)}
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.fieldHint}>Insurance value of the package</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Handling Instructions (Optional)</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="e.g., Fragile, Keep cool, etc."
              placeholderTextColor="#666"
              value={formData.package.handling_instructions}
              onChangeText={(text) => updatePackage('handling_instructions', text)}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>
    </View>
  );

const renderPickupStep = () => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Pickup Location</Text>
    <Text style={styles.stepSubtitle}>Where should we pick up the package from?</Text>

    <View style={styles.form}>
      {/* Map Picker Button */}
      <TouchableOpacity 
        style={styles.mapPickerButton}
        onPress={() => setShowPickupMap(true)}
      >
        <Feather name="map" size={20} color="#f97316" />
        <View style={styles.mapPickerContent}>
          <Text style={styles.mapPickerTitle}>Pick on Map</Text>
          <Text style={styles.mapPickerSubtitle}>
            {formData.pickup.address || 'Tap to select pickup location on map'}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color="#666" />
      </TouchableOpacity>

      {/* Current Location Button */}
      <TouchableOpacity 
        style={styles.locationButton}
        onPress={() => getCurrentLocation('pickup')}
        disabled={gettingLocation === 'pickup'}
      >
        {gettingLocation === 'pickup' ? (
          <ActivityIndicator color="#f97316" />
        ) : (
          <Feather name="navigation" size={18} color="#f97316" />
        )}
        <Text style={styles.locationButtonText}>
          {gettingLocation === 'pickup' ? 'Getting location...' : 'Use My Current Location'}
        </Text>
      </TouchableOpacity>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pickup Address *</Text>
        <View style={styles.inputContainer}>
          <Feather name="map-pin" size={18} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter full address"
            placeholderTextColor="#666"
            value={formData.pickup.address}
            onChangeText={(text) => updatePickup('address', text)}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contact Name *</Text>
        <View style={styles.inputContainer}>
          <Feather name="user" size={18} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Person at pickup location"
            placeholderTextColor="#666"
            value={formData.pickup.contact_name}
            onChangeText={(text) => updatePickup('contact_name', text)}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contact Phone *</Text>
        <View style={styles.inputContainer}>
          <Feather name="phone" size={18} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="+234 801 234 5678"
            placeholderTextColor="#666"
            value={formData.pickup.contact_phone}
            onChangeText={(text) => updatePickup('contact_phone', text)}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pickup Instructions (Optional)</Text>
        <View style={styles.textAreaContainer}>
          <TextInput
            style={styles.textArea}
            placeholder="e.g., Call on arrival, gate code, etc."
            placeholderTextColor="#666"
            value={formData.pickup.instructions}
            onChangeText={(text) => updatePickup('instructions', text)}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      </View>
    </View>
  </View>
);

 const renderDeliveryStep = () => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Delivery Location</Text>
    <Text style={styles.stepSubtitle}>Where should we deliver the package to?</Text>

    <View style={styles.form}>
      {/* Map Picker Button */}
      <TouchableOpacity 
        style={styles.mapPickerButton}
        onPress={() => {
          console.log('Opening delivery map');
          setShowDeliveryMap(true);
        }}
      >
        <Feather name="map" size={20} color="#f97316" />
        <View style={styles.mapPickerContent}>
          <Text style={styles.mapPickerTitle}>Pick on Map</Text>
          <Text style={styles.mapPickerSubtitle}>
            {formData.delivery.address || 'Tap to select delivery location on map'}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color="#666" />
      </TouchableOpacity>

      {/* Current Location Button */}
      <TouchableOpacity 
        style={styles.locationButton}
        onPress={() => getCurrentLocation('delivery')}
        disabled={gettingLocation === 'delivery'}
      >
        {gettingLocation === 'delivery' ? (
          <ActivityIndicator color="#f97316" />
        ) : (
          <Feather name="navigation" size={18} color="#f97316" />
        )}
        <Text style={styles.locationButtonText}>
          {gettingLocation === 'delivery' ? 'Getting location...' : 'Use My Current Location'}
        </Text>
      </TouchableOpacity>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Delivery Address *</Text>
        <View style={styles.inputContainer}>
          <Feather name="flag" size={18} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter full address"
            placeholderTextColor="#666"
            value={formData.delivery.address}
            onChangeText={(text) => updateDelivery('address', text)}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contact Name *</Text>
        <View style={styles.inputContainer}>
          <Feather name="user" size={18} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Person receiving package"
            placeholderTextColor="#666"
            value={formData.delivery.contact_name}
            onChangeText={(text) => updateDelivery('contact_name', text)}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contact Phone *</Text>
        <View style={styles.inputContainer}>
          <Feather name="phone" size={18} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="+234 801 234 5678"
            placeholderTextColor="#666"
            value={formData.delivery.contact_phone}
            onChangeText={(text) => updateDelivery('contact_phone', text)}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Receiver Phone *</Text>
        <View style={styles.inputContainer}>
          <Feather name="phone-forwarded" size={18} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Final receiver's phone number"
            placeholderTextColor="#666"
            value={formData.receiver_phone}
            onChangeText={(text) => setFormData({ ...formData, receiver_phone: text })}
            keyboardType="phone-pad"
          />
        </View>
        <Text style={styles.fieldHint}>The person who will receive the package</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Delivery Instructions (Optional)</Text>
        <View style={styles.textAreaContainer}>
          <TextInput
            style={styles.textArea}
            placeholder="e.g., Leave with security, call before delivery, etc."
            placeholderTextColor="#666"
            value={formData.delivery.instructions}
            onChangeText={(text) => updateDelivery('instructions', text)}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      </View>
    </View>
  </View>
);

const renderReviewStep = () => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Review Your Request</Text>
    <Text style={styles.stepSubtitle}>Please review all details before submitting</Text>

    <ScrollView style={styles.reviewContainer} showsVerticalScrollIndicator={false}>
      {/* Package Image Preview */}
      {formData.package.image_uri && (
        <View style={styles.reviewSection}>
          <View style={styles.reviewHeader}>
            <Feather name="image" size={18} color="#f97316" />
            <Text style={styles.reviewTitle}>Package Image</Text>
          </View>
          <Image 
            source={{ uri: formData.package.image_uri }} 
            style={styles.reviewPackageImage}
          />
        </View>
      )}

      {/* Package Summary */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Feather name="package" size={18} color="#f97316" />
          <Text style={styles.reviewTitle}>Package Details</Text>
        </View>
        <View style={styles.reviewGrid}>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Name</Text>
            <Text style={styles.reviewValue}>{formData.package.name}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Type</Text>
            <Text style={styles.reviewValue}>{formData.package.type}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Weight</Text>
            <Text style={styles.reviewValue}>{formData.package.weight} kg</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Quantity</Text>
            <Text style={styles.reviewValue}>{formData.package.quantity}</Text>
          </View>
        </View>
        {formData.package.description && (
          <Text style={styles.reviewDescription}>{formData.package.description}</Text>
        )}
      </View>

      {/* Pickup Summary */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Feather name="map-pin" size={18} color="#10b981" />
          <Text style={styles.reviewTitle}>Pickup Location</Text>
        </View>
        <Text style={styles.reviewAddress}>{formData.pickup.address}</Text>
        {formData.pickup.latitude && formData.pickup.longitude && (
          <Text style={styles.reviewCoordinates}>
            📍 {parseFloat(formData.pickup.latitude).toFixed(6)}, {parseFloat(formData.pickup.longitude).toFixed(6)}
          </Text>
        )}
        <View style={styles.reviewContact}>
          <Text style={styles.reviewContactName}>{formData.pickup.contact_name}</Text>
          <Text style={styles.reviewContactPhone}>{formData.pickup.contact_phone}</Text>
        </View>
      </View>

      {/* Delivery Summary */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Feather name="flag" size={18} color="#f97316" />
          <Text style={styles.reviewTitle}>Delivery Location</Text>
        </View>
        <Text style={styles.reviewAddress}>{formData.delivery.address}</Text>
        {formData.delivery.latitude && formData.delivery.longitude && (
          <Text style={styles.reviewCoordinates}>
            📍 {parseFloat(formData.delivery.latitude).toFixed(6)}, {parseFloat(formData.delivery.longitude).toFixed(6)}
          </Text>
        )}
        <View style={styles.reviewContact}>
          <Text style={styles.reviewContactName}>{formData.delivery.contact_name}</Text>
          <Text style={styles.reviewContactPhone}>{formData.delivery.contact_phone}</Text>
        </View>
        <View style={styles.receiverInfo}>
          <Feather name="phone-forwarded" size={14} color="#666" />
          <Text style={styles.receiverText}>Receiver: {formData.receiver_phone}</Text>
        </View>
      </View>

      {/* Fee Calculation */}
      <View style={styles.feeSection}>
        <Text style={styles.feeSectionTitle}>Delivery Fee Estimate</Text>
        
        {distance && (
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Distance:</Text>
            <Text style={styles.feeValue}>{distance} km</Text>
          </View>
        )}
        
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Weight:</Text>
          <Text style={styles.feeValue}>{formData.package.weight} kg</Text>
        </View>
        
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Package Type:</Text>
          <Text style={styles.feeValue}>
            {formData.package.type.charAt(0).toUpperCase() + formData.package.type.slice(1)}
            {formData.package.type === 'fragile' && ' (1.5x)'}
            {formData.package.type === 'electronics' && ' (1.3x)'}
            {formData.package.type === 'documents' && ' (0.8x)'}
          </Text>
        </View>

        <View style={styles.feeDivider} />

        {calculatingFee ? (
          <View style={styles.calculatingContainer}>
            <ActivityIndicator color="#f97316" />
            <Text style={styles.calculatingText}>Calculating estimate...</Text>
          </View>
        ) : estimatedFee ? (
          <LinearGradient
            colors={['#f97316', '#f43f5e']}
            style={styles.estimatedFeeCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.estimatedFeeLabel}>Estimated Delivery Fee</Text>
            <Text style={styles.estimatedFeeAmount}>₦{estimatedFee.toLocaleString()}</Text>
            <Text style={styles.estimatedFeeNote}>
              *Final fee will be reviewed and adjusted by admin
            </Text>
          </LinearGradient>
        ) : (
          <View style={styles.noFeeContainer}>
            <Feather name="info" size={20} color="#666" />
            <Text style={styles.noFeeText}>
              Complete pickup and delivery locations to see estimated fee
            </Text>
          </View>
        )}
      </View>

      <View style={styles.termsContainer}>
        <Feather name="info" size={16} color="#666" />
        <Text style={styles.termsText}>
          By submitting, you agree to our terms of service and confirm that all information is accurate.
        </Text>
      </View>
    </ScrollView>
  </View>
);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Delivery Request</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <View style={styles.progressStep}>
              <View style={[
                styles.progressDot,
                index <= currentStepIndex && styles.progressDotActive,
              ]}>
                {index < currentStepIndex ? (
                  <Feather name="check" size={12} color="#fff" />
                ) : (
                  <Text style={[
                    styles.progressDotText,
                    index <= currentStepIndex && styles.progressDotTextActive,
                  ]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.progressLabel,
                index <= currentStepIndex && styles.progressLabelActive,
              ]}>
                {step.label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View style={[
                styles.progressLine,
                index < currentStepIndex && styles.progressLineActive,
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {currentStep === 'package' && renderPackageStep()}
            {currentStep === 'pickup' && renderPickupStep()}
            {currentStep === 'delivery' && renderDeliveryStep()}
            {currentStep === 'review' && renderReviewStep()}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={currentStep === 'review' ? handleSubmit : handleNext}
          disabled={loading || uploading || gettingLocation !== null}
        >
          {loading || uploading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.continueButtonText}>
                {uploading ? 'Uploading...' : 'Submitting...'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.continueButtonText}>
                {currentStep === 'review' ? 'Submit Request' : 'Continue'}
              </Text>
              <Feather name="arrow-right" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
      {/* Pickup Location Picker Modal */}
{/* Pickup Location Picker Modal */}
<LocationPicker
  visible={showPickupMap}
  onClose={() => setShowPickupMap(false)}
  onSelectLocation={(location) => {
    console.log('Location selected:', location); // Add this to debug
    updatePickup('address', location.address);
    updatePickup('latitude', location.latitude.toString());
    updatePickup('longitude', location.longitude.toString());
    // The modal will be closed by the LocationPicker component after calling onSelectLocation
  }}
  initialLocation={
    formData.pickup.latitude && formData.pickup.longitude
      ? {
          latitude: parseFloat(formData.pickup.latitude),
          longitude: parseFloat(formData.pickup.longitude),
        }
      : undefined
  }
  title="Select Pickup Location"
/>

{/* Delivery Location Picker Modal */}
{/* Delivery Location Picker Modal */}
<LocationPicker
  visible={showDeliveryMap}
  onClose={() => setShowDeliveryMap(false)}
  onSelectLocation={(location) => {
    console.log('Delivery location selected:', location);
    updateDelivery('address', location.address);
    updateDelivery('latitude', location.latitude.toString());
    updateDelivery('longitude', location.longitude.toString());
  }}
  initialLocation={
    formData.delivery.latitude && formData.delivery.longitude
      ? {
          latitude: parseFloat(formData.delivery.latitude),
          longitude: parseFloat(formData.delivery.longitude),
        }
      : undefined
  }
  title="Select Delivery Location"
/>

{/* Delivery Location Picker Modal */}
<LocationPicker
  visible={showDeliveryMap}
  onClose={() => setShowDeliveryMap(false)}
  onSelectLocation={(location) => {
    updateDelivery('address', location.address);
    updateDelivery('latitude', location.latitude.toString());
    updateDelivery('longitude', location.longitude.toString());
  }}
  initialLocation={
    formData.delivery.latitude && formData.delivery.longitude
      ? {
          latitude: parseFloat(formData.delivery.latitude),
          longitude: parseFloat(formData.delivery.longitude),
        }
      : undefined
  }
  title="Select Delivery Location"
/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 2,
    backgroundColor: '#000000',
  },
  mapPickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#1a1a1a',
  padding: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#f97316',
  marginBottom: 12,
},
mapPickerContent: {
  flex: 1,
  marginLeft: 12,
},
mapPickerTitle: {
  fontSize: 15,
  fontWeight: '600',
  color: '#fff',
},
mapPickerSubtitle: {
  fontSize: 12,
  color: '#666',
  marginTop: 2,
},
feeSection: {
  backgroundColor: '#1a1a1a',
  padding: 16,
  borderRadius: 12,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.05)',
},
feeSectionTitle: {
  fontSize: 15,
  fontWeight: '600',
  color: '#fff',
  marginBottom: 12,
},
feeRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 8,
},
feeLabel: {
  fontSize: 13,
  color: '#666',
},
feeValue: {
  fontSize: 13,
  color: '#fff',
  fontWeight: '500',
},
feeDivider: {
  height: 1,
  backgroundColor: 'rgba(255,255,255,0.05)',
  marginVertical: 12,
},
calculatingContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 20,
},
calculatingText: {
  color: '#666',
  fontSize: 13,
},
estimatedFeeCard: {
  padding: 16,
  borderRadius: 12,
  marginTop: 8,
},
estimatedFeeLabel: {
  fontSize: 13,
  color: 'rgba(255,255,255,0.8)',
},
estimatedFeeAmount: {
  fontSize: 28,
  fontWeight: 'bold',
  color: '#fff',
  marginVertical: 4,
},
estimatedFeeNote: {
  fontSize: 11,
  color: 'rgba(255,255,255,0.6)',
},
noFeeContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  padding: 20,
  backgroundColor: '#0a0a0a',
  borderRadius: 8,
},
noFeeText: {
  flex: 1,
  color: '#666',
  fontSize: 12,
  lineHeight: 18,
},
reviewCoordinates: {
  fontSize: 11,
  color: '#f97316',
  marginTop: 4,
  marginBottom: 8,
  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#1a1a1a',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: '#f97316',
  },
  progressDotText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  progressDotTextActive: {
    color: '#fff',
  },
  progressLabel: {
    fontSize: 10,
    color: '#666',
  },
  progressLabelActive: {
    color: '#f97316',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#f97316',
  },
  content: {
    flex: 20,
    padding: 16,
  },
  stepContainer: {
    flex: 1,
    paddingBottom: 10,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    height: 50,
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    height: '100%',
  },
  currencySymbol: {
    position: 'absolute',
    left: 12,
    color: '#666',
    fontSize: 14,
  },
  textAreaContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 12,
  },
  textArea: {
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeCard: {
    flex: 1,
    minWidth: '18%',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  typeCardActive: {
    borderColor: '#f97316',
    backgroundColor: 'rgba(249,115,22,0.1)',
  },
  typeText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  typeTextActive: {
    color: '#f97316',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f97316',
    marginBottom: 8,
  },
  locationButtonText: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '500',
  },
  fieldHint: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  imageUploadSection: {
    marginBottom: 16,
  },
  imageUploadButton: {
    width: '100%',
    height: 150,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  packageImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    color: '#666',
    fontSize: 14,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  removeImageText: {
    color: '#ef4444',
    fontSize: 12,
  },
  reviewContainer: {
    flex: 1,
  },
  reviewSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  reviewPackageImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reviewItem: {
    flex: 1,
    minWidth: '40%',
  },
  reviewLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  reviewValue: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
  reviewDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  reviewAddress: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  reviewContact: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewContactName: {
    fontSize: 13,
    color: '#f97316',
  },
  reviewContactPhone: {
    fontSize: 13,
    color: '#666',
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
  feeCard: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 12,
  },
 
  feeAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  feeNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249,115,22,0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  continueButton: {
    backgroundColor: '#f97316',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});