import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { TouchableOpacity, View, Text } from 'react-native';

import { BusinessDashboardScreen } from '../screens/business/DashboardScreen';
import { CreateRequestScreen } from '../screens/business/CreateRequestScreen';
import { RequestsListScreen } from '../screens/business/RequestsListScreen';
import { RequestDetailsScreen } from '../screens/business/RequestDetailsScreen';
import { TrackDeliveryScreen } from '../screens/business/TrackDeliveryScreen';
import { PaymentScreen } from '../screens/business/PaymentScreen';
import { HistoryScreen } from '../screens/business/HistoryScreen';
import { ProfileScreen } from '../screens/business/ProfileScreen';
import { SupportScreen } from '../screens/business/SupportScreen';

export type BusinessStackParamList = {
  BusinessTabs: undefined;
  CreateRequest: undefined;
  RequestDetails: { id: string };
  TrackDelivery: { id: string };
  Payment: { id: string; amount: number };
  Support: undefined;
  RequestList:undefined;
};

const Stack = createNativeStackNavigator<BusinessStackParamList>();
const Tab = createBottomTabNavigator();

function BusinessTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = 'home';
          } else if (route.name === 'Requests') {
            iconName = 'list';
          } else if (route.name === 'History') {
            iconName = 'clock';
          } else if (route.name === 'Profile') {
            iconName = 'user';
          }

          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: 'rgba(255,255,255,0.05)',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={BusinessDashboardScreen} />
      <Tab.Screen name="Requests" component={RequestsListScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function BusinessNavigator() {
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
        name="BusinessTabs" 
        component={BusinessTabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateRequest" 
        component={CreateRequestScreen} 
        options={{ 
          title: 'New Delivery Request',
          presentation: 'modal',
        
        }}
      />
      <Stack.Screen 
        name="RequestDetails" 
        component={RequestDetailsScreen} 
        options={{ title: 'Request Details' }}
      />
      <Stack.Screen
      name="RequestList"
      component={RequestsListScreen}
      options={{title: 'Request List'}}
      />
      <Stack.Screen 
        name="TrackDelivery" 
        component={TrackDeliveryScreen} 
        options={{ title: 'Track Delivery' }}
      />
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen} 
        options={{ 
          title: 'Make Payment',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="Support" 
        component={SupportScreen} 
        options={{ title: 'Support' }}
      />
    </Stack.Navigator>
  );
}