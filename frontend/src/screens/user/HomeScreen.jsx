import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions, RefreshControl, StatusBar, Platform, SafeAreaView } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState(null);
  const [advisories, setAdvisories] = useState(null);
  const [useGPS, setUseGPS] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showChatLabel, setShowChatLabel] = useState(true);
  const [aqiData, setAqiData] = useState(null);
  const [location, setLocation] = useState(null);
  const [displayLocationName, setDisplayLocationName] = useState('');

  const { user } = useSelector(state => state.auth || {});
  const userModel = user || { name: 'User', city: 'Manila', country: 'Philippines' };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    initializeAQI();
  }, [useGPS]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowChatLabel(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleChatPress = () => {
    navigation.navigate('Chatbot');
  };

  // AQI Functions from AQIScreen
  const initializeAQI = async () => {
    try {
      setLoading(true);
      let coords;
      let locationName = '';
      
      try {
        // Priority 1: Use GPS if enabled
        if (useGPS) {
          coords = await getCurrentLocation();
          const address = await reverseGeocode(coords.latitude, coords.longitude);
          locationName = address?.city || address?.region || 'Current Location';
        }
        // Priority 2: Use user's city from profile
        else if (user?.city) {
          coords = await geocodeCity(user.city);
          if (coords) {
            const address = await reverseGeocode(coords.latitude, coords.longitude);
            locationName = address?.city || address?.region || user.city;
          }
        }
        // Fallback: Use GPS as last resort
        else {
          coords = await getCurrentLocation();
          const address = await reverseGeocode(coords.latitude, coords.longitude);
          locationName = address?.city || address?.region || 'Current Location';
        }
      } catch (geocodeError) {
        console.log('Geocoding error, using fallback Manila coordinates:', geocodeError);
        coords = { latitude: 14.5995, longitude: 120.9842 };
        locationName = 'Manila';
      }
      
      if (coords) {
        setLocation({ ...coords, name: locationName });
        setDisplayLocationName(locationName);
        await fetchAQIData(coords.latitude, coords.longitude);
      }
    } catch (error) {
      Alert.alert('AQI Error', 'Failed to load air quality data.', [
        { text: 'Retry', onPress: initializeAQI }, 
        { text: 'Cancel', style: 'cancel' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
        {
          headers: {
            'User-Agent': 'YourAppName/1.0 (your@email.com)'
          }
        }
      );
      
      const text = await response.text();
      if (text.startsWith('<!DOCTYPE html>') || text.startsWith('<')) {
        throw new Error('Received HTML response instead of JSON');
      }
      
      const data = JSON.parse(text);
      return {
        city: data.address?.city || data.address?.town,
        region: data.address?.state || data.address?.region,
        country: data.address?.country
      };
    } catch (error) {
      console.log('Reverse geocoding failed:', error);
      return null;
    }
  };

  const geocodeCity = async (city) => {
    try {
      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}, Philippines&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'YourAppName/1.0 (your@email.com)'
          }
        }
      );
      
      const text = await response.text();
      if (text.startsWith('<!DOCTYPE html>') || text.startsWith('<')) {
        throw new Error('Received HTML response instead of JSON');
      }
      
      const data = JSON.parse(text);
      
      if (data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
      
      const philippineCities = {
        'manila': { lat: 14.5995, lon: 120.9842 },
        'makati': { lat: 14.5547, lon: 121.0244 },
        'quezon city': { lat: 14.6760, lon: 121.0437 },
        'cebu': { lat: 10.3157, lon: 123.8854 },
        'davao': { lat: 7.1907, lon: 125.4553 },
      };
      
      const normalizedCity = city.toLowerCase().trim();
      if (philippineCities[normalizedCity]) {
        return philippineCities[normalizedCity];
      }
      
      throw new Error('City not found');
    } catch (error) {
      console.log('Geocoding failed:', error);
      throw error;
    }
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Location permission denied');
    const location = await Location.getCurrentPositionAsync({ 
      accuracy: Location.Accuracy.Balanced, 
      timeout: 15000, 
      maximumAge: 300000 
    });
    return { 
      latitude: location.coords.latitude, 
      longitude: location.coords.longitude 
    };
  };

  const fetchAQIData = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust,uv_index,ammonia&forecast_days=5&timezone=auto`
      );
      if (!response.ok) throw new Error(`AQI API error: ${response.status}`);
      const data = await response.json();
      if (!data.hourly?.pm2_5) throw new Error('Invalid AQI data');
      
      const processedData = { ...data, daily: calculateDailyAQI(data.hourly) };
      setAqiData(processedData);
      
      // Also fetch weather data since we have coordinates
      await fetchWeatherData(lat, lon);
    } catch (error) {
      console.error('Failed to fetch AQI data:', error);
      throw error;
    }
  };

  const calculateDailyAQI = (hourly) => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const dayStart = i * 24;
      const dayEnd = Math.min(dayStart + 24, hourly.pm2_5.length);
      if (dayStart >= hourly.pm2_5.length) break;
      
      const dayHours = hourly.pm2_5.slice(dayStart, dayEnd).filter(val => val !== null);
      if (dayHours.length === 0) continue;
      
      const avgPM25 = dayHours.reduce((sum, val) => sum + val, 0) / dayHours.length;
      const calculatedAQI = pm25ToAQI(avgPM25);
      days.push({ 
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        aqi: calculatedAQI, 
        pm25: avgPM25, 
        category: getAQICategory(calculatedAQI) 
      });
    }
    return days;
  };

  const pm25ToAQI = (pm25) => {
    if (isNaN(pm25) || pm25 < 0) return 0;
    const breakpoints = [
      { cLo: 0, cHi: 12.0, iLo: 0, iHi: 50 },
      { cLo: 12.1, cHi: 35.4, iLo: 51, iHi: 100 },
      { cLo: 35.5, cHi: 55.4, iLo: 101, iHi: 150 },
      { cLo: 55.5, cHi: 150.4, iLo: 151, iHi: 200 },
      { cLo: 150.5, cHi: 250.4, iLo: 201, iHi: 300 },
      { cLo: 250.5, cHi: 500.4, iLo: 301, iHi: 500 }
    ];
    
    for (const bp of breakpoints) {
      if (pm25 >= bp.cLo && pm25 <= bp.cHi) {
        return Math.round(((bp.iHi - bp.iLo) / (bp.cHi - bp.cLo)) * (pm25 - bp.cLo) + bp.iLo);
      }
    }
    return 500;
  };

  const getAQICategory = (aqi) => {
    if (aqi <= 50) return { text: 'Good', color: '#00E676', bgColor: 'rgba(0,230,118,0.15)' };
    if (aqi <= 100) return { text: 'Moderate', color: '#FFC107', bgColor: 'rgba(255,193,7,0.15)' };
    if (aqi <= 150) return { text: 'Unhealthy for Sensitive', color: '#FF9800', bgColor: 'rgba(255,152,0,0.15)' };
    if (aqi <= 200) return { text: 'Unhealthy', color: '#F44336', bgColor: 'rgba(244,67,54,0.15)' };
    if (aqi <= 300) return { text: 'Very Unhealthy', color: '#9C27B0', bgColor: 'rgba(156,39,176,0.15)' };
    return { text: 'Hazardous', color: '#B71C1C', bgColor: 'rgba(183,28,28,0.15)' };
  };

  const getCurrentPollutants = () => {
    if (!aqiData?.hourly) return {};
    
    const currentIndex = 0;
    
    return {
      pm25: aqiData.hourly.pm2_5?.[currentIndex] || 0,
      pm10: aqiData.hourly.pm10?.[currentIndex] || 0,
      co: aqiData.hourly.carbon_monoxide?.[currentIndex] || 0,
      no2: aqiData.hourly.nitrogen_dioxide?.[currentIndex] || 0,
      so2: aqiData.hourly.sulphur_dioxide?.[currentIndex] || 0,
      ozone: aqiData.hourly.ozone?.[currentIndex] || 0,
    };
  };

  const fetchWeatherData = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat || location?.latitude || 14.5995}&longitude=${lon || location?.longitude || 120.9842}&current=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`
      );
      
      if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
      const weather = await response.json();
      
      const weatherDataObj = {
        location: displayLocationName,
        temperature: Math.round(weather.current.temperature_2m),
        humidity: weather.current.relative_humidity_2m,
        windSpeed: Math.round(weather.current.wind_speed_10m * 10) / 10,
        weatherCode: weather.current.weather_code,
        weather: getWeatherDescription(weather.current.weather_code)
      };
      
      setWeatherData(weatherDataObj);
      
      // Generate advisories based on current AQI and weather
      if (aqiData?.daily?.[0]) {
        const advisoryData = await generateAdvisories({
          ...weatherDataObj,
          aqi: aqiData.daily[0].aqi
        });
        setAdvisories(advisoryData);
      }
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
    }
  };

  const generateAdvisories = async (data) => {
    try {
      const prompt = `Based on the current weather and air quality conditions, provide a single paragraph advisory (maximum 120 words) with personalized health and activity recommendations. Make it engaging and actionable.

Current conditions:
- Temperature: ${data.temperature}°C
- Weather: ${data.weather}
- Humidity: ${data.humidity}%
- Wind Speed: ${data.windSpeed} km/h
- Air Quality Index: ${data.aqi} (${getAQICategory(data.aqi).text})

Format your response as a JSON object with a single 'text' property containing the paragraph. Example:
{"text": "With excellent air quality and pleasant temperatures, it's a perfect day for outdoor activities like jogging or cycling. Stay hydrated due to moderate humidity levels, and consider wearing light clothing. The gentle breeze makes it ideal for spending time in parks or outdoor dining."}`;

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyA2DYXABEdYm5YBxg0YAp1BvbrIWbmNU3Q', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          try {
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanContent);
          } catch (parseError) {
            console.log('Parse error, using fallback advisory');
          }
        }
      }
    } catch (error) {
      console.log('Advisory generation failed, using fallback');
    }

    // Fallback advisory
    const aqiInfo = getAQICategory(data.aqi);
    let advisory = "";
    
    if (aqiInfo.text === 'Good') {
      advisory += "Air quality is excellent today, making it perfect for outdoor activities and exercise. ";
    } else if (aqiInfo.text === 'Moderate') {
      advisory += "Air quality is moderate - light outdoor activities are recommended. ";
    } else {
      advisory += "Poor air quality detected - consider staying indoors and keeping windows closed. ";
    }

    if (data.temperature > 30) {
      advisory += "High temperatures call for staying hydrated and seeking shade during peak hours. ";
    } else if (data.temperature < 20) {
      advisory += "Cool weather - dress warmly when heading out. ";
    }

    if (data.humidity > 70) {
      advisory += "High humidity levels mean you'll need extra hydration and breathable clothing.";
    }

    return { text: advisory || "Stay aware of current conditions and adjust your activities accordingly for optimal comfort and health." };
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

  const formatDateTime = (date) => ({
    date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  });

  const getWeatherIcon = (code) => {
    if (code === 0) return 'sunny';
    if (code <= 2) return 'partly-sunny';
    if (code === 3) return 'cloudy';
    if (code >= 45 && code <= 48) return 'cloud';
    if (code >= 51 && code <= 65) return 'rainy';
    if (code >= 71 && code <= 75) return 'snow';
    if (code >= 80 && code <= 82) return 'rainy';
    if (code >= 95) return 'thunderstorm';
    return 'partly-sunny';
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

  const handleQuickAccess = (screen) => {
    if (screen === 'Weather' || screen === 'Aqi') {
      navigation.navigate(screen, {
        cityName: displayLocationName,
        lat: location?.latitude,
        lon: location?.longitude
      });
    } else {
      Alert.alert('Coming Soon', 'This feature is coming soon!');
    }
  };

  const onRefresh = () => {
    initializeAQI();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={[styles.safeArea, styles.center]}>
            <Text style={styles.loadingText}>Loading...</Text>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (!weatherData || !aqiData?.daily?.[0]) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={[styles.safeArea, styles.center]}>
            <Text style={styles.errorText}>Failed to load data</Text>
            <TouchableOpacity style={styles.retryButton} onPress={initializeAQI}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  const { date, time } = formatDateTime(currentTime);
  const currentAQI = aqiData.daily[0];
  const aqiInfo = getAQICategory(currentAQI.aqi);
  const pollutants = getCurrentPollutants();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E676" colors={['#00E676']} progressBackgroundColor="#1A1A2E" />}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.dateText}>{date}</Text>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
                <TouchableOpacity style={styles.locationToggle} onPress={handleLocationToggle}>
                  <Ionicons name={useGPS ? 'location' : 'home'} size={20} color="#00E676" />
                </TouchableOpacity>
              </View>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color="#00E676" />
                <Text style={styles.locationText}>{displayLocationName}</Text>
              </View>
            </View>

            {/* Current Conditions */}
            <View style={styles.conditionsContainer}>
              <TouchableOpacity style={styles.weatherCard}>
                <LinearGradient colors={['rgba(0,230,118,0.1)', 'rgba(0,230,118,0.05)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGradient}>
                  <View style={styles.cardContent}>
                    <View style={styles.cardLeft}>
                      <View style={styles.weatherIconContainer}>
                        <Ionicons name={getWeatherIcon(weatherData.weatherCode)} size={48} color="#00E676" />
                      </View>
                    </View>
                    <View style={styles.cardCenter}>
                      <Text style={styles.cardTitle}>Weather</Text>
                      <Text style={styles.weatherTemp}>{weatherData.temperature}°</Text>
                      <Text style={styles.weatherDesc}>{weatherData.weather}</Text>
                    </View>
                    <View style={styles.cardRight}>
                      <View style={styles.weatherStats}>
                        <View style={styles.statItem}>
                          <Ionicons name="water-outline" size={16} color="#00E676" />
                          <Text style={styles.statText}>{weatherData.humidity}%</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Ionicons name="leaf-outline" size={16} color="#00E676" />
                          <Text style={styles.statText}>{weatherData.windSpeed} km/h</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.aqiCard}
                onPress={() => navigation.navigate('Aqi', {
                  cityName: displayLocationName,
                  lat: location?.latitude,
                  lon: location?.longitude
                })}
              >
                <LinearGradient colors={[aqiInfo.bgColor, 'rgba(255,255,255,0.02)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGradient}>
                  <View style={styles.cardContent}>
                    <View style={styles.cardLeft}>
                      <View style={[styles.aqiIconContainer, { backgroundColor: aqiInfo.bgColor }]}>
                        <Ionicons name="analytics" size={32} color={aqiInfo.color} />
                      </View>
                    </View>
                    <View style={styles.cardCenter}>
                      <Text style={styles.cardTitle}>Air Quality Index</Text>
                      <Text style={[styles.aqiValue, { color: aqiInfo.color }]}>{currentAQI.aqi}</Text>
                      <Text style={[styles.aqiStatus, { color: aqiInfo.color }]}>{aqiInfo.text}</Text>
                    </View>
                    <View style={styles.cardRight}>
                      <View style={styles.aqiIndicator}>
                        <View style={[styles.aqiDot, { backgroundColor: aqiInfo.color }]} />
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* AI Advisories */}
            {advisories && (
              <View style={styles.advisorySection}>
                <Text style={styles.sectionTitle}>Smart Advisory</Text>
                <View style={styles.advisoryCard}>
                  <View style={styles.advisoryIcon}>
                    <Ionicons name="bulb-outline" size={20} color="#00E676" />
                  </View>
                  <Text style={styles.advisoryText}>{advisories.text}</Text>
                </View>
              </View>
            )}

            {/* Health Recommendation */}
            <View style={styles.healthSection}>
              <TouchableOpacity style={styles.healthCard} onPress={() => navigation.navigate('Health')}>
                <View style={styles.healthContent}>
                  <View style={styles.healthIcon}>
                    <Ionicons name="heart-outline" size={24} color="#00E676" />
                  </View>
                  <View style={styles.healthText}>
                    <Text style={styles.healthTitle}>Health Assessment</Text>
                    <Text style={styles.healthDesc}>Get personalized health recommendations based on current conditions</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#00E676" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Quick Access */}
            <View style={styles.quickSection}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              <View style={styles.quickGrid}>
                {[
                  { icon: 'cloud-outline', title: 'Weather Forecast', screen: 'Weather' },
                  { icon: 'speedometer-outline', title: 'Air Quality', screen: 'Aqi' }
                ].map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.quickItem} 
                    onPress={() => handleQuickAccess(item.screen)}
                  >
                    <View style={styles.quickCard}>
                      <View style={styles.quickIconContainer}>
                        <Ionicons name={item.icon} size={24} color="#00E676" />
                      </View>
                      <Text style={styles.quickTitle}>{item.title}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
      <View style={styles.chatContainer}>
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={handleChatPress}
          activeOpacity={0.8}
        >
          <View style={styles.chatButtonContent}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
            {showChatLabel && (
              <View style={styles.chatLabel}>
                <Text style={styles.chatLabelText}>Chat with AirBud</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomSpace} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 20 },
  loadingText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#E91E63', fontSize: 16, marginBottom: 16 },
  retryButton: { backgroundColor: '#00E676', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 20, marginBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  dateText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 4 },
  timeText: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
  locationToggle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,230,118,0.2)', justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '500' },

  conditionsContainer: { paddingHorizontal: 20, marginBottom: 24, gap: 20 },
  weatherCard: { borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#00E676', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  aqiCard: { borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  cardGradient: { padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardContent: { flexDirection: 'row', alignItems: 'center', minHeight: 80 },
  cardLeft: { marginRight: 16 },
  cardCenter: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  
  weatherIconContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,230,118,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(0,230,118,0.3)' },
  weatherTemp: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', marginBottom: 4, textShadowColor: 'rgba(0,230,118,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  weatherDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  weatherStats: { marginBottom: 12, gap: 8 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,230,118,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

  aqiIconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  aqiValue: { fontSize: 32, fontWeight: '800', marginBottom: 4, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  aqiStatus: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  aqiIndicator: { marginBottom: 12 },
  aqiDot: { width: 12, height: 12, borderRadius: 6, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },

  cardTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },

  advisorySection: { paddingHorizontal: 20, marginBottom: 24 },
  advisoryCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, borderColor: 'rgba(0,230,118,0.1)', borderWidth: 1 },
  advisoryIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,230,118,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  advisoryText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 20 },

  healthSection: { paddingHorizontal: 20, marginBottom: 24 },
  healthCard: { backgroundColor: 'rgba(0,230,118,0.1)', borderRadius: 16, padding: 20, borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  healthContent: { flexDirection: 'row', alignItems: 'center' },
  healthIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,230,118,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  healthText: { flex: 1 },
  healthTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  healthDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 },

  quickSection: { paddingHorizontal: 20, paddingBottom:100},
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickItem: { width: (width - 52) / 2 },
  quickCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, alignItems: 'center', borderColor: 'rgba(0,230,118,0.1)', borderWidth: 1 },
  quickIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,230,118,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  quickTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500', textAlign: 'center' },

  chatContainer: {
  position: 'absolute',
  bottom: 120,
  right: 20,
  alignItems: 'flex-end',
},
chatButton: {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: 'transparent',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: 'rgba(0,230,118,0.8)',
  shadowColor: '#00E676',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
},
chatLabel: {
  position: 'absolute',
  right: 66,
  top: 16,
  backgroundColor: 'rgba(0,0,0,0.9)',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 12,
  borderColor: 'rgba(0,230,118,0.3)',
  borderWidth: 1,
},
chatLabelText: {
  color: 'rgba(255,255,255,0.9)',
  fontSize: 12,
  fontWeight: '500',
},
  bottomSpace: { height: 0 }
});
export default HomeScreen;