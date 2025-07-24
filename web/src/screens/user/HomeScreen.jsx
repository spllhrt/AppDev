import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Dimensions, RefreshControl, StatusBar, Platform, SafeAreaView, Image } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getAllBulletins } from '../../api/bulletin';
import { getMyReports } from '../../api/report';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState(null);
  const [advisories, setAdvisories] = useState(null);
  const [useGPS, setUseGPS] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aqiData, setAqiData] = useState(null);
  const [location, setLocation] = useState(null);
  const [displayLocationName, setDisplayLocationName] = useState('');
  const [philippineCitiesAqi, setPhilippineCitiesAqi] = useState([]);
  const [topBulletins, setTopBulletins] = useState([]);
  const [topReports, setTopReports] = useState([]);
  const [error, setError] = useState(null);

  const { user } = useSelector(state => state.auth || {});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    initializeAQI();
    fetchMajorCitiesAqi();
    fetchTopBulletins();
    fetchTopReports();
  }, [useGPS]);

  const fetchTopReports = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await getMyReports();
      const sortedReports = [...(response.reports || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
      setTopReports(sortedReports);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message || 'Failed to fetch reports');
      Alert.alert('Error', err.message || 'Could not load your reports', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTopBulletins = async () => {
    try {
      const bulletins = await getAllBulletins();
      const sorted = [...bulletins].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
      setTopBulletins(sorted);
    } catch (error) {
      console.error('Failed to fetch bulletins:', error);
    }
  };

  const handleChatPress = () => navigation.navigate('Chatbot');

  const fetchMajorCitiesAqi = async () => {
    const cities = [
      { name: 'Manila', lat: 14.5995, lon: 120.9842 },
      { name: 'Quezon City', lat: 14.6760, lon: 121.0437 },
      { name: 'Caloocan', lat: 14.6507, lon: 120.9676 },
      { name: 'Las Piñas', lat: 14.4649, lon: 120.9779 },
      { name: 'Makati', lat: 14.5547, lon: 121.0244 },
      { name: 'Malabon', lat: 14.6619, lon: 120.9569 },
      { name: 'Mandaluyong', lat: 14.5794, lon: 121.0359 },
      { name: 'Marikina', lat: 14.6507, lon: 121.1029 },
      { name: 'Muntinlupa', lat: 14.3832, lon: 121.0409 },
      { name: 'Navotas', lat: 14.6691, lon: 120.9469 },
      { name: 'Parañaque', lat: 14.4793, lon: 121.0198 },
      { name: 'Pasay', lat: 14.5378, lon: 120.9896 },
      { name: 'Pasig', lat: 14.5764, lon: 121.0851 },
      { name: 'San Juan', lat: 14.6019, lon: 121.0355 },
      { name: 'Taguig', lat: 14.5176, lon: 121.0509 },
      { name: 'Valenzuela', lat: 14.7000, lon: 120.9820 },
      { name: 'Pateros', lat: 14.5443, lon: 121.0699 },
    ];

    try {
      const aqiPromises = cities.map(async city => {
        try {
          const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&hourly=pm2_5&forecast_days=1&timezone=auto`);
          if (!response.ok) return null;
          const data = await response.json();
          if (!data.hourly?.pm2_5) return null;

          const pm25Values = data.hourly.pm2_5.filter(val => val !== null);
          const avgPM25 = pm25Values.reduce((sum, val) => sum + val, 0) / pm25Values.length;
          const aqi = pm25ToAQI(avgPM25);

          return { ...city, aqi, category: getAQICategory(aqi) };
        } catch (error) {
          console.error(`Failed to fetch AQI for ${city.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(aqiPromises);
      const validResults = results.filter(city => city !== null);
      validResults.sort((a, b) => a.aqi - b.aqi);
      setPhilippineCitiesAqi(validResults);
    } catch (error) {
      console.error('Failed to fetch cities AQI:', error);
    }
  };

  const initializeAQI = async () => {
    try {
      setLoading(true);
      let coords, locationName = '';

      try {
        if (useGPS) {
          coords = await getCurrentLocation();
          const address = await reverseGeocode(coords.latitude, coords.longitude);
          locationName = address?.city || address?.region || 'Current Location';
        } else if (user?.city) {
          coords = await geocodeCity(user.city);
          if (coords) {
            const address = await reverseGeocode(coords.latitude, coords.longitude);
            locationName = address?.city || address?.region || user.city;
          }
        } else {
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
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`, {
        headers: { 'User-Agent': 'YourAppName/1.0 (your@email.com)' }
      });

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
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}, Philippines&format=json&limit=1`, {
        headers: { 'User-Agent': 'YourAppName/1.0 (your@email.com)' }
      });

      const text = await response.text();
      if (text.startsWith('<!DOCTYPE html>') || text.startsWith('<')) {
        throw new Error('Received HTML response instead of JSON');
      }

      const data = JSON.parse(text);

      if (data.length > 0) {
        return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
      }

      const philippineCities = {
        'manila': { latitude: 14.5995, longitude: 120.9842 }, 'makati': { latitude: 14.5547, longitude: 121.0244 },
        'quezon city': { latitude: 14.6760, longitude: 121.0437 }, 'cebu': { latitude: 10.3157, longitude: 123.8854 },
        'davao': { latitude: 7.1907, longitude: 125.4553 },
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
    return { latitude: location.coords.latitude, longitude: location.coords.longitude };
  };

  const fetchAQIData = async (lat, lon) => {
    try {
      const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust,uv_index,ammonia&forecast_days=5&timezone=auto`);
      if (!response.ok) throw new Error(`AQI API error: ${response.status}`);
      const data = await response.json();
      if (!data.hourly?.pm2_5) throw new Error('Invalid AQI data');

      const processedData = { ...data, daily: calculateDailyAQI(data.hourly) };
      setAqiData(processedData);
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
      { cLo: 0, cHi: 12.0, iLo: 0, iHi: 50 }, { cLo: 12.1, cHi: 35.4, iLo: 51, iHi: 100 },
      { cLo: 35.5, cHi: 55.4, iLo: 101, iHi: 150 }, { cLo: 55.5, cHi: 150.4, iLo: 151, iHi: 200 },
      { cLo: 150.5, cHi: 250.4, iLo: 201, iHi: 300 }, { cLo: 250.5, cHi: 500.4, iLo: 301, iHi: 500 }
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
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat || location?.latitude || 14.5995}&longitude=${lon || location?.longitude || 120.9842}&current=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`);

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

      if (aqiData?.daily?.[0]) {
        const advisoryData = await generateAdvisories({ ...weatherDataObj, aqi: aqiData.daily[0].aqi });
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
      0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast', 45: 'Foggy', 48: 'Depositing Rime Fog',
      51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle', 61: 'Slight Rain', 63: 'Moderate Rain',
      65: 'Heavy Rain', 71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow', 80: 'Rain Showers',
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

  const getAQIIcon = (aqi) => {
    if (aqi <= 50) return 'leaf';
    if (aqi <= 100) return 'leaf-outline';
    if (aqi <= 150) return 'aperture-outline';
    if (aqi <= 200) return 'nuclear-outline';
    if (aqi <= 300) return 'warning-outline';
    return 'skull-outline';
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await initializeAQI();
      await fetchMajorCitiesAqi();
      await fetchTopReports();
      await fetchTopBulletins();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickAccess = (screen) => {
    if (screen === 'Weather' || screen === 'Aqi') {
      navigation.navigate(screen, { cityName: displayLocationName, lat: location?.latitude, lon: location?.longitude });
    } else {
      Alert.alert('Coming Soon', 'This feature is coming soon!');
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Environmental Alert': '🌍', 'Weather Update': '🌤️', 'Public Safety': '🚨', 'Emergency': '🚨',
      'Event Notice': '📅', 'Service Disruption': '⚠️', 'Health Advisory': '🏥', 'Traffic Alert': '🚦',
      'Community Announcement': '📢', 'General': '📢'
    };
    return icons[category] || '📢';
  };

  const formatTimeAgo = (dateString) => {
    const diffInMinutes = Math.floor((new Date() - new Date(dateString)) / (1000 * 60));
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Updated photo layout function matching AdminDashboard
  const renderPhotoLayout = (photos) => {
    if (!photos || photos.length === 0) return null;

    switch (photos.length) {
      case 1:
        return (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photos[0].url }} style={styles.singlePhoto} />
          </View>
        );
      case 2:
        return (
          <View style={styles.photoContainer}>
            <View style={styles.photoRow}>
              <Image source={{ uri: photos[0].url }} style={styles.halfPhoto} />
              <Image source={{ uri: photos[1].url }} style={styles.halfPhoto} />
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photos[0].url }} style={styles.mainPhoto} />
            <View style={styles.photoRow}>
              <Image source={{ uri: photos[1].url }} style={styles.halfPhoto} />
              <Image source={{ uri: photos[2].url }} style={styles.halfPhoto} />
            </View>
          </View>
        );
      default:
        return (
          <View style={styles.photoContainer}>
            <View style={styles.photoRow}>
              <Image source={{ uri: photos[0].url }} style={styles.halfPhoto} />
              <Image source={{ uri: photos[1].url }} style={styles.halfPhoto} />
            </View>
            <View style={styles.photoRow}>
              <Image source={{ uri: photos[2].url }} style={styles.halfPhoto} />
              <View style={styles.morePhotosContainer}>
                <Image 
                  source={{ uri: photos[3].url }} 
                  style={[styles.halfPhoto, photos.length > 4 && styles.blurredPhoto]} 
                  blurRadius={photos.length > 4 ? 2 : 0} 
                />
                {photos.length > 4 && (
                  <View style={styles.morePhotosOverlay}>
                    <Text style={styles.morePhotosText}>+{photos.length - 4}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F0F23', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainer}>
              <Ionicons name="leaf" size={60} color="#00E676" />
              <Text style={styles.loadingText}>Loading...</Text>
              <View style={styles.loadingSpinner}>
                <ActivityIndicator size="large" color="#00E676" />
              </View>
            </View>
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
  const bestCities = philippineCitiesAqi.slice(0, 5);
  const worstCities = [...philippineCitiesAqi].reverse().slice(0, 5);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00E676" colors={['#00E676']} progressBackgroundColor="#1A1A2E" />}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                  <View style={styles.brandContainer}>
                    <View style={styles.brandText}>
                      <View style={styles.locationBadge}>
                        <Ionicons name="location-outline" size={18} color="#00E676" />
                        <Text style={styles.locationText}>{displayLocationName}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.headerRight}>
                  <View style={styles.locationContainer}>
                    <View style={styles.controlsContainer}>
                      <TouchableOpacity style={[styles.controlBtn, refreshing && styles.refreshingButton]} onPress={handleRefresh} disabled={refreshing}>
                        <Ionicons name="refresh" size={20} color="#00E676" style={[refreshing && styles.refreshingIcon]} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.controlBtn} onPress={handleLocationToggle}>
                        <Ionicons name={useGPS ? 'location' : 'home'} size={20} color="#00E676" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Main Content Grid */}
            <View style={styles.mainGrid}>
              {/* Left Column - Primary Cards */}
              <View style={styles.leftColumn}>
                {/* Weather Card */}
                <TouchableOpacity style={styles.weatherCard}>
                  <LinearGradient colors={['rgba(0,230,118,0.15)', 'rgba(0,230,118,0.08)', 'rgba(0,230,118,0.03)']} style={styles.cardGradient}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>Current Weather</Text>
                        <View style={styles.cardBadge}>
                          <Ionicons name="partly-sunny" size={16} color="#00E676" />
                        </View>
                      </View>
                    </View>
                    <View style={styles.weatherContent}>
                      <View style={styles.weatherMain}>
                        <View style={styles.weatherIconLarge}>
                          <Ionicons name={getWeatherIcon(weatherData.weatherCode)} size={64} color="#00E676" />
                        </View>
                        <View style={styles.weatherData}>
                          <Text style={styles.weatherTemp}>{weatherData.temperature}°C</Text>
                          <Text style={styles.weatherDesc}>{weatherData.weather}</Text>
                        </View>
                      </View>
                      <View style={styles.weatherMetrics}>
                        <View style={styles.metricCard}>
                          <View style={styles.metricIcon}>
                            <Ionicons name="water-outline" size={20} color="#00E676" />
                          </View>
                          <View style={styles.metricData}>
                            <Text style={styles.metricValue}>{weatherData.humidity}%</Text>
                            <Text style={styles.metricLabel}>Humidity</Text>
                          </View>
                        </View>
                        <View style={styles.metricCard}>
                          <View style={styles.metricIcon}>
                            <Ionicons name="leaf-outline" size={20} color="#00E676" />
                          </View>
                          <View style={styles.metricData}>
                            <Text style={styles.metricValue}>{weatherData.windSpeed} km/h</Text>
                            <Text style={styles.metricLabel}>Wind Speed</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* AQI Card */}
                <TouchableOpacity style={styles.aqiCard}>
                  <LinearGradient colors={[aqiInfo.bgColor, 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.1)']} style={styles.cardGradient}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>Air Quality Index</Text>
                        <View style={[styles.cardBadge, { backgroundColor: aqiInfo.color }]}>
                          <Ionicons name="leaf" size={16} color="#FFFFFF" />
                        </View>
                      </View>
                    </View>
                    <View style={styles.aqiContent}>
                      <View style={styles.aqiMain}>
                        <View style={styles.aqiIndicator}>
                          <View style={[styles.aqiCircle, { backgroundColor: aqiInfo.color }]}>
                            <Ionicons name={getAQIIcon(currentAQI.aqi)} size={48} color="#FFFFFF" />
                          </View>
                          <View style={styles.aqiData}>
                            <Text style={styles.aqiNumber}>{currentAQI.aqi}</Text>
                            <Text style={[styles.aqiStatus, { color: aqiInfo.color }]}>{aqiInfo.text}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.aqiDetails}>
                        <View style={styles.aqiProgressContainer}>
                          <View style={styles.aqiProgressBar}>
                            <View style={[styles.aqiProgress, { width: `${Math.min(currentAQI.aqi / 5, 100)}%`, backgroundColor: aqiInfo.color }]} />
                          </View>
                          <View style={styles.aqiScaleContainer}>
                            <Text style={styles.aqiScale}>0</Text>
                            <Text style={styles.aqiScale}>Good</Text>
                            <Text style={styles.aqiScale}>500</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Cities Bulletin */}
                {philippineCitiesAqi.length > 0 && (
                  <View style={styles.bulletinCard}>
                    <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']} style={styles.cardGradient}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                          <Text style={styles.cardTitle}>Metro Manila Air Quality Overview</Text>
                          <View style={styles.cardBadge}>
                            <Ionicons name="stats-chart" size={16} color="#00E676" />
                          </View>
                        </View>
                      </View>
                      <View style={styles.bulletinContent}>
                        <View style={styles.bulletinGrid}>
                          <View style={styles.bulletinSection}>
                            <View style={styles.bulletinSectionHeader}>
                              <View style={[styles.bulletinIndicator, { backgroundColor: '#00C853' }]} />
                              <Text style={styles.bulletinSectionTitle}>Best Air Quality</Text>
                            </View>
                            <View style={styles.cityList}>
                              {bestCities.map((city, idx) => (
                                <View key={`best-${idx}`} style={styles.cityItem}>
                                  <Text style={styles.cityRank}>{idx + 1}</Text>
                                  <Text style={styles.cityName}>{city.name}</Text>
                                  <View style={styles.cityAqiContainer}>
                                    <View style={[styles.cityAqiDot, { backgroundColor: city.category.color }]} />
                                    <Text style={[styles.cityAqiValue, { color: city.category.color }]}>{city.aqi}</Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          </View>
                          <View style={styles.bulletinSection}>
                            <View style={styles.bulletinSectionHeader}>
                              <View style={[styles.bulletinIndicator, { backgroundColor: '#FF5252' }]} />
                              <Text style={styles.bulletinSectionTitle}>Worst Air Quality</Text>
                            </View>
                            <View style={styles.cityList}>
                              {worstCities.map((city, idx) => (
                                <View key={`worst-${idx}`} style={styles.cityItem}>
                                  <Text style={styles.cityRank}>{idx + 1}</Text>
                                  <Text style={styles.cityName}>{city.name}</Text>
                                  <View style={styles.cityAqiContainer}>
                                    <View style={[styles.cityAqiDot, { backgroundColor: city.category.color }]} />
                                    <Text style={[styles.cityAqiValue, { color: city.category.color }]}>{city.aqi}</Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                )}

                {/* Top Bulletins Card - Updated with matching layout */}
                {topBulletins.length > 0 && (
                  <View style={styles.bulletinCard}>
                    <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']} style={styles.cardGradient}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                          <Text style={styles.cardTitle}>Latest Bulletins</Text>
                          <View style={styles.headerRightContainer}>
                            <TouchableOpacity style={styles.seeMoreButton} onPress={() => navigation.navigate('BulletinScreen')}>
                              <Text style={styles.seeMoreText}>See More</Text>
                              <Ionicons name="chevron-forward" size={16} color="#00E676" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                      <View style={styles.bulletinContent}>
                        {topBulletins.map((bulletin, idx) => (
                          <View key={bulletin._id} style={styles.bulletinPost}>
                            <TouchableOpacity onPress={() => navigation.navigate('BulletinDetail', { bulletin })} activeOpacity={0.7}>
                              <View style={styles.bulletinHeader}>
                                <View style={styles.bulletinIcon}>
                                  <Text style={styles.bulletinIconText}>{getCategoryIcon(bulletin.category)}</Text>
                                </View>
                                <View style={styles.bulletinInfo}>
                                  <Text style={styles.bulletinTitle}>{bulletin.title}</Text>
                                  <Text style={styles.bulletinCategory}>{bulletin.category}</Text>
                                  <Text style={styles.bulletinTime}>{formatTimeAgo(bulletin.createdAt)}</Text>
                                </View>
                              </View>
                              
                              <Text style={styles.bulletinMessage}>{bulletin.message}</Text>
                              
                              {renderPhotoLayout(bulletin.photos)}
                              
                              <View style={styles.bulletinFooter}>
                                <View style={styles.bulletinReactions}>
                                  <View style={styles.reactionButton}>
                                    <Ionicons name="thumbs-up-outline" size={16} color="#10B981" style={styles.reactionIcon} />
                                    <Text style={styles.reactionText}>{bulletin.reactions?.filter(r => r.type === 'upvote').length || 0}</Text>
                                  </View>
                                  <View style={styles.reactionButton}>
                                    <Ionicons name="thumbs-down-outline" size={16} color="#EF4444" style={styles.reactionIcon} />
                                    <Text style={styles.reactionText}>{bulletin.reactions?.filter(r => r.type === 'downvote').length || 0}</Text>
                                  </View>
                                </View>
                                <Text style={styles.commentCount}>💬 {bulletin.comments?.length || 0} comments</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </LinearGradient>
                  </View>
                )}
              </View>

              {/* Right Column - Secondary Cards */}
              <View style={styles.rightColumn}>
                {/* AI Advisory */}
                {advisories && (
                  <View style={styles.advisoryCard}>
                    <LinearGradient colors={['rgba(0,230,118,0.1)', 'rgba(0,230,118,0.05)', 'rgba(0,230,118,0.02)']} style={styles.cardGradient}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                          <Text style={styles.cardTitle}>AI Advisory</Text>
                          <View style={styles.cardBadge}>
                            <Ionicons name="bulb" size={16} color="#00E676" />
                          </View>
                        </View>
                      </View>
                      <View style={styles.advisoryContent}>
                        <Text style={styles.advisoryText}>{advisories.text}</Text>
                      </View>
                    </LinearGradient>
                  </View>
                )}

                {/* Quick Actions */}
                <View style={styles.quickActionsCard}>
                  <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']} style={styles.cardGradient}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>Quick Actions</Text>
                        <View style={styles.cardBadge}>
                          <Ionicons name="flash" size={16} color="#00E676" />
                        </View>
                      </View>
                    </View>
                    <View style={styles.quickActionsGrid}>
                      <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('HealthAssessment')}>
                        <View style={styles.quickActionIcon}>
                          <Ionicons name="heart" size={24} color="#00E676" />
                        </View>
                        <Text style={styles.quickActionText}>Health</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleQuickAccess('Weather')}>
                        <View style={styles.quickActionIcon}>
                          <Ionicons name="cloud" size={24} color="#00E676" />
                        </View>
                        <Text style={styles.quickActionText}>Weather</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleQuickAccess('Aqi')}>
                        <View style={styles.quickActionIcon}>
                          <Ionicons name="analytics" size={24} color="#00E676" />
                        </View>
                        <Text style={styles.quickActionText}>AQI</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickActionBtn} onPress={handleChatPress}>
                        <View style={styles.quickActionIcon}>
                          <Ionicons name="chatbubbles" size={24} color="#00E676" />
                        </View>
                        <Text style={styles.quickActionText}>Chat</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('ReportScreen')}>
                        <View style={styles.quickActionIcon}>
                          <Ionicons name="megaphone" size={24} color="#00E676" />
                        </View>
                        <Text style={styles.quickActionText}>Report</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('MyReportScreen')}>
                        <View style={styles.quickActionIcon}>
                          <Ionicons name="list" size={24} color="#00E676" />
                        </View>
                        <Text style={styles.quickActionText}>My Reports</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>

                {/* Health Tips */}
                <View style={styles.healthTipsCard}>
                  <LinearGradient colors={['rgba(33,150,243,0.15)', 'rgba(33,150,243,0.08)', 'rgba(33,150,243,0.03)']} style={styles.cardGradient}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>Health Tips</Text>
                        <View style={[styles.cardBadge, { backgroundColor: 'rgba(33,150,243,0.15)' }]}>
                          <Ionicons name="fitness" size={16} color="#2196F3" />
                        </View>
                      </View>
                    </View>
                    <View style={styles.healthTipsContent}>
                      <View style={styles.tipCard}>
                        <View style={styles.tipIcon}>
                          <Ionicons name="water" size={20} color="#2196F3" />
                        </View>
                        <View style={styles.tipContent}>
                          <Text style={styles.tipTitle}>Hydration Reminder</Text>
                          <Text style={styles.tipDescription}>
                            {currentAQI.aqi > 150 ? 'Drink extra water to help flush out toxins' : 'Stay hydrated - aim for 8 glasses of water daily'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.tipCard}>
                        <View style={styles.tipIcon}>
                          <Ionicons name="home" size={20} color="#2196F3" />
                        </View>
                        <View style={styles.tipContent}>
                          <Text style={styles.tipTitle}>Indoor Air Quality</Text>
                          <Text style={styles.tipDescription}>
                            {currentAQI.aqi > 100 ? 'Keep windows closed and use air purifiers' : 'Open windows for fresh air circulation'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.tipCard}>
                        <View style={styles.tipIcon}>
                          <Ionicons name="leaf" size={20} color="#2196F3" />
                        </View>
                        <View style={styles.tipContent}>
                          <Text style={styles.tipTitle}>Respiratory Health</Text>
                          <Text style={styles.tipDescription}>
                            {currentAQI.aqi > 100 ? 'Consider breathing exercises and avoid outdoor activities' : 'Perfect conditions for deep breathing exercises'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Top Reports Card */}
                {topReports.length > 0 && (
                  <View style={styles.reportsCard}>
                    <LinearGradient colors={['rgba(255,152,0,0.15)', 'rgba(255,152,0,0.08)', 'rgba(255,152,0,0.03)']} style={styles.cardGradient}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                          <Text style={styles.cardTitle}>Latest Reports</Text>
                          <View style={styles.headerRightContainer}>
                            <TouchableOpacity style={styles.seeMoreButton} onPress={() => navigation.navigate('MyReportScreen')}>
                              <Text style={styles.seeMoreText}>See More</Text>
                              <Ionicons name="chevron-forward" size={16} color="#00E676" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                      <View style={styles.reportsContent}>
                        {topReports.map((report, idx) => (
                          <TouchableOpacity key={report._id} style={styles.reportItem} onPress={() => navigation.navigate('MyReportScreen')}>
                            {report.photo?.url && (
                              <Image source={{ uri: report.photo.url }} style={styles.reportImage} resizeMode="cover" />
                            )}
                            <View style={styles.reportTextContent}>
                              <View style={styles.reportItemHeader}>
                                <Text style={styles.reportItemType}>{report.type}</Text>
                                <Text style={styles.reportItemTime}>
                                  {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </Text>
                              </View>
                              <Text style={styles.reportItemLocation} numberOfLines={1}>
                                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.6)" />
                                {' '}{report.location}
                              </Text>
                              {report.description && (
                                <Text style={styles.reportItemDescription} numberOfLines={2}>
                                  {report.description}
                                </Text>
                              )}
                              <View style={styles.reportItemFooter}>
                                <View style={[styles.reportStatusBadge, {
                                  backgroundColor: report.status === 'resolved' ? 'rgba(76,175,80,0.2)' :
                                    report.status === 'verified' ? 'rgba(33,150,243,0.2)' : 'rgba(255,193,7,0.2)',
                                  borderColor: report.status === 'resolved' ? '#4CAF50' :
                                    report.status === 'verified' ? '#2196F3' : '#FFC107'
                                }]}>
                                  <Text style={[styles.reportStatusText, {
                                    color: report.status === 'resolved' ? '#4CAF50' :
                                      report.status === 'verified' ? '#2196F3' : '#FFC107'
                                  }]}>
                                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </LinearGradient>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', maxWidth: '100%', alignSelf: 'center', width: '100%', minHeight: '100vh' },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 140, paddingHorizontal: 70, minHeight: '100vh' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#FFFFFF', marginTop: 20, fontWeight: '600' },
  loadingSpinner: { marginTop: 20 },
  header: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 32 : 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 32 },
  headerLeft: { flex: 1 },
  brandContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  brandText: { gap: 2 },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  locationContainer: { alignItems: 'flex-end', gap: 12 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,230,118,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  locationText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  controlsContainer: { flexDirection: 'row', gap: 12 },
  controlBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  refreshingButton: { opacity: 0.6 },
  refreshingIcon: { opacity: 0.5 },
  mainGrid: { flexDirection: 'row', gap: 24, marginBottom: 32, '@media (max-width: 768px)': { flexDirection: 'column' } },
  leftColumn: { flex: 2.5, gap: 24 },
  rightColumn: { flex: 1.5, gap: 24 },
  cardGradient: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  cardHeader: { marginBottom: 20 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  cardBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,230,118,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  weatherCard: { borderRadius: 24, overflow: 'hidden' },
  weatherContent: { gap: 20 },
  weatherMain: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  weatherIconLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,230,118,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(0,230,118,0.3)' },
  weatherData: { flex: 1 },
  weatherTemp: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -1, marginBottom: 4 },
  weatherDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500' },
  weatherMetrics: { flexDirection: 'row', gap: 16 },
  metricCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,230,118,0.1)', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)' },
  metricIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,230,118,0.15)', justifyContent: 'center', alignItems: 'center' },
  metricData: { flex: 1 },
  metricValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  metricLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
  aqiCard: { borderRadius: 24, overflow: 'hidden' },
  aqiContent: { gap: 50, paddingVertical: 1 },
  aqiMain: { flexDirection: 'column', alignItems: 'center', gap: 16 },
  aqiIndicator: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  aqiCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  aqiData: { alignItems: 'flex-start', gap: 4 },
  aqiNumber: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  aqiDetails: { width: '100%' },
  aqiStatus: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  aqiProgressContainer: { gap: 12, width: '100%' },
  aqiProgressBar: { height: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  aqiProgress: { height: 10, borderRadius: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  aqiScaleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  aqiScale: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
  advisoryCard: { borderRadius: 24, overflow: 'hidden' },
  advisoryContent: { gap: 16 },
  advisoryText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, lineHeight: 24, fontWeight: '500' },
  quickActionsCard: { borderRadius: 24, overflow: 'hidden' },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickActionBtn: { width: '48%', alignItems: 'center', backgroundColor: 'rgba(0,230,118,0.1)', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)' },
  quickActionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,230,118,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  healthTipsCard: { borderRadius: 24, overflow: 'hidden', marginBottom: -13 },
  healthTipsContent: { gap: 16 },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(33,150,243,0.1)', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(33,150,243,0.2)' },
  tipIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(33,150,243,0.15)', justifyContent: 'center', alignItems: 'center' },
  tipContent: { flex: 1 },
  tipTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  tipDescription: { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 16 },
  headerRightContainer: { flexDirection: 'row', alignItems: 'center' },
  seeMoreButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  seeMoreText: { color: '#00E676', fontSize: 12, fontWeight: '600', marginRight: 4 },
  bulletinCard: { borderRadius: 24, overflow: 'hidden', paddingBottom: 25 },
  bulletinContent: { gap: 20 },
  bulletinGrid: { flexDirection: 'row', gap: 32, '@media (max-width: 768px)': { flexDirection: 'column', gap: 24 } },
  bulletinSection: { flex: 1 },
  bulletinSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  bulletinIndicator: { width: 12, height: 12, borderRadius: 6 },
  bulletinSectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  cityList: { gap: 12 },
  cityItem: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cityRank: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700', width: 20 },
  cityName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', flex: 1 },
  cityAqiContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cityAqiDot: { width: 8, height: 8, borderRadius: 4 },
  cityAqiValue: { fontSize: 14, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  
  // Updated bulletin post styles matching AdminDashboard
  bulletinPost: { 
    backgroundColor: 'rgba(255,255,255,0.04)', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(0,230,118,0.1)' 
  },
  bulletinHeader: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  bulletinIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  bulletinIconText: { fontSize: 20, color: '#ffffff' },
  bulletinInfo: { flex: 1 },
  bulletinTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4, lineHeight: 20 },
  bulletinCategory: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginBottom: 4 },
  bulletinTime: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '400' },
  bulletinMessage: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 22, marginBottom: 16 },
  
  // Photo layout styles matching AdminDashboard
  photoContainer: { marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  singlePhoto: { width: '100%', height: 200, resizeMode: 'cover' },
  mainPhoto: { width: '100%', height: 180, resizeMode: 'cover', marginBottom: 4 },
  photoRow: { flexDirection: 'row', gap: 4 },
  halfPhoto: { flex: 1, height: 120, resizeMode: 'cover' },
  morePhotosContainer: { flex: 1, position: 'relative' },
  blurredPhoto: { position: 'relative' },
  morePhotosOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  morePhotosText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  
  bulletinFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  bulletinReactions: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  reactionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  reactionIcon: { marginRight: 4 },
  reactionText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  commentCount: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  
  reportsCard: { borderRadius: 24, overflow: 'hidden', marginBottom: -13 },
  reportsContent: { gap: 16 },
  reportItem: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,152,0,0.1)' },
  reportImage: { width: '100%', height: 120, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  reportTextContent: { padding: 16 },
  reportItemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reportItemType: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  reportItemTime: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 12 },
  reportItemLocation: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 16, marginBottom: 8 },
  reportItemDescription: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18, marginBottom: 12 },
  reportItemFooter: { flexDirection: 'row', justifyContent: 'flex-start' },
  reportStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  reportStatusText: { fontSize: 11, fontWeight: '600' },
  
  '@media (max-width: 100%)': { mainGrid: { flexDirection: 'column' }, leftColumn: { flex: 1 }, rightColumn: { flex: 1 } },
});

export default HomeScreen;