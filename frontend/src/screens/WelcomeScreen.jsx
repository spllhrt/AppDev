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

            </Animated.View>

            {/* Spacer for visual separation */}
            <View style={styles.spacer} />

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
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 30 : 50,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  mainContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Spacer between content and buttons
  spacer: {
    height: 40,
  },
  
  // Icon Styles (made more compact)
  iconContainer: {
    position: 'relative',
    width: 120,
    height: 90,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudBase: {
    position: 'relative',
    width: 80,
    height: 48,
    alignSelf: 'center',
  },
  cloudPart1: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f4fd',
    left: 0,
    top: 0,
  },
  cloudPart2: {
    position: 'absolute',
    width: 56,
    height: 40,
    borderRadius: 28,
    backgroundColor: '#f0f8ff',
    right: 0,
    top: 4,
  },
  cloudPart3: {
    position: 'absolute',
    width: 40,
    height: 28,
    borderRadius: 20,
    backgroundColor: '#f8fcff',
    left: 20,
    top: 20,
  },
  windLines: {
    position: 'absolute',
    right: 8,
    top: 16,
  },
  windLine: {
    height: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 1,
    opacity: 0.8,
    marginVertical: 3,
  },
  windLine1: {
    width: 20,
  },
  windLine2: {
    width: 16,
    opacity: 0.6,
  },
  windLine3: {
    width: 12,
    opacity: 0.4,
  },
  particles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#81C784',
  },
  particle1: {
    top: 12,
    right: 12,
  },
  particle2: {
    top: 32,
    right: 4,
  },
  particle3: {
    top: 52,
    right: 8,
  },
  particle4: {
    top: 20,
    right: 0,
  },
  particle5: {
    top: 44,
    right: -4,
  },

  // Title Section (more compact)
  titleSection: {
    alignItems: 'center',
    marginBottom: 26,
  },
  appName: {
    fontSize: Math.min(width * 0.08, 32),
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: Math.min(width * 0.08, 32),
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: -4,
    letterSpacing: 1,
  },
  description: {
    fontSize: Math.min(width * 0.04, 15),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    maxWidth: width * 0.85,
    marginBottom: 26,
  },

  // Buttons Section
  buttonsSection: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    width: '85%',
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
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: Math.min(width * 0.045, 17),
    fontWeight: '600',
    marginRight: 8,
  },
  signInContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 40,
    justifyContent: 'center',
  },
  signInText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Math.min(width * 0.04, 15),
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default WelcomeScreen;