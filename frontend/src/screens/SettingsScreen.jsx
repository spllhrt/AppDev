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
  const [darkMode, setDarkMode] = useState(false);
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
          color: '#667eea',
        },
        {
          id: 2,
          title: 'Dark Mode',
          icon: 'moon-outline',
          type: 'switch',
          value: darkMode,
          onValueChange: setDarkMode,
          color: '#764ba2',
        },
        {
          id: 3,
          title: 'Biometric Login',
          icon: 'finger-print-outline',
          type: 'switch',
          value: biometric,
          onValueChange: setBiometric,
          color: '#51cf66',
        },
        {
          id: 4,
          title: 'Auto Sync',
          icon: 'sync-outline',
          type: 'switch',
          value: autoSync,
          onValueChange: setAutoSync,
          color: '#ff8cc8',
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
          color: '#667eea',
        },
        {
          id: 6,
          title: 'Contact Support',
          icon: 'mail-outline',
          type: 'button',
          onPress: () => showAlert('Contact Support', 'Support contact coming soon!', [{ text: 'OK' }]),
          color: '#764ba2',
        },
        {
          id: 7,
          title: 'Report a Bug',
          icon: 'bug-outline',
          type: 'button',
          onPress: () => showAlert('Report Bug', 'Bug reporting coming soon!', [{ text: 'OK' }]),
          color: '#ff6b6b',
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
          color: '#51cf66',
        },
        {
          id: 9,
          title: 'Terms of Service',
          icon: 'clipboard-outline',
          type: 'button',
          onPress: () => showAlert('Terms of Service', 'Terms of service coming soon!', [{ text: 'OK' }]),
          color: '#ff8cc8',
        },
        {
          id: 10,
          title: 'App Version',
          icon: 'information-circle-outline',
          type: 'info',
          rightText: '1.0.0',
          color: '#999',
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
              <View style={[styles.settingIconContainer, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={20} color="#fff" />
              </View>
              <Text style={styles.settingTitle}>{item.title}</Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ false: '#e9ecef', true: item.color }}
              thumbColor="#fff"
            />
          </View>
        );
      
      case 'button':
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.settingItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={20} color="#fff" />
              </View>
              <Text style={styles.settingTitle}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        );
      
      case 'info':
        return (
          <View key={item.id} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={20} color="#fff" />
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
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* User Info Card */}
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={32} color="#667eea" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userNameText}>
                {user?.name || user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.userEmailText}>{user?.email}</Text>
            </View>
          </View>

          {/* Settings Groups */}
          {settingsGroups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.settingsGroup}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.groupCard}>
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
            <Ionicons name="log-out-outline" size={20} color="#fff" />
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmailText: {
    fontSize: 14,
    color: '#666',
  },
  settingsGroup: {
    marginBottom: 30,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingRightText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#f8f9fa',
    marginLeft: 56,
  },
  logoutButton: {
    backgroundColor: '#ff6b6b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#ff6b6b',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Custom Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  alertButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  alertButtonCancel: {
    backgroundColor: '#e9ecef',
  },
  alertButtonDestructive: {
    backgroundColor: '#ff6b6b',
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  alertButtonTextCancel: {
    color: '#666',
  },
  alertButtonTextDestructive: {
    color: '#fff',
  },
});

export default SettingsScreen;