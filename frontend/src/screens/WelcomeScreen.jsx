import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Dimensions, 
  StatusBar, 
  Animated,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const particleAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Particle floating animation
    const animateParticles = () => {
      const animations = particleAnims.map((anim, index) => 
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000 + (index * 400),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 2000 + (index * 400),
              useNativeDriver: true,
            }),
          ])
        )
      );
      
      Animated.parallel(animations).start();
    };

    animateParticles();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient 
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Main Content */}
            <Animated.View 
              style={[
                styles.mainContent,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              {/* Air Quality Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.cloudBase}>
                  <View style={styles.cloudPart1} />
                  <View style={styles.cloudPart2} />
                  <View style={styles.cloudPart3} />
                </View>
                <View style={styles.windLines}>
                  <View style={[styles.windLine, styles.windLine1]} />
                  <View style={[styles.windLine, styles.windLine2]} />
                  <View style={[styles.windLine, styles.windLine3]} />
                </View>
                <View style={styles.particles}>
                  {particleAnims.map((anim, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.particle,
                        styles[`particle${index + 1}`],
                        {
                          opacity: anim,
                          transform: [
                            {
                              translateY: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -8],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* Title Section */}
              <View style={styles.titleSection}>
                <Text style={styles.appName}>AirNet AI</Text>
                <Text style={styles.subtitle}>& Monitoring</Text>
              </View>

              {/* Description */}
              <Text style={styles.description}>
                Real-time air quality predictions with personalized health insights powered by advanced AI
              </Text>

              {/* Stats Cards */}
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>98%</Text>
                  <Text style={styles.statLabel}>Accuracy</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>24/7</Text>
                  <Text style={styles.statLabel}>Monitoring</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>50+</Text>
                  <Text style={styles.statLabel}>Cities</Text>
                </View>
              </View>

              {/* Features */}
              <View style={styles.featuresSection}>
                <Text style={styles.featuresTitle}>Key Features</Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="analytics-outline" size={24} color="#4CAF50" />
                    <Text style={styles.featureText}>AI-powered predictions</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="pulse-outline" size={24} color="#4CAF50" />
                    <Text style={styles.featureText}>Real-time monitoring</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="fitness-outline" size={24} color="#4CAF50" />
                    <Text style={styles.featureText}>Health insights</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Buttons Section */}
            <Animated.View 
              style={[
                styles.buttonsSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              {/* Get Started Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign In Link */}
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.signInContainer}
                activeOpacity={0.7}
              >
                <Text style={styles.signInText}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 40,
    paddingBottom: 20,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.75,
  },
  
  // Icon Styles
  iconContainer: {
    position: 'relative',
    width: 160,
    height: 120,
    marginBottom: 32,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudBase: {
    position: 'relative',
    width: 100,
    height: 60,
    alignSelf: 'center',
  },
  cloudPart1: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e8f4fd',
    left: 0,
    top: 0,
  },
  cloudPart2: {
    position: 'absolute',
    width: 70,
    height: 50,
    borderRadius: 35,
    backgroundColor: '#f0f8ff',
    right: 0,
    top: 5,
  },
  cloudPart3: {
    position: 'absolute',
    width: 50,
    height: 35,
    borderRadius: 25,
    backgroundColor: '#f8fcff',
    left: 25,
    top: 25,
  },
  windLines: {
    position: 'absolute',
    right: 10,
    top: 20,
  },
  windLine: {
    height: 3,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    opacity: 0.8,
    marginVertical: 4,
  },
  windLine1: {
    width: 25,
  },
  windLine2: {
    width: 20,
    opacity: 0.6,
  },
  windLine3: {
    width: 15,
    opacity: 0.4,
  },
  particles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#81C784',
  },
  particle1: {
    top: 15,
    right: 15,
  },
  particle2: {
    top: 40,
    right: 5,
  },
  particle3: {
    top: 65,
    right: 10,
  },
  particle4: {
    top: 25,
    right: 0,
  },
  particle5: {
    top: 55,
    right: -5,
  },

  // Title Section
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: Math.min(width * 0.09, 36),
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: Math.min(width * 0.09, 36),
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: -6,
    letterSpacing: 1,
  },
  description: {
    fontSize: Math.min(width * 0.042, 16),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 16,
    maxWidth: width * 0.85,
  },

  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  statCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
    marginHorizontal: 4,
    minHeight: 80,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: Math.min(width * 0.055, 20),
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Math.min(width * 0.032, 12),
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Features Section
  featuresSection: {
    width: '100%',
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: Math.min(width * 0.052, 20),
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  featuresList: {
    alignItems: 'stretch',
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
    minHeight: 56,
  },
  featureText: {
    fontSize: Math.min(width * 0.042, 16),
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 16,
    fontWeight: '500',
    flex: 1,
  },

  // Buttons Section
  buttonsSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: Math.min(width * 0.047, 18),
    fontWeight: '600',
    marginRight: 8,
  },
  signInContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  signInText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Math.min(width * 0.042, 16),
    textAlign: 'center',
    fontWeight: '500',
    paddingBottom:100
  },
});

export default WelcomeScreen;