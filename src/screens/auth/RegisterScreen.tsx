import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

export function RegisterScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  // OTP State
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [maskedEmail, setMaskedEmail] = useState('');
  const otpInputs = useRef<Array<TextInput | null>>([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!canResend && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
      setCountdown(60);
    }
    return () => clearTimeout(timer);
  }, [canResend, countdown]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    return phoneRegex.test(phone);
  };

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    
    const firstTwo = localPart.slice(0, 2);
    const lastTwo = localPart.slice(-2);
    const maskedLocal = firstTwo + '*'.repeat(Math.max(0, localPart.length - 4)) + lastTwo;
    
    return `${maskedLocal}@${domain}`;
  };

  const handleRegister = async () => {
    // Validation
    if (!businessName || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (businessName.length < 2) {
      Alert.alert('Error', 'Please enter a valid business name');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!validatePhone(phone)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (!agreeToTerms) {
      Alert.alert('Error', 'Please agree to the terms and conditions');
      return;
    }

    setLoading(true);
    // Pass businessName as the name parameter
    const result = await signUp(businessName, email, phone, password);
    setLoading(false);

    if (result.success) {
      setMaskedEmail(maskEmail(email));
      setShowOTPModal(true);
      setCanResend(false);
    } else {
      Alert.alert('Registration Failed', result.error);
    }
  };

// Replace your existing handleOTPChange
const handleOTPChange = (text: string, index: number) => {
  // Only allow one digit
  if (text.length > 1) text = text.slice(-1);
  if (!/^\d?$/.test(text)) return; // only digits or empty

  const newOtp = [...otpCode];
  newOtp[index] = text;
  setOtpCode(newOtp);
  setOtpError('');

  // Auto-focus next input
  if (text && index < 5) {
    otpInputs.current[index + 1]?.focus();
  }

  // Auto-focus previous on backspace (when field becomes empty)
  if (!text && index > 0) {
    otpInputs.current[index - 1]?.focus();
  }
};

// ADD THIS useEffect right after your existing useEffects
useEffect(() => {
  const otpString = otpCode.join('');

  // Auto-verify when exactly 6 digits are filled and not already verifying
  if (otpString.length === 6 && !isVerifyingOTP) {
    handleVerifyOTP();
  }
}, [otpCode, isVerifyingOTP]);

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace to focus previous input
    if (e.nativeEvent.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

const handleVerifyOTP = async () => {
  const otpString = otpCode.join('');
  
  // Only manual check if somehow called without 6 digits (e.g. button press)
  if (otpString.length !== 6) {
    setOtpError('Please enter all 6 digits');
    return;
  }

  setIsVerifyingOTP(true);
  
  try {
    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: otpString,
      type: 'signup'
    });

    if (error) throw error;

    // OTP verified → show success UI and auto-redirect
    setShowOTPModal(false);

    // Instead of Alert, show success screen or auto-redirect
    // Option A: Simple auto-redirect (recommended for clean UX)
    setTimeout(() => {
      navigation.replace('Login');  // replace = clear stack, no back button to signup
    }, 2500); // 2.5 seconds delay - enough to see success

    // Option B: If you want a brief success message first (uncomment if preferred)
    /*
    Alert.alert(
      'Success',
      'Business account created and verified! Redirecting to login...',
      [],
      { cancelable: false }
    );
    setTimeout(() => {
      navigation.replace('Login');
    }, 3000);
    */

  } catch (error: any) {
    setOtpError(error.message || 'Invalid OTP. Please try again.');
    setOtpCode(['', '', '', '', '', '']);
    otpInputs.current[0]?.focus();
  } finally {
    setIsVerifyingOTP(false);
  }
};
  const handleResendOTP = async () => {
    if (!canResend) return;
    
    try {
      // Resend OTP using the signUp method again or resend API
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;
      
      setCanResend(false);
      Alert.alert('Success', 'A new verification code has been sent to your email');
      
    } catch (error: any) {
      setOtpError(error.message || 'Failed to resend code');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Registration</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <Feather name="briefcase" size={40} color="#f97316" />
            </View>
            
            <Text style={styles.title}>Create Business Account</Text>
            <Text style={styles.subtitle}>Join Vesphe Logistics to start sending packages</Text>

            <View style={styles.inputGroup}>
              <Feather name="briefcase" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Business Name"
                placeholderTextColor="#666"
                value={businessName}
                onChangeText={setBusinessName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Feather name="mail" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Business Email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Feather name="phone" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Business Phone"
                placeholderTextColor="#666"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Feather name="lock" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#666"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>

            {/* Email Verification Info */}
            <View style={styles.infoBox}>
              <Feather name="info" size={16} color="#f97316" />
              <Text style={styles.infoText}>
                After registration, we'll send a 6-digit verification code to your email. You'll need to enter it to complete signup.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
            >
              <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                {agreeToTerms && <Feather name="check" size={14} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.registerButton, (!agreeToTerms || loading) && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={!agreeToTerms || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Create Business Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.noteCard}>
              <Feather name="info" size={16} color="#f97316" />
              <Text style={styles.noteText}>
                <Text style={styles.noteBold}>For Riders:</Text> Delivery partners are created by admin. If you're a rider, please contact support or use the login credentials provided by your administrator.
              </Text>
            </View>

            <View style={styles.featuresCard}>
              <Text style={styles.featuresTitle}>With a business account you can:</Text>
              <View style={styles.featureItem}>
                <Feather name="check-circle" size={14} color="#10b981" />
                <Text style={styles.featureText}>Request package deliveries</Text>
              </View>
              <View style={styles.featureItem}>
                <Feather name="check-circle" size={14} color="#10b981" />
                <Text style={styles.featureText}>Track deliveries in real-time</Text>
              </View>
              <View style={styles.featureItem}>
                <Feather name="check-circle" size={14} color="#10b981" />
                <Text style={styles.featureText}>Manage multiple delivery requests</Text>
              </View>
              <View style={styles.featureItem}>
                <Feather name="check-circle" size={14} color="#10b981" />
                <Text style={styles.featureText}>Access delivery history and invoices</Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOTPModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOTPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Your Email</Text>
              <TouchableOpacity onPress={() => setShowOTPModal(false)}>
                <Feather name="x" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.otpDescription}>
                Enter the 6-digit verification code sent to:
              </Text>
              <Text style={styles.maskedEmail}>{maskedEmail}</Text>

              {/* OTP Input Boxes */}
              <View style={styles.otpContainer}>
                {otpCode.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      if (ref) {
                        otpInputs.current[index] = ref;
                      }
                    }}
                    style={[
                      styles.otpInput,
                      otpError ? styles.otpInputError : null
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOTPChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isVerifyingOTP}
                  />
                ))}
              </View>

              {otpError ? (
                <Text style={styles.otpErrorText}>{otpError}</Text>
              ) : null}

              {/* Resend Code */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendInfo}>Didn't receive the code? </Text>
                <TouchableOpacity 
                  onPress={handleResendOTP}
                  disabled={!canResend}
                >
                  <Text style={[
                    styles.resendLink,
                    !canResend && styles.resendLinkDisabled
                  ]}>
                    {canResend ? 'Resend' : `Resend in ${countdown}s`}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleVerifyOTP}
                disabled={isVerifyingOTP || otpCode.some(d => d === '')}
                style={styles.modalButton}
              >
                {isVerifyingOTP ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Verify Email</Text>
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
  content: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    paddingVertical: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(249,115,22,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249,115,22,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#f97316',
    fontSize: 12,
    lineHeight: 18,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#f97316',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#f97316',
  },
  termsText: {
    flex: 1,
    color: '#666',
    fontSize: 13,
    lineHeight: 18,
  },
  termsLink: {
    color: '#f97316',
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '600',
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249,115,22,0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.2)',
  },
  noteText: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    lineHeight: 18,
  },
  noteBold: {
    fontWeight: 'bold',
    color: '#f97316',
  },
  featuresCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  featuresTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    color: '#666',
    fontSize: 13,
    flex: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
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
  otpDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  maskedEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f97316',
    textAlign: 'center',
    marginBottom: 24,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  otpInput: {
    width: 45,
    height: 45,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  otpInputError: {
    borderColor: '#ef4444',
  },
  otpErrorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  resendInfo: {
    color: '#666',
    fontSize: 14,
  },
  resendLink: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '500',
  },
  resendLinkDisabled: {
    color: '#666',
  },
  modalButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

