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
  const [philippineCitiesAqi, setPhilippineCitiesAqi] = useState([]);

  const { user } = useSelector(state => state.auth || {});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    initializeAQI();
    fetchMajorCitiesAqi();
  }, [useGPS]);

  useEffect(() => {
    const timer = setTimeout(() => setShowChatLabel(false), 3000);
    return () => clearTimeout(timer);
  }, []);

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
        'manila': { lat: 14.5995, lon: 120.9842 }, 'makati': { lat: 14.5547, lon: 121.0244 },
        'quezon city': { lat: 14.6760, lon: 121.0437 }, 'cebu': { lat: 10.3157, lon: 123.8854 },
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

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F0F23', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainer}>
              <Ionicons name="leaf" size={60} color="#00E676" />
              <Text style={styles.loadingText}>Loading...</Text>
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
                        <Ionicons name="speedometer" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                  <View style={styles.aqiContent}>
                    <View style={styles.aqiMain}>
                      <View style={styles.aqiIndicator}>
                        <View style={[styles.aqiCircle, { backgroundColor: aqiInfo.color }]}>
                          <Text style={styles.aqiNumber}>{currentAQI.aqi}</Text>
                        </View>
                      </View>
                      <View style={styles.aqiDetails}>
                        <Text style={[styles.aqiStatus, { color: aqiInfo.color }]}>{aqiInfo.text}</Text>
                        <View style={styles.aqiProgressContainer}>
                          <View style={styles.aqiProgressBar}>
                            <View style={[styles.aqiProgress, { width: `${Math.min(currentAQI.aqi / 5, 100)}%`, backgroundColor: aqiInfo.color }]} />
                          </View>
                          <Text style={styles.aqiScale}>0 - 500 Scale</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
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
                  </View>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Full Width Cards */}
          <View style={styles.fullWidthSection}>
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
          </View>
          

          {/* Air Quality Trend Chart */}
          <View style={styles.trendCard}>
            <LinearGradient colors={['rgba(156,39,176,0.15)', 'rgba(156,39,176,0.08)', 'rgba(156,39,176,0.03)']} style={styles.cardGradient}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>5-Day AQI Trend</Text>
                  <View style={[styles.cardBadge, { backgroundColor: 'rgba(156,39,176,0.15)' }]}>
                    <Ionicons name="trending-up" size={16} color="#9C27B0" />
                  </View>
                </View>
              </View>
              <View style={styles.chartContainer}>
                <View style={styles.chartGrid}>
                  {aqiData.daily.map((day, index) => {
                    const height = Math.max((day.aqi / 200) * 100, 10);
                    const category = getAQICategory(day.aqi);
                    return (
                      <View key={index} style={styles.chartColumn}>
                        <View style={styles.chartBar}>
                          <View 
                            style={[
                              styles.chartBarFill, 
                              { 
                                height: `${height}%`, 
                                backgroundColor: category.color 
                              }
                            ]} 
                          />
                        </View>
                        <Text style={styles.chartLabel}>{day.aqi}</Text>
                        <Text style={styles.chartDay}>
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#00E676' }]} />
                    <Text style={styles.legendText}>Good (0-50)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
                    <Text style={styles.legendText}>Moderate (51-100)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.legendText}>Unhealthy (101+)</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Pollutants Breakdown */}
          <View style={styles.pollutantsCard}>
            <LinearGradient colors={['rgba(255,87,34,0.15)', 'rgba(255,87,34,0.08)', 'rgba(255,87,34,0.03)']} style={styles.cardGradient}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>Current Pollutants</Text>
                  <View style={[styles.cardBadge, { backgroundColor: 'rgba(255,87,34,0.15)' }]}>
                    <Ionicons name="flask" size={16} color="#FF5722" />
                  </View>
                </View>
              </View>
              <View style={styles.pollutantsGrid}>
                <View style={styles.pollutantItem}>
                  <View style={styles.pollutantIcon}>
                    <Ionicons name="radio-button-on" size={16} color="#FF5722" />
                  </View>
                  <View style={styles.pollutantData}>
                    <Text style={styles.pollutantName}>PM2.5</Text>
                    <Text style={styles.pollutantValue}>{pollutants.pm25?.toFixed(1) || 0} μg/m³</Text>
                  </View>
                </View>
                <View style={styles.pollutantItem}>
                  <View style={styles.pollutantIcon}>
                    <Ionicons name="radio-button-on" size={16} color="#FF9800" />
                  </View>
                  <View style={styles.pollutantData}>
                    <Text style={styles.pollutantName}>PM10</Text>
                    <Text style={styles.pollutantValue}>{pollutants.pm10?.toFixed(1) || 0} μg/m³</Text>
                  </View>
                </View>
                <View style={styles.pollutantItem}>
                  <View style={styles.pollutantIcon}>
                    <Ionicons name="radio-button-on" size={16} color="#2196F3" />
                  </View>
                  <View style={styles.pollutantData}>
                    <Text style={styles.pollutantName}>CO</Text>
                    <Text style={styles.pollutantValue}>{pollutants.co?.toFixed(1) || 0} mg/m³</Text>
                  </View>
                </View>
                <View style={styles.pollutantItem}>
                  <View style={styles.pollutantIcon}>
                    <Ionicons name="radio-button-on" size={16} color="#9C27B0" />
                  </View>
                  <View style={styles.pollutantData}>
                    <Text style={styles.pollutantName}>O₃</Text>
                    <Text style={styles.pollutantValue}>{pollutants.ozone?.toFixed(1) || 0} μg/m³</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
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
  header: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 32 : 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 32 },
  headerLeft: { flex: 1 },
  brandContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  brandIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,230,118,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  brandText: { gap: 2 },
  brandTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  brandSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerCenter: { flex: 1, alignItems: 'center' },
  dateText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
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
  aqiContent: { gap: 16 },
  aqiMain: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  aqiIndicator: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  aqiCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  aqiNumber: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  aqiDetails: { flex: 1 },
  aqiStatus: { fontSize: 20, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  aqiProgressContainer: { gap: 8 },
  aqiProgressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4 },
  aqiProgress: { height: 8, borderRadius: 4 },
  aqiScale: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' },
  advisoryCard: { borderRadius: 24, overflow: 'hidden' },
  advisoryContent: { gap: 16 },
  advisoryIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,230,118,0.15)', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  advisoryText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, lineHeight: 24, fontWeight: '500' },
  quickActionsCard: { borderRadius: 24, overflow: 'hidden' },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickActionBtn: { width: '48%', alignItems: 'center', backgroundColor: 'rgba(0,230,118,0.1)', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)' },
  quickActionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,230,118,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  fullWidthSection: { gap: 24, paddingTop: 12 },
  healthTipsCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 24 },
  healthTipsContent: { gap: 16 },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(33,150,243,0.1)', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(33,150,243,0.2)' },
  tipIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(33,150,243,0.15)', justifyContent: 'center', alignItems: 'center' },
  tipContent: { flex: 1 },
  tipTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  tipDescription: { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 16 },
  trendCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 24 },
  chartContainer: { gap: 20 },
  chartGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, paddingHorizontal: 8 },
  chartColumn: { flex: 1, alignItems: 'center', gap: 8 },
  chartBar: { width: 24, height: 80, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill: { width: '100%', borderRadius: 12, minHeight: 8 },
  chartLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  chartDay: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '500' },
  chartLegend: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500' },
  pollutantsCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 24 },
  pollutantsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pollutantItem: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,87,34,0.1)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,87,34,0.2)' },
  pollutantIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,87,34,0.15)', justifyContent: 'center', alignItems: 'center' },
  pollutantData: { flex: 1 },
  pollutantName: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  pollutantValue: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },
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
  '@media (max-width: 100%)': { mainGrid: { flexDirection: 'column' }, leftColumn: { flex: 1 }, rightColumn: { flex: 1 } },
});
export default HomeScreen;