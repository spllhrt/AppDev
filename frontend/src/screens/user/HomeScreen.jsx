import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const HomeScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [currentAQI, setCurrentAQI] = useState(85);
  const [location, setLocation] = useState('Manila');
  const [aiPrediction, setAiPrediction] = useState(null);
  const [healthRisk, setHealthRisk] = useState('Moderate');

  useEffect(() => {
    fetchAirQualityData();
    generateAIPrediction();
  }, []);

  const fetchAirQualityData = () => {
    // Simulate ML prediction
    setTimeout(() => {
      setCurrentAQI(Math.floor(Math.random() * 200) + 1);
      generateHealthRisk();
    }, 1000);
  };

  const generateAIPrediction = () => {
    // Simulate LSTM/RNN prediction
    const predictions = [
      { hour: '14:00', aqi: 78, confidence: 0.92 },
      { hour: '16:00', aqi: 85, confidence: 0.89 },
      { hour: '18:00', aqi: 92, confidence: 0.85 },
    ];
    setAiPrediction(predictions);
  };

  const generateHealthRisk = () => {
    // Simulate AI-based health risk assessment
    const risks = ['Low', 'Moderate', 'High', 'Very High'];
    setHealthRisk(risks[Math.floor(Math.random() * risks.length)]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAirQualityData();
    generateAIPrediction();
    setTimeout(() => setRefreshing(false), 2000);
  };

  const getAQIStatus = (aqi) => {
    if (aqi <= 50) return { status: 'Good', color: '#00E676', gradient: ['#00E676', '#00C853'] };
    if (aqi <= 100) return { status: 'Moderate', color: '#FFD54F', gradient: ['#FFD54F', '#FFC107'] };
    if (aqi <= 150) return { status: 'Unhealthy', color: '#FF7043', gradient: ['#FF7043', '#FF5722'] };
    return { status: 'Hazardous', color: '#E91E63', gradient: ['#E91E63', '#C2185B'] };
  };

  const pollutionSources = [
    { source: 'Traffic', percentage: 45, icon: 'car-outline' },
    { source: 'Industrial', percentage: 30, icon: 'business-outline' },
    { source: 'Construction', percentage: 15, icon: 'hammer-outline' },
    { source: 'Other', percentage: 10, icon: 'ellipse-outline' },
  ];

  const aqiInfo = getAQIStatus(currentAQI);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color="#00E676" />
              <Text style={styles.location}>{location}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E676" />}
          >
            
            {/* Current AQI Card */}
            <LinearGradient colors={aqiInfo.gradient} style={styles.aqiCard}>
              <Text style={styles.aqiNumber}>{currentAQI}</Text>
              <Text style={styles.aqiLabel}>Air Quality Index</Text>
              <Text style={styles.statusText}>{aqiInfo.status}</Text>
            </LinearGradient>

            {/* Health Recommendations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Health Advice</Text>
              <View style={styles.healthCard}>
                <Text style={styles.healthRisk}>Health Risk: {healthRisk}</Text>
                <Text style={styles.healthAdvice}>
                  {healthRisk === 'High' 
                    ? 'Stay indoors when possible. Close windows and use air purifiers.'
                    : 'Good for outdoor activities! People with asthma should still be careful.'
                  }
                </Text>
              </View>
            </View>

            {/* Air Quality Forecast */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Smart Forecast</Text>
              {aiPrediction?.map((pred, index) => (
                <View key={index} style={styles.predictionItem}>
                  <Text style={styles.predTime}>{pred.hour}</Text>
                  <Text style={styles.predAQI}>Air Quality: {pred.aqi}</Text>
                  <Text style={styles.confidence}>Accuracy: {(pred.confidence * 100).toFixed(0)}%</Text>
                </View>
              ))}
            </View>

            {/* What's Causing Pollution */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pollution Causes</Text>
              {pollutionSources.map((source, index) => (
                <View key={index} style={styles.sourceItem}>
                  <Ionicons name={source.icon} size={20} color="#00E676" />
                  <Text style={styles.sourceName}>{source.source}</Text>
                  <Text style={styles.sourcePercent}>{source.percentage}%</Text>
                </View>
              ))}
            </View>

            {/* Daily Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Air Report</Text>
              <View style={styles.bulletinCard}>
                <Text style={styles.bulletinText}>
                  More cars on the road today are making the air dirtier. 
                  Good news: Rain tonight should help clear the air! 
                  If you have breathing problems, stay inside between 12-4 PM.
                </Text>
                <Text style={styles.bulletinTime}>Updated at 8:30 AM</Text>
              </View>
            </View>

            {/* Bottom spacing for navigation */}
            <View style={styles.bottomSpacer} />

          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: { padding: 10, alignItems: 'center' },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 26  },
  location: { fontSize: 15, color: '#FFFFFF', marginLeft: 8 },
  content: { flex: 1, paddingHorizontal: 20 },
  
  aqiCard: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  aqiNumber: { fontSize: 60, fontWeight: '900', color: '#FFFFFF' },
  aqiLabel: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 5 },
  statusText: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginTop: 10 },
  
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 15 },
  
  healthCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 15,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  healthRisk: { fontSize: 16, fontWeight: '600', color: '#00E676', marginBottom: 8 },
  healthAdvice: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  
  predictionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  predTime: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  predAQI: { fontSize: 14, color: '#00E676', fontWeight: '600' },
  confidence: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  sourceName: { flex: 1, fontSize: 14, color: '#FFFFFF', marginLeft: 10 },
  sourcePercent: { fontSize: 14, color: '#00E676', fontWeight: '600' },
  
  bulletinCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 15,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  bulletinText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 20, marginBottom: 10 },
  bulletinTime: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },
  
  bottomSpacer: {
    height: 100, // Extra space to prevent navigation overlap
    backgroundColor: 'transparent',
  },
});

export default HomeScreen;