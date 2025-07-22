import React, { useState, useRef, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { 
  Platform, 
  Dimensions, 
  StyleSheet, 
  View, 
  Text, 
  Pressable,
  Animated,
  ScrollView,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/user/HomeScreen';
import WeatherScreen from '../screens/user/WeatherScreen';
import AqiScreen from '../screens/user/AqiScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MapScreen from '../screens/user/MapScreen';
import HealthAssessmentScreen from '../screens/user/HealthAssessmentScreen';
import HistoryScreen from '../screens/user/HistoryScreen';
import ChatbotScreen from '../screens/user/ChatbotScreen';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Custom Header Component with Toggle Button
const CustomHeader = ({ title, showToggle = true, navigation: propNavigation }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const handleToggleDrawer = () => {
    try {
      // Check if we're in a drawer navigator context
      const state = navigation.getState();
      const parentState = navigation.getParent()?.getState();
      
      // If we're in a drawer navigator, toggle it
      if (state?.type === 'drawer' || parentState?.type === 'drawer') {
        navigation.dispatch(DrawerActions.toggleDrawer());
      } else {
        // Try to find the drawer navigator in the navigation tree
        let currentNav = navigation;
        while (currentNav) {
          if (currentNav.getState?.()?.type === 'drawer') {
            currentNav.dispatch(DrawerActions.toggleDrawer());
            break;
          }
          currentNav = currentNav.getParent?.();
        }
      }
    } catch (error) {
      console.log('Drawer toggle error:', error);
      // Fallback: try to navigate to the drawer
      try {
        navigation.navigate('MainDrawer');
      } catch (navError) {
        console.log('Navigation fallback failed:', navError);
      }
    }
  };
  
  return (
    <View style={[
      styles.headerContainer,
      { paddingTop: Math.max(insets.top, 0) }
    ]}>
      <LinearGradient
        colors={['rgba(10, 10, 10, 0.98)', 'rgba(26, 26, 46, 0.98)', 'rgba(22, 33, 62, 0.98)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.glassOverlay} />
      
      <View style={styles.headerContent}>
        {showToggle && (
          <Pressable
            style={({ pressed }) => [
              styles.toggleButton,
              pressed && styles.toggleButtonPressed
            ]}
            onPress={handleToggleDrawer}
          >
            <View style={styles.toggleButtonInner}>
              <Ionicons name="menu" size={24} color="#00E676" />
            </View>
          </Pressable>
        )}
        
        <Text style={styles.headerTitle}>{title}</Text>
        
        <View style={styles.headerRight} />
      </View>
    </View>
  );
};

// Custom Drawer Content Component
const CustomDrawerContent = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeRoute, setActiveRoute] = useState(state.routeNames[state.index]);
  
  // Define visible drawer items with their icons and labels
  const visibleDrawerItems = [
    { name: 'Home', icon: 'home', label: 'Home' },
    { name: 'Map', icon: 'map', label: 'Map' },
    { name: 'Weather', icon: 'partly-sunny', label: 'Weather' },
    { name: 'Aqi', icon: 'cloud', label: 'Air Quality' },
    { name: 'HealthAssessment', icon: 'heart', label: 'Health Assessment' },
    { name: 'Chatbot', icon: 'chatbubbles', label: 'AI Assistant' },
    { name: 'Settings', icon: 'settings', label: 'Settings' },
  ];
  
  useEffect(() => {
    setActiveRoute(state.routeNames[state.index]);
  }, [state.index, state.routeNames]);
  
  return (
    <View style={[
      styles.drawerContainer,
      { paddingTop: Math.max(insets.top, 0) }
    ]}>
      <LinearGradient
        colors={['rgba(10, 10, 10, 0.98)', 'rgba(26, 26, 46, 0.98)', 'rgba(22, 33, 62, 0.98)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.glassOverlay} />
      
      {/* Drawer Header */}
      <View style={styles.drawerHeader}>
        <Pressable
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed
          ]}
          onPress={() => navigation.closeDrawer()}
        >
          <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.6)" />
        </Pressable>
      </View>
      
      {/* Drawer Items */}
      <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
        {visibleDrawerItems.map((item, index) => {
          const isActive = activeRoute === item.name;
          
          return (
            <Pressable
              key={item.name}
              style={({ pressed }) => [
                styles.drawerItem,
                isActive && styles.activeDrawerItem,
                pressed && styles.drawerItemPressed
              ]}
              onPress={() => {
                navigation.navigate(item.name);
                navigation.closeDrawer();
              }}
            >
              {/* Active background */}
              {isActive && (
                <View style={styles.activeDrawerBackground}>
                  <LinearGradient
                    colors={['rgba(0, 230, 118, 0.15)', 'rgba(0, 188, 212, 0.15)']}
                    style={styles.activeDrawerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </View>
              )}
              
              {/* Active indicator */}
              {isActive && <View style={styles.activeDrawerIndicator} />}
              
              <View style={styles.drawerItemContent}>
                <View style={[
                  styles.drawerIconContainer,
                  isActive && styles.activeDrawerIconContainer
                ]}>
                  <Ionicons
                    name={isActive ? item.icon : `${item.icon}-outline`}
                    size={24}
                    color={isActive ? '#00E676' : 'rgba(255, 255, 255, 0.6)'}
                  />
                </View>
                
                <Text style={[
                  styles.drawerItemLabel,
                  isActive && styles.activeDrawerItemLabel
                ]}>
                  {item.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      
    </View>
  );
};

// Main Drawer Navigator
const MainDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        header: ({ navigation, route }) => (
          <CustomHeader 
            navigation={navigation} 
            title={route.name === 'Home' ? 'AirNet AI' : route.name} 
          />
        ),
        drawerType: 'slide',
        drawerStyle: {
          width: 300, // Fixed width of 300 pixels
          backgroundColor: 'transparent',
        },
        overlayColor: 'rgba(0, 0, 0, 0.6)',
        sceneContainerStyle: {
          backgroundColor: '#0A0A0A',
        },
        swipeEnabled: true,
        swipeEdgeWidth: 50,
      })}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Drawer.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          headerShown: false,
          title: 'Map',
        }}
      />
      <Drawer.Screen 
        name="Weather" 
        component={WeatherScreen}
        options={{
          headerShown: false,
          title: 'Weather',
        }}
      />
      <Drawer.Screen 
        name="Aqi" 
        component={AqiScreen}
        options={{
          headerShown: false,
          title: 'Air Quality',
        }}
      />
      <Drawer.Screen 
        name="HealthAssessment" 
        component={HealthAssessmentScreen}
        options={{
          headerShown: false,
          title: 'Health Assessment',
        }}
      />
      <Drawer.Screen 
        name="Chatbot" 
        component={ChatbotScreen}
        options={{
          headerShown: false,
          title: 'AI Assistant',
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      {/* Hidden screens - not shown in drawer but available for navigation */}
      <Drawer.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          headerShown: false,
          title: 'History',
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          headerShown: false,
          title: 'Profile',
        }}
      />
    </Drawer.Navigator>
  );
};

