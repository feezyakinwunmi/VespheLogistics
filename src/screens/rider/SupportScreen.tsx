import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

export function SupportScreen({ navigation }: any) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How do I track my delivery?',
      answer: 'Go to Active Deliveries and tap on the delivery to see real-time tracking.',
    },
    {
      question: 'How is delivery fee calculated?',
      answer: 'Fee is based on distance (₦350/km) and package weight (₦100/kg).',
    },
    {
      question: 'What if my package is damaged?',
      answer: 'Contact support immediately with photos of the damage.',
    },
    {
      question: 'Can I cancel a request?',
      answer: 'Yes, you can cancel pending or accepted requests from the request details page.',
    },
    {
      question: 'How do I get a refund?',
      answer: 'Refunds are processed within 3-5 business days for cancelled orders.',
    },
  ];

  const handleCall = async () => {
    try {
      await Linking.openURL('tel:+2349161460898');
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Could not open phone dialer',
        position: 'bottom',
      });
    }
  };

  const handleWhatsApp = async () => {
    try {
      await Linking.openURL('https://wa.me/2349161460898');
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Could not open WhatsApp',
        position: 'bottom',
      });
    }
  };

  const handleEmail = async () => {
    try {
      await Linking.openURL('mailto:info.phantomire@gmail.com');
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Could not open email client',
        position: 'bottom',
      });
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Help Banner */}
        <LinearGradient
          colors={['#f97316', '#f43f5e']}
          style={styles.helpCard}
        >
          <Text style={styles.helpTitle}>How can we help you?</Text>
          <Text style={styles.helpText}>
            Our support team is available 24/7 to assist you
          </Text>
        </LinearGradient>

        {/* Quick Contact Options */}
        <View style={styles.contactGrid}>
          <TouchableOpacity style={styles.contactCard} onPress={handleCall}>
            <View style={[styles.contactIcon, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Feather name="phone" size={24} color="#10b981" />
            </View>
            <Text style={styles.contactLabel}>Call Us</Text>
            <Text style={styles.contactValue}>+2349161460898</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleWhatsApp}>
            <View style={[styles.contactIcon, { backgroundColor: 'rgba(37,211,102,0.1)' }]}>
              <Feather name="message-circle" size={24} color="#25D366" />
            </View>
            <Text style={styles.contactLabel}>WhatsApp</Text>
            <Text style={styles.contactValue}>Chat with us</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
            <View style={[styles.contactIcon, { backgroundColor: 'rgba(249,115,22,0.1)' }]}>
              <Feather name="mail" size={24} color="#f97316" />
            </View>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>support@vesphe.com</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>

          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => toggleFaq(index)}
              activeOpacity={0.8}
            >
              <View style={styles.faqQuestion}>
                <Feather name="help-circle" size={16} color="#f97316" />
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <Feather
                  name={openFaqIndex === index ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#666"
                />
              </View>

              {openFaqIndex === index && (
                <Text style={styles.faqAnswerText}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Report Issue Button */}
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() =>
            Toast.show({
              type: 'info',
              text1: 'Coming Soon',
              text2: 'Issue reporting will be available soon',
              position: 'bottom',
            })
          }
        >
          <Feather name="alert-triangle" size={20} color="#f97316" />
          <Text style={styles.reportText}>Report an Issue</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
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
  helpCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  contactGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '500',
    textAlign: 'center',
  },
  faqSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  faqItem: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  faqAnswerText: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 18,
    marginTop: 12,
    marginLeft: 28,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f97316',
  },
  reportText: {
    color: '#f97316',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});