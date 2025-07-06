import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  Modal,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';

// Privacy Policy Modal Component
const PrivacyPolicyModal = ({ visible, onClose }) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalText}>
              <Text style={styles.modalHeading}>Last Updated: {new Date().toLocaleDateString()}</Text>
              {'\n\n'}
              <Text style={styles.modalHeading}>1. Information We Collect</Text>
              {'\n'}
              We collect information you provide directly to us, such as when you create an account, update your profile, or contact us for support. This includes your name, email address, and any other information you choose to provide.
              {'\n\n'}
              <Text style={styles.modalHeading}>2. How We Use Your Information</Text>
              {'\n'}
              We use the information we collect to:
              {'\n'}• Provide, maintain, and improve our services
              {'\n'}• Process transactions and send related information
              {'\n'}• Send technical notices and support messages
              {'\n'}• Respond to your comments and questions
              {'\n\n'}
              <Text style={styles.modalHeading}>3. Information Sharing</Text>
              {'\n'}
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
              {'\n\n'}
              <Text style={styles.modalHeading}>4. Data Security</Text>
              {'\n'}
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              {'\n\n'}
              <Text style={styles.modalHeading}>5. Your Rights</Text>
              {'\n'}
              You have the right to access, update, or delete your personal information. You can do this through your account settings or by contacting us directly.
              {'\n\n'}
              <Text style={styles.modalHeading}>6. Changes to This Policy</Text>
              {'\n'}
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
              {'\n\n'}
              <Text style={styles.modalHeading}>7. Contact Us</Text>
              {'\n'}
              If you have any questions about this privacy policy, please contact us at privacy@example.com.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// About Modal Component
const AboutModal = ({ visible, onClose }) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>About Us</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalText}>
              <Text style={styles.modalHeading}>Our Mission</Text>
              {'\n'}
              We are dedicated to creating innovative solutions that simplify your digital life. Our platform is designed to provide a seamless, secure, and user-friendly experience that empowers you to achieve your goals efficiently.
              {'\n\n'}
              <Text style={styles.modalHeading}>Our Story</Text>
              {'\n'}
              Founded in 2024, our company began with a simple vision: to bridge the gap between complex technology and everyday users. We believe that powerful tools should be accessible to everyone, regardless of their technical background.
              {'\n\n'}
              <Text style={styles.modalHeading}>Our Values</Text>
              {'\n'}
              <Text style={styles.modalSubheading}>Innovation</Text>
              {'\n'}
              We continuously push the boundaries of what's possible, embracing new technologies and methodologies to deliver cutting-edge solutions.
              {'\n\n'}
              <Text style={styles.modalSubheading}>Privacy & Security</Text>
              {'\n'}
              Your data security and privacy are our top priorities. We implement industry-leading security measures to protect your information.
              {'\n\n'}
              <Text style={styles.modalSubheading}>User-Centric Design</Text>
              {'\n'}
              Every feature we build is designed with the user in mind, ensuring intuitive interfaces and meaningful experiences.
              {'\n\n'}
              <Text style={styles.modalSubheading}>Transparency</Text>
              {'\n'}
              We believe in open communication and honest practices. We're committed to being transparent about our processes, policies, and updates.
              {'\n\n'}
              <Text style={styles.modalHeading}>Our Team</Text>
              {'\n'}
              Our diverse team of engineers, designers, and product specialists brings together decades of experience from leading technology companies. We're passionate about creating solutions that make a real difference in people's lives.
              {'\n\n'}
              <Text style={styles.modalHeading}>Contact Us</Text>
              {'\n'}
              Have questions or feedback? We'd love to hear from you!
              {'\n'}
              Email: hello@example.com
              {'\n'}
              Support: support@example.com
              {'\n'}
              Website: www.example.com
              {'\n\n'}
              <Text style={styles.modalHeading}>Follow Us</Text>
              {'\n'}
              Stay connected with us on social media for the latest updates, tips, and community highlights.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Terms of Service Modal Component
