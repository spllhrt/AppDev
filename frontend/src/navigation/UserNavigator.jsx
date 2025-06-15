import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { 
  Platform, 
  Dimensions, 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/user/HomeScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  
  // Filter out hidden tabs
  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    return options.tabBarButton !== null;
  });
  
  return (
    <View style={[
      styles.tabBarContainer,
      {
        paddingBottom: Math.max(insets.bottom, 8),
        height: 55 + Math.max(insets.bottom, 8), // Reduced height since no labels
      }
    ]}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['rgba(10, 10, 10, 0.98)', 'rgba(26, 26, 46, 0.98)', 'rgba(22, 33, 62, 0.98)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Glass effect overlay */}
      <View style={styles.glassOverlay} />
      
      {/* Tab buttons container */}
      <View style={styles.tabButtonsContainer}>
        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const routeIndex = state.routes.indexOf(route);
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Icon mapping
          let iconName;
          if (route.name === 'Home') {
            iconName = isFocused ? 'home' : 'home-outline';
          } else if (route.name === 'Settings') {
            iconName = isFocused ? 'settings' : 'settings-outline';
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              {/* Active tab background */}
              {isFocused && (
                <View style={styles.activeTabBackground}>
                  <LinearGradient
                    colors={['rgba(0, 230, 118, 0.15)', 'rgba(0, 188, 212, 0.15)']}
                    style={styles.activeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </View>
              )}
              
              <View style={[
                styles.tabButtonInner,
                isFocused && styles.activeTabButton
              ]}>
                {/* Active indicator */}
                {isFocused && <View style={styles.activeIndicator} />}
                
                {/* Icon */}
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={iconName}
                    size={26} // Slightly larger since no label
                    color={isFocused ? '#00E676' : 'rgba(255, 255, 255, 0.6)'}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Main Tab Navigator with Profile removed
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS === 'android',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

// Enhanced User Stack Navigator
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
        name="MainTabs" 
        component={MainTabNavigator}
        options={{
          gestureEnabled: false, // Disable swipe for main tabs
        }}
      />
      
      {/* Profile screen as a stack screen - accessible programmatically but not in tabs */}
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
      
      {/* Add other screens that should be accessible from the main tabs */}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 230, 118, 0.2)',
  },
  tabButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    height: 55, // Reduced height
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  activeTabBackground: {
    position: 'absolute',
    top: 6,
    left: 4,
    right: 4,
    bottom: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  activeGradient: {
    flex: 1,
  },
  tabButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    minHeight: 45, // Reduced height
    width: '100%',
    maxWidth: 60, // Reduced width since no label
    position: 'relative',
  },
  activeTabButton: {
    // Additional styling for active state if needed
  },
  activeIndicator: {
    position: 'absolute',
    top: -4,
    width: 24,
    height: 3,
    backgroundColor: '#00E676',
    borderRadius: 2,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 32, // Slightly larger for the icon
  },
});

export default UserNavigator;