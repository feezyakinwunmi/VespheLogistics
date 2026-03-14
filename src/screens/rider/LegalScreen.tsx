import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

type TabType = 'terms' | 'privacy';

export function LegalScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('terms');

  const lastUpdated = 'March 12, 2026';

  const termsContent = (
    <View style={styles.contentContainer}>
      <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>

      <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
      <Text style={styles.paragraph}>
        By downloading, installing, or using the Vesphe Rider app ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App.
      </Text>

      <Text style={styles.sectionTitle}>2. Eligibility</Text>
      <Text style={styles.paragraph}>
        You must be at least 18 years old and legally able to work as a delivery rider in Nigeria to use this App. You must provide accurate information during registration.
      </Text>

      <Text style={styles.sectionTitle}>3. Account & Responsibilities</Text>
      <Text style={styles.paragraph}>
        • You are responsible for maintaining the confidentiality of your account credentials.{'\n'}
        • You must only accept deliveries you can reasonably complete.{'\n'}
        • You must follow all traffic laws and safety regulations while delivering.{'\n'}
        • Any fraudulent activity, including fake GPS or multiple accounts, will result in permanent suspension.
      </Text>

      <Text style={styles.sectionTitle}>4. Payments & Earnings</Text>
      <Text style={styles.paragraph}>
        • Earnings are calculated based on distance, time, and package type.{'\n'}
        • Withdrawals are available only on Sundays with a minimum of ₦1,000.{'\n'}
        • Vesphe reserves the right to deduct fees, penalties, or refunds from your balance.{'\n'}
        • All payments are processed within 1–3 business days after withdrawal request.
      </Text>

      <Text style={styles.sectionTitle}>5. Termination</Text>
      <Text style={styles.paragraph}>
        We may suspend or terminate your account at any time for violation of these Terms, safety concerns, or at our sole discretion. You may stop using the App at any time.
      </Text>

      <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
      <Text style={styles.paragraph}>
        The App is provided "as is". Vesphe is not liable for any loss, damage, delay, or injury arising from use of the App or delivery services.
      </Text>

      <Text style={styles.sectionTitle}>7. Changes to Terms</Text>
      <Text style={styles.paragraph}>
        We may update these Terms at any time. Continued use of the App after changes constitutes acceptance of the new Terms.
      </Text>

      <Text style={styles.sectionTitle}>8. Governing Law</Text>
      <Text style={styles.paragraph}>
        These Terms are governed by the laws of the Federal Republic of Nigeria.
      </Text>

      <Text style={styles.contactFooter}>
        Questions? Contact support@vesphe.com
      </Text>
    </View>
  );

  const privacyContent = (
    <View style={styles.contentContainer}>
      <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>

      <Text style={styles.sectionTitle}>1. Information We Collect</Text>
      <Text style={styles.paragraph}>
        • Personal information: name, phone number, email, bank details{'\n'}
        • Location data: real-time location during active deliveries and while online{'\n'}
        • Device information: device type, OS version, app version{'\n'}
        • Delivery data: pickup/delivery addresses, order details, photos (if uploaded)
      </Text>

      <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
      <Text style={styles.paragraph}>
        • To connect you with delivery requests{'\n'}
        • To process payments and withdrawals{'\n'}
        • To show your location to customers/vendors during active deliveries{'\n'}
        • To improve the App and prevent fraud{'\n'}
        • To communicate important updates and support
      </Text>

      <Text style={styles.sectionTitle}>3. Location Sharing</Text>
      <Text style={styles.paragraph}>
        We collect precise location only when you are online or have an active delivery and have enabled location sharing. Location data is shared with customers and vendors only for active orders. We may share coarse location with operations for order assignment.
      </Text>

      <Text style={styles.sectionTitle}>4. Data Sharing</Text>
      <Text style={styles.paragraph}>
        We share your information with:{'\n'}
        • Customers and vendors (name, photo, location during delivery){'\n'}
        • Payment processors (for withdrawals){'\n'}
        • Law enforcement when required by law
      </Text>

      <Text style={styles.sectionTitle}>5. Data Security</Text>
      <Text style={styles.paragraph}>
        We use industry-standard encryption and security measures. However, no system is 100% secure.
      </Text>

      <Text style={styles.sectionTitle}>6. Your Rights</Text>
      <Text style={styles.paragraph}>
        You may request access, correction, or deletion of your personal data by contacting support@vesphe.com. We will respond within 30 days.
      </Text>

      <Text style={styles.sectionTitle}>7. Changes to Privacy Policy</Text>
      <Text style={styles.paragraph}>
        We may update this policy. Continued use after changes means you accept the updated policy.
      </Text>

      <Text style={styles.contactFooter}>
        Questions? Contact support@vesphe.com
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'terms' && styles.activeTab]}
          onPress={() => setActiveTab('terms')}
        >
          <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
            Terms of Service
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'privacy' && styles.activeTab]}
          onPress={() => setActiveTab('privacy')}
        >
          <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {activeTab === 'terms' ? termsContent : privacyContent}
        <View style={styles.bottomSpace} />
      </ScrollView>
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activeTab: {
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderColor: '#f97316',
  },
  tabText: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#f97316',
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 22,
    marginBottom: 16,
  },
  contactFooter: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  bottomSpace: {
    height: 40,
  },
});