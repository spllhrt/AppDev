import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Dimensions,
  Keyboard, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Fixed import
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { useSelector } from 'react-redux';
import { storeAQIWeatherSnapshot } from '../../api/aqiwea'; // Import your API function

const { width } = Dimensions.get('window');

// Background task name
const BACKGROUND_FETCH_TASK = 'background-aqi-weather-store';
const STORAGE_KEYS = {
  USE_GPS: 'useGPS',
  SAVED_LOCATION: 'savedLocation',
};

// Helper function to get stored location preferences
const getStoredLocationPreferences = async () => {
  try {
    const [useGPSStr, savedLocationStr] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.USE_GPS),
      AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATION),
    ]);
    
    const useGPS = useGPSStr === 'true';
    const savedLocation = savedLocationStr ? JSON.parse(savedLocationStr) : null;
    
    return { useGPS, savedLocation };
  } catch (error) {
    console.error('Error getting stored location preferences:', error);
    return { useGPS: false, savedLocation: null };
  }
};

// Helper function to get coordinates from city name
const getCityCoordinates = async (cityName) => {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data?.results?.length > 0) {
        const result = data.results[0];
        return {
          lat: result.latitude,
          lon: result.longitude,
          city: `${result.name}, ${result.country}`,
          country: result.country,
          timezone: result.timezone || 'auto'
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting city coordinates:', error);
    return null;
  }
};

// Define the background task with flexible location handling
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('Background task: Starting AQI weather storage...');
    
    // Get stored location preferences
    const { useGPS, savedLocation } = await getStoredLocationPreferences();
    
    let latitude, longitude;
    
    if (useGPS) {
      // Try to get GPS location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Background task: Location permission not granted, falling back to saved location');
          
          if (savedLocation) {
            latitude = savedLocation.lat;
            longitude = savedLocation.lon;
          } else {
            console.log('Background task: No saved location available');
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        } else {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 15000, // Increased timeout for background task
          });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        }
      } catch (locationError) {
        console.log('Background task: GPS failed, using saved location:', locationError.message);
        
        if (savedLocation) {
          latitude = savedLocation.lat;
          longitude = savedLocation.lon;
        } else {
          console.log('Background task: No fallback location available');
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      }
    } else {
      // Use saved location
      if (savedLocation) {
        latitude = savedLocation.lat;
        longitude = savedLocation.lon;
      } else {
        console.log('Background task: No saved location available');
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    }

    // Store the snapshot using your API
    await storeAQIWeatherSnapshot(latitude, longitude);

    console.log(`Background task: AQI weather snapshot stored successfully for location: ${latitude}, ${longitude}`);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Utility functions
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const getAQIStatus = (aqi) => {
  if (aqi <= 50) return { 
    status: 'Good', 
    color: ['#10b981', '#059669'], 
    textColor: '#f0fdf4' 
  };
  if (aqi <= 100) return { 
    status: 'Moderate', 
    color: ['#f59e0b', '#ea580c'], 
    textColor: '#fefce8' 
  };
  if (aqi <= 150) return { 
    status: 'Unhealthy for Sensitive', 
    color: ['#ea580c', '#dc2626'], 
    textColor: '#fef2f2' 
  };
  if (aqi <= 200) return { 
    status: 'Unhealthy', 
    color: ['#dc2626', '#b91c1c'], 
    textColor: '#fef2f2' 
  };
  return { 
    status: 'Hazardous', 
    color: ['#9333ea', '#dc2626'], 
    textColor: '#faf5ff' 
  };
};

const getWeatherEmoji = (code) => {
  if (code === 0) return '☀️';
  if (code <= 3) return code === 1 ? '🌤️' : code === 2 ? '⛅' : '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌦️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return '☁️';
};

const getWeatherDescription = (code) => {
  const descriptions = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 46: 'Foggy', 47: 'Foggy', 48: 'Foggy',
    51: 'Rainy', 61: 'Rainy', 71: 'Snowy', 80: 'Rain showers', 95: 'Thunderstorm'
  };
  return descriptions[code] || 'Cloudy';
};

const getWindDirection = (degrees) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

