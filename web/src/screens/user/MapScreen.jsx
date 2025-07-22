import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, 
  SafeAreaView, StatusBar, Platform, Animated, Dimensions,
  TextInput, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import _ from 'lodash';

const { width: screenWidth } = Dimensions.get('window');
const DRAWER_WIDTH = 280;

const METRO_MANILA_LGUS = [
  { name: "Manila", lat: 14.5995, lon: 120.9842 },
  { name: "Quezon City", lat: 14.6760, lon: 121.0437 },
  { name: "Caloocan", lat: 14.6546, lon: 120.9839 },
  { name: "Las Piñas", lat: 14.4496, lon: 120.9828 },
  { name: "Makati", lat: 14.5547, lon: 121.0244 },
  { name: "Malabon", lat: 14.6626, lon: 120.9567 },
  { name: "Mandaluyong", lat: 14.5794, lon: 121.0359 },
  { name: "Marikina", lat: 14.6507, lon: 121.1029 },
  { name: "Muntinlupa", lat: 14.4081, lon: 121.0415 },
  { name: "Navotas", lat: 14.6667, lon: 120.9411 },
  { name: "Parañaque", lat: 14.4793, lon: 121.0198 },
  { name: "Pasay", lat: 14.5378, lon: 121.0014 },
  { name: "Pasig", lat: 14.5764, lon: 121.0851 },
  { name: "San Juan", lat: 14.6019, lon: 121.0355 },
  { name: "Taguig", lat: 14.5176, lon: 121.0509 },
  { name: "Valenzuela", lat: 14.7004, lon: 120.9839 },
  { name: "Pateros", lat: 14.5411, lon: 121.0685 }
];

const WEATHER_CONDITIONS = {
  0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  51: 'Light Drizzle', 53: 'Drizzle', 61: 'Light Rain', 63: 'Rain', 
  65: 'Heavy Rain', 95: 'Thunderstorm'
};

const getWeatherColor = (condition, temp) => {
  if (temp >= 35) return '#FF5722';
  if (temp >= 30) return '#FF9800';
  if (temp >= 25) return '#FFC107';
  if (temp >= 20) return '#4CAF50';
  return '#2196F3';
};

const getAQIColor = (aqi) => {
  if (aqi <= 50) return '#00E676';
  if (aqi <= 100) return '#FFC107';
  if (aqi <= 150) return '#FF9800';
  if (aqi <= 200) return '#F44336';
  if (aqi <= 300) return '#9C27B0';
  return '#B71C1C';
};

const getAQIStatus = (aqi) => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

