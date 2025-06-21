import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, TextInput, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { getHealthProfile, createHealthRiskAssessment, getLatestAssessment, checkHealthProfileComplete, updateHealthProfile, formatHealthProfileData } from '../../api/health';

const HealthAssessmentScreen = ({ navigation }) => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const [useGPS, setUseGPS] = useState(true);

  // Modal states
  const [healthProfileModalVisible, setHealthProfileModalVisible] = useState(false);
  const [assessmentDetailsModalVisible, setAssessmentDetailsModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Health profile form data
  const [healthFormData, setHealthFormData] = useState({
    age: '',
    gender: '',
    isPregnant: false,
    isSmoker: false,
    hasAsthma: false,
    hasHeartDisease: false,
    hasRespiratoryIssues: false,
    outdoorExposure: 'moderate'
  });

  useEffect(() => { 
    if (isAuthenticated) loadInitialData(); 
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWeatherData();
    }
  }, [useGPS, isAuthenticated]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadHealthProfile(), loadLatestAssessment()]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHealthProfile = async () => {
    try {
      const profileData = await getHealthProfile();
      setHealthProfile(profileData);
      if (profileData.healthProfile) {
        setHealthFormData({
          age: profileData.healthProfile.age?.toString() || '',
          gender: profileData.healthProfile.gender || '',
          isPregnant: profileData.healthProfile.isPregnant || false,
          isSmoker: profileData.healthProfile.isSmoker || false,
          hasAsthma: profileData.healthProfile.hasAsthma || false,
          hasHeartDisease: profileData.healthProfile.hasHeartDisease || false,
          hasRespiratoryIssues: profileData.healthProfile.hasRespiratoryIssues || false,
          outdoorExposure: profileData.healthProfile.outdoorExposure || 'moderate'
        });
      }
    } catch (error) {
      console.error('Error loading health profile:', error);
    }
  };

  const loadLatestAssessment = async () => {
    try {
      const assessmentData = await getLatestAssessment();
      setAssessment(assessmentData.assessment);
    } catch (error) {
      if (error.status === 404) {
        console.log('No previous assessment found - normal for new users');
        setAssessment(null);
      } else {
        console.error('Error loading assessment:', error);
      }
    }
  };

  // Use the same location functions as HomeScreen
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });

      return {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      };
    } catch (error) {
      throw new Error(`GPS location failed: ${error.message}`);
    }
  };

  const reverseGeocode = async (lat, lon) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (result.length > 0) {
        const address = result[0];
        return address.city || address.subregion || address.region || 'Unknown Location';
      }
      return 'Unknown Location';
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return 'Unknown Location';
    }
  };

  const getCityCoordinates = async (cityName) => {
    try {
      const result = await Location.geocodeAsync(cityName);
      if (result.length > 0) {
        return {
          lat: result[0].latitude,
          lon: result[0].longitude,
          name: cityName,
          country: null
        };
      }
      throw new Error('City not found');
    } catch (error) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  };

  const getWeatherDescription = (code) => {
    const descriptions = {
      0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Depositing Rime Fog', 51: 'Light Drizzle', 53: 'Moderate Drizzle',
      55: 'Dense Drizzle', 61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
      71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow', 80: 'Rain Showers',
      81: 'Moderate Rain Showers', 82: 'Violent Rain Showers', 95: 'Thunderstorm'
    };
    return descriptions[code] || 'Unknown';
  };

  // Use the same weather fetching logic as HomeScreen
  const fetchWeatherData = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let coordinates, locationDisplayName;

      if (useGPS) {
        try {
          coordinates = await getCurrentLocation();
          locationDisplayName = await reverseGeocode(coordinates.lat, coordinates.lon);
        } catch (gpsError) {
          Alert.alert('GPS Error', 'Failed to get GPS location. Using your saved city instead.', [{ text: 'OK' }]);
          const userCity = user?.city || 'Manila';
          const cityCoords = await getCityCoordinates(userCity);
          coordinates = { lat: cityCoords.lat, lon: cityCoords.lon };
          locationDisplayName = cityCoords.country ? `${cityCoords.name}, ${cityCoords.country}` : cityCoords.name;
          setUseGPS(false);
        }
      } else {
        const userCity = user?.city || 'Manila';
        const cityCoords = await getCityCoordinates(userCity);
        coordinates = { lat: cityCoords.lat, lon: cityCoords.lon };
        locationDisplayName = cityCoords.country ? `${cityCoords.name}, ${cityCoords.country}` : cityCoords.name;
      }

      const [weatherResponse, airQualityResponse] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust,uv_index,ammonia,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen`)
      ]);

      if (!weatherResponse.ok) throw new Error(`Weather API error: ${weatherResponse.status}`);

      const weather = await weatherResponse.json();
      const airQuality = await airQualityResponse.json();

      setWeatherData({
        location: locationDisplayName,
        temperature: Math.round(weather.current.temperature_2m),
        humidity: weather.current.relative_humidity_2m,
        windSpeed: Math.round(weather.current.wind_speed_10m * 10) / 10,
        weatherCode: weather.current.weather_code,
        aqi: Math.round(airQuality.current?.us_aqi || 50),
        weather: getWeatherDescription(weather.current.weather_code),
        // Include additional AQI data for assessment
        pm25: airQuality.current?.pm2_5,
        pm10: airQuality.current?.pm10,
        coordinates: coordinates
      });

    } catch (error) {
      Alert.alert('Error', `Failed to fetch weather data: ${error.message}`);
      if (useGPS) setUseGPS(false);
    } finally {
      if (isRefreshing) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    fetchWeatherData(true);
    loadLatestAssessment();
  };

  const handleLocationToggle = async () => {
    if (!useGPS) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location Permission Required', 'Please grant location permission to use GPS functionality.', [{ text: 'OK' }]);
          return;
        }
      } catch (error) {
        Alert.alert('GPS Unavailable', 'GPS functionality is not available on this device.', [{ text: 'OK' }]);
        return;
      }
    }
    setUseGPS(!useGPS);
  };

  const getAQIInfo = (aqi) => {
    if (aqi <= 50) return { status: 'Good', colors: ['#10b981', '#34d399'], textColor: '#ffffff' };
    if (aqi <= 100) return { status: 'Moderate', colors: ['#f59e0b', '#fbbf24'], textColor: '#ffffff' };
    if (aqi <= 150) return { status: 'Unhealthy', colors: ['#f97316', '#fb923c'], textColor: '#ffffff' };
    return { status: 'Hazardous', colors: ['#dc2626', '#ef4444'], textColor: '#ffffff' };
  };

  const getRiskLevelColor = (riskLevel) => {
    const colors = { low: '#4CAF50', moderate: '#FFC107', high: '#FF9800', very_high: '#F44336' };
    return colors[riskLevel] || '#9E9E9E';
  };

  const handleCreateAssessment = async () => {
    if (!weatherData || !weatherData.pm25 || !weatherData.coordinates) {
      Alert.alert('Missing Data', 'Please wait for environmental data to load.');
      return;
    }

    try {
      setLoading(true);
      const profileCheck = await checkHealthProfileComplete();
      if (!profileCheck.isComplete) {
        Alert.alert('Incomplete Profile', `Please complete your health profile first. Missing: ${profileCheck.missingFields.join(', ')}`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete Profile', onPress: () => setHealthProfileModalVisible(true) }
        ]);
        return;
      }

      const assessmentData = { 
        aqi: weatherData.aqi, 
        pm25: weatherData.pm25, 
        pm10: weatherData.pm10, 
        location: weatherData.location 
      };
      const result = await createHealthRiskAssessment(assessmentData);
      setAssessment(result.assessment);
      
      Alert.alert('Assessment Complete', `Risk Level: ${result.assessment.riskLevel.toUpperCase()}\nScore: ${result.assessment.riskScore}/100`, [
        { text: 'View Details', onPress: () => setAssessmentDetailsModalVisible(true) }
      ]);
    } catch (error) {
      console.error('Assessment error:', error);
      Alert.alert('Error', error.message || 'Failed to create assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleHealthProfileSubmit = async () => {
    try {
      setModalLoading(true);
      const formattedData = formatHealthProfileData(healthFormData);
      await updateHealthProfile(formattedData);
      await loadHealthProfile();
      setHealthProfileModalVisible(false);
      Alert.alert('Success', 'Health profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update health profile');
    } finally {
      setModalLoading(false);
    }
  };

  const HealthProfileModal = () => (
    <Modal
      visible={healthProfileModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setHealthProfileModalVisible(false)}
    >
      <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.modalContainer}>
        <ScrollView style={styles.modalScrollView}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setHealthProfileModalVisible(false)}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Health Profile</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={healthFormData.age}
                onChangeText={(text) => setHealthFormData({...healthFormData, age: text})}
                placeholder="Enter your age"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                {['male', 'female', 'other'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      healthFormData.gender === gender && styles.genderButtonActive
                    ]}
                    onPress={() => setHealthFormData({...healthFormData, gender})}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      healthFormData.gender === gender && styles.genderButtonTextActive
                    ]}>
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Outdoor Exposure</Text>
              <View style={styles.genderContainer}>
                {['low', 'moderate', 'high'].map((exposure) => (
                  <TouchableOpacity
                    key={exposure}
                    style={[
                      styles.genderButton,
                      healthFormData.outdoorExposure === exposure && styles.genderButtonActive
                    ]}
                    onPress={() => setHealthFormData({...healthFormData, outdoorExposure: exposure})}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      healthFormData.outdoorExposure === exposure && styles.genderButtonTextActive
                    ]}>
                      {exposure.charAt(0).toUpperCase() + exposure.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Air Quality Data Display */}
            {weatherData && (
              <View style={styles.airQualitySection}>
                <Text style={styles.sectionTitle}>Current Air Quality</Text>
                <View style={styles.aqiContainer}>
                  <View style={[styles.aqiCircle, { borderColor: getAQIInfo(weatherData.aqi)?.colors[0] }]}>
                    <Text style={[styles.aqiValue, { color: getAQIInfo(weatherData.aqi)?.colors[0] }]}>{weatherData.aqi}</Text>
                    <Text style={styles.aqiLabel}>AQI</Text>
                  </View>
                  <View style={styles.aqiInfo}>
                    <Text style={[styles.aqiLevel, { color: getAQIInfo(weatherData.aqi)?.colors[0] }]}>{getAQIInfo(weatherData.aqi)?.status}</Text>
                    <Text style={styles.aqiDescription}>
                      PM2.5: {weatherData.pm25?.toFixed(1)} μg/m³{'\n'}PM10: {weatherData.pm10?.toFixed(1)} μg/m³
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Health Conditions */}
            <Text style={styles.sectionTitle}>Health Conditions</Text>
            
            {healthFormData.gender === 'female' && (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Currently Pregnant</Text>
                <Switch
                  value={healthFormData.isPregnant}
                  onValueChange={(value) => setHealthFormData({...healthFormData, isPregnant: value})}
                  trackColor={{ false: '#767577', true: '#4CAF50' }}
                  thumbColor={healthFormData.isPregnant ? '#ffffff' : '#f4f3f4'}
                />
              </View>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Smoker</Text>
              <Switch
                value={healthFormData.isSmoker}
                onValueChange={(value) => setHealthFormData({...healthFormData, isSmoker: value})}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={healthFormData.isSmoker ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Asthma</Text>
              <Switch
                value={healthFormData.hasAsthma}
                onValueChange={(value) => setHealthFormData({...healthFormData, hasAsthma: value})}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={healthFormData.hasAsthma ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Heart Disease</Text>
              <Switch
                value={healthFormData.hasHeartDisease}
                onValueChange={(value) => setHealthFormData({...healthFormData, hasHeartDisease: value})}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={healthFormData.hasHeartDisease ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Respiratory Issues</Text>
              <Switch
                value={healthFormData.hasRespiratoryIssues}
                onValueChange={(value) => setHealthFormData({...healthFormData, hasRespiratoryIssues: value})}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={healthFormData.hasRespiratoryIssues ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={handleHealthProfileSubmit}
              disabled={modalLoading}
            >
              <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.buttonGradient}>
                {modalLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Save Health Profile</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );

  const AssessmentDetailsModal = () => (
    <Modal
      visible={assessmentDetailsModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setAssessmentDetailsModalVisible(false)}
    >
      <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.modalContainer}>
        <ScrollView style={styles.modalScrollView}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAssessmentDetailsModalVisible(false)}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Assessment Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {assessment && (
            <View style={styles.modalContent}>
              <View style={styles.assessmentHeader}>
                <View style={[styles.riskBadge, { backgroundColor: getRiskLevelColor(assessment.riskLevel) }]}>
                  <Text style={styles.riskText}>{assessment.riskLevel.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Text style={styles.riskScore}>Risk Score: {assessment.riskScore}/100</Text>
                <Text style={styles.assessmentDate}>Assessed: {new Date(assessment.assessedAt).toLocaleDateString()}</Text>
              </View>

              {/* Air Quality Data Display */}
              {weatherData && (
                <View style={styles.airQualitySection}>
                  <Text style={styles.sectionTitle}>Air Quality Data</Text>
                  <View style={styles.aqiContainer}>
                    <View style={[styles.aqiCircle, { borderColor: getAQIInfo(weatherData.aqi)?.colors[0] }]}>
                      <Text style={[styles.aqiValue, { color: getAQIInfo(weatherData.aqi)?.colors[0] }]}>{weatherData.aqi}</Text>
                      <Text style={styles.aqiLabel}>AQI</Text>
                    </View>
                    <View style={styles.aqiInfo}>
                      <Text style={[styles.aqiLevel, { color: getAQIInfo(weatherData.aqi)?.colors[0] }]}>{getAQIInfo(weatherData.aqi)?.status}</Text>
                      <Text style={styles.aqiDescription}>
                        PM2.5: {weatherData.pm25?.toFixed(1)} μg/m³{'\n'}PM10: {weatherData.pm10?.toFixed(1)} μg/m³
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {assessment.recommendations && assessment.recommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <Text style={styles.sectionTitle}>Recommendations</Text>
                  {assessment.recommendations.map((rec, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              )}

              {assessment.location && (
                <View style={styles.locationSection}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <Text style={styles.locationText}>{assessment.location}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </Modal>
  );

  if (loading && !weatherData) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading environmental data...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.appName}>AirNet AI</Text>
            <Text style={styles.subtitle}>Health Monitor</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={24} color="#4CAF50" />
              <Text style={styles.cardTitle}>Current Location</Text>
            </View>
            <Text style={styles.locationText}>{weatherData?.location || 'Loading location...'}</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleLocationToggle}>
              <Ionicons name={useGPS ? "location" : "location-outline"} size={16} color="#4CAF50" />
              <Text style={styles.refreshButtonText}>{useGPS ? 'Using GPS' : 'Using Saved City'}</Text>
            </TouchableOpacity>
          </View>

          {assessment ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="heart" size={24} color="#4CAF50" />
                <Text style={styles.cardTitle}>Latest Assessment</Text>
              </View>
              
              <View style={styles.assessmentContainer}>
                <View style={[styles.riskBadge, { backgroundColor: getRiskLevelColor(assessment.riskLevel) }]}>
                  <Text style={styles.riskText}>{assessment.riskLevel.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Text style={styles.riskScore}>Risk Score: {assessment.riskScore}/100</Text>
                <Text style={styles.assessmentDate}>Assessed: {new Date(assessment.assessedAt).toLocaleDateString()}</Text>
              </View>

              {assessment.recommendations && assessment.recommendations.length > 0 && (
                <View style={styles.recommendationsContainer}>
                  <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                  {assessment.recommendations.slice(0, 2).map((rec, index) => (
                    <Text key={index} style={styles.recommendationText}>• {rec}</Text>
                  ))}
                </View>
              )}

              <TouchableOpacity 
                style={styles.viewDetailsButton} 
                onPress={() => setAssessmentDetailsModalVisible(true)}
              >
                <Text style={styles.viewDetailsText}>View Full Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="heart-outline" size={24} color="#4CAF50" />
                <Text style={styles.cardTitle}>Health Assessment</Text>
              </View>
              <View style={styles.noAssessmentContainer}>
                <Ionicons name="analytics-outline" size={48} color="rgba(255,255,255,0.5)" />
                <Text style={styles.noAssessmentTitle}>No Previous Assessment</Text>
                <Text style={styles.noAssessmentText}>Create your first health risk assessment based on current air quality conditions.</Text>
              </View>
            </View>
          )}

          {healthProfile && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="person" size={24} color="#4CAF50" />
                <Text style={styles.cardTitle}>Health Profile</Text>
              </View>
              
              <View style={styles.profileStatus}>
                <Ionicons name={healthProfile.isComplete ? "checkmark-circle" : "warning"} size={24} color={healthProfile.isComplete ? "#4CAF50" : "#FFC107"} />
                <Text style={styles.profileStatusText}>{healthProfile.isComplete ? 'Profile Complete' : 'Profile Incomplete'}</Text>
              </View>
              
              {!healthProfile.isComplete && (
                <TouchableOpacity style={styles.completeProfileButton} onPress={() => setHealthProfileModalVisible(true)}>
                  <Text style={styles.completeProfileText}>Complete Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleCreateAssessment} disabled={loading}>
              <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.buttonGradient}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="analytics" size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>Create New Assessment</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setHealthProfileModalVisible(true)}>
              <View style={styles.secondaryButtonContent}>
                <Ionicons name="settings" size={20} color="#4CAF50" />
                <Text style={styles.secondaryButtonText}>Manage Health Profile</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
       <View style={styles.bottomSpace} />
      </ScrollView>

      <HealthProfileModal />
      <AssessmentDetailsModal />
    </LinearGradient>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#cbd5e1', fontSize: 16, marginTop: 10 },
  
  header: { alignItems: 'center', marginBottom: 30 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: '600', color: '#3b82f6', textAlign: 'center', marginTop: 5 },
  
  card: { backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginLeft: 10, flex: 1 },
  
  locationText: { fontSize: 16, color: '#cbd5e1', marginBottom: 10 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  refreshButtonText: { color: '#3b82f6', fontSize: 14, marginLeft: 5 },
  
  assessmentContainer: { alignItems: 'center', marginBottom: 15 },
  riskBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 10 },
  riskText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  riskScore: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 5 },
  assessmentDate: { fontSize: 12, color: '#94a3b8' },
  
  recommendationsContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(148, 163, 184, 0.2)' },
  recommendationsTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 10 },
  recommendationText: { fontSize: 14, color: '#cbd5e1', lineHeight: 20, marginBottom: 5 },
  
  viewDetailsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingVertical: 8 },
  viewDetailsText: { color: '#3b82f6', fontSize: 14, fontWeight: '600', marginRight: 5 },
  
  noAssessmentContainer: { alignItems: 'center', paddingVertical: 20 },
  noAssessmentTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginTop: 15, marginBottom: 10 },
  noAssessmentText: { fontSize: 14, color: '#cbd5e1', textAlign: 'center', lineHeight: 20 },
  
  profileStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  profileStatusText: { fontSize: 16, color: '#ffffff', marginLeft: 10 },
  completeProfileButton: { backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6' },
  completeProfileText: { color: '#3b82f6', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  
  buttonContainer: { marginTop: 20 },
  button: { width: '100%', borderRadius: 20, overflow: 'hidden', marginBottom: 15 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  
  secondaryButton: { backgroundColor: 'rgba(30, 41, 59, 0.5)', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.3)', borderRadius: 20 },
  secondaryButtonContent: { paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  secondaryButtonText: { color: '#3b82f6', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  
  bottomSpace: { height: 100 },

  // Modal styles
  modalContainer: { flex: 1 },
  modalScrollView: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.2)' },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#ffffff' },
  modalContent: { flex: 1, padding: 20 },
  
  // Health Profile Modal styles
  formGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  input: { backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#ffffff', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.3)' },
  
  genderContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  genderButton: { flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.5)', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.3)' },
  genderButtonActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  genderButtonText: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  genderButtonTextActive: { color: '#ffffff' },
  
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 15, marginTop: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.1)' },
  switchLabel: { fontSize: 16, color: '#ffffff', flex: 1 },
  modalButton: { marginTop: 30, borderRadius: 20, overflow: 'hidden' },
  
  // Assessment Details Modal styles
  assessmentHeader: { alignItems: 'center', marginBottom: 30 },
  airQualitySection: { marginBottom: 25 },
  aqiContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  aqiCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  aqiValue: { fontSize: 24, fontWeight: 'bold' },
  aqiLabel: { fontSize: 12, color: '#94a3b8' },
  aqiInfo: { flex: 1 },
  aqiLevel: { fontSize: 18, fontWeight: '600', marginBottom: 5 },
  aqiDescription: { fontSize: 14, color: '#cbd5e1', lineHeight: 20 },
  
  recommendationsSection: { marginBottom: 25 },
  recommendationItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  locationSection: { marginBottom: 20 }
});
export default HealthAssessmentScreen;