const formatHourTime = (timeString) => {
  const date = new Date(timeString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.getHours().toString().padStart(2, '0') + ':00';
  return (isToday && date.getHours() === now.getHours()) ? 'Now' : timeStr;
};

// Components
const LoadingScreen = ({ location, isGPS }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#10b981" />
    <Text style={styles.loadingText}>
      {isGPS 
        ? 'Getting your location & weather data...' 
        : 'Loading weather & air quality data...'
      }
    </Text>
    <Text style={styles.loadingSubtext}>
      📍 {isGPS ? 'Current Location' : location?.city || 'Loading...'}
    </Text>
  </View>
);

const LocationToggle = ({ useGPS, onToggle, savedLocation, currentLocation }) => (
  <View style={styles.locationToggleContainer}>
    <Text style={styles.locationToggleTitle}>📍 Location Source</Text>
    <View style={styles.locationToggleButtons}>
      <TouchableOpacity
        style={[styles.toggleButton, !useGPS && styles.toggleButtonActive]}
        onPress={() => onToggle(false)}
      >
        <Text style={[
          styles.toggleButtonText, 
          !useGPS && styles.toggleButtonTextActive
        ]}>
          🏠 Saved Location
        </Text>
        <Text style={[
          styles.toggleButtonSubtext, 
          !useGPS && styles.toggleButtonSubtextActive
        ]}>
          {savedLocation?.city || 'Loading...'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.toggleButton, useGPS && styles.toggleButtonActive]}
        onPress={() => onToggle(true)}
      >
        <Text style={[
          styles.toggleButtonText, 
          useGPS && styles.toggleButtonTextActive
        ]}>
          📍 GPS Location
        </Text>
        <Text style={[
          styles.toggleButtonSubtext, 
          useGPS && styles.toggleButtonSubtextActive
        ]}>
          {currentLocation ? currentLocation.city : 'Auto-detect'}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);


