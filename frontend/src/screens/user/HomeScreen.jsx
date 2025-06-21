import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState(null);
  const [useGPS, setUseGPS] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useSelector(state => state.auth || {});
  const userModel = user || { name: 'User', city: 'Manila', country: 'Philippines' };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchWeatherData();
  }, [useGPS]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied');
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000
      });

      return { lat: location.coords.latitude, lon: location.coords.longitude };
    } catch (error) {
      console.error('Location error:', error);
      throw error;
    }
  };

  const getCityCoordinates = async (cityName) => {
    try {
      const cleanCityName = cityName.replace(/\s+City$/i, '').trim();
      const searchVariations = [cityName, cleanCityName, `${cleanCityName}, Philippines`, `${cleanCityName}, Metro Manila, Philippines`];
      
      for (const searchTerm of searchVariations) {
        try {
          const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5&language=en&format=json`);
          if (!response.ok) continue;
          
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const philippinesResult = data.results.find(result => result.country === 'Philippines' || result.country_code === 'PH');
            const result = philippinesResult || data.results[0];
            
            return {
              lat: result.latitude,
              lon: result.longitude,
              name: result.name,
              country: result.country || 'Philippines',
              admin1: result.admin1 || ''
            };
          }
        } catch (searchError) {
          continue;
        }
      }
      
      const knownCities = {
        'taguig': { lat: 14.5176, lon: 121.0509, name: 'Taguig', country: 'Philippines', admin1: 'Metro Manila' },
        'makati': { lat: 14.5547, lon: 121.0244, name: 'Makati', country: 'Philippines', admin1: 'Metro Manila' },
        'quezon city': { lat: 14.6760, lon: 121.0437, name: 'Quezon City', country: 'Philippines', admin1: 'Metro Manila' },
        'manila': { lat: 14.5995, lon: 120.9842, name: 'Manila', country: 'Philippines', admin1: 'Metro Manila' }
      };
      
      const normalizedCity = cleanCityName.toLowerCase();
      if (knownCities[normalizedCity]) return knownCities[normalizedCity];
      
      return { lat: 14.5995, lon: 120.9842, name: 'Manila', country: 'Philippines', admin1: 'Metro Manila' };
    } catch (error) {
      return { lat: 14.5995, lon: 120.9842, name: 'Manila', country: 'Philippines', admin1: 'Metro Manila' };
    }
  };

  const reverseGeocode = async (lat, lon) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`, {
        headers: { 'User-Agent': 'WeatherApp/1.0' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          const city = data.address.city || data.address.town || data.address.village || data.address.municipality || data.address.county || 'Unknown Location';
          const country = data.address.country || '';
          const state = data.address.state || data.address.province || '';
          
          let locationName = city;
          if (state && state !== city) locationName += `, ${state}`;
          if (country) locationName += `, ${country}`;
          
          return locationName;
        }
      }
      return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    } catch (error) {
      return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    }
  };

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
          const userCity = userModel.city || 'Manila';
          const cityCoords = await getCityCoordinates(userCity);
          coordinates = { lat: cityCoords.lat, lon: cityCoords.lon };
          locationDisplayName = cityCoords.country ? `${cityCoords.name}, ${cityCoords.country}` : cityCoords.name;
          setUseGPS(false);
        }
      } else {
        const userCity = userModel.city || 'Manila';
        const cityCoords = await getCityCoordinates(userCity);
        coordinates = { lat: cityCoords.lat, lon: cityCoords.lon };
        locationDisplayName = cityCoords.country ? `${cityCoords.name}, ${cityCoords.country}` : cityCoords.name;
      }

      const [weatherResponse, airQualityResponse] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=us_aqi`)
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
        weather: getWeatherDescription(weather.current.weather_code)
      });

      // Update current time when refreshing
      if (isRefreshing) {
        setCurrentTime(new Date());
      }
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

  const getAQIInfo = (aqi) => {
    if (aqi <= 50) return { status: 'Good', colors: ['#10b981', '#34d399'], textColor: '#ffffff' };
    if (aqi <= 100) return { status: 'Moderate', colors: ['#f59e0b', '#fbbf24'], textColor: '#ffffff' };
    if (aqi <= 150) return { status: 'Unhealthy', colors: ['#f97316', '#fb923c'], textColor: '#ffffff' };
    return { status: 'Hazardous', colors: ['#dc2626', '#ef4444'], textColor: '#ffffff' };
  };

  const getHealthRecommendation = (aqi) => {
    if (aqi <= 50) return { icon: '🏃‍♂️', title: 'Perfect for Outdoors', desc: 'Great air quality! Ideal for activities.', colors: ['#10b981', '#34d399'] };
    if (aqi <= 100) return { icon: '⚠️', title: 'Good with Precautions', desc: 'Moderate air quality. Limit prolonged exertion.', colors: ['#f59e0b', '#fbbf24'] };
    return { icon: '🏠', title: 'Stay Indoors', desc: 'Poor air quality. Consider wearing a mask.', colors: ['#dc2626', '#ef4444'] };
  };

  const getWeatherEmoji = (code) => {
    const emojis = {
      0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
      51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌦️', 63: '🌧️', 65: '🌧️',
      71: '🌨️', 73: '🌨️', 75: '🌨️', 80: '🌧️', 81: '🌧️', 82: '⛈️', 95: '⛈️'
    };
    return emojis[code] || '☁️';
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

  if (loading) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </LinearGradient>
    );
  }

  if (!weatherData) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Failed to load data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchWeatherData()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const { date, time } = formatDateTime(currentTime);
  const aqiInfo = getAQIInfo(weatherData.aqi);
  const healthRec = getHealthRecommendation(weatherData.aqi);

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#3b82f6']}
            progressBackgroundColor="#1e293b"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.dateText}>{date}</Text>
              <Text style={styles.timeText}>{time}</Text>
            </View>
            <TouchableOpacity style={styles.locationToggle} onPress={handleLocationToggle}>
              <Text style={styles.toggleIcon}>{useGPS ? '📍' : '🏙️'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>{weatherData.location}</Text>
          </View>
        </View>

        {/* Current Forecasts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Conditions</Text>
          <View style={styles.forecastGrid}>
            {/* Weather Card */}
            <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.weatherCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.weatherEmoji}>{getWeatherEmoji(weatherData.weatherCode)}</Text>
                <Text style={styles.cardTemp}>{weatherData.temperature}°</Text>
              </View>
              <Text style={styles.cardTitle}>Weather</Text>
              <Text style={styles.cardSubtitle}>{weatherData.weather}</Text>
              <View style={styles.weatherDetails}>
                <Text style={styles.detailText}>💧 {weatherData.humidity}%</Text>
                <Text style={styles.detailText}>💨 {weatherData.windSpeed} km/h</Text>
              </View>
            </LinearGradient>

            {/* AQI Card */}
            <LinearGradient colors={aqiInfo.colors} style={styles.aqiCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.aqiEmoji}>🌬️</Text>
                <Text style={styles.cardAqi}>{weatherData.aqi}</Text>
              </View>
              <Text style={styles.cardTitle}>Air Quality</Text>
              <Text style={styles.cardSubtitle}>{aqiInfo.status}</Text>
              <Text style={styles.aqiStandard}>US AQI Standard</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Traffic Status */}
        <View style={styles.section}>
          <LinearGradient colors={['rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.05)']} style={styles.trafficCard}>
            <View style={styles.trafficContent}>
              <View style={styles.trafficLeft}>
                <Text style={styles.trafficIcon}>🚗</Text>
                <View>
                  <Text style={styles.trafficTitle}>Traffic Status</Text>
                  <Text style={styles.trafficStatus}>Moderate Traffic</Text>
                </View>
              </View>
              <Text style={styles.trafficTime}>Now</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Health Recommendation */}
        <View style={styles.section}>
          <LinearGradient colors={[...healthRec.colors.map(c => c + '20'), ...healthRec.colors.map(c => c + '10')]} style={styles.healthCard}>
            <View style={styles.healthContent}>
              <Text style={styles.healthIcon}>{healthRec.icon}</Text>
              <View style={styles.healthText}>
                <Text style={[styles.healthTitle, { color: healthRec.colors[0] }]}>{healthRec.title}</Text>
                <Text style={styles.healthDesc}>{healthRec.desc}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickGrid}>
            {[
              { icon: '🌡️', title: 'Weather Details', colors: ['#3b82f6', '#1d4ed8'] },
              { icon: '💨', title: 'AQI History', colors: ['#10b981', '#059669'] },
              { icon: '📋', title: 'Health Report', colors: ['#ec4899', '#db2777'] },
              { icon: '📍', title: 'Locations', colors: ['#8b5cf6', '#7c3aed'] }
            ].map((item, index) => (
              <TouchableOpacity key={index} style={styles.quickItem}>
                <LinearGradient colors={[...item.colors.map(c => c + '20'), ...item.colors.map(c => c + '10')]} style={styles.quickCard}>
                  <Text style={styles.quickIcon}>{item.icon}</Text>
                  <Text style={styles.quickTitle}>{item.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#cbd5e1', fontSize: 18, fontWeight: '500' },
  errorText: { color: '#ef4444', fontSize: 16, marginBottom: 12 },
  retryButton: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  dateText: { color: '#94a3b8', fontSize: 14, marginBottom: 4 },
  timeText: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  locationToggle: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 12 },
  toggleIcon: { fontSize: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationIcon: { fontSize: 16 },
  locationText: { color: '#cbd5e1', fontSize: 16, fontWeight: '500' },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  
  forecastGrid: { flexDirection: 'row', gap: 12 },
  weatherCard: { flex: 1, borderRadius: 20, padding: 20 },
  aqiCard: { flex: 1, borderRadius: 20, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  weatherEmoji: { fontSize: 32 },
  cardTemp: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  aqiEmoji: { fontSize: 32 },
  cardAqi: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardSubtitle: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 },
  weatherDetails: { flexDirection: 'row', gap: 16, marginTop: 8 },
  detailText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 },
  aqiStandard: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, marginTop: 8 },

  trafficCard: { borderRadius: 20, padding: 20, backgroundColor: 'rgba(30, 41, 59, 0.5)' },
  trafficContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trafficLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trafficIcon: { fontSize: 24 },
  trafficTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  trafficStatus: { color: '#f59e0b', fontSize: 14, marginTop: 2 },
  trafficTime: { color: '#94a3b8', fontSize: 12 },

  healthCard: { borderRadius: 20, padding: 20, backgroundColor: 'rgba(30, 41, 59, 0.5)' },
  healthContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  healthIcon: { fontSize: 32 },
  healthText: { flex: 1 },
  healthTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  healthDesc: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickItem: { width: (width - 52) / 2 },
  quickCard: { borderRadius: 16, padding: 20, alignItems: 'center', backgroundColor: 'rgba(30, 41, 59, 0.5)' },
  quickIcon: { fontSize: 28, marginBottom: 8 },
  quickTitle: { color: '#ffffff', fontSize: 14, fontWeight: '500', textAlign: 'center' },

  bottomSpace: { height: 100 }
});

export default HomeScreen;