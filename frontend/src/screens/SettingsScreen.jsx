import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
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
    <Modal transparent={true} visible={visible} animationType="slide" onRequestClose={onClose}>
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
    <Modal transparent={true} visible={visible} animationType="slide" onRequestClose={onClose}>
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
    <Modal transparent={true} visible={visible} animationType="slide" onRequestClose={onClose}>
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
    <Modal transparent={true} visible={visible} animationType="fade" onRequestClose={onClose}>
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
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  
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
      setAlertConfig({ visible: true, title, message, buttons });
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const closeAlert = () => {
    setAlertConfig({ visible: false, title: '', message: '', buttons: [] });
  };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { console.log('User logging out from settings'); dispatch(logout()); } },
    ]);
  };

  const getInitials = (name) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const settingsGroups = [
    {
      title: 'About',
      items: [
        { id: 8, title: 'Privacy Policy', icon: 'document-text-outline', type: 'button', onPress: () => setPrivacyModalVisible(true), color: '#00E676' },
        { id: 9, title: 'Terms of Service', icon: 'clipboard-outline', type: 'button', onPress: () => setTermsModalVisible(true), color: '#00E676' },
        { id: 10, title: 'About Us', icon: 'information-circle-outline', type: 'button', onPress: () => setAboutModalVisible(true), color: '#00E676' },
        { id: 11, title: 'App Version', icon: 'information-circle-outline', type: 'info', rightText: '1.0.0', color: 'rgba(255,255,255,0.6)' },
      ],
    },
  ];

  const renderSettingItem = (item) => {
    switch (item.type) {
      case 'switch':
        return (
          <View key={item.id} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(0,230,118,0.2)' }]}>
                <Ionicons name={item.icon} size={18} color="#00E676" />
              </View>
              <Text style={styles.settingTitle}>{item.title}</Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#00E676' }}
              thumbColor="#FFFFFF"
            />
          </View>
        );
      case 'button':
        return (
          <TouchableOpacity key={item.id} style={styles.settingItem} onPress={item.onPress} activeOpacity={0.8}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(0,230,118,0.2)' }]}>
                <Ionicons name={item.icon} size={18} color="#00E676" />
              </View>
              <Text style={styles.settingTitle}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        );
      case 'info':
        return (
          <View key={item.id} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                <Ionicons name={item.icon} size={18} color="rgba(255,255,255,0.6)" />
              </View>
              <Text style={styles.settingTitle}>{item.title}</Text>
            </View>
            <Text style={styles.settingRightText}>{item.rightText}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
              <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                  {user?.avatar?.url ? (
                    <Image source={{ uri: user.avatar.url }} style={styles.avatarImage} onError={() => console.log('Avatar image failed to load')} resizeMode="cover" />
                  ) : (
                    <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
                  )}
                </View>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name || user?.email?.split('@')[0] || 'User'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <View style={styles.roleBadge}>
                  <Ionicons name="star" size={10} color="#00E676" />
                  <Text style={styles.roleText}>{user?.role || 'User'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            {settingsGroups.map((group, groupIndex) => (
              <View key={groupIndex} style={styles.section}>
                <Text style={styles.sectionTitle}>{group.title}</Text>
                <View style={styles.formCard}>
                  {group.items.map((item, itemIndex) => (
                    <View key={item.id}>
                      {renderSettingItem(item)}
                      {itemIndex < group.items.length - 1 && <View style={styles.separator} />}
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>

          <PrivacyPolicyModal visible={privacyModalVisible} onClose={() => setPrivacyModalVisible(false)} />
          <AboutModal visible={aboutModalVisible} onClose={() => setAboutModalVisible(false)} />
          <TermsModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
          <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={closeAlert} />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20, paddingBottom: 20 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', flex: 1 },
  placeholder: { width: 36 },
  content: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 100 },
  profileCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 25, borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  avatarSection: { marginRight: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,230,118,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#00E676', overflow: 'hidden' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  userEmail: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 6 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,230,118,0.2)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  roleText: { fontSize: 10, fontWeight: '600', color: '#00E676', marginLeft: 3 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  formCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 15, borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, minHeight: 52 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIconContainer: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  settingTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  settingRightText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' },
  separator: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginLeft: 46 },
  logoutButton: { backgroundColor: '#E91E63', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 20, borderColor: 'rgba(233, 30, 99, 0.3)', borderWidth: 1 },
  logoutButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#1A1A2E', borderRadius: 20, width: '90%', maxWidth: 600, maxHeight: '80%', borderColor: 'rgba(0, 230, 118, 0.3)', borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { padding: 4 },
  modalText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 20 ,padding: 34 },
  modalHeading: { fontSize: 16, fontWeight: '600', color: '#00E676' },
  modalSubheading: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  // Alert Styles
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertContainer: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, minWidth: 280, maxWidth: 400, borderColor: 'rgba(0, 230, 118, 0.3)', borderWidth: 1 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center' },
  alertMessage: { fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 16, textAlign: 'center', lineHeight: 18 },
  alertButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  alertButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#00E676', alignItems: 'center' },
  alertButtonCancel: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  alertButtonDestructive: { backgroundColor: '#E91E63' },
  alertButtonText: { fontSize: 14, fontWeight: '600', color: '#0A0A0A' },
  alertButtonTextCancel: { color: '#FFFFFF' },
  alertButtonTextDestructive: { color: '#FFFFFF' },
});

export default SettingsScreen;