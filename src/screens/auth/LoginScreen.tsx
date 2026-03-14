import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import Toast from 'react-native-toast-message';

interface SuspendedUserInfo {
  name: string;
  email: string;
  role: string;
  suspendedAt?: string;
}

export function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Suspension modal state
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [suspendedUser, setSuspendedUser] = useState<SuspendedUserInfo | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
        position: 'bottom',
      });
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (!result.success) {
      // Check for suspension
      if (result.error === 'ACCOUNT_SUSPENDED' && result.userData) {
        setSuspendedUser({
          name: result.userData.name,
          email: result.userData.email,
          role: result.userData.role,
          suspendedAt: result.userData.suspendedAt,
        });
        setShowSuspendedModal(true);
        return;
      }

      // Handle other errors with toast
      if (result.error?.includes('Invalid login credentials')) {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: 'Invalid email or password. Please try again.',
          position: 'bottom',
        });
      } else if (result.error?.includes('Email not confirmed')) {
        Toast.show({
          type: 'error',
          text1: 'Email Not Verified',
          text2: 'Please verify your email address before signing in.',
          position: 'bottom',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: result.error || 'An error occurred. Please try again.',
          position: 'bottom',
        });
      }
    }
  };

  const handleContactSupport = () => {
    setShowSuspendedModal(false);
    
    // Open email client
    Linking.openURL('mailto:info.phantomire@gmail.com?subject=Account%20Suspension%20Inquiry');
    
    Toast.show({
      type: 'info',
      text1: 'Support',
      text2: 'Opening email client...',
      position: 'bottom',
    });
  };

  const handleCallSupport = () => {
    setShowSuspendedModal(false);
    
    // Open phone dialer
    Linking.openURL('tel:+2349161460898');
    
    Toast.show({
      type: 'info',
      text1: 'Support',
      text2: 'Opening phone dialer...',
      position: 'bottom',
    });
  };

  const handleDispute = () => {
    setShowSuspendedModal(false);
    
    // Open dispute form URL
    Linking.openURL('https://vesphe.com/support/dispute');
    
    Toast.show({
      type: 'info',
      text1: 'Dispute Form',
      text2: 'Opening dispute form in browser...',
      position: 'bottom',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Image
          source={require('../../assets/logistic.png')}
          style={{ width: 300, height: 300 }}
          resizeMode="contain"
        />        

        <View style={styles.formContainer}>
          <Text style={styles.welcome}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.inputGroup}>
            <Feather name="mail" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Feather name="lock" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.loginButtonText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Professional Suspended User Modal */}
      <Modal
        visible={showSuspendedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuspendedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header with gradient */}
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.modalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.modalIconContainer}>
                <Feather name="alert-octagon" size={32} color="#fff" />
              </View>
              <Text style={styles.modalHeaderTitle}>Account Suspended</Text>
            </LinearGradient>

            {/* User Info */}
            {suspendedUser && (
              <View style={styles.modalUserInfo}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {suspendedUser.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.modalUserDetails}>
                  <Text style={styles.modalUserName}>{suspendedUser.name}</Text>
                  <Text style={styles.modalUserEmail}>{suspendedUser.email}</Text>
                  <View style={styles.modalRoleBadge}>
                    <Feather name="user" size={10} color="#f97316" />
                    <Text style={styles.modalRoleText}>{suspendedUser.role.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Message */}
            <View style={styles.modalMessageContainer}>
              <Text style={styles.modalMessage}>
          Your account has been suspended due to suspicious activity or a violation of our terms of service.
              </Text>
            </View>

            {/* Reason Card */}
            <View style={styles.modalReasonCard}>
              <Feather name="info" size={20} color="#f97316" />
              <Text style={styles.modalReasonText}>
                If you believe this is a mistake or would like to dispute this action, please contact our support team.
              </Text>
            </View>

            {/* Suspension Date */}
            {suspendedUser?.suspendedAt && (
              <View style={styles.modalDateContainer}>
                <Feather name="calendar" size={14} color="#666" />
                <Text style={styles.modalDateText}>
                  Suspended on: {new Date(suspendedUser.suspendedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.modalDivider} />

            {/* Support Options */}
            <Text style={styles.modalSupportTitle}>Contact Support</Text>
            
            <View style={styles.modalSupportOptions}>
              <TouchableOpacity
                style={styles.modalSupportOption}
                onPress={handleCallSupport}
              >
                <View style={[styles.modalSupportIcon, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                  <Feather name="phone" size={20} color="#10b981" />
                </View>
                <Text style={styles.modalSupportOptionText}>Call Support</Text>
                <Text style={styles.modalSupportOptionSubtext}>+234 800 000 0000</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSupportOption}
                onPress={handleContactSupport}
              >
                <View style={[styles.modalSupportIcon, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                  <Feather name="mail" size={20} color="#3b82f6" />
                </View>
                <Text style={styles.modalSupportOptionText}>Email Support</Text>
                <Text style={styles.modalSupportOptionSubtext}>support@vesphe.com</Text>
              </TouchableOpacity>
            </View>

            {/* Dispute Button */}
            <TouchableOpacity
              style={styles.modalDisputeButton}
              onPress={handleDispute}
            >
              <Feather name="file-text" size={18} color="#f97316" />
              <Text style={styles.modalDisputeButtonText}>File a Dispute</Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSuspendedModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  welcome: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    height: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#f97316',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalUserInfo: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 12,
    gap: 12,
  },
  modalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalUserDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  modalUserEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modalRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249,115,22,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  modalRoleText: {
    fontSize: 9,
    color: '#f97316',
    fontWeight: '600',
  },
  modalMessageContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  modalReasonCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249,115,22,0.1)',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.2)',
  },
  modalReasonText: {
    flex: 1,
    fontSize: 12,
    color: '#f97316',
    lineHeight: 16,
  },
  modalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 6,
  },
  modalDateText: {
    fontSize: 11,
    color: '#666',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  modalSupportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modalSupportOptions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  modalSupportOption: {
    flex: 1,
    alignItems: 'center',
  },
  modalSupportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSupportOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  modalSupportOptionSubtext: {
    fontSize: 9,
    color: '#666',
  },
  modalDisputeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f97316',
  },
  modalDisputeButtonText: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  modalCloseButtonText: {
    fontSize: 14,
    color: '#666',
  },
});