const MapScreen = ({ navigation }) => {
  const [state, setState] = useState({
    dataLayer: 'none',
    cities: METRO_MANILA_LGUS,
    loading: false,
    drawerOpen: false,
    searchQuery: '',
    searchResults: [],
    showSearchResults: false,
    isSearching: false,
    selectedLocation: null,
    searchCache: {},
    weatherData: {},
    aqiData: {}
  });
  
  const drawerAnimation = useState(new Animated.Value(-DRAWER_WIDTH))[0];
  const searchInputRef = useRef(null);
  const iframeRef = useRef(null);
  const lastNominatimRequest = useRef(0);
  const NOMINATIM_RATE_LIMIT = 1000;
  const blurTimeoutRef = useRef(null);
  
  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

  const fetchWeatherData = useCallback(async () => {
    if (!state.cities.length) return;
    
    const weatherPromises = state.cities.map(async (city) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia/Manila`
        );
        const weather = await response.json();
        return [city.name, {
          temp: Math.round(weather.current.temperature_2m),
          humidity: weather.current.relative_humidity_2m,
          condition: WEATHER_CONDITIONS[weather.current.weather_code] || 'Unknown',
        }];
      } catch (error) {
        console.error(`Weather error for ${city.name}:`, error);
        return [city.name, null];
      }
    });

    const results = await Promise.all(weatherPromises);
    const weatherData = Object.fromEntries(results.filter(([, data]) => data));
    updateState({ weatherData });
  }, [state.cities]);

  const fetchAQIData = useCallback(async () => {
    if (!state.cities.length) return;
    
    const aqiPromises = state.cities.map(async (city) => {
      try {
        const response = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=us_aqi,pm10,pm2_5&timezone=auto`
        );
        const aqi = await response.json();
        
        if (aqi.current) {
          const aqiValue = aqi.current.us_aqi || 0;
          return [city.name, {
            pm25: aqi.current.pm2_5 || 0,
            pm10: aqi.current.pm10 || 0,
            aqi: Math.round(aqiValue),
            status: getAQIStatus(aqiValue),
            timestamp: aqi.current.time
          }];
        }
        return [city.name, null];
      } catch (error) {
        console.error(`AQI error for ${city.name}:`, error);
        return [city.name, null];
      }
    });

    const results = await Promise.all(aqiPromises);
    const aqiData = Object.fromEntries(results.filter(([, data]) => data));
    updateState({ aqiData });
  }, [state.cities]);

  const searchLocations = async (query) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastNominatimRequest.current;
    
    if (timeSinceLastRequest < NOMINATIM_RATE_LIMIT) {
      await new Promise(resolve => 
        setTimeout(resolve, NOMINATIM_RATE_LIMIT - timeSinceLastRequest)
      );
    }
    
    lastNominatimRequest.current = Date.now();
    
    if (!query.trim()) {
      updateState({
        searchResults: [],
        showSearchResults: false,
        isSearching: false
      });
      return;
    }
        
    try {
      const boundedUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&bounded=1&viewbox=120.85,14.3,121.15,14.8&countrycodes=ph`;
      
      const response = await fetch(boundedUrl, { 
        headers: { 'User-Agent': 'MetroManilaWeatherApp/1.0' } 
      });
      const results = await response.json();
      
      let filteredResults = [];
      
      if (results && results.length > 0) {
        filteredResults = results.map(item => ({
          id: item.place_id.toString(),
          name: item.display_name.split(',')[0],
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          address: item.display_name,
          importance: item.importance || 0,
          type: item.type || item.class || 'location',
          icon: getLocationIcon(item.type, item.class)
        }));
      } else {
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Metro Manila')}&limit=10&countrycodes=ph`;
        
        const phResponse = await fetch(fallbackUrl, {
          headers: { 'User-Agent': 'MetroManilaWeatherApp/1.0' }
        });
        const phResults = await phResponse.json();
        
        filteredResults = phResults
          .filter(item => {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            return lat > 14.3 && lat < 14.8 && lon > 120.85 && lon < 121.15;
          })
          .map(item => ({
            id: item.place_id.toString(),
            name: item.display_name.split(',')[0],
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            address: item.display_name,
            importance: item.importance || 0,
            type: item.type || item.class || 'location',
            icon: getLocationIcon(item.type, item.class)
          }));
      }

      filteredResults.sort((a, b) => {
        if (b.importance !== a.importance) {
          return b.importance - a.importance;
        }
        return a.name.localeCompare(b.name);
      });

      filteredResults = filteredResults.slice(0, 5);
      
      updateState({
        searchResults: filteredResults,
        showSearchResults: true,
        isSearching: false,
        searchCache: {
          ...state.searchCache,
          [query.toLowerCase()]: filteredResults
        }
      });
      
    } catch (error) {
      console.error('❌ Search error:', error);
      updateState({
        searchResults: [], 
        showSearchResults: true,
        isSearching: false 
      });
    }
  };

  const getLocationIcon = (type, className) => {
    if (type === 'city' || type === 'town') return 'business';
    if (type === 'school' || className === 'amenity') return 'school';
    if (type === 'hospital') return 'medical';
    if (type === 'mall' || type === 'shopping') return 'storefront';
    if (type === 'restaurant') return 'restaurant';
    if (type === 'gas_station') return 'car';
    if (className === 'building') return 'business';
    return 'location';
  };

  const debouncedSearch = useRef(
    _.debounce((query) => {
      searchLocations(query);
    }, 300)
  ).current;

  const handleSearchChange = (text) => {    
    updateState({
      searchQuery: text
    });
    
    if (text.length > 2) {
      const cacheKey = text.toLowerCase();
      
      if (state.searchCache[cacheKey]) {
        updateState({
          searchResults: state.searchCache[cacheKey],
          showSearchResults: true,
          isSearching: false
        });
      } else {
        updateState({
          showSearchResults: true,
          isSearching: true,
          searchResults: []
        });
        
        debouncedSearch(text);
      }
    } else {
      updateState({
        searchResults: [],
        showSearchResults: false,
        selectedLocation: null,
        isSearching: false
      });
      removeSearchMarker();
    }
  };

  const handleSearchFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    if (state.searchQuery.length > 0 && state.searchResults.length > 0) {
      updateState({ showSearchResults: true });
    }
  };

  const handleSearchBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      updateState({ showSearchResults: false });
    }, 150);
  };

  const removeSearchMarker = () => {
    if (Platform.OS === 'web' && iframeRef.current) {
      const message = {
        action: 'removeMarker'
      };
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  };

  const fetchWeatherForLocation = async (location) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia/Manila`
      );
      const weather = await response.json();
      return {
        temp: Math.round(weather.current.temperature_2m),
        humidity: weather.current.relative_humidity_2m,
        condition: WEATHER_CONDITIONS[weather.current.weather_code] || 'Unknown',
      };
    } catch (error) {
      console.error('Weather error for searched location:', error);
      return null;
    }
  };

  const fetchAQIForLocation = async (location) => {
    try {
      const response = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lon}&current=us_aqi,pm10,pm2_5&timezone=auto`
      );
      const aqi = await response.json();
      
      if (aqi.current) {
        const aqiValue = aqi.current.us_aqi || 0;
        return {
          pm25: aqi.current.pm2_5 || 0,
          pm10: aqi.current.pm10 || 0,
          aqi: Math.round(aqiValue),
          status: getAQIStatus(aqiValue),
          timestamp: aqi.current.time
        };
      }
      return null;
    } catch (error) {
      console.error('AQI error for searched location:', error);
      return null;
    }
  };

  const addSearchMarker = (location, weatherData = null, aqiData = null) => {
    if (Platform.OS === 'web') {
      const sendMarker = () => {
        if (!iframeRef.current?.contentWindow) {
          setTimeout(sendMarker, 100); // Retry until iframe is ready
          return;
        }

        // // Always remove previous marker
        // iframeRef.current.contentWindow.postMessage({ action: 'removeMarker' }, '*');

        // // Delay to ensure marker is removed first
        // setTimeout(() => {
        //   let markerColor = '#00E676';
        //   let pulseColorRgba = 'rgba(0,230,118,0.4)';

        //   if (state.dataLayer === 'weather' && weatherData) {
        //     markerColor = getWeatherColor(weatherData.condition, weatherData.temp);
        //   } else if (state.dataLayer === 'aqi' && aqiData) {
        //     markerColor = getAQIColor(aqiData.aqi);
        //   }

        //   // Convert hex to rgba for pulse
        //   if (markerColor !== '#00E676') {
        //     const hex = markerColor.replace('#', '');
        //     const r = parseInt(hex.substr(0, 2), 16);
        //     const g = parseInt(hex.substr(2, 2), 16);
        //     const b = parseInt(hex.substr(4, 2), 16);
        //     pulseColorRgba = `rgba(${r}, ${g}, ${b}, 0.4)`;
        //   }

        //   // Build popup content dynamically based on current dataLayer
        //   let popupContent = `<div class="popup-content"><div class="popup-title">${location.name.replace(/'/g, "\\'")}</div>`;

        //   if (state.dataLayer === 'weather' && weatherData) {
        //     popupContent += `<div class="popup-data"><strong style="color: #00E676;">Weather Conditions</strong><br/>🌡️ Temperature: <strong>${weatherData.temp}°C</strong><br/>💧 Humidity: <strong>${weatherData.humidity}%</strong><br/>☁️ Condition: <strong>${weatherData.condition}</strong></div>`;
        //     popupContent += `<button class="nav-button" onclick="window.navigateToScreen('Weather', '${location.name.replace(/'/g, "\\'")}', ${location.lat}, ${location.lon})">📊 View Weather Details</button>`;
        //   } else if (state.dataLayer === 'aqi' && aqiData) {
        //     popupContent += `<div class="popup-data"><strong style="color: #00E676;">Air Quality Index</strong><br/>🌫️ PM2.5: <strong>${aqiData.pm25} μg/m³</strong><br/>🌪️ PM10: <strong>${aqiData.pm10} μg/m³</strong><br/>📊 AQI: <strong>${aqiData.aqi}</strong> (${aqiData.status})</div>`;
        //     popupContent += `<button class="nav-button" onclick="window.navigateToScreen('Aqi', '${location.name.replace(/'/g, "\\'")}', ${location.lat}, ${location.lon})">🌿 View AQI Details</button>`;
        //   } else {
        //     popupContent += `<div class="popup-data">📍 <strong>Searched Location</strong><br/>Select a data layer to view more information</div>`;
        //   }

        //   popupContent += '</div>'; // Close popup-content

          // Send marker details to iframe
          const message = {
            action: 'addMarker',
            location: {
              lat: location.lat,
              lon: location.lon,
              name: location.name
            },
            weatherData: weatherData,
            aqiData: aqiData
          };

      iframeRef.current.contentWindow.postMessage(message, '*');
       ; // Allow time for removeMarker
      };

      sendMarker();
    }
  };

  const handleLocationSelect = async (location) => {
    console.log('🖱️ Location selected:', location.name);
    
    updateState({ 
      searchQuery: location.name,
      showSearchResults: false,
      selectedLocation: location
    });

    searchInputRef.current?.blur();

    let weatherData = null;
    let aqiData = null;

    // Immediately add the marker with current layer data
    if (state.dataLayer === 'weather') {
      console.log('🌡️ Fetching weather data for:', location.name);
      weatherData = await fetchWeatherForLocation(location);
      if (weatherData) {
        updateState(prev => ({
          ...prev,
          weatherData: {
            ...prev.weatherData,
            [location.name]: weatherData
          }
        }));
      }
    } else if (state.dataLayer === 'aqi') {
      console.log('🌿 Fetching AQI data for:', location.name);
      aqiData = await fetchAQIForLocation(location);
      if (aqiData) {
        updateState(prev => ({
          ...prev,
          aqiData: {
            ...prev.aqiData,
            [location.name]: aqiData
          }
        }));
      }
    }

    // Add marker with current data
    addSearchMarker(
      location,
      state.dataLayer === 'weather' ? weatherData : null,
      state.dataLayer === 'aqi' ? aqiData : null
    );
  };

  const toggleDrawer = () => {
    const toValue = state.drawerOpen ? -DRAWER_WIDTH : 0;
    updateState({ drawerOpen: !state.drawerOpen });
    
    Animated.timing(drawerAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
const setDataLayer = async (layer) => {
  updateState({ dataLayer: layer });

  let selectedWeatherData = state.selectedLocation ? state.weatherData[state.selectedLocation.name] : null;
  let selectedAqiData = state.selectedLocation ? state.aqiData[state.selectedLocation.name] : null;

  // Fetch missing data if needed
  if (state.selectedLocation) {
    if (layer === 'weather' && !selectedWeatherData) {
      selectedWeatherData = await fetchWeatherForLocation(state.selectedLocation);
      updateState(prev => ({
        ...prev,
        weatherData: { ...prev.weatherData, [state.selectedLocation.name]: selectedWeatherData }
      }));
    } else if (layer === 'aqi' && !selectedAqiData) {
      selectedAqiData = await fetchAQIForLocation(state.selectedLocation);
      updateState(prev => ({
        ...prev,
        aqiData: { ...prev.aqiData, [state.selectedLocation.name]: selectedAqiData }
      }));
    }
  }

  if (Platform.OS === 'web' && iframeRef.current) {
    const message = {
      action: 'updateData',
      cities: state.cities,
      dataLayer: layer,
      weatherData: state.weatherData,
      aqiData: state.aqiData,
      selectedLocation: state.selectedLocation,
      selectedWeatherData,
      selectedAqiData
    };
    iframeRef.current.contentWindow.postMessage(message, '*');
  }
};

  const handleMessage = useCallback((event) => {
    if (event.origin !== window.location.origin) return;
    
    try {
      const data = event.data;
      console.log('📋 Received message from iframe:', data);
      
      if (data.action === 'navigate') {
        console.log('🧭 Navigation triggered for:', data.screen, data.cityName);
        
        setTimeout(() => {
          try {
            console.log('🎯 Attempting navigation to:', data.screen);
            
            navigation.navigate(data.screen, {
              cityName: data.cityName,
              lat: parseFloat(data.lat),
              lon: parseFloat(data.lon)
            });
            
            console.log('✅ Navigation call completed');
          } catch (navError) {
            console.error('❌ Navigation error:', navError);
            console.error('Navigation object:', navigation);
            
            try {
              navigation.push(data.screen, {
                cityName: data.cityName,
                lat: parseFloat(data.lat),
                lon: parseFloat(data.lon)
              });
            } catch (pushError) {
              console.error('❌ Push navigation also failed:', pushError);
            }
          }
        }, 100);
      }
    } catch (parseError) {
      console.error('❌ Message parse error:', parseError);
      console.error('Raw data:', event.data);
    }
  }, [navigation]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [handleMessage]);

  useEffect(() => {
    if (state.dataLayer === 'weather') {
      fetchWeatherData();
    } else if (state.dataLayer === 'aqi') {
      fetchAQIData();
    }
  }, [state.dataLayer, fetchWeatherData, fetchAQIData]);

const getHtmlContent = useCallback(() => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%); }
            #map { height: 100vh; width: 100%; border-radius: 0; brightness(0.95); }
            .popup-content { min-width: 200px; background: linear-gradient(135deg, rgba(26, 26, 46, 0.97) 0%, rgba(16, 33, 62, 0.97) 100%); border-radius: 16px; border: 1px solid rgba(0, 230, 118, 0.4); backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1); }
            .popup-title { font-weight: 700; margin-bottom: 8px; color: #FFFFFF; font-size: 16px; padding: 16px 16px 0; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); }
            .popup-data { font-size: 14px; line-height: 1.6; color: rgba(255, 255, 255, 0.9); padding: 0 16px 8px; font-weight: 500; }
            .nav-button { 
                display: inline-block; 
                background: linear-gradient(135deg, #00E676 0%, #00C853 100%); 
                color: white; 
                padding: 8px 16px; 
                margin: 8px 16px 16px 16px; 
                border-radius: 8px; 
                text-decoration: none; 
                font-size: 13px; 
                font-weight: 600; 
                text-align: center; 
                cursor: pointer; 
                transition: all 0.2s ease;
                border: none;
                box-shadow: 0 2px 8px rgba(0, 230, 118, 0.3);
            }
            .nav-button:hover { 
                background: linear-gradient(135deg, #00C853 0%, #00A843 100%); 
                transform: translateY(-1px); 
                box-shadow: 0 4px 12px rgba(0, 230, 118, 0.4); 
            }
            .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; border-radius: 16px !important; padding: 0 !important; }
            .leaflet-popup-tip { background: linear-gradient(135deg, rgba(26, 26, 46, 0.97) 0%, rgba(16, 33, 62, 0.97) 100%) !important; border: 1px solid rgba(0, 230, 118, 0.4) !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important; }
            .leaflet-popup-close-button { color: rgba(255, 255, 255, 0.8) !important; font-size: 18px !important; font-weight: bold !important; right: 12px !important; top: 12px !important; width: 24px !important; height: 24px !important; text-align: center !important; line-height: 22px !important; background: rgba(0, 0, 0, 0.3) !important; border-radius: 50% !important; transition: all 0.2s ease !important; }
            .leaflet-popup-close-button:hover { background: rgba(255, 77, 77, 0.8) !important; color: white !important; }
            .leaflet-control-container .leaflet-bottom { bottom: 8px !important; }
            .leaflet-control-attribution { background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(26, 26, 46, 0.8) 100%) !important; color: rgba(255, 255, 255, 0.8) !important; font-size: 10px !important; padding: 4px 8px !important; border-radius: 8px !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; backdrop-filter: blur(8px) !important; }
            .leaflet-control-attribution a { color: #00E676 !important; text-decoration: none !important; }
            .legend { position: absolute; bottom: 50px; right: 12px; background: linear-gradient(135deg, rgba(26, 26, 46, 0.97) 0%, rgba(16, 33, 62, 0.97) 100%); border-radius: 16px; border: 1px solid rgba(0, 230, 118, 0.4); color: white; font-size: 12px; z-index: 1000; max-width: 220px; backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; }
            .legend-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; background: rgba(0, 230, 118, 0.1); border-bottom: 1px solid rgba(0, 230, 118, 0.2); transition: background 0.2s ease; }
            .legend-header:hover { background: rgba(0, 230, 118, 0.15); }
            .legend-title { font-weight: 600; color: #00E676; font-size: 13px; margin: 0; }
            .legend-toggle { color: #00E676; font-size: 16px; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); user-select: none; }
            .legend-toggle.collapsed { transform: rotate(-90deg); }
            .legend-content { padding: 12px 16px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); max-height: 300px; overflow: hidden; }
            .legend-content.collapsed { max-height: 0; padding: 0 16px; }
            .legend-item { display: flex; align-items: center; margin-bottom: 8px; transition: transform 0.2s ease; }
            .legend-item:hover { transform: translateX(2px); }
            .legend-item:last-child { margin-bottom: 0; }
            .legend-color { width: 14px; height: 14px; border-radius: 50%; margin-right: 10px; border: 2px solid rgba(255, 255, 255, 0.2); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); }
            .legend-text { font-weight: 500; color: rgba(255, 255, 255, 0.9); }
            @keyframes markerPulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }
            .marker-pulse { animation: markerPulse 2s ease-in-out infinite; }
            .search-marker { z-index: 1000 !important; }
            .lgu-marker { z-index: 500 !important; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
            const map = L.map('map', { zoomControl: false, attributionControl: true }).setView([14.6091, 121.0223], 11);
            L.control.zoom({ position: 'topleft' }).addTo(map);
            map.setMaxBounds([[14.2, 120.7], [15.0, 121.3]]);
            map.options.minZoom = 10;
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18,
                tileSize: 256
            }).addTo(map);
            
            const getWeatherColor = (condition, temp) => {
              if (temp >= 35) return '#FF5722';
              if (temp >= 30) return '#FF9800';
              if (temp >= 25) return '#FFC107';
              if (temp >= 20) return '#4CAF50';
              return '#2196F3';
            };
            
            const getAQIColor = (aqi) => {
              if (aqi <= 50) return '#00E676';
              if (aqi <= 100) return '#FFC107';
              if (aqi <= 150) return '#FF9800';
              if (aqi <= 200) return '#F44336';
              if (aqi <= 300) return '#9C27B0';
              return '#B71C1C';
            };

            const getAQIStatus = (aqi) => {
              if (aqi <= 50) return 'Good';
              if (aqi <= 100) return 'Moderate';
              if (aqi <= 150) return 'Unhealthy for Sensitive';
              if (aqi <= 200) return 'Unhealthy';
              if (aqi <= 300) return 'Very Unhealthy';
              return 'Hazardous';
            };

            let cities = [];
            let dataLayer = 'none';
            let weatherData = {};
            let aqiData = {};
            let searchMarker = null;
            let lguMarkers = [];
            let currentSearchLocation = null;
            let currentSearchWeatherData = null;
            let currentSearchAqiData = null;

            window.navigateToScreen = (screen, cityName, lat, lon) => {
                const navigationData = {
                    action: 'navigate',
                    screen: screen,
                    cityName: cityName,
                    lat: lat,
                    lon: lon
                };
                window.parent.postMessage(navigationData, '*');
            };

            const clearLguMarkers = () => {
              lguMarkers.forEach(marker => map.removeLayer(marker));
              lguMarkers = [];
            };

            const updateSearchMarker = () => {
              if (!currentSearchLocation) return;
              
              let markerColor = '#00E676';
              let pulseColor = 'rgba(0,230,118,0.4)';
              let popupContent = '<div class="popup-content"><div class="popup-title">' + currentSearchLocation.name + '</div>';
              
              if (dataLayer === 'weather' && currentSearchWeatherData) {
                const w = currentSearchWeatherData;
                markerColor = getWeatherColor(w.condition, w.temp);
                popupContent += '<div class="popup-data"><strong style="color: #00E676;">Weather Conditions</strong><br/>🌡️ Temperature: <strong>' + w.temp + '°C</strong><br/>💧 Humidity: <strong>' + w.humidity + '%</strong><br/>☁️ Condition: <strong>' + w.condition + '</strong></div>';
                popupContent += '<button class="nav-button" onclick="window.navigateToScreen(\\'Weather\\', \\''+currentSearchLocation.name+'\\', '+currentSearchLocation.lat+', '+currentSearchLocation.lon+')">📊 View Weather Details</button>';
              } else if (dataLayer === 'aqi' && currentSearchAqiData) {
                const a = currentSearchAqiData;
                markerColor = getAQIColor(a.aqi);
                popupContent += '<div class="popup-data"><strong style="color: #00E676;">Air Quality Index</strong><br/>🌫️ PM2.5: <strong>' + a.pm25 + ' μg/m³</strong><br/>🌪️ PM10: <strong>' + a.pm10 + ' μg/m³</strong><br/>📊 AQI: <strong>' + a.aqi + '</strong> (' + a.status + ')</div>';
                popupContent += '<button class="nav-button" onclick="window.navigateToScreen(\\'Aqi\\', \\''+currentSearchLocation.name+'\\', '+currentSearchLocation.lat+', '+currentSearchLocation.lon+')">🌿 View AQI Details</button>';
              } else {
                popupContent += '<div class="popup-data">📍 <strong>Searched Location</strong><br/>Select a data layer to view more information</div>';
              }
              
              popupContent += '</div>';
              
              // Convert hex to rgba for pulse effect
              if (markerColor !== '#00E676') {
                const hex = markerColor.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                pulseColor = \`rgba(\${r}, \${g}, \${b}, 0.4)\`;
              }
              
              const customIcon = L.divIcon({
                  className: 'search-marker',
                  html: \`
                    <div style="
                      position: relative;
                      width: 28px;
                      height: 28px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    ">
                      <div style="
                        position: absolute;
                        width: 28px;
                        height: 28px;
                        background: \${pulseColor};
                        border-radius: 50%;
                        animation: markerPulse 2s infinite;
                      "></div>
                      <div style="
                        width: 20px;
                        height: 20px;
                        background: linear-gradient(135deg, \${markerColor} 0%, \${markerColor}dd 100%);
                        border-radius: 50%;
                        border: 3px solid rgba(255,255,255,0.9);
                        box-shadow: 0 0 0 2px \${pulseColor}, 0 3px 12px rgba(0,0,0,0.4);
                        position: relative;
                        z-index: 1;
                      "></div>
                    </div>
                  \`,
                  iconSize: [28, 28],
                  iconAnchor: [14, 14]
              });
              
              if (searchMarker) {
                searchMarker.setIcon(customIcon);
                searchMarker.setPopupContent(popupContent);
              } else {
                searchMarker = L.marker([currentSearchLocation.lat, currentSearchLocation.lon], { 
                    icon: customIcon,
                    zIndexOffset: 1000 
                }).addTo(map);
                searchMarker.bindPopup(popupContent, { 
                    maxWidth: 280, 
                    className: 'custom-popup' 
                }).openPopup();
              }
            };

            const addLguMarkers = () => {
              clearLguMarkers();
              
              cities.forEach(city => {
                let markerColor = '#00E676';
                let pulseColor = 'rgba(0,230,118,0.4)';
                
                if (dataLayer === 'weather' && weatherData[city.name]) {
                  const w = weatherData[city.name];
                  markerColor = getWeatherColor(w.condition, w.temp);
                  const hex = markerColor.replace('#', '');
                  const r = parseInt(hex.substr(0, 2), 16);
                  const g = parseInt(hex.substr(2, 2), 16);
                  const b = parseInt(hex.substr(4, 2), 16);
                  pulseColor = \`rgba(\${r}, \${g}, \${b}, 0.4)\`;
                } else if (dataLayer === 'aqi' && aqiData[city.name]) {
                  const a = aqiData[city.name];
                  markerColor = getAQIColor(a.aqi);
                  const hex = markerColor.replace('#', '');
                  const r = parseInt(hex.substr(0, 2), 16);
                  const g = parseInt(hex.substr(2, 2), 16);
                  const b = parseInt(hex.substr(4, 2), 16);
                  pulseColor = \`rgba(\${r}, \${g}, \${b}, 0.4)\`;
                }
                
                const customIcon = L.divIcon({
                    className: 'lgu-marker',
                    html: \`<div class="marker-pulse" style="background: linear-gradient(135deg, \${markerColor} 0%, \${markerColor}dd 100%); width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.9); box-shadow: 0 0 0 4px \${pulseColor}, 0 2px 8px rgba(0,0,0,0.3); position: relative;"></div>\`,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                });
                
                const marker = L.marker([city.lat, city.lon], { icon: customIcon }).addTo(map);
                lguMarkers.push(marker);
                
                let content = '<div class="popup-content"><div class="popup-title">' + city.name + '</div>';
                
                if (dataLayer === 'weather' && weatherData[city.name]) {
                    const w = weatherData[city.name];
                    content += '<div class="popup-data"><strong style="color: #00E676;">Weather Conditions</strong><br/>🌡️ Temperature: <strong>' + w.temp + '°C</strong><br/>💧 Humidity: <strong>' + w.humidity + '%</strong><br/>☁️ Condition: <strong>' + w.condition + '</strong></div>';
                    content += '<button class="nav-button" onclick="window.navigateToScreen(\\'Weather\\', \\''+city.name+'\\', '+city.lat+', '+city.lon+')">📊 View Weather Details</button>';
                } else if (dataLayer === 'aqi' && aqiData[city.name]) {
                    const a = aqiData[city.name];
                    content += '<div class="popup-data"><strong style="color: #00E676;">Air Quality Index</strong><br/>🌫️ PM2.5: <strong>' + a.pm25 + ' μg/m³</strong><br/>🌪️ PM10: <strong>' + a.pm10 + ' μg/m³</strong><br/>📊 AQI: <strong>' + a.aqi + '</strong> (' + a.status + ')</div>';
                    content += '<button class="nav-button" onclick="window.navigateToScreen(\\'Aqi\\', \\''+city.name+'\\', '+city.lat+', '+city.lon+')">🌿 View AQI Details</button>';
                } else {
                    content += '<div class="popup-data">🏙️ <strong>Metro Manila LGU</strong><br/>Click the menu to view weather or air quality data</div>';
                }
                
                content += '</div>';
                marker.bindPopup(content, { maxWidth: 250, className: 'custom-popup' });
              });
            };

            window.addEventListener('message', (event) => {
                try {
                    const data = event.data;
                    
                    if (data.action === 'addMarker') {
                        currentSearchLocation = data.location;
                        currentSearchWeatherData = data.weatherData || null;
                        currentSearchAqiData = data.aqiData || null;
                        
                        updateSearchMarker();
                        
                        map.setView([data.location.lat, data.location.lon], Math.max(map.getZoom(), 14), {
                            animate: true,
                            duration: 0.8,
                            easeLinearity: 0.25
                        });
                    } 
                    else if (data.action === 'removeMarker') {
                        if (searchMarker) {
                            map.removeLayer(searchMarker);
                            searchMarker = null;
                            currentSearchLocation = null;
                            currentSearchWeatherData = null;
                            currentSearchAqiData = null;
                        }
                    }
                    else if (data.action === 'updateData') {
                        cities = data.cities || [];
                        dataLayer = data.dataLayer;
                        weatherData = data.weatherData || {};
                        aqiData = data.aqiData || {};
                        
                        // Update selected location data if available
                        if (data.selectedLocation) {
                            currentSearchLocation = data.selectedLocation;
                            currentSearchWeatherData = data.selectedWeatherData || null;
                            currentSearchAqiData = data.selectedAqiData || null;
                        }
                        
                        // Update both LGU markers and search marker
                        addLguMarkers();
                        updateSearchMarker();
                        
                        // Update legend
                        const existingLegend = document.querySelector('.legend');
                        if (existingLegend) {
                            existingLegend.remove();
                        }
                        
                        if (dataLayer === 'weather') {
                            const legend = document.createElement('div');
                            legend.className = 'legend';
                            legend.innerHTML = \`
                              <div class="legend-header" onclick="toggleLegend()">
                                <div class="legend-title">Temperature Scale</div>
                                <div class="legend-toggle" id="legendToggle">▼</div>
                              </div>
                              <div class="legend-content" id="legendContent">
                                <div class="legend-item">
                                  <div class="legend-color" style="background: #FF5722;"></div>
                                  <span class="legend-text">35°C+ Very Hot</span>
                                </div>
                                <div class="legend-item">
                                  <div class="legend-color" style="background: #FF9800;"></div>
                                  <span class="legend-text">30-34°C Hot</span>
                                </div>
                                <div class="legend-item">
                                  <div class="legend-color" style="background: #FFC107;"></div>
                                  <span class="legend-text">25-29°C Warm</span>
                                </div>
                                <div class="legend-item">
                                  <div class="legend-color" style="background: #4CAF50;"></div>
                                  <span class="legend-text">20-24°C Pleasant</span>
                                </div>
                                <div class="legend-item">
                                  <div class="legend-color" style="background: #2196F3;"></div>
                                  <span class="legend-text">&lt;20°C Cool</span>
                                </div>
                              </div>\`;
                            document.body.appendChild(legend);
                        } else if (dataLayer === 'aqi') {
                            const legend = document.createElement('div');
                            legend.className = 'legend';
                            legend.innerHTML = \`
                              <div class="legend-header" onclick="toggleLegend()">
                                <div class="legend-title">Air Quality Index (US)</div>
                                <div class="legend-toggle" id="legendToggle">▼</div>
                              </div>
                              <div class="legend-content" id="legendContent">
                                <div class="legend-item">
                                  <div class="legend-color" style="background: #00E676;"></div>
                                  <span class="legend-text">0-50 Good</span>
                                </div>
                                <div class="legend-item">
                                  <div class="legend-color" style="background: #FFC107;"></div>
                                  <span class="legend-text">51-100 Moderate</span>
                                </div>
                                <div class="legend-item">
                                  <div class="legend-color" style="background: #FF9800;"></div>
                                  <span class="legend-text">101-150 Unhealthy for Sensitive</span>
                                </div>
                                <div class="legend-item">
                                  <div class="legend-color" style="background: #F44336;"></div>
                                  <span class="legend-text">151-200 Unhealthy</span>
                                </div>
                                <div class="legend-item">
                                  <div class="legend-color" style="background: #9C27B0;"></div>
                                  <span class="legend-text">201-300 Very Unhealthy</span>
                                </div>
                                <div class="legend-item">
                                  <div class="legend-color" style="background: #B71C1C;"></div>
                                  <span class="legend-text">300+ Hazardous</span>
                                </div>
                              </div>\`;
                            document.body.appendChild(legend);
                        }
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            });

            window.toggleLegend = function() {
                const content = document.getElementById('legendContent');
                const toggle = document.getElementById('legendToggle');
                const collapsed = content.classList.contains('collapsed');
                if (collapsed) {
                    content.classList.remove('collapsed');
                    toggle.classList.remove('collapsed');
                } else {
                    content.classList.add('collapsed');
                    toggle.classList.add('collapsed');
                }
            };

            // Initial data load
            window.parent.postMessage({ action: 'requestInitialData' }, '*');
        </script>
    </body>
    </html>
`, []);

  useEffect(() => {
    if (Platform.OS === 'web' && iframeRef.current) {
      const message = {
        action: 'updateData',
        cities: state.cities,
        dataLayer: state.dataLayer,
        weatherData: state.weatherData,
        aqiData: state.aqiData
      };
      
      // Wait for iframe to load before sending message
      const timer = setTimeout(() => {
        iframeRef.current.contentWindow.postMessage(message, '*');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [state.cities, state.dataLayer, state.weatherData, state.aqiData]);

  const ControlItem = ({ icon, title, subtitle, active, onPress }) => (
    <TouchableOpacity style={[styles.controlItem, active && styles.controlItemActive]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={active ? "#00E676" : "rgba(255,255,255,0.6)"} />
      <View style={styles.controlText}>
        <Text style={styles.controlTitle}>{title}</Text>
        <Text style={styles.controlSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={18} color={active ? "#00E676" : "rgba(255,255,255,0.4)"} />
    </TouchableOpacity>
  );

  const SearchResultItem = ({ item, onPress }) => (
    <TouchableOpacity 
      style={styles.searchResultItem} 
      onPress={() => {
        console.log('🖱️ Search item pressed:', item.name);
        onPress(item);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.searchResultIconContainer}>
        <Ionicons name={item.icon} size={18} color="#00E676" />
      </View>
      <View style={styles.searchResultTextContainer}>
        <Text style={styles.searchResultTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.searchResultSubtitle} numberOfLines={2}>
          {item.address ? item.address.split(',').slice(0, 3).join(',') : 'Location'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <iframe
            ref={iframeRef}
            srcDoc={getHtmlContent()}
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-popups"
            title="AirNet Map"
            allow="geolocation"
          />
        ) : (
          <View style={styles.webViewFallback}>
            <Text>Map view is only available on web platform</Text>
          </View>
        )}
      </View>
      
      <SafeAreaView style={styles.headerOverlay}>
        <LinearGradient colors={['rgba(26,26,46,0.95)', 'rgba(16,33,62,0.95)']} style={styles.headerGradient}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.searchContainer}>
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search locations..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={state.searchQuery}
                onChangeText={handleSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
              />
              {state.isSearching && (
                <ActivityIndicator size="small" color="#00E676" style={styles.searchLoading} />
              )}
            </View>
            
            <TouchableOpacity style={styles.headerButton} onPress={toggleDrawer}>
              <Ionicons name="menu" size={20} color="#00E676" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>

      {state.showSearchResults && (
        <View style={styles.searchResultsContainer}>
          {state.isSearching ? (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="small" color="#00E676" />
              <Text style={styles.searchLoadingText}>Searching...</Text>
            </View>
          ) : state.searchResults.length > 0 ? (
            <FlatList
              data={state.searchResults}
              renderItem={({ item }) => (
                <SearchResultItem 
                  item={item} 
                  onPress={handleLocationSelect} 
                />
              )}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              style={styles.searchResultsList}
              contentContainerStyle={styles.searchResultsContent}
            />
          ) : state.searchQuery.length > 2 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search" size={24} color="rgba(255,255,255,0.4)" />
              <Text style={styles.noResultsText}>No locations found</Text>
              <Text style={styles.noResultsSubtext}>Try a different search term</Text>
            </View>
          ) : null}
        </View>
      )}

      <Animated.View 
        style={[
          styles.drawer, 
          { 
            transform: [{ translateX: drawerAnimation }] 
          }
        ]}
      >
        <LinearGradient colors={['rgba(26,26,46,0.98)', 'rgba(16,33,62,0.98)']} style={styles.drawerContent}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Data Layers</Text>
            <TouchableOpacity onPress={toggleDrawer}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          <View style={styles.controls}>
            <ControlItem 
              icon="location" 
              title="Basic View" 
              subtitle="Show all locations" 
              active={state.dataLayer === 'none'} 
              onPress={() => setDataLayer('none')} 
            />
            <ControlItem 
              icon="partly-sunny" 
              title="Weather Data" 
              subtitle="Temperature & conditions" 
              active={state.dataLayer === 'weather'} 
              onPress={() => setDataLayer('weather')} 
            />
            <ControlItem 
              icon="leaf" 
              title="Air Quality" 
              subtitle="PM2.5, PM10 & AQI" 
              active={state.dataLayer === 'aqi'} 
              onPress={() => setDataLayer('aqi')} 
            />
          </View>

          <View style={styles.info}>
            <Text style={styles.infoText}>
              🏙️ {state.cities.length} Metro Manila LGUs • 🎨 Color-coded data • 🔄 Auto-refresh
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  mapContainer: { flex: 1 },
  webViewFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A2E' },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,230,118,0.2)',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1,
  },
  searchContainer: {
    flex: 1,
    marginHorizontal: 12,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingRight: 36,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  searchLoading: {
    position: 'absolute',
    right: 12,
    top: 10,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 85 : 105,
    left: 20,
    right: 20,
    maxHeight: 250,
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  searchResultsList: {
    maxHeight: 240,
  },
  searchResultsContent: {
    paddingVertical: 8,
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  searchLoadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginLeft: 8,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  noResultsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  noResultsSubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  searchResultItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchResultIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  searchResultTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  searchResultSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    lineHeight: 16,
  },
  drawer: { position: 'absolute', top: 0, right: -DRAWER_WIDTH, width: DRAWER_WIDTH, height: '100%', zIndex: 20 },
  drawerContent: { flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(0,230,118,0.3)' },
  drawerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
  },
  drawerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  loading: { flexDirection: 'row', alignItems: 'center', margin: 20, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginLeft: 8 },
  controls: { padding: 20, flex: 1 },
  controlItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
  },
  controlItemActive: { backgroundColor: 'rgba(0,230,118,0.1)', borderColor: 'rgba(0,230,118,0.3)' },
  controlText: { flex: 1, marginHorizontal: 12 },
  controlTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  controlSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  info: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  infoText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 16 },
});

export default MapScreen;