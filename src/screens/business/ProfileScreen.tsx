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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

interface BusinessProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  created_at?: string;
}

interface AppSettings {
  notifications: boolean;
  sound: boolean;
  vibration: boolean;
}

export function ProfileScreen({ navigation }: any) {
const { user, isLoading: authLoading,signOut } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Profile form
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  // App settings (like in SettingsScreen)
  const [settings, setSettings] = useState<AppSettings>({
    notifications: true,
    sound: true,
    vibration: true,
  });

  useEffect(() => {
      if (!authLoading && user?.id) {

    fetchProfile();
    loadSettings();
      }
  }, [user?.id, authLoading]);

const fetchProfile = async (forceRefresh = false) => {
  if (!user?.id) return;
  
  // Return cached data if available and not forcing refresh
  if (!forceRefresh && profile) return;
  
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    if (data) {
      setProfile(data);
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
      });
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  } finally {
    setLoading(false);
  }
};

  const loadSettings = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      if (data?.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      // Silent fail
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
    } catch (error) {
      // Silent fail or toast
    }
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, name: formData.name, phone: formData.phone } : null);
      setIsEditing(false);
    } catch (error) {
      // Silent fail or toast
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      // You can add upload logic here similar to your other screens
      // For now just preview (add supabase storage upload if needed)
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
  };

  const handleCallSupport = () => Linking.openURL('tel:+2349161460898').catch(() => {});
  const handleEmailSupport = () => Linking.openURL('mailto:info.phantomire@gmail.com').catch(() => {});
  const handleWhatsAppSupport = () => Linking.openURL('https://wa.me/2349161460898').catch(() => {});

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#f97316', '#f43f5e']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* Profile Summary Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={['#f97316', '#f43f5e']} style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile?.name?.charAt(0).toUpperCase() || 'B'}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name || 'Business'}</Text>
              <Text style={styles.profileEmail}>{profile?.email || '—'}</Text>
            </View>
          </View>
         
        </View>

        {/* Edit / Save Controls */}
        <View style={styles.actionButtons}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setIsEditing(false);
                  if (profile) {
                    setFormData({ name: profile.name || '', phone: profile.phone || '' });
                  }
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setIsEditing(true)}
            >
              <Feather name="edit-2" size={16} color="#fff" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Business Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.infoCard}>
            {isEditing ? (
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Business Name</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="briefcase" size={16} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={text => setFormData({ ...formData, name: text })}
                      placeholder="Business name"
                      placeholderTextColor="#666"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="phone" size={16} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.phone}
                      onChangeText={text => setFormData({ ...formData, phone: text })}
                      placeholder="Phone number"
                      placeholderTextColor="#666"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="mail" size={16} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      value={profile?.email}
                      editable={false}
                    />
                  </View>
                  <Text style={styles.hint}>Email cannot be changed</Text>
                </View>
              </View>
            ) : (
              <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                  <Feather name="briefcase" size={16} color="#f97316" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Business Name</Text>
                    <Text style={styles.infoValue}>{profile?.name || 'Not set'}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="phone" size={16} color="#f97316" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{profile?.phone || 'Not set'}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="mail" size={16} color="#f97316" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{profile?.email || '—'}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: '#f9731620' }]}>
              <Feather name="bell" size={20} color="#f97316" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingDescription}>Receive order alerts and updates</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={val => saveSetting('notifications', val)}
              trackColor={{ false: '#2a2a2a', true: '#f97316' }}
              thumbColor={settings.notifications ? '#fff' : '#666'}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: '#10b98120' }]}>
              <Feather name="volume-2" size={20} color="#10b981" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Sound</Text>
              <Text style={styles.settingDescription}>Play sounds for notifications</Text>
            </View>
            <Switch
              value={settings.sound}
              onValueChange={val => saveSetting('sound', val)}
              trackColor={{ false: '#2a2a2a', true: '#10b981' }}
              thumbColor={settings.sound ? '#fff' : '#666'}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: '#8b5cf620' }]}>
              <Feather name="smartphone" size={20} color="#8b5cf6" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Text style={styles.settingDescription}>Vibrate on new orders</Text>
            </View>
            <Switch
              value={settings.vibration}
              onValueChange={val => saveSetting('vibration', val)}
              trackColor={{ false: '#2a2a2a', true: '#8b5cf6' }}
              thumbColor={settings.vibration ? '#fff' : '#666'}
            />
          </View>
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleCallSupport}>
            <View style={[styles.settingIcon, { backgroundColor: '#10b98120' }]}>
              <Feather name="phone" size={20} color="#10b981" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Call Support</Text>
              <Text style={styles.settingDescription}>Speak with our team</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleWhatsAppSupport}>
            <View style={[styles.settingIcon, { backgroundColor: '#25D36620' }]}>
              <Feather name="message-circle" size={20} color="#25D366" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>WhatsApp Support</Text>
              <Text style={styles.settingDescription}>Chat with us</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleEmailSupport}>
            <View style={[styles.settingIcon, { backgroundColor: '#f9731620' }]}>
              <Feather name="mail" size={20} color="#f97316" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Email Support</Text>
              <Text style={styles.settingDescription}>info.phantomire@gmail.com</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <Text style={styles.infoValue}>Vendor</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={() => setShowLogoutModal(true)}>
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIcon}>
              <Feather name="log-out" size={40} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Sign Out</Text>
            <Text style={styles.confirmMessage}>Are you sure you want to sign out?</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmLogoutButton]}
                onPress={handleLogout}
              >
                <Text style={styles.confirmLogoutText}>Sign Out</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#f97316',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f97316',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  profileEmail: {
    fontSize: 13,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#f97316',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#2a2a2a',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  infoCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  infoGrid: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  editForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  disabledInput: {
    color: '#666',
  },
  hint: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
    marginTop: 4,
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

  confirmLogoutButton: {
    backgroundColor: '#ef4444',
  },
  confirmLogoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
});