const AQICard = ({ currentData }) => {
  const aqiInfo = getAQIStatus(currentData?.aqi?.us_aqi || 85);
  
  return (
    <LinearGradient colors={aqiInfo.color} style={styles.aqiCard}>
      <View style={styles.aqiHeader}>
        <View>
          <Text style={styles.aqiLabel}>AIR QUALITY INDEX</Text>
          <Text style={styles.aqiValue}>{currentData?.aqi?.us_aqi || 85}</Text>
          <Text style={styles.aqiStatus}>{aqiInfo.status}</Text>
        </View>
        <View style={styles.aqiIcon}>
          <Text style={styles.aqiEmoji}>🌬️</Text>
        </View>
      </View>
      
      <View style={styles.pollutants}>
        {[
          { label: 'PM2.5', value: currentData?.aqi?.pm2_5 || 28.8 },
          { label: 'PM10', value: currentData?.aqi?.pm10 || 45.2 },
          { label: 'O₃', value: currentData?.aqi?.ozone || 95.1 },
          { label: 'NO₂', value: currentData?.aqi?.nitrogen_dioxide || 25.4 }
        ].map((pollutant, index) => (
          <View key={index} style={styles.pollutant}>
            <Text style={styles.pollutantLabel}>{pollutant.label}</Text>
            <Text style={styles.pollutantValue}>
              {pollutant.value.toFixed(1)}
            </Text>
            <Text style={styles.pollutantUnit}>μg/m³</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
};

const WeatherCard = ({ currentData, forecastData }) => {
  const currentWeatherCode = currentData?.weather?.weather_code || 1;
  
  return (
    <View style={styles.weatherCard}>
      <View style={styles.weatherHeader}>
        <View>
          <Text style={styles.weatherLabel}>CURRENT WEATHER</Text>
          <Text style={styles.temperature}>
            {Math.round(currentData?.weather?.temperature_2m || 28)}°C
          </Text>
          <Text style={styles.feelsLike}>
            Feels like {Math.round(currentData?.weather?.apparent_temperature || 32)}°C
          </Text>
          <Text style={styles.weatherCondition}>
            {getWeatherDescription(currentWeatherCode)}
          </Text>
        </View>
        <View style={styles.weatherIcon}>
          <Text style={styles.emoji}>{getWeatherEmoji(currentWeatherCode)}</Text>
          {forecastData?.dailyWeather?.temperature_2m_max && (
            <>
              <Text style={styles.highLow}>
                H: {Math.round(forecastData.dailyWeather.temperature_2m_max[0])}°
              </Text>
              <Text style={styles.highLow}>
                L: {Math.round(forecastData.dailyWeather.temperature_2m_min[0])}°
              </Text>
            </>
          )}
        </View>
      </View>
      
      <View style={styles.weatherDetails}>
        {[
          { 
            label: '💨 Wind', 
            value: `${(currentData?.weather?.wind_speed_10m || 8.5).toFixed(1)} km/h ${getWindDirection(currentData?.weather?.wind_direction_10m || 135)}` 
          },
          { 
            label: '💧 Humidity', 
            value: `${currentData?.weather?.relative_humidity_2m || 75}%` 
          },
          { 
            label: '🔽 Pressure', 
            value: `${Math.round(currentData?.weather?.surface_pressure || 1013)} hPa` 
          },
          { 
            label: '🌧️ Rain', 
            value: `${(currentData?.weather?.precipitation || 0).toFixed(1)} mm` 
          }
        ].map((detail, index) => (
          <View key={index} style={styles.weatherDetail}>
            <Text style={styles.detailLabel}>{detail.label}</Text>
            <Text style={styles.detailValue}>{detail.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const HourlyForecast = ({ title, data, renderItem }) => (
  <View style={styles.hourlySection}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <ScrollView 
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hourlyList}
      nestedScrollEnabled={true}
    >
      {data.map(renderItem)}
    </ScrollView>
  </View>
);

const HomeScreen = () => {
  const { user } = useSelector((state) => state.auth);
  
  const [currentData, setCurrentData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [useGPS, setUseGPS] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [savedLocation, setSavedLocation] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [locationInput, setLocationInput] = useState('');
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);

  // Store location preferences to AsyncStorage
  const storeLocationPreferences = async (useGPSPref, savedLoc) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USE_GPS, useGPSPref.toString());
      if (savedLoc) {
        await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATION, JSON.stringify(savedLoc));
      }
    } catch (error) {
      console.error('Error storing location preferences:', error);
    }
  };

  // Setup background task when component mounts
  useEffect(() => {
    const setupBackgroundTask = async () => {
      try {
        // Register the background fetch task
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
          minimumInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          stopOnTerminate: false, // Continue running when app is terminated
          startOnBoot: true, // Start when device reboots
        });
        
        console.log('Background task registered successfully');
      } catch (error) {
        console.error('Failed to register background task:', error);
      }
    };

    setupBackgroundTask();

    // Cleanup on unmount
    return () => {
      BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    };
  }, []);

  // Store current data manually (for immediate storage)
  const storeCurrentSnapshot = async () => {
    try {
      const location = getCurrentLocation();
      if (!location) {
        Alert.alert('Error', 'No location available for storing snapshot');
        return;
      }

      await storeAQIWeatherSnapshot(location.lat, location.lon);
      Alert.alert('Success', 'AQI & Weather snapshot stored successfully!');
    } catch (error) {
      console.error('Error storing snapshot:', error);
      Alert.alert('Error', 'Failed to store snapshot: ' + error.message);
    }
  };

  // Get current location for display
  const getCurrentLocation = () => useGPS ? gpsLocation : savedLocation;

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to use GPS location feature.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const getCurrentGPSLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });

      // Reverse geocode to get city name
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = reverseGeocode[0];
      let cityName = 'Current Location';
      if (address) {
        cityName = address.city 
          ? `${address.city}, ${address.country}` 
          : address.region 
          ? `${address.region}, ${address.country}`
          : address.country || 'Current Location';
      }

      return {
        city: cityName,
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        country: address?.country || 'Unknown',
        timezone: 'auto'
      };
    } catch (error) {
      console.error('Error getting GPS location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please check your location settings.',
        [{ text: 'OK' }]
      );
      return null;
    }
  };

  // Initialize saved location from user profile
  const initializeSavedLocation = async () => {
    if (user?.city) {
      const coordinates = await getCityCoordinates(user.city);
      if (coordinates) {
        setSavedLocation(coordinates);
        // Store the saved location in AsyncStorage
        await storeLocationPreferences(useGPS, coordinates);
      } else {
        // Fallback if geocoding fails
        const fallbackLocation = {
          city: user.city,
          lat: 40.7128, // Default to NYC coordinates
          lon: -74.0060,
          country: 'Unknown',
          timezone: 'auto'
        };
        setSavedLocation(fallbackLocation);
        await storeLocationPreferences(useGPS, fallbackLocation);
      }
    }
  };

  const handleLocationToggle = async (useGPSLocation) => {
    if (useGPSLocation && !gpsLocation) {
      setLoading(true);
      const location = await getCurrentGPSLocation();
      if (location) {
        setGpsLocation(location);
        setUseGPS(true);
        await storeLocationPreferences(true, savedLocation);
      } else {
        setUseGPS(false);
        await storeLocationPreferences(false, savedLocation);
      }
      setLoading(false);
    } else {
      setUseGPS(useGPSLocation);
      await storeLocationPreferences(useGPSLocation, savedLocation);
    }
  };

  const searchLocationAPI = async (cityName) => {
    if (!cityName.trim() || cityName.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    setLocationSearching(true);
    
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`
      );
      
      if (response.ok) {
        const data = await response.json();
        setLocationSuggestions(data?.results || []);
      }
    } catch (error) {
      console.error('Location search failed:', error);
      setLocationSuggestions([]);
    } finally {
      setLocationSearching(false);
    }
  };

 
  const generateFallbackData = () => {
    const generateHourlyData = (baseValue, variation, hours = 24) => {
      return Array.from({ length: hours }, (_, i) => {
        const dailyCycle = Math.sin(i / 12 * Math.PI);
        const randomVariation = (Math.random() - 0.5) * variation;
        return Math.max(0, baseValue + dailyCycle * variation + randomVariation);
      });
    };

    const generateHourlyTimes = (hours = 24) => {
      return Array.from({ length: hours }, (_, i) => {
        const date = new Date();
        date.setHours(date.getHours() + i);
        return date.toISOString();
      });
    };

    return {
      current: {
        weather: {
          temperature_2m: 28.5, 
          relative_humidity_2m: 75, 
          apparent_temperature: 32.1,
          precipitation: 0, 
          weather_code: 1, 
          surface_pressure: 1013.2,
          wind_speed_10m: 8.5, 
          wind_direction_10m: 135, 
          cloud_cover: 25
        },
        aqi: {
          us_aqi: 85, 
          pm10: 45.2, 
          pm2_5: 28.8, 
          carbon_monoxide: 0.8,
          nitrogen_dioxide: 25.4, 
          sulphur_dioxide: 8.2, 
          ozone: 95.1
        }
      },
      forecast: {
        hourlyAQI: { 
          us_aqi: generateHourlyData(85, 30),
          pm2_5: generateHourlyData(28.8, 15),
          pm10: generateHourlyData(45.2, 20),
          ozone: generateHourlyData(95.1, 25),
          time: generateHourlyTimes()
        },
        hourlyWeather: { 
          temperature_2m: generateHourlyData(28.5, 8),
          weather_code: Array.from({ length: 24 }, () => 
            Math.random() > 0.7 ? (Math.random() > 0.5 ? 61 : 3) : 1
          ),
          relative_humidity_2m: generateHourlyData(75, 20),
          wind_speed_10m: generateHourlyData(8.5, 5),
          precipitation: generateHourlyData(0, 2),
          time: generateHourlyTimes()
        },
        dailyWeather: {
          temperature_2m_max: [32, 31],
          temperature_2m_min: [24, 23],
          weather_code: [1, 3]
        }
      }
    };
  };

  const fetchAQIAndWeatherData = async () => {
    const location = getCurrentLocation();
    if (!location) return;

    setLoading(true);
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover&hourly=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,precipitation,apparent_temperature,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=${location.timezone}&forecast_hours=24`;
      
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone&timezone=${location.timezone}&forecast_hours=24`;

      const [weatherResponse, aqiResponse] = await Promise.all([
        fetch(weatherUrl),
        fetch(aqiUrl)
      ]);

      if (weatherResponse.ok && aqiResponse.ok) {
        const [weatherData, aqiData] = await Promise.all([
          weatherResponse.json(),
          aqiResponse.json()
        ]);
        
        setCurrentData({ 
          weather: weatherData.current, 
          aqi: aqiData.current 
        });
        setForecastData({
          hourlyWeather: weatherData.hourly,
          hourlyAQI: aqiData.hourly,
          dailyWeather: weatherData.daily
        });
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      const fallbackData = generateFallbackData();
      setCurrentData(fallbackData.current);
      setForecastData(fallbackData.forecast);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initialize saved location when component mounts or user changes
  useEffect(() => {
    if (user?.city) {
      initializeSavedLocation();
    }
  }, [user]);

  // Fetch data when location changes
  useEffect(() => {
    if (savedLocation || (useGPS && gpsLocation)) {
      fetchAQIAndWeatherData();
    }
  }, [useGPS, savedLocation, gpsLocation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAQIAndWeatherData();
  };

  const renderHourlyAQI = (item, index) => {
    const aqi = Math.round(item);
    const aqiInfo = getAQIStatus(aqi);
    const time = forecastData?.hourlyAQI?.time?.[index] || new Date().toISOString();
    
    return (
      <View key={`aqi-${index}`} style={styles.hourlyItem}>
        <Text style={styles.hourlyTime}>{formatHourTime(time)}</Text>
        <View style={[styles.hourlyAQIBadge, { backgroundColor: aqiInfo.color[0] }]}>
          <Text style={styles.hourlyAQIValue}>{aqi}</Text>
        </View>
        <Text style={styles.hourlyAQIStatus}>{aqiInfo.status.split(' ')[0]}</Text>
        <Text style={styles.hourlyPollutant}>
          PM2.5: {Math.round(forecastData?.hourlyAQI?.pm2_5?.[index] || 0)}
        </Text>
      </View>
    );
  };

  const renderHourlyWeather = (item, index) => {
    const temp = Math.round(item);
    const weatherCode = forecastData?.hourlyWeather?.weather_code?.[index] || 1;
    const time = forecastData?.hourlyWeather?.time?.[index] || new Date().toISOString();
    const humidity = forecastData?.hourlyWeather?.relative_humidity_2m?.[index];
    const precipitation = forecastData?.hourlyWeather?.precipitation?.[index];
    
    return (
      <View key={`weather-${index}`} style={styles.hourlyItem}>
        <Text style={styles.hourlyTime}>{formatHourTime(time)}</Text>
        <Text style={styles.hourlyWeatherEmoji}>{getWeatherEmoji(weatherCode)}</Text>
        <Text style={styles.hourlyTemp}>{temp}°</Text>
        {humidity && <Text style={styles.hourlyHumidity}>{Math.round(humidity)}%</Text>}
        {precipitation > 0 && (
          <Text style={styles.hourlyPrecip}>{precipitation.toFixed(1)}mm</Text>
        )}
      </View>
    );
  };

  const currentLocation = getCurrentLocation();

  if (loading || !savedLocation) {
    return (
      <LoadingScreen 
        location={currentLocation || { city: user?.city }} 
        isGPS={useGPS} 
      />
    );
  }

  const aqiInfo = getAQIStatus(currentData?.aqi?.us_aqi || 85);
  const avgAQI = Math.round(
    // Continue from where the code was cut off:
    forecastData?.hourlyAQI?.us_aqi?.length || 1
  ) || 85;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#10b981']}
          tintColor="#10b981"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Air Quality & Weather</Text>
        <Text style={styles.headerSubtitle}>
          📍 {currentLocation?.city || 'Loading...'}
        </Text>
        <Text style={styles.lastUpdated}>
          Last updated: {lastUpdated.toLocaleString()}
        </Text>
      </View>

      {/* Location Controls */}
      <LocationToggle
        useGPS={useGPS}
        onToggle={handleLocationToggle}
        savedLocation={savedLocation}
        currentLocation={gpsLocation}
      />


      {/* Manual Store Button */}
      <TouchableOpacity 
        style={styles.storeButton}
        onPress={storeCurrentSnapshot}
      >
        <Text style={styles.storeButtonText}>📊 Store Current Snapshot</Text>
      </TouchableOpacity>

      {/* AQI Card */}
      <AQICard currentData={currentData} />

      {/* Weather Card */}
      <WeatherCard currentData={currentData} forecastData={forecastData} />

      {/* Hourly AQI Forecast */}
      {forecastData?.hourlyAQI?.us_aqi?.length > 0 && (
        <HourlyForecast
          title={`🌬️ 24-Hour AQI Forecast (Avg: ${avgAQI})`}
          data={forecastData.hourlyAQI.us_aqi}
          renderItem={renderHourlyAQI}
        />
      )}

      {/* Hourly Weather Forecast */}
      {forecastData?.hourlyWeather?.temperature_2m?.length > 0 && (
        <HourlyForecast
          title="🌡️ 24-Hour Weather Forecast"
          data={forecastData.hourlyWeather.temperature_2m}
          renderItem={renderHourlyWeather}
        />
      )}

      {/* Summary Cards */}
      <View style={styles.summaryCards}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Air Quality</Text>
          <Text style={styles.summaryValue}>
            {aqiInfo.status} ({currentData?.aqi?.us_aqi || 85})
          </Text>
          <Text style={styles.summaryDescription}>
            Primary pollutant: PM2.5 ({(currentData?.aqi?.pm2_5 || 28.8).toFixed(1)} μg/m³)
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Weather Summary</Text>
          <Text style={styles.summaryValue}>
            {Math.round(currentData?.weather?.temperature_2m || 28)}°C
          </Text>
          <Text style={styles.summaryDescription}>
            {getWeatherDescription(currentData?.weather?.weather_code || 1)}
            {currentData?.weather?.precipitation > 0 && 
              ` • ${currentData.weather.precipitation.toFixed(1)}mm rain`
            }
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  // Container & Layout
  container: { flex: 1, backgroundColor: '#0f172a' },
  contentContainer: { paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  
  // Loading States
  loadingText: { color: '#f8fafc', fontSize: 16, marginTop: 16, fontWeight: '500' },
  loadingSubtext: { color: '#64748b', fontSize: 12, marginTop: 8 },
  
  // Header Section
  header: { padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 8 },
  headerSubtitle: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 },
  lastUpdated: { color: '#64748b', fontSize: 11 },
  
  // Location Toggle
  locationToggleContainer: { marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(30, 41, 59, 0.6)', borderRadius: 12, padding: 16 },
  locationToggleTitle: { color: '#f8fafc', fontSize: 12, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  locationToggleButtons: { flexDirection: 'row', gap: 8 },
  toggleButton: { flex: 1, backgroundColor: 'rgba(51, 65, 85, 0.5)', padding: 12, borderRadius: 8 },
  toggleButtonActive: { backgroundColor: 'rgba(14, 165, 233, 0.2)' },
  toggleButtonText: { color: '#cbd5e1', fontSize: 11, fontWeight: '500', textAlign: 'center', marginBottom: 4 },
  toggleButtonTextActive: { color: '#f8fafc' },
  toggleButtonSubtext: { color: '#64748b', fontSize: 10, textAlign: 'center' },
  toggleButtonSubtextActive: { color: '#cbd5e1' },
  
  // Search Components
  searchToggle: { marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(14, 165, 233, 0.1)', padding: 14, borderRadius: 12 },
  searchToggleText: { color: '#f8fafc', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  searchContainer: { marginHorizontal: 20, marginBottom: 20, backgroundColor: 'rgba(30, 41, 59, 0.6)', borderRadius: 16, padding: 16 },
  searchInput: { backgroundColor: 'rgba(51, 65, 85, 0.5)', color: '#f8fafc', padding: 16, borderRadius: 12, fontSize: 14 },
  searchingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 10 },
  searchingText: { color: '#64748b', fontSize: 12 },
  suggestionsList: { maxHeight: 200, marginTop: 12 },
  suggestionItem: { backgroundColor: 'rgba(51, 65, 85, 0.5)', padding: 16, borderRadius: 12, marginBottom: 8 },
  suggestionName: { color: '#f8fafc', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  suggestionDetails: { color: '#64748b', fontSize: 11 },
  
  // Store Button
  storeButton: { marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: 12, borderRadius: 10 },
  storeButtonText: { color: '#f8fafc', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  
  // AQI Card
  aqiCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 20 },
  aqiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  aqiLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  aqiValue: { color: '#fff', fontSize: 42, fontWeight: '700', marginVertical: 8 },
  aqiStatus: { color: '#fff', fontSize: 16, fontWeight: '600' },
  aqiIcon: { alignItems: 'center' },
  aqiEmoji: { fontSize: 36 },
  pollutants: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  pollutant: { alignItems: 'center', flex: 1 },
  pollutantLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },
  pollutantValue: { color: '#fff', fontSize: 16, fontWeight: '600', marginVertical: 4 },
  pollutantUnit: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },
  
  // Weather Card
  weatherCard: { marginHorizontal: 20, backgroundColor: 'rgba(30, 41, 59, 0.6)', borderRadius: 16, padding: 20, marginBottom: 20 },
  weatherHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  weatherLabel: { color: 'rgba(248, 250, 252, 0.8)', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  temperature: { color: '#f8fafc', fontSize: 42, fontWeight: '700', marginVertical: 8 },
  feelsLike: { color: 'rgba(248, 250, 252, 0.7)', fontSize: 12, fontWeight: '400' },
  weatherCondition: { color: '#f8fafc', fontSize: 16, fontWeight: '600', marginTop: 6 },
  weatherIcon: { alignItems: 'center' },
  emoji: { fontSize: 36, marginBottom: 8 },
  highLow: { color: 'rgba(248, 250, 252, 0.8)', fontSize: 12, fontWeight: '500', marginBottom: 2 },
  weatherDetails: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  weatherDetail: { width: '47%', backgroundColor: 'rgba(51, 65, 85, 0.3)', borderRadius: 12, padding: 14 },
  detailLabel: { color: 'rgba(248, 250, 252, 0.8)', fontSize: 11, fontWeight: '500' },
  detailValue: { color: '#f8fafc', fontSize: 14, fontWeight: '600', marginTop: 4 },
  
  // Hourly Forecast
  hourlySection: { marginHorizontal: 20, marginBottom: 24 },
  sectionTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  hourlyList: { paddingHorizontal: 8 },
  hourlyItem: { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderRadius: 12, padding: 14, marginRight: 12, alignItems: 'center', minWidth: 90 },
  hourlyTime: { color: 'rgba(248, 250, 252, 0.8)', fontSize: 11, fontWeight: '500', marginBottom: 10 },
  hourlyAQIBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6 },
  hourlyAQIValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  hourlyAQIStatus: { color: 'rgba(248, 250, 252, 0.8)', fontSize: 9, fontWeight: '500', textAlign: 'center', marginBottom: 4 },
  hourlyPollutant: { color: 'rgba(248, 250, 252, 0.6)', fontSize: 8, marginTop: 2 },
  hourlyWeatherEmoji: { fontSize: 24, marginBottom: 8 },
  hourlyTemp: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  hourlyHumidity: { color: 'rgba(248, 250, 252, 0.6)', fontSize: 9, marginBottom: 2 },
  hourlyPrecip: { color: '#3b82f6', fontSize: 9, fontWeight: '500' },
  
  // Summary Cards
  summaryCards: { paddingHorizontal: 20, gap: 16 },
  summaryCard: { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderRadius: 16, padding: 20 },
  summaryTitle: { color: 'rgba(248, 250, 252, 0.8)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12 },
  summaryValue: { color: '#f8fafc', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  summaryDescription: { color: '#cbd5e1', fontSize: 12, fontWeight: '400', lineHeight: 18, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 10 }
});
export default HomeScreen;