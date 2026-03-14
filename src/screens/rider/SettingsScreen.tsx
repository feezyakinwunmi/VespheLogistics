import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { useAuth } from '../../hooks/useAuth';
import { useRiderDeliveries } from '../../hooks/useRiderDeliveries';
import { supabase } from '../../services/supabase';

interface AppSettings {
  notifications: boolean;
  sound: boolean;
  vibration: boolean;
  darkMode: boolean;
  autoAccept: boolean;
  shareLocation: boolean;
}

export function SettingsScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { stats, refresh } = useRiderDeliveries(user?.id || '');

  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    notifications: true,
    sound: true,
    vibration: true,
    darkMode: true,
    autoAccept: false,
    shareLocation: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data?.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      // Silent fail - use defaults
    }
  };

  const saveSetting = async (key: keyof AppSettings, value: boolean) => {
    if (!user?.id) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings: newSettings,
          updated_at: new Date().toISOString(),
        });

      Toast.show({
        type: 'success',
        text1: 'Setting saved',
        position: 'bottom',
        visibilityTime: 1500,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to save setting',
        position: 'bottom',
      });
    }
  };

  const handleSignOut = () => {
    setShowLogoutModal(true);
  };

  const confirmSignOut = async () => {
    setShowLogoutModal(false);
    setLoading(true);

    try {
      await signOut();
      Toast.show({
        type: 'success',
        text1: 'Signed out successfully',
        position: 'bottom',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Sign out failed',
        text2: 'Please try again',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+2349161460898').catch(() =>
      Toast.show({ type: 'error', text1: 'Could not open phone dialer' })
    );
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:info.phantomire@gmail.com').catch(() =>
      Toast.show({ type: 'error', text1: 'Could not open email' })
    );
  };

  const handleWhatsAppSupport = () => {
    Linking.openURL('https://wa.me/2349161460898').catch(() =>
      Toast.show({ type: 'error', text1: 'Could not open WhatsApp' })
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const StatCard = ({ label, value, icon, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  const SettingItem = ({
    icon,
    label,
    description,
    value,
    onValueChange,
    type = 'switch',
    onPress,
    color = '#f97316',
  }: any) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={type === 'switch'}
      activeOpacity={type === 'switch' ? 1 : 0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: color + '20' }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#2a2a2a', true: '#f97316' }}
          thumbColor={value ? '#fff' : '#666'}
        />
      ) : (
        <Feather name="chevron-right" size={20} color="#666" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#f97316', '#f43f5e']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* Profile Summary */}
        <View
          style={styles.profileCard}
        >
          <View style={styles.profileLeft}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={['#f97316', '#f43f5e']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'R'}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'Rider'}</Text>
              <Text style={styles.profileEmail}>{user?.email || '—'}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="#666" />
        </View>

        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Performance Stats</Text>
            <TouchableOpacity onPress={() => setShowStatsModal(true)}>
              <Text style={styles.statsViewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              label="Total Earnings"
              value={`₦${(stats?.totalEarnings ?? 0).toLocaleString()}`}
              icon="dollar-sign"
              color="#10b981"
            />
            <StatCard
              label="Deliveries"
              value={stats?.totalDeliveries ?? 0}
              icon="truck"
              color="#f97316"
            />
            <StatCard
              label="Rating"
              value={stats?.rating?.toFixed(1) ?? '4.8'}
              icon="star"
              color="#fbbf24"
            />
            <StatCard
              label="Available"
              value={`₦${(stats?.availableBalance ?? 0).toLocaleString()}`}
              icon="credit-card"
              color="#8b5cf6"
            />
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <SettingItem
            icon="bell"
            label="Notifications"
            description="Receive order alerts and updates"
            value={settings.notifications}
            onValueChange={(val: boolean) => saveSetting('notifications', val)}
            color="#f97316"
          />

          <SettingItem
            icon="volume-2"
            label="Sound"
            description="Play sounds for notifications"
            value={settings.sound}
            onValueChange={(val: boolean) => saveSetting('sound', val)}
            color="#10b981"
          />

          <SettingItem
            icon="smartphone"
            label="Vibration"
            description="Vibrate on new orders"
            value={settings.vibration}
            onValueChange={(val: boolean) => saveSetting('vibration', val)}
            color="#8b5cf6"
          />
        </View>

        {/* Delivery Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Preferences</Text>

          {/* Uncomment when ready */}
          {/* <SettingItem
            icon="check-circle"
            label="Auto Accept"
            description="Automatically accept nearby orders"
            value={settings.autoAccept}
            onValueChange={(val: boolean) => saveSetting('autoAccept', val)}
            color="#f97316"
          /> */}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('LiveTracking')}
          >
            <LinearGradient
              colors={['#000000', '#bd3702']}
              style={styles.locationGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="radio" size={24} color="#fff" />
              <Text style={styles.actionText}>Live Tracking</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>

          <SettingItem
            icon="help-circle"
            label="Help Center"
            description="FAQs and guides"
            type="link"
            onPress={() => navigation.navigate('Support')}
            color="#3b82f6"
          />

          <SettingItem
            icon="phone"
            label="Call Support"
            description="Speak with our team"
            type="link"
            onPress={handleCallSupport}
            color="#10b981"
          />

          <SettingItem
            icon="message-circle"
            label="WhatsApp Support"
            description="Chat with us"
            type="link"
            onPress={handleWhatsAppSupport}
            color="#25D366"
          />

          <SettingItem
            icon="mail"
            label="Email Support"
            description="support@vesphe.com"
            type="link"
            onPress={handleEmailSupport}
            color="#f97316"
          />

          <SettingItem
            icon="file-text"
            label="Terms of Service"
            description="Read our terms"
            type="link"
            onPress={() => navigation.navigate('Legal')}
            color="#8b5cf6"
          />

          <SettingItem
            icon="shield"
            label="Privacy Policy"
            description="How we handle your data"
            type="link"
          onPress={() => navigation.navigate('Legal')}
            color="#3b82f6"
          />
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{formatDate(user?.created_at)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <Text style={styles.infoValue}>Rider</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Stats Modal */}
      <Modal visible={showStatsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detailed Stats</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.statsDetails}>
                <View style={styles.statDetailItem}>
                  <Text style={styles.statDetailLabel}>Total Earnings</Text>
                  <Text style={styles.statDetailValue}>
                    ₦{(stats?.totalEarnings ?? 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statDetailItem}>
                  <Text style={styles.statDetailLabel}>Available Balance</Text>
                  <Text style={styles.statDetailValue}>
                    ₦{(stats?.availableBalance ?? 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statDetailItem}>
                  <Text style={styles.statDetailLabel}>Pending Balance</Text>
                  <Text style={styles.statDetailValue}>
                    ₦{(stats?.pendingBalance ?? 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.statDetailItem}>
                  <Text style={styles.statDetailLabel}>Total Deliveries</Text>
                  <Text style={styles.statDetailValue}>{stats?.totalDeliveries ?? 0}</Text>
                </View>
                <View style={styles.statDetailItem}>
                  <Text style={styles.statDetailLabel}>Today's Deliveries</Text>
                  <Text style={styles.statDetailValue}>{stats?.todayDeliveries ?? 0}</Text>
                </View>
                <View style={styles.statDetailItem}>
                  <Text style={styles.statDetailLabel}>This Week</Text>
                  <Text style={styles.statDetailValue}>{stats?.weekDeliveries ?? 0}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.statDetailItem}>
                  <Text style={styles.statDetailLabel}>Average Rating</Text>
                  <Text style={styles.statDetailValue}>{stats?.rating?.toFixed(1) ?? '4.8'}</Text>
                </View>
                <View style={styles.statDetailItem}>
                  <Text style={styles.statDetailLabel}>Average per Delivery</Text>
                  <Text style={styles.statDetailValue}>
                    ₦{stats?.totalDeliveries
                      ? Math.round((stats.totalEarnings ?? 0) / stats.totalDeliveries).toLocaleString()
                      : '0'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIcon}>
              <Feather name="log-out" size={40} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Sign Out</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmLogoutButton]}
                onPress={confirmSignOut}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmLogoutText}>Sign Out</Text>
                )}
              </TouchableOpacity>
            </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: -20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#666',
  },
  statsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statsViewAll: {
    color: '#f97316',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  settingDescription: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoValue: {
    fontSize: 13,
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 11,
    color: '#10b981',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalBody: {
    padding: 16,
  },
  statsDetails: {
    gap: 12,
  },
  statDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statDetailLabel: {
    fontSize: 13,
    color: '#666',
  },
  statDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 8,
  },
  confirmModal: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#2a2a2a',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmLogoutButton: {
    backgroundColor: '#ef4444',
  },
  confirmLogoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
  },
  locationGradient: {
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  actionText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
});