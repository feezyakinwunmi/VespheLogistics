import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Auth Navigator Types
export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
    Message: undefined;

};

// Business Navigator Types
export type BusinessTabParamList = {
  Dashboard: undefined;
  Requests: undefined;
  History: undefined;
  Profile: undefined;
  RequestList:undefined;
    Message: undefined;

};

export type BusinessStackParamList = {
  BusinessTabs: undefined;
  CreateRequest: undefined;
  RequestDetails: { id: string };
  TrackDelivery: { id: string };
  Payment: { id: string; amount: number };
  Support: undefined;
    Message: undefined;

};

// Rider Navigator Types
export type RiderTabParamList = {
  Dashboard: undefined;
  Available: undefined;
  MyDeliveries: undefined;
  Earnings: undefined;
  Profile: undefined;
  LiveTracking:undefined;
  Message: undefined;

};

export type RiderStackParamList = {
  RiderTabs: undefined;
  DeliveryDetails: { id: string };
  TrackDelivery: { id: string };
  Withdraw: undefined;
  Support: undefined;
  Legal:undefined;
  Message: undefined;

};

// Root Navigator Types
export type RootStackParamList = {
  Auth: undefined;
  Business: undefined;
  Rider: undefined;
  Message: undefined;
};

// Screen Props Types
export type AuthScreenProps<T extends keyof AuthStackParamList> = 
  NativeStackScreenProps<AuthStackParamList, T>;

export type BusinessTabScreenProps<T extends keyof BusinessTabParamList> = 
  BottomTabScreenProps<BusinessTabParamList, T>;

export type BusinessStackScreenProps<T extends keyof BusinessStackParamList> = 
  NativeStackScreenProps<BusinessStackParamList, T>;

export type RiderTabScreenProps<T extends keyof RiderTabParamList> = 
  BottomTabScreenProps<RiderTabParamList, T>;

export type RiderStackScreenProps<T extends keyof RiderStackParamList> = 
  NativeStackScreenProps<RiderStackParamList, T>;

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;