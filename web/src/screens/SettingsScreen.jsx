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
  Image, // Added Image import
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice'; // Adjust path as needed

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
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  
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

  const settingsGroups = [
    {
      title: 'Preferences',
      items: [
        {
          id: 1,
          title: 'Push Notifications',
          icon: 'notifications-outline',
          type: 'switch',
          value: notifications,
          onValueChange: setNotifications,
          color: '#00E676',
        },
        {
          id: 2,
          title: 'Dark Mode',
          icon: 'moon-outline',
          type: 'switch',
          value: darkMode,
          onValueChange: setDarkMode,
          color: '#00E676',
        },
        {
          id: 3,
          title: 'Biometric Login',
          icon: 'finger-print-outline',
          type: 'switch',
          value: biometric,
          onValueChange: setBiometric,
          color: '#00E676',
        },
        {
          id: 4,
          title: 'Auto Sync',
          icon: 'sync-outline',
          type: 'switch',
          value: autoSync,
          onValueChange: setAutoSync,
          color: '#00E676',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 5,
          title: 'Help Center',
          icon: 'help-circle-outline',
          type: 'button',
          onPress: () => showAlert('Help Center', 'Help center coming soon!', [{ text: 'OK' }]),
          color: '#00E676',
        },
        {
          id: 6,
          title: 'Contact Support',
          icon: 'mail-outline',
          type: 'button',
          onPress: () => showAlert('Contact Support', 'Support contact coming soon!', [{ text: 'OK' }]),
          color: '#00E676',
        },
        {
          id: 7,
          title: 'Report a Bug',
          icon: 'bug-outline',
          type: 'button',
          onPress: () => showAlert('Report Bug', 'Bug reporting coming soon!', [{ text: 'OK' }]),
          color: '#00E676',
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          id: 8,
          title: 'Privacy Policy',
          icon: 'document-text-outline',
          type: 'button',
          onPress: () => showAlert('Privacy Policy', 'Privacy policy coming soon!', [{ text: 'OK' }]),
          color: '#00E676',
        },
        {
          id: 9,
          title: 'Terms of Service',
          icon: 'clipboard-outline',
          type: 'button',
          onPress: () => showAlert('Terms of Service', 'Terms of service coming soon!', [{ text: 'OK' }]),
          color: '#00E676',
        },
        {
          id: 10,
          title: 'App Version',
          icon: 'information-circle-outline',
          type: 'info',
          rightText: '1.0.0',
          color: 'rgba(255,255,255,0.6)',
        },
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
          <TouchableOpacity
            key={item.id}
            style={styles.settingItem}
            onPress={item.onPress}
            activeOpacity={0.8}
          >
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
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* User Info Card with Avatar Display */}
            <TouchableOpacity 
              style={styles.profileCard}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <View style={styles.avatarSection}>
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
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user?.name || user?.email?.split('@')[0] || 'User'}
                </Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                
                <View style={styles.roleBadge}>
                  <Ionicons name="star" size={10} color="#00E676" />
                  <Text style={styles.roleText}>{user?.role || 'User'}</Text>
                </View>
              </View>
              
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            {/* Settings Groups */}
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

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>

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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 20,
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  avatarSection: {
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,230,118,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00E676',
    overflow: 'hidden', // Added to ensure image fits properly
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,230,118,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00E676',
    marginLeft: 3,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 15,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    minHeight: 52,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingRightText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 46,
  },
  logoutButton: {
    backgroundColor: '#E91E63',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    borderColor: 'rgba(233, 30, 99, 0.3)',
    borderWidth: 1,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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