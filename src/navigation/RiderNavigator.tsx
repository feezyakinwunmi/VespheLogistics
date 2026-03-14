import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

import { RiderDashboardScreen } from '../screens/rider/RiderDashboardScreen';
import { AvailableDeliveriesScreen } from '../screens/rider/AvailableDeliveriesScreen';
import { MyDeliveriesScreen } from '../screens/rider/MyDeliveriesScreen';
import { DeliveryDetailsScreen } from '../screens/rider/DeliveryDetailsScreen';
import { TrackDeliveryScreen } from '../screens/rider/TrackDeliveryScreen';
import { EarningsScreen } from '../screens/rider/EarningsScreen';
import { WithdrawScreen } from '../screens/rider/WithdrawScreen';
import { LiveTrackingScreen } from '../screens/rider/LiveTrackingScreen';
import { NotificationsScreen } from '../screens/rider/NotificationsScreen';
import { SupportScreen } from '../screens/rider/SupportScreen';
import { LegalScreen } from '../screens/rider/LegalScreen';

import { SettingsScreen } from '../screens/rider/SettingsScreen';


export type RiderStackParamList = {
  RiderTabs: undefined;
  DeliveryDetails: { id: string };
  TrackDelivery: { id: string };
  Withdraw: undefined;
  Support: undefined;
  Notifications:undefined;
  LiveTracking:undefined;
  Legal:undefined;

};

const Stack = createNativeStackNavigator<RiderStackParamList>();
const Tab = createBottomTabNavigator();

function RiderTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = 'home';
          } else if (route.name === 'Available') {
            iconName = 'package';
          } else if (route.name === 'MyDeliveries') {
            iconName = 'list';
          } else if (route.name === 'Earnings') {
            iconName = 'dollar-sign';
          } else if (route.name === 'Profile') {
            iconName = 'user';
          } else if (route.name === 'Settings'){
            iconName = 'settings'
          } else if (route.name === 'Notifications'){
            iconName = 'bell'
          }

          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: 'rgba(255,255,255,0.05)',
          paddingBottom: 20,
          paddingTop: 5,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={RiderDashboardScreen} />
      <Tab.Screen name="Available" component={AvailableDeliveriesScreen} />
      <Tab.Screen name="MyDeliveries" component={MyDeliveriesScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />   
         <Tab.Screen name="Notifications" component={NotificationsScreen} />

      <Tab.Screen name="Settings" component={SettingsScreen} />

    </Tab.Navigator>
  );
}

export function RiderNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1a1a1a',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="RiderTabs" 
        component={RiderTabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="DeliveryDetails" 
        component={DeliveryDetailsScreen} 
        options={{ title: 'Delivery Details' }}
      />
      <Stack.Screen 
        name="TrackDelivery" 
        component={TrackDeliveryScreen} 
        options={{ title: 'Track Delivery' }}
      />
      <Stack.Screen 
        name="Withdraw" 
        component={WithdrawScreen} 
        options={{ 
          title: 'Withdraw Earnings',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
  name="LiveTracking" 
  component={LiveTrackingScreen} 
  options={{ 
    title: 'Live Tracking',
    headerShown: false,
  }}
/>
<Stack.Screen 
  name="Notifications" 
  component={NotificationsScreen} 
  options={{ 
    title: 'Notifications',
    headerShown: false,
  }}
/>

      <Stack.Screen 
        name="Support" 
        component={SupportScreen} 
        options={{ title: 'Support' }}
      />
      
      <Stack.Screen 
        name="Legal" 
        component={LegalScreen} 
        options={{ title: 'Legal' }}
      />
    </Stack.Navigator>
  );
}