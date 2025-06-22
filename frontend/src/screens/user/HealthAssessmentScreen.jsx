import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, SafeAreaView, StatusBar, Platform, Modal } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { createHealthRiskAssessment, getLatestAssessment } from '../../api/health';

const HealthRiskAssessmentScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentAQI, setCurrentAQI] = useState(null);
  const user = useSelector(state => state.auth.user);

  const getCityCoordinates = async (cityName) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName.trim())}&limit=1`, 
        { headers: { 'User-Agent': 'HealthRiskApp/1.0' } });
      const data = await response.json();
      if (data.length > 0) return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
      throw new Error(`Location "${cityName}" not found`);
    } catch (error) {
      throw new Error(`Unable to find coordinates for "${cityName}"`);
    }
  };

  const getCityFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`, 
        { headers: { 'User-Agent': 'HealthRiskApp/1.0' } });
      const data = await response.json();
      return data?.address?.city || data?.address?.town || data?.display_name?.split(',')[0] || 'Unknown Location';
    } catch (error) {
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const getGPSLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Location permission denied');
    const location = await Location.getCurrentPositionAsync({});
    return { latitude: location.coords.latitude, longitude: location.coords.longitude };
  };

  const fetchAQIData = async (coordinates) => {
    const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current=us_aqi,pm10,pm2_5&timezone=auto`);
    const data = await response.json();
    if (data.current) return { aqi: data.current.us_aqi, pm25: data.current.pm2_5, pm10: data.current.pm10, timestamp: data.current.time };
    throw new Error('No air quality data available');
  };

  const performAssessment = async (useGPS = false) => {
    try {
      setLoading(true);
      setShowLocationModal(false);
      let coordinates, locationName;
      
      if (useGPS) {
        coordinates = await getGPSLocation();
        locationName = await getCityFromCoordinates(coordinates.latitude, coordinates.longitude);
      } else {
        if (!user?.city) throw new Error('No saved city found');
        coordinates = await getCityCoordinates(user.city);
        locationName = user.city;
      }

      const aqiData = await fetchAQIData(coordinates);
      setCurrentAQI(aqiData);
      const result = await createHealthRiskAssessment({ aqi: aqiData.aqi, pm25: aqiData.pm25, pm10: aqiData.pm10, location: locationName });
      setAssessment(result.assessment);
    } catch (error) {
      Alert.alert('Assessment Failed', error.message || 'Unable to complete assessment');
    } finally {
      setLoading(false);
    }
  };

  const loadLatestAssessment = async () => {
    try {
      const result = await getLatestAssessment();
      if (result.success) setAssessment(result.assessment);
    } catch (error) {
      console.log('No previous assessment found');
    }
  };

  useEffect(() => { loadLatestAssessment(); }, []);

  const getRiskColor = (level) => ({ low: '#00E676', moderate: '#FF9800', high: '#E91E63', very_high: '#9C27B0' }[level] || '#757575');
  
  const getAQILevel = (aqi) => {
    if (aqi <= 50) return { level: 'Good', color: '#00E676' };
    if (aqi <= 100) return { level: 'Moderate', color: '#FF9800' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive', color: '#FF6B35' };
    if (aqi <= 200) return { level: 'Unhealthy', color: '#E91E63' };
    if (aqi <= 300) return { level: 'Very Unhealthy', color: '#9C27B0' };
    return { level: 'Hazardous', color: '#8B0000' };
  };

  const checkProfileCompleteness = () => {
    const required = ['age', 'gender', 'outdoorExposure', 'isPregnant', 'isSmoker', 'hasAsthma', 'hasHeartDisease', 'hasRespiratoryIssues'];
    const missing = required.filter(field => user?.[field] === undefined || user?.[field] === null);
    return { complete: missing.length === 0, missing };
  };

  const HealthMetric = ({ icon, label, value, unit, color = '#00E676' }) => (
    <View style={[styles.metricCard, { borderColor: color + '30' }]}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {unit && <Text style={styles.metricUnit}>{unit}</Text>}
    </View>
  );

  const RiskFactorBar = ({ label, score, maxScore, color }) => (
    <View style={styles.riskFactorItem}>
      <View style={styles.riskFactorHeader}>
        <Text style={styles.riskFactorLabel}>{label}</Text>
        <Text style={styles.riskFactorScore}>{score}/{maxScore}</Text>
      </View>
      <View style={styles.riskFactorBar}>
        <View style={[styles.riskFactorFill, { width: `${(score/maxScore)*100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );

  const RiskIndicator = ({ level }) => {
    const progress = level === 'low' ? 25 : level === 'moderate' ? 50 : level === 'high' ? 75 : 100;
    const color = getRiskColor(level);
    return (
      <View style={styles.riskIndicator}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: color }]} />
        </View>
        <View style={styles.riskLabels}>
          {['Low', 'Moderate', 'High', 'Critical'].map((label, i) => (
            <Text key={label} style={[styles.riskLabel, { color: progress >= (i+1)*25 ? color : '#666' }]}>{label}</Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Health Risk Assessment</Text>
              <Text style={styles.headerSubtitle}>Environmental Health Analysis</Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={() => setShowLocationModal(true)}>
              <Ionicons name="refresh" size={20} color="#00E676" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.statusBanner}>
              <View style={styles.statusIndicator}>
                <Ionicons name="pulse" size={18} color="#00E676" />
                <Text style={styles.statusText}>Real-time Environmental Monitoring</Text>
              </View>
              {assessment && <Text style={styles.lastUpdate}>Last updated: {new Date(assessment.assessedAt).toLocaleDateString()}</Text>}
            </View>

            {assessment ? (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#00E676" />
                      <View>
                        <Text style={styles.cardTitle}>Risk Assessment Score</Text>
                        <Text style={styles.cardSubtitle}>Based on current conditions</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setShowDetailsModal(true)} style={styles.infoButton}>
                      <Ionicons name="information-circle-outline" size={18} color="#00E676" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.riskCard, { backgroundColor: getRiskColor(assessment.riskLevel) + '15', borderColor: getRiskColor(assessment.riskLevel) + '30' }]}>
                    <View style={styles.riskScoreContainer}>
                      <Text style={[styles.riskScore, { color: getRiskColor(assessment.riskLevel) }]}>{assessment.riskScore}</Text>
                      <Text style={styles.riskScoreMax}>/100</Text>
                    </View>
                    <Text style={[styles.riskLevel, { color: getRiskColor(assessment.riskLevel) }]}>
                      {assessment.riskLevel.replace('_', ' ').toUpperCase()} RISK
                    </Text>
                    <RiskIndicator level={assessment.riskLevel} />
                  </View>
                </View>

                {/* Risk Factors Breakdown */}
                {assessment.breakdown && (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="analytics-outline" size={20} color="#00E676" />
                      <View>
                        <Text style={styles.cardTitle}>Risk Factors Breakdown</Text>
                        <Text style={styles.cardSubtitle}>Contributing factors to your score</Text>
                      </View>
                    </View>
                    <View style={styles.riskFactorsContainer}>
                      <RiskFactorBar label="Environmental" score={assessment.breakdown.environmental || 0} maxScore={40} color="#FF6B35" />
                      <RiskFactorBar label="Age Factor" score={assessment.breakdown.age || 0} maxScore={20} color="#9C27B0" />
                      <RiskFactorBar label="Health Conditions" score={assessment.breakdown.healthConditions || 0} maxScore={25} color="#E91E63" />
                      <RiskFactorBar label="Lifestyle" score={assessment.breakdown.lifestyle || 0} maxScore={15} color="#FF9800" />
                    </View>
                  </View>
                )}

                {currentAQI && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Environmental Metrics</Text>
                    <View style={styles.metricsGrid}>
                      <HealthMetric icon="speedometer-outline" label="Air Quality Index" value={currentAQI.aqi} color={getAQILevel(currentAQI.aqi).color} />
                      <HealthMetric icon="analytics-outline" label="PM2.5" value={currentAQI.pm25?.toFixed(1)} unit="μg/m³" color="#FF6B35" />
                      <HealthMetric icon="bar-chart-outline" label="PM10" value={currentAQI.pm10?.toFixed(1)} unit="μg/m³" color="#9C27B0" />
                      <HealthMetric icon="location-outline" label="Location" value={assessment.location || 'Unknown'} color="#00E676" />
                    </View>
                  </View>
                )}

                {assessment.recommendations && (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="medical-outline" size={20} color="#00E676" />
                      <View>
                        <Text style={styles.cardTitle}>Health Recommendations</Text>
                        <Text style={styles.cardSubtitle}>Personalized guidance</Text>
                      </View>
                    </View>
                    <View style={styles.recommendationsContainer}>
                      {assessment.recommendations.slice(0, 3).map((rec, index) => (
                        <View key={index} style={styles.recommendationCard}>
                          <View style={styles.recommendationIcon}>
                            <Ionicons name={["shield-outline", "heart-outline", "fitness-outline"][index]} size={16} color="#00E676" />
                          </View>
                          <Text style={styles.recommendationText}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                    {assessment.recommendations.length > 3 && (
                      <TouchableOpacity style={styles.viewAllButton} onPress={() => setShowDetailsModal(true)}>
                        <Text style={styles.viewAllText}>View All Recommendations</Text>
                        <Ionicons name="chevron-forward" size={16} color="#00E676" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="document-text-outline" size={20} color="#00E676" />
                    <Text style={styles.cardTitle}>Clinical Summary</Text>
                  </View>
                  <View style={styles.clinicalSummary}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Assessment Date:</Text>
                      <Text style={styles.summaryValue}>{new Date(assessment.assessedAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Risk Category:</Text>
                      <Text style={[styles.summaryValue, { color: getRiskColor(assessment.riskLevel) }]}>{assessment.riskLevel.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyCard}>
                <LinearGradient colors={['rgba(0,230,118,0.1)', 'rgba(0,230,118,0.05)']} style={styles.emptyGradient}>
                  <Ionicons name="analytics-outline" size={48} color="rgba(0,230,118,0.6)" />
                  <Text style={styles.emptyTitle}>No Assessment Available</Text>
                  <Text style={styles.emptyText}>Get your personalized health risk assessment based on real-time environmental data</Text>
                </LinearGradient>
              </View>
            )}

            <TouchableOpacity style={styles.assessButton} onPress={() => setShowLocationModal(true)} disabled={loading}>
              <LinearGradient colors={['#00E676', '#00C765']} style={styles.assessButtonGradient}>
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                  <>
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.assessButtonText}>{assessment ? 'New Assessment' : 'Start Assessment'}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>

          <Modal visible={showLocationModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Assessment Requirements</Text>
                {(() => {
                  const profileCheck = checkProfileCompleteness();
                  if (!profileCheck.complete) {
                    return (
                      <View style={styles.profileIncomplete}>
                        <Ionicons name="warning-outline" size={24} color="#FF9800" />
                        <Text style={styles.incompleteTitle}>Profile Incomplete</Text>
                        <Text style={styles.incompleteText}>Please complete your health profile first:</Text>
                        <View style={styles.missingFields}>
                          {profileCheck.missing.map(field => (
                            <Text key={field} style={styles.missingField}>• {field.replace(/([A-Z])/g, ' $1').toLowerCase()}</Text>
                          ))}
                        </View>
                        <TouchableOpacity style={styles.profileButton} onPress={() => { setShowLocationModal(false); navigation.navigate('Profile'); }}>
                          <Text style={styles.profileButtonText}>Complete Profile</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  return (
                    <>
                      <Text style={styles.modalSubtitle}>Select location source for assessment</Text>
                      <TouchableOpacity style={styles.modalButton} onPress={() => performAssessment(false)} disabled={!user?.city}>
                        <Ionicons name="home-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.modalButtonText}>Use Saved City {user?.city ? `(${user.city})` : '(Not Set)'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalButton} onPress={() => performAssessment(true)}>
                        <Ionicons name="location-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.modalButtonText}>Use Current GPS Location</Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowLocationModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal visible={showDetailsModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.detailsModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detailed Assessment Report</Text>
                  <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.detailsContent}>
                  {currentAQI && (
                    <View style={styles.aqiSection}>
                      <Text style={styles.detailsSectionTitle}>Environmental Data</Text>
                      <View style={[styles.aqiDetailCard, { backgroundColor: getAQILevel(currentAQI.aqi).color + '20', borderColor: getAQILevel(currentAQI.aqi).color + '40' }]}>
                        <Text style={[styles.aqiValue, { color: getAQILevel(currentAQI.aqi).color }]}>{currentAQI.aqi}</Text>
                        <Text style={[styles.aqiLabel, { color: getAQILevel(currentAQI.aqi).color }]}>{getAQILevel(currentAQI.aqi).level}</Text>
                      </View>
                      <View style={styles.pollutantRow}>
                        <Text style={styles.pollutantText}>PM2.5: {currentAQI.pm25} μg/m³</Text>
                        <Text style={styles.pollutantText}>PM10: {currentAQI.pm10} μg/m³</Text>
                      </View>
                    </View>
                  )}
                  {assessment?.recommendations && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsSectionTitle}>Complete Recommendations</Text>
                      {assessment.recommendations.map((rec, index) => (
                        <View key={index} style={styles.recommendationItem}>
                          <View style={styles.bulletPoint} />
                          <Text style={styles.recommendationText}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {assessment?.insights && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsSectionTitle}>Clinical Insights</Text>
                      {assessment.insights.map((insight, index) => (
                        <View key={index} style={styles.insightItem}>
                          <Ionicons name="bulb-outline" size={14} color="#00E676" />
                          <Text style={styles.insightText}>{insight}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20, paddingBottom: 20 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  refreshButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,230,118,0.2)', justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 100 },
  statusBanner: { backgroundColor: 'rgba(0,230,118,0.1)', borderRadius: 12, padding: 16, marginBottom: 20, borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusText: { fontSize: 14, fontWeight: '600', color: '#00E676', marginLeft: 8 },
  lastUpdate: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 18, marginBottom: 20, borderColor: 'rgba(0,230,118,0.2)', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginLeft: 8 },
  cardSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginLeft: 8, marginTop: 2 },
  infoButton: { padding: 4 },
  riskCard: { alignItems: 'center', padding: 24, borderRadius: 12, marginBottom: 16, borderWidth: 1 },
  riskScoreContainer: { flexDirection: 'row', alignItems: 'baseline' },
  riskScore: { fontSize: 48, fontWeight: '900' },
  riskScoreMax: { fontSize: 24, color: 'rgba(255,255,255,0.5)', marginLeft: 4 },
  riskLevel: { fontSize: 12, fontWeight: '700', marginTop: 8, letterSpacing: 1 },
  riskIndicator: { marginTop: 16, width: '100%' },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 2 },
  riskLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  riskLabel: { fontSize: 10, fontWeight: '600' },
  riskFactorsContainer: { gap: 12 },
  riskFactorItem: { marginBottom: 8 },
  riskFactorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  riskFactorLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  riskFactorScore: { fontSize: 12, color: '#00E676', fontWeight: '700' },
  riskFactorBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 },
  riskFactorFill: { height: '100%', borderRadius: 3 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, borderWidth: 1 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  metricLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginLeft: 6 },
  metricValue: { fontSize: 20, fontWeight: '700' },
  metricUnit: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  recommendationsContainer: { gap: 12 },
  recommendationCard: { backgroundColor: 'rgba(0,230,118,0.05)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', borderColor: 'rgba(0,230,118,0.1)', borderWidth: 1 },
  recommendationIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,230,118,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recommendationText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18, flex: 1 },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, padding: 8 },
  viewAllText: { fontSize: 14, color: '#00E676', fontWeight: '600', marginRight: 4 },
  clinicalSummary: { gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  emptyCard: { borderRadius: 16, marginBottom: 20, overflow: 'hidden', borderColor: 'rgba(0,230,118,0.2)', borderWidth: 1 },
  emptyGradient: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  assessButton: { borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  assessButtonGradient: { padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  assessButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 24, margin: 20, width: '92%', maxWidth: 400 },
 // Continuation from the cut-off point in the first document:
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20 },
  
  profileIncomplete: { alignItems: 'center', paddingVertical: 10 },
  incompleteTitle: { fontSize: 16, fontWeight: '700', color: '#FF9800', marginTop: 8, marginBottom: 8 },
  incompleteText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 12 },
  missingFields: { alignSelf: 'flex-start', marginBottom: 16 },
  missingField: { fontSize: 12, color: '#FF9800', marginBottom: 2 },
  profileButton: {
    backgroundColor: '#FF9800', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginBottom: 12
  },
  profileButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  
  modalButton: {
    backgroundColor: 'rgba(0,230,118,0.2)', padding: 16, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    borderColor: '#00E676', borderWidth: 1
  },
  modalButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 12, flex: 1 },
  modalCancelButton: { padding: 12, alignItems: 'center' },
  modalCancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  
  detailsModal: { backgroundColor: '#1A1A2E', borderRadius: 16, margin: 20, maxHeight: '85%', width: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  detailsContent: { paddingHorizontal: 20, paddingBottom: 20 },
  detailsSectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  
  aqiSection: { marginBottom: 20 },
  aqiDetailCard: { alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  aqiValue: { fontSize: 32, fontWeight: '900' },
  aqiLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  pollutantRow: { flexDirection: 'row', justifyContent: 'space-around' },
  pollutantText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  
  detailsSection: { marginBottom: 20 },
  recommendationItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  bulletPoint: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#00E676', marginTop: 6, marginRight: 10 },
  insightItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  insightText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18, flex: 1, marginLeft: 8, fontStyle: 'italic' },
  
  // Missing riskFactorsContainer and related styles
  riskFactorsContainer: { gap: 12 },
  riskFactorItem: { marginBottom: 8 },
  riskFactorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  riskFactorLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  riskFactorScore: { fontSize: 12, color: '#00E676', fontWeight: '700' },
  riskFactorBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 },
  riskFactorFill: { height: '100%', borderRadius: 3 }
});

export default HealthRiskAssessmentScreen;