import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { AuthNavigator } from './AuthNavigator';
import { BusinessNavigator } from './BusinessNavigator';
import { RiderNavigator } from './RiderNavigator';
import { useAuth } from '../hooks/useAuth';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';

export type RootStackParamList = {
  Auth: undefined;
  Business: undefined;
  Rider: undefined;
  Onboarding:undefined
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isLoading, userRole } = useAuth();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Small delay to ensure auth state is resolved
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading || initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Onboarding" component={AuthNavigator} />
        ) : userRole === 'business' ? (
          <Stack.Screen name="Business" component={BusinessNavigator} />
        ) : userRole === 'rider' ? (
          <Stack.Screen name="Rider" component={RiderNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}