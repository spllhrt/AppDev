import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Dimensions,
  Keyboard, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useSelector } from 'react-redux';

const { width } = Dimensions.get('window');

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

const formatHourTime = (timeString) => {
  const date = new Date(timeString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.getHours().toString().padStart(2, '0') + ':00';
  return (isToday && date.getHours() === now.getHours()) ? 'Now' : timeStr;
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

const LocationSearch = ({ 
  showSearch, onToggle, locationInput, onInputChange, 
  locationSearching, suggestions, onSelectLocation 
}) => (
  <>
    <TouchableOpacity style={styles.searchToggle} onPress={onToggle}>
      <Text style={styles.searchToggleText}>
        🔍 {showSearch ? 'Hide' : 'Change'} Saved Location
      </Text>
    </TouchableOpacity>

    {showSearch && (
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={locationInput}
          onChangeText={onInputChange}
          placeholder="Search for any city worldwide..."
          placeholderTextColor="#9ca3af"
          editable={!locationSearching}
          onSubmitEditing={() => Keyboard.dismiss()}
          returnKeyType="search"
        />
        
        {locationSearching && (
          <View style={styles.searchingIndicator}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        )}

        {suggestions.length > 0 && (
          <ScrollView 
            style={styles.suggestionsList}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={`${item.id}-${index}`}
                style={styles.suggestionItem}
                onPress={() => onSelectLocation(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionName}>{item.name}</Text>
                <Text style={styles.suggestionDetails}>
                  {item.admin1 && `${item.admin1}, `}{item.country}
                  {item.population && ` • Pop: ${item.population.toLocaleString()}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    )}
  </>
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
      } else {
        // Fallback if geocoding fails
        setSavedLocation({
          city: user.city,
          lat: 40.7128, // Default to NYC coordinates
          lon: -74.0060,
          country: 'Unknown',
          timezone: 'auto'
        });
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
      } else {
        setUseGPS(false);
      }
      setLoading(false);
    } else {
      setUseGPS(useGPSLocation);
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

  const debouncedSearch = useCallback(debounce(searchLocationAPI, 500), []);

  const handleLocationInputChange = (text) => {
    setLocationInput(text);
    if (text.length >= 3) {
      debouncedSearch(text);
    } else {
      setLocationSuggestions([]);
      setLocationSearching(false);
    }
  };

  const selectLocation = async (selectedLocation) => {
    const newLocation = {
      city: `${selectedLocation.name}, ${selectedLocation.country}`,
      lat: selectedLocation.latitude,
      lon: selectedLocation.longitude,
      country: selectedLocation.country,
      timezone: selectedLocation.timezone || 'auto'
    };
    
    setSavedLocation(newLocation);
    setShowLocationSearch(false);
    setLocationInput('');
    setLocationSuggestions([]);
    Keyboard.dismiss();
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
    forecastData?.hourlyAQI?.us_aqi?.reduce((a, b) => a + b, 0) / 
    (forecastData?.hourlyAQI?.us_aqi?.length || 1) || 85
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Weather & Air Quality</Text>
            <Text style={styles.location}>
              📍 {currentLocation ? currentLocation.city : 'No Location'}
              {useGPS && ' (GPS)'}
            </Text>
            <Text style={styles.lastUpdated}>
              🕐 Updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? '⏳' : '🔄'} Refresh
            </Text>
          </TouchableOpacity>
        </View>

        {/* Location Toggle */}
        <LocationToggle 
          useGPS={useGPS}
          onToggle={handleLocationToggle}
          savedLocation={savedLocation}
          currentLocation={gpsLocation}
        />

        {/* Location Search (only for saved location) */}
        {!useGPS && (
          <LocationSearch 
            showSearch={showLocationSearch}
            onToggle={() => setShowLocationSearch(!showLocationSearch)}
            locationInput={locationInput}
            onInputChange={handleLocationInputChange}
            locationSearching={locationSearching}
            suggestions={locationSuggestions}
            onSelectLocation={selectLocation}
          />
        )}

        {/* Current Conditions */}
        <View style={styles.currentConditions}>
          <AQICard currentData={currentData} />
          <WeatherCard currentData={currentData} forecastData={forecastData} />
        </View>

        {/* Hourly Forecasts */}
        <HourlyForecast 
          title="📊 Today's AQI Forecast"
          data={forecastData?.hourlyAQI?.us_aqi || []}
          renderItem={renderHourlyAQI}
        />

        <HourlyForecast 
          title="🌤️ Today's Weather Forecast"
          data={forecastData?.hourlyWeather?.temperature_2m || []}
          renderItem={renderHourlyWeather}
        />

        {/* Today's Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>📅 Today's Summary</Text>
          <View style={styles.summaryContent}>
            <View style={styles.summaryWeather}>
              <Text style={styles.summaryEmoji}>
                {getWeatherEmoji(forecastData?.dailyWeather?.weather_code?.[0] || 1)}
              </Text>
              <Text style={styles.summaryTemp}>
                {Math.round(forecastData?.dailyWeather?.temperature_2m_max?.[0] || 32)}° / {Math.round(forecastData?.dailyWeather?.temperature_2m_min?.[0] || 24)}°
              </Text>
            </View>
            <View style={styles.summaryAQI}>
              <Text style={styles.summaryAQILabel}>Avg AQI</Text>
              <View style={[styles.summaryAQIBadge, { backgroundColor: getAQIStatus(avgAQI).color[0] }]}>
                <Text style={styles.summaryAQIValue}>{avgAQI}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.summaryDescription}>
            {getWeatherDescription(forecastData?.dailyWeather?.weather_code?.[0] || 1)} with {getAQIStatus(avgAQI).status.toLowerCase()} air quality
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  loadingText: { color: 'white', fontSize: 18, marginTop: 10, fontWeight: '600' },
  loadingSubtext: { color: '#9ca3af', fontSize: 14, marginTop: 5 },
  header: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: 'rgba(16, 185, 129, 0.2)' },
  headerContent: { marginBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 5 },
  location: { color: '#d1d5db', fontSize: 14, marginBottom: 2 },
  lastUpdated: { color: '#9ca3af', fontSize: 12 },
  refreshButton: { backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', alignSelf: 'flex-start' },
  refreshButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  
 locationToggleContainer: { margin: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  locationToggleTitle: { color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 15, textAlign: 'center' },
  locationToggleButtons: { flexDirection: 'row', gap: 10 },
  toggleButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  toggleButtonActive: { backgroundColor: 'rgba(16, 185, 129, 0.3)', borderColor: 'rgba(16, 185, 129, 0.5)' },
  toggleButtonText: { color: '#d1d5db', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 5 },
  toggleButtonTextActive: { color: 'white' },
  toggleButtonSubtext: { color: '#9ca3af', fontSize: 12, textAlign: 'center' },
  toggleButtonSubtextActive: { color: '#d1d5db' },

  // Search Styles
  searchToggle: { marginHorizontal: 20, marginBottom: 10, backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  searchToggleText: { color: 'white', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  searchContainer: { marginHorizontal: 20, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', padding: 15, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  searchingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 10 },
  searchingText: { color: '#9ca3af', fontSize: 14 },
  suggestionsList: { maxHeight: 200, marginTop: 10 },
  suggestionItem: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  suggestionName: { color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  suggestionDetails: { color: '#9ca3af', fontSize: 12 },

  // Current Conditions
  currentConditions: { paddingHorizontal: 20, gap: 15 },
  
  // AQI Card
  aqiCard: { borderRadius: 20, padding: 20, marginBottom: 15 },
  aqiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  aqiLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  aqiValue: { color: 'white', fontSize: 48, fontWeight: 'bold', marginVertical: 5 },
  aqiStatus: { color: 'white', fontSize: 16, fontWeight: '600' },
  aqiIcon: { alignItems: 'center' },
  aqiEmoji: { fontSize: 40 },
  pollutants: { flexDirection: 'row', justifyContent: 'space-between' },
  pollutant: { alignItems: 'center', flex: 1 },
  pollutantLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  pollutantValue: { color: 'white', fontSize: 16, fontWeight: 'bold', marginVertical: 2 },
  pollutantUnit: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },

  // Weather Card
  weatherCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  weatherHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  weatherLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  temperature: { color: 'white', fontSize: 48, fontWeight: 'bold', marginVertical: 5 },
  feelsLike: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  weatherCondition: { color: 'white', fontSize: 16, fontWeight: '600', marginTop: 5 },
  weatherIcon: { alignItems: 'center' },
  emoji: { fontSize: 40, marginBottom: 5 },
  highLow: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  weatherDetails: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  weatherDetail: { width: '48%', marginBottom: 10 },
  detailLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  detailValue: { color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 2 },

  // Hourly Forecast
  hourlySection: { marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  hourlyList: { paddingHorizontal: 5 },
  hourlyItem: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: 15, marginRight: 12, alignItems: 'center', minWidth: 90, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  hourlyTime: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  hourlyAQIBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 5 },
  hourlyAQIValue: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  hourlyAQIStatus: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  hourlyPollutant: { color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 2 },
  hourlyWeatherEmoji: { fontSize: 24, marginBottom: 5 },
  hourlyTemp: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  hourlyHumidity: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  hourlyPrecip: { color: '#60a5fa', fontSize: 10, fontWeight: '600' },

  // Summary Card Styles - Updated for better presentation
summaryCard: { 
  margin: 20, 
  backgroundColor: 'rgba(255,255,255,0.1)', 
  borderRadius: 20, 
  padding: 25, 
  borderWidth: 1, 
  borderColor: 'rgba(16, 185, 129, 0.3)',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6
},
summaryContent: { 
  flexDirection: 'row', 
  justifyContent: 'space-between', 
  alignItems: 'center',
  marginBottom: 20
},
summaryWeather: { 
  alignItems: 'center', 
  flex: 1 
},
summaryEmoji: { 
  fontSize: 40, 
  marginBottom: 10 
},
summaryTemp: { 
  color: 'white', 
  fontSize: 20, 
  fontWeight: 'bold', 
  marginBottom: 5 
},
summaryAQI: { 
  alignItems: 'center', 
  flex: 1 
},
summaryAQILabel: { 
  color: 'rgba(255,255,255,0.8)', 
  fontSize: 12, 
  marginBottom: 8, 
  fontWeight: '600',
  letterSpacing: 0.5
},
summaryAQIBadge: { 
  borderRadius: 15, 
  paddingHorizontal: 12, 
  paddingVertical: 6, 
  marginBottom: 5,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 3
},
summaryAQIValue: { 
  color: 'white', 
  fontSize: 18, 
  fontWeight: 'bold' 
},
summaryDescription: { 
  color: '#d1d5db', 
  fontSize: 14, 
  textAlign: 'center',
  fontWeight: '500',
  lineHeight: 20,
  backgroundColor: 'rgba(0,0,0,0.2)',
  padding: 12,
  borderRadius: 10,
  marginTop: 5
}
});
export default HomeScreen;