// Enhanced User Stack Navigator with Custom Headers
const UserNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0A0A0A' },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
              opacity: current.progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.5, 1],
              }),
            },
          };
        },
      }}
    >
      <Stack.Screen 
        name="MainDrawer" 
        component={MainDrawerNavigator}
        options={{
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  // Header Styles
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop:10,
  },
  toggleButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  toggleButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    padding:20,
    textAlign: 'left',
    flex: 1,
  },
  headerRight: {
    width: 44,
    height: 44,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 118, 0.2)',
  },
  
  // Drawer Styles
  drawerContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawerHeaderContent: {
    flex: 1,
  },
  appIconContainer: {
    marginBottom: 12,
  },
  appIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  
  // Drawer Content
  drawerContent: {
    flex: 1,
    paddingTop: 20,
  },
  drawerItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  activeDrawerItem: {
    // Removed transform scale to avoid layout issues
  },
  drawerItemPressed: {
    opacity: 0.8,
  },
  activeDrawerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  activeDrawerGradient: {
    flex: 1,
  },
  activeDrawerIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -16,
    width: 4,
    height: 32,
    backgroundColor: '#00E676',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  drawerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  drawerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeDrawerIconContainer: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  drawerItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
  },
  activeDrawerItemLabel: {
    color: 'white',
    fontWeight: '600',
  },
});

export default UserNavigator;