const TermsModal = ({ visible, onClose }) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Terms of Service</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalText}>
              <Text style={styles.modalHeading}>Last Updated: {new Date().toLocaleDateString()}</Text>
              {'\n\n'}
              <Text style={styles.modalHeading}>1. Acceptance of Terms</Text>
              {'\n'}
              By accessing and using our service, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              {'\n\n'}
              <Text style={styles.modalHeading}>2. Use License</Text>
              {'\n'}
              Permission is granted to temporarily download one copy of the materials on our service for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              {'\n'}• Modify or copy the materials
              {'\n'}• Use the materials for any commercial purpose
              {'\n'}• Attempt to reverse engineer any software
              {'\n'}• Remove any copyright or other proprietary notations
              {'\n\n'}
              <Text style={styles.modalHeading}>3. Account Responsibilities</Text>
              {'\n'}
              You are responsible for safeguarding the password and for all activities that occur under your account. You agree to:
              {'\n'}• Provide accurate and complete information
              {'\n'}• Maintain the security of your account
              {'\n'}• Notify us immediately of any unauthorized use
              {'\n'}• Accept responsibility for all activities under your account
              {'\n\n'}
              <Text style={styles.modalHeading}>4. Prohibited Uses</Text>
              {'\n'}
              You may not use our service:
              {'\n'}• For any unlawful purpose or to solicit others to perform illegal acts
              {'\n'}• To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances
              {'\n'}• To infringe upon or violate our intellectual property rights or the intellectual property rights of others
              {'\n'}• To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate
              {'\n'}• To submit false or misleading information
              {'\n\n'}
              <Text style={styles.modalHeading}>5. Service Availability</Text>
              {'\n'}
              We strive to provide reliable service, but cannot guarantee 100% uptime. We reserve the right to:
              {'\n'}• Modify or discontinue the service at any time
              {'\n'}• Refuse service to anyone for any reason
              {'\n'}• Perform scheduled maintenance that may temporarily affect service
              {'\n\n'}
              <Text style={styles.modalHeading}>6. Limitation of Liability</Text>
              {'\n'}
              In no event shall our company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the service.
              {'\n\n'}
              <Text style={styles.modalHeading}>7. Governing Law</Text>
              {'\n'}
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which our company operates.
              {'\n\n'}
              <Text style={styles.modalHeading}>8. Changes to Terms</Text>
              {'\n'}
              We reserve the right to revise these terms of service at any time without notice. By using this service, you agree to be bound by the current version of these terms of service.
              {'\n\n'}
              <Text style={styles.modalHeading}>9. Contact Information</Text>
              {'\n'}
              If you have any questions about these Terms of Service, please contact us at legal@example.com.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Custom Alert Component for Web Compatibility
const CustomAlert = ({ visible, title, message, buttons, onClose }) => {
  if (!visible) return null;
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.alertOverlay}>
        <View style={styles.alertContainer}>
          <Text style={styles.alertTitle}>{title}</Text>
          {message && <Text style={styles.alertMessage}>{message}</Text>}
          <View style={styles.alertButtonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.alertButton,
                  button.style === 'destructive' && styles.alertButtonDestructive,
                  button.style === 'cancel' && styles.alertButtonCancel,
                ]}
                onPress={() => {
                  button.onPress && button.onPress();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.alertButtonText,
                    button.style === 'destructive' && styles.alertButtonTextDestructive,
                    button.style === 'cancel' && styles.alertButtonTextCancel,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const SettingsScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  
  // Modal states
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  
  // Custom alert state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  // Cross-platform alert function
  const showAlert = (title, message, buttons) => {
    if (Platform.OS === 'web') {
      setAlertConfig({
        visible: true,
        title,
        message,
        buttons,
      });
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const closeAlert = () => {
    setAlertConfig({
      visible: false,
      title: '',
      message: '',
      buttons: [],
    });
  };

  const handleLogout = () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            console.log('User logging out from settings');
            dispatch(logout());
          },
        },
      ]
    );
  };

  const getInitials = (name) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          {/* Main Content Container */}
          <View style={styles.mainContainer}>
            
            {/* Left Panel - User Profile */}
            <View style={styles.leftPanel}>
              <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    {user?.avatar?.url ? (
                      <Image
                        source={{ uri: user.avatar.url }}
                        style={styles.avatarImage}
                        onError={() => console.log('Avatar image failed to load')}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {getInitials(user?.name)}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>
                    {user?.name || user?.email?.split('@')[0] || 'User'}
                  </Text>
                  <Text style={styles.userEmail}>{user?.email}</Text>
                  
                  <View style={styles.roleBadge}>
                    <Ionicons name="star" size={12} color="#00E676" />
                    <Text style={styles.roleText}>{user?.role || 'User'}</Text>
                  </View>
                </View>

              </View>
            </View>

            {/* Right Panel - Settings Options */}
            <View style={styles.rightPanel}>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.settingsScroll}>
                
                {/* Account Section */}
                <View style={styles.settingsSection}>
                  <Text style={styles.sectionTitle}>Account</Text>
                  <View style={styles.settingsGrid}>
                    
                    <TouchableOpacity 
                      style={styles.settingCard}
                      onPress={() => navigation.navigate('Profile')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.settingIcon}>
                        <Ionicons name="person-outline" size={24} color="#00E676" />
                      </View>
                      <Text style={styles.settingTitle}>Profile</Text>
                      <Text style={styles.settingSubtitle}>Manage your profile information</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.settingCard}
                      onPress={() => setAboutModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.settingIcon}>
                        <Ionicons name="information-circle-outline" size={24} color="#00E676" />
                      </View>
                      <Text style={styles.settingTitle}>About</Text>
                      <Text style={styles.settingSubtitle}>Learn more about our company</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.settingCard}
                      onPress={() => setPrivacyModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.settingIcon}>
                        <Ionicons name="document-text-outline" size={24} color="#00E676" />
                      </View>
                      <Text style={styles.settingTitle}>Privacy Policy</Text>
                      <Text style={styles.settingSubtitle}>View our privacy policy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.settingCard}
                      onPress={() => setTermsModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.settingIcon}>
                        <Ionicons name="clipboard-outline" size={24} color="#00E676" />
                      </View>
                      <Text style={styles.settingTitle}>Terms of Service</Text>
                      <Text style={styles.settingSubtitle}>Read our terms of service</Text>
                    </TouchableOpacity>

                  </View>
                </View>

                {/* App Information */}
                <View style={styles.settingsSection}>
                  <Text style={styles.sectionTitle}>App Information</Text>
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Version</Text>
                      <Text style={styles.infoValue}>1.0.0</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Build</Text>
                      <Text style={styles.infoValue}>2024.01.15</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Platform</Text>
                      <Text style={styles.infoValue}>{Platform.OS}</Text>
                    </View>
                  </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>

          </View>

          {/* Privacy Policy Modal */}
          <PrivacyPolicyModal
            visible={privacyModalVisible}
            onClose={() => setPrivacyModalVisible(false)}
          />

          {/* About Modal */}
          <AboutModal
            visible={aboutModalVisible}
            onClose={() => setAboutModalVisible(false)}
          />

          {/* Terms of Service Modal */}
          <TermsModal
            visible={termsModalVisible}
            onClose={() => setTermsModalVisible(false)}
          />

          {/* Custom Alert for Web */}
          <CustomAlert
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={alertConfig.buttons}
            onClose={closeAlert}
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  leftPanel: {
    width: '35%',
    marginRight: 20,
  },
  profileSection: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,230,118,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00E676',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  userDetails: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,230,118,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00E676',
    marginLeft: 4,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,230,118,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  editProfileText: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  rightPanel: {
    flex: 1,
  },
  settingsScroll: {
    flex: 1,
  },
  settingsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  settingCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    width: '48%',
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,230,118,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: '#E91E63',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
    borderColor: 'rgba(233, 30, 99, 0.3)',
    borderWidth: 1,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal Styles (shared across all modals)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    borderColor: 'rgba(0, 230, 118, 0.3)',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 24,
  },
  modalText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00E676',
  },
  modalSubheading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Custom Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    minWidth: 280,
    maxWidth: 400,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    borderWidth: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
  alertButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#00E676',
    alignItems: 'center',
  },
  alertButtonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  alertButtonDestructive: {
    backgroundColor: '#E91E63',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  alertButtonTextCancel: {
    color: '#FFFFFF',
  },
  alertButtonTextDestructive: {
    color: '#FFFFFF',
  },
});

export default SettingsScreen;