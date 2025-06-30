// AdminNavigator.js - Enhanced with Drawer Navigation, Analytics, Cross-Platform Alerts, and History Screen
import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Platform, 
  Modal 
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/authSlice'; // Adjust path as needed
import AdminDashboardScreen from '../screens/admin/DashboardScreen';
import AdminProfileScreen from '../screens/admin/ProfileScreen';
import AdminAnalyticsScreen from '../screens/admin/AnalyticsScreen';
import AdminUsersScreen from '../screens/admin/UsersScreen';
import AdminHistoryScreen from '../screens/admin/HistoryScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

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

// Custom Drawer Content Component
const CustomDrawerContent = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
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
      'Are you sure you want to logout from the admin panel?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            console.log('Admin logging out');
            dispatch(logout());
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      name: 'MainTabs',
      title: 'Dashboard',
      icon: 'home',
      iconOutline: 'home-outline'
    },
    {
      name: 'Analytics',
      title: 'Analytics',
      icon: 'analytics',
      iconOutline: 'analytics-outline'
    },
    {
      name: 'Users',
      title: 'User Management',
      icon: 'people',
      iconOutline: 'people-outline'
    },
    {
      name: 'History',
      title: 'Activity History',
      icon: 'time',
      iconOutline: 'time-outline'
    }
  ];

  return (
    <View style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <Ionicons name="shield-checkmark" size={40} color="#3b82f6" />
        <Text style={styles.drawerHeaderTitle}>Admin Panel</Text>
        <Text style={styles.drawerHeaderSubtitle}>Management Console</Text>
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userNameText}>
              {user.name || user.email?.split('@')[0] || 'Admin'}
            </Text>
            <Text style={styles.userRoleText}>Administrator</Text>
          </View>
        )}
      </View>
      
      <View style={styles.drawerContent}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.drawerItem}
            onPress={() => navigation.navigate(item.name)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={item.iconOutline} 
              size={24} 
              color="#374151" 
              style={styles.drawerItemIcon}
            />
            <Text style={styles.drawerItemText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.drawerFooter}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Alert for Web */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={closeAlert}
      />
    </View>
  );
};

// Tab Navigator Component
const AdminTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'AdminDashboard') {
            iconName = focused ? 'dashboard' : 'dashboard-outline';
          } else if (route.name === 'AdminProfile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
        },
      })}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

// Main Admin Navigator with Drawer
const AdminNavigator = () => {
  return (
    <Drawer.Navigator
      initialRouteName="MainTabs"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1f2937',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: '#f9fafb',
          width: 280,
        },
        drawerActiveTintColor: '#3b82f6',
        drawerInactiveTintColor: '#6b7280',
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={AdminTabNavigator}
        options={{
          title: 'Admin Dashboard',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="Analytics"
        component={AdminAnalyticsScreen}
        options={{
          title: 'Analytics',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="Users"
        component={AdminUsersScreen}
        options={{
          title: 'User Management',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="History"
        component={AdminHistoryScreen}
        options={{
          title: 'Activity History',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  drawerHeader: {
    backgroundColor: '#1f2937',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  drawerHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  drawerHeaderSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
  },
  userInfo: {
    marginTop: 15,
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  userNameText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userRoleText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  drawerContent: {
    flex: 1,
    paddingTop: 20,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  drawerItemIcon: {
    marginRight: 15,
    width: 24,
  },
  drawerItemText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
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
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  alertButtonCancel: {
    backgroundColor: '#e5e7eb',
  },
  alertButtonDestructive: {
    backgroundColor: '#ef4444',
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  alertButtonTextCancel: {
    color: '#374151',
  },
  alertButtonTextDestructive: {
    color: '#fff',
  },
});

export default AdminNavigator;