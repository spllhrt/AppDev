import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  FlatList, 
  Dimensions, 
  Platform, 
  StatusBar, 
  Animated,
  AccessibilityInfo 
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
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
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
              duration: 2000 + (index * 300),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 2000 + (index * 300),
              useNativeDriver: true,
            }),
          ])
        )
      );
      
      Animated.parallel(animations).start();
    };

    animateParticles();
  }, []);

  const handleNavigation = (screen) => {
    navigation.navigate(screen);
  };

  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.logo}>
        <Text style={styles.logoText}>AirNet AI</Text>
      </View>
      <View style={styles.nav}>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => handleNavigation('Login')}
          accessibilityRole="button"
          accessibilityLabel="Sign In"
          accessibilityHint="Navigate to login screen"
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderHero = () => (
    <Animated.View 
      style={[
        styles.hero,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.heroContent}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>
            Smart Air Quality{'\n'}
            <Text style={styles.heroTitleAccent}>Monitoring</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Real-time air quality predictions with personalized health insights powered by advanced AI technology
          </Text>
          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handleNavigation('Register')}
              accessibilityRole="button"
              accessibilityLabel="Get Started Free"
              accessibilityHint="Sign up for free account"
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>Get Started Free</Text>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" style={styles.buttonIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.heroVisual}>
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
                            outputRange: [0, -10],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>
          </View>
          
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
        </View>
      </View>
    </Animated.View>
  );

  const renderFeatures = () => (
    <View style={styles.features}>
      <Text style={styles.sectionTitle}>Why Choose AirNet AI?</Text>
      <View style={styles.featureGrid}>
        {[
          {
            icon: 'analytics-outline',
            title: 'AI Predictions',
            description: 'Advanced machine learning algorithms predict air quality changes hours ahead',
            color: '#3b82f6'
          },
          {
            icon: 'pulse-outline',
            title: 'Real-time Data',
            description: 'Live air quality metrics from thousands of sensors worldwide',
            color: '#f59e0b'
          },
          {
            icon: 'fitness-outline',
            title: 'Health Insights',
            description: 'Personalized recommendations based on your health profile and location',
            color: '#ef4444'
          }
        ].map((feature, index) => (
          <TouchableOpacity
            key={index}
            style={styles.featureCard}
            accessibilityRole="button"
            accessibilityLabel={feature.title}
            accessibilityHint={feature.description}
            activeOpacity={0.9}
          >
            <View style={styles.featureIcon}>
              <View style={[styles.featureIconCircle, { borderColor: feature.color }]}>
                <Ionicons name={feature.icon} size={24} color={feature.color} />
              </View>
            </View>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCTA = () => (
    <View style={styles.cta}>
      <Text style={styles.ctaTitle}>Ready to breathe easier?</Text>
      <Text style={styles.ctaSubtitle}>
        Join thousands of users who trust AirNet AI for their air quality monitoring needs
      </Text>
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => handleNavigation('Register')}
        accessibilityRole="button"
        accessibilityLabel="Start Your Free Trial"
        accessibilityHint="Sign up for free trial"
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.ctaButtonGradient}
        >
          <Text style={styles.ctaButtonText}>Start Your Free Trial</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" style={styles.buttonIcon} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const sections = [
    { id: 'header', render: renderHeader },
    { id: 'hero', render: renderHero },
    { id: 'features', render: renderFeatures },
    { id: 'cta', render: renderCTA }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient 
        colors={['#0f172a', '#1e293b', '#334155']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <FlatList
            data={sections}
            renderItem={({ item }) => item.render()}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={{ height: 50 }} />}
            removeClippedSubviews={true}
            initialNumToRender={2}
            maxToRenderPerBatch={1}
            windowSize={5}
            style={Platform.OS === 'web' ? { height: '100vh' } : null}
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 50,
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginRight: 8,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navItem: {
    marginHorizontal: 15,
    paddingVertical: 8,
  },
  navText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  loginButtonText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },

  // Hero Section
  hero: {
    paddingVertical: 110,
    paddingHorizontal: 20,
  },
  heroContent: {
    flexDirection: width > 768 ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding:50
  },
  heroText: {
    flex: 1,
    marginRight: width > 768 ? 40 : 0,
    marginBottom: width > 768 ? 0 : 40,
  },
  heroTitle: {
    fontSize: width > 768 ? 52 : 40,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: width > 768 ? 60 : 48,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  heroTitleAccent: {
    color: '#10b981',
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 28,
    marginBottom: 40,
    fontWeight: '400',
  },
  heroButtons: {
    flexDirection: width > 480 ? 'row' : 'column',
    gap: 15,
    alignItems: 'flex-start',
  },
  primaryButton: {
    borderRadius: 30,
    overflow: 'hidden',
    minWidth: 200,
    elevation: 8,
    shadowColor: '#10b981',
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
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minWidth: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },

  // Hero Visual
  heroVisual: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    width: 180,
    height: 180,
    marginBottom: 40,
  },
  cloudBase: {
    position: 'relative',
    width: 120,
    height: 80,
    alignSelf: 'center',
  },
  cloudPart1: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(232, 244, 253, 0.9)',
    left: 0,
    top: 0,
  },
  cloudPart2: {
    position: 'absolute',
    width: 80,
    height: 60,
    borderRadius: 40,
    backgroundColor: 'rgba(240, 248, 255, 0.9)',
    right: 0,
    top: 10,
  },
  cloudPart3: {
    position: 'absolute',
    width: 60,
    height: 45,
    borderRadius: 30,
    backgroundColor: 'rgba(248, 252, 255, 0.9)',
    left: 30,
    top: 35,
  },
  windLines: {
    position: 'absolute',
    right: -40,
    top: 30,
  },
  windLine: {
    height: 4,
    backgroundColor: '#10b981',
    borderRadius: 2,
    opacity: 0.8,
    marginVertical: 5,
  },
  windLine1: {
    width: 30,
  },
  windLine2: {
    width: 25,
    opacity: 0.6,
  },
  windLine3: {
    width: 20,
    opacity: 0.4,
  },
  particles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  particle1: {
    top: 20,
    left: 130,
  },
  particle2: {
    top: 50,
    left: 150,
  },
  particle3: {
    top: 80,
    left: 140,
  },
  particle4: {
    top: 35,
    left: 160,
  },
  particle5: {
    top: 65,
    left: 170,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 450,
    gap: 15,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Features Section
  features: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 30,
    marginVertical: 20,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 60,
    letterSpacing: -0.5,
  },
  featureGrid: {
    flexDirection: width > 768 ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: 30,
  },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    padding: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    marginBottom: 25,
  },
  featureIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },

  // CTA Section
  cta: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 50,
    maxWidth: 550,
    fontWeight: '400',
  },
  ctaButton: {
    borderRadius: 30,
    overflow: 'hidden',
    minWidth: 240,
    elevation: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  ctaButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default WelcomeScreen;