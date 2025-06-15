import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const WelcomeScreen = ({ navigation }) => {
  return (
    <LinearGradient 
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <SafeAreaView style={styles.content}>
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
            <View style={[styles.particle, styles.particle1]} />
            <View style={[styles.particle, styles.particle2]} />
            <View style={[styles.particle, styles.particle3]} />
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

        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Get started</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Sign In Link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.signInContainer}
        >
          <Text style={styles.signInText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
    margin: 15,
  },
  iconContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 60,
  },
  cloudBase: {
    position: 'relative',
    width: 80,
    height: 50,
    alignSelf: 'center',
  },
  cloudPart1: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f4fd',
    left: 0,
    top: 0,
  },
  cloudPart2: {
    position: 'absolute',
    width: 60,
    height: 40,
    borderRadius: 30,
    backgroundColor: '#f0f8ff',
    right: 0,
    top: 5,
  },
  cloudPart3: {
    position: 'absolute',
    width: 40,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#f8fcff',
    left: 20,
    top: 20,
  },
  windLines: {
    position: 'absolute',
    right: -20,
    top: 15,
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
    width: 15,
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
    top: 10,
    left: 90,
    opacity: 0.8,
  },
  particle2: {
    top: 35,
    left: 100,
    opacity: 0.6,
  },
  particle3: {
    top: 55,
    left: 95,
    opacity: 0.4,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: -5,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 50,
    paddingHorizontal: 20,
  },
  button: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 20,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  signInContainer: {
    paddingVertical: 10,
  },
  signInText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default WelcomeScreen;