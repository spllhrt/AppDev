import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, 
  SafeAreaView, StatusBar, Platform, Animated, Dimensions,
  TextInput, FlatList
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import _ from 'lodash';

const { width: screenWidth } = Dimensions.get('window');
const DRAWER_WIDTH = 280;

const METRO_MANILA_LGUS = [
  "Manila", "Quezon City", "Caloocan", "Las Piñas", "Makati", 
  "Malabon", "Mandaluyong", "Marikina", "Muntinlupa", "Navotas", 
  "Parañaque", "Pasay", "Pasig", "San Juan", "Taguig", 
  "Valenzuela", "Pateros"
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
  if (aqi <= 20) return '#4CAF50';
  if (aqi <= 40) return '#8BC34A';
  if (aqi <= 60) return '#FFC107';
  if (aqi <= 80) return '#FF9800';
  return '#F44336';
};

const MapScreen = ({ navigation }) => {
  const [state, setState] = useState({
    dataLayer: 'none',
    cities: [],
    weatherData: {},
    aqiData: {},
    loading: true,
    drawerOpen: false,
    searchQuery: '',
    searchResults: [],
    showSearchResults: false,
    isSearching: false,
    selectedLocation: null,
    searchCache: {}
  });
  
  const drawerAnimation = useState(new Animated.Value(-DRAWER_WIDTH))[0];
  const searchInputRef = useRef(null);
  const webViewRef = useRef(null);
  const lastNominatimRequest = useRef(0);
  const NOMINATIM_RATE_LIMIT = 1000;
  
  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

  // Caching functions
  const cacheCities = useCallback((cities) => {
    console.log('Cities loaded:', cities.length);
  }, []);

  const getCachedCities = useCallback(async () => {
    return null;
  }, []);

  // Fetch cities with caching
  const fetchCities = useCallback(async () => {
    try {
      const cachedCities = await getCachedCities();
      if (cachedCities && cachedCities.length > 0) {
        updateState({ cities: cachedCities, loading: false });
        return;
      }

      const geocodedCities = [];
      for (const cityName of METRO_MANILA_LGUS) {
        try {
          const query = `${cityName}, Metro Manila, Philippines`;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
            { headers: { 'User-Agent': 'MetroManilaWeatherApp/1.0' } }
          );
          const data = await response.json();
          
          if (data?.length > 0) {
            const { lat: latStr, lon: lonStr } = data[0];
            const lat = parseFloat(latStr);
            const lon = parseFloat(lonStr);
            
            if (lat > 14.3 && lat < 14.8 && lon > 120.85 && lon < 121.15) {
              geocodedCities.push({ name: cityName, lat, lon });
            }
          }
        } catch (error) {
          console.error(`Error for ${cityName}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      const sortedCities = geocodedCities.sort((a, b) => a.name.localeCompare(b.name));
      cacheCities(sortedCities);
      updateState({ cities: sortedCities, loading: false });
    } catch (error) {
      console.error('Error fetching cities:', error);
      updateState({ loading: false });
    }
  }, [cacheCities, getCachedCities]);

  // Fetch weather data
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

  // Fetch AQI data
  const fetchAQIData = useCallback(async () => {
    if (!state.cities.length) return;
    
    const aqiPromises = state.cities.map(async (city) => {
      try {
        const response = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=pm10,pm2_5,european_aqi`
        );
        const aqi = await response.json();
        const aqiValue = aqi.current.european_aqi || 0;
        
        return [city.name, {
          pm25: Math.round(aqi.current.pm2_5 || 0),
          pm10: Math.round(aqi.current.pm10 || 0),
          aqi: Math.round(aqiValue),
          status: getAQIStatus(aqiValue),
        }];
      } catch (error) {
        console.error(`AQI error for ${city.name}:`, error);
        return [city.name, null];
      }
    });

    const results = await Promise.all(aqiPromises);
    const aqiData = Object.fromEntries(results.filter(([, data]) => data));
    updateState({ aqiData });
  }, [state.cities]);

  const getAQIStatus = (aqi) => {
    if (aqi <= 20) return 'Good';
    if (aqi <= 40) return 'Fair';
    if (aqi <= 60) return 'Moderate';
    if (aqi <= 80) return 'Poor';
    return 'Very Poor';
  };

  // Fixed search function with proper rate limiting and state management
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
    
    console.log('🔍 Searching for:', query);
    
    try {
      // First try bounded search
      const boundedUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&bounded=1&viewbox=120.85,14.3,121.15,14.8&countrycodes=ph`;
      
      const response = await fetch(boundedUrl, { 
        headers: { 'User-Agent': 'MetroManilaWeatherApp/1.0' } 
      });
      const results = await response.json();
      
      let filteredResults = [];
      
      if (results && results.length > 0) {
        console.log('✅ Using bounded results');
        filteredResults = results.map(item => ({
          name: item.display_name.split(',')[0],
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          address: item.display_name,
          importance: item.importance || 0,
          type: item.type || item.class || 'location'
        }));
      } else {
        console.log('❌ No bounded results, trying fallback search');
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
            name: item.display_name.split(',')[0],
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            address: item.display_name,
            importance: item.importance || 0,
            type: item.type || item.class || 'location'
          }));
      }

      // Sort and limit results
      filteredResults.sort((a, b) => {
        if (b.importance !== a.importance) {
          return b.importance - a.importance;
        }
        return a.name.localeCompare(b.name);
      });

      filteredResults = filteredResults.slice(0, 5);
      
      console.log('📊 Final results count:', filteredResults.length);
      
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

  // Debounced search handler
  const debouncedSearch = useRef(
    _.debounce((query) => {
      searchLocations(query);
    }, 300)
  ).current;

  // Fixed search change handler
  const handleSearchChange = (text) => {
    console.log('🔍 Search text changed:', text);
    
    // Update search query immediately
    updateState({
      searchQuery: text
    });
    
    // Handle search logic
    if (text.length > 2) {
      const cacheKey = text.toLowerCase();
      
      // Check cache first
      if (state.searchCache[cacheKey]) {
        console.log('🎯 Found cached results');
        updateState({
          searchResults: state.searchCache[cacheKey],
          showSearchResults: true,
          isSearching: false
        });
      } else {
        // Show loading state and trigger search
        console.log('🔄 Starting search');
        updateState({
          showSearchResults: true,
          isSearching: true,
          searchResults: []
        });
        
        debouncedSearch(text);
      }
    } else {
      // Clear results for short queries
      updateState({
        searchResults: [],
        showSearchResults: false,
        selectedLocation: null,
        isSearching: false
      });
      removeSearchMarker();
    }
  };

  const removeSearchMarker = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.searchMarker) {
          map.removeLayer(window.searchMarker);
          window.searchMarker = null;
        }
        true;
      `);
    }
  };

  // Fetch weather data for searched location
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

  // Fetch AQI data for searched location
  const fetchAQIForLocation = async (location) => {
    try {
      const response = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lon}&current=pm10,pm2_5,european_aqi`
      );
      const aqi = await response.json();
      const aqiValue = aqi.current.european_aqi || 0;
      return {
        pm25: Math.round(aqi.current.pm2_5 || 0),
        pm10: Math.round(aqi.current.pm10 || 0),
        aqi: Math.round(aqiValue),
        status: getAQIStatus(aqiValue),
      };
    } catch (error) {
      console.error('AQI error for searched location:', error);
      return null;
    }
  };

  // FIXED: Add marker for searched location with proper color calculation
const addSearchMarker = (location, weatherData = null, aqiData = null) => {
  if (webViewRef.current) {
    // Calculate colors on React Native side
    let markerColor = '#00E676';
    let pulseColorRgba = 'rgba(0,230,118,0.4)';
    
    if (state.dataLayer === 'weather' && weatherData) {
      markerColor = getWeatherColor(weatherData.condition, weatherData.temp);
    } else if (state.dataLayer === 'aqi' && aqiData) {
      markerColor = getAQIColor(aqiData.aqi);
    }
    
    // Convert hex to rgba for pulse effect
    if (markerColor !== '#00E676') {
      const hex = markerColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      pulseColorRgba = `rgba(${r}, ${g}, ${b}, 0.4)`;
    }

    // Build popup content on React Native side
    let popupContent = `<div class="popup-content"><div class="popup-title">${location.name.replace(/'/g, "\\'")}</div>`;
    
    if (state.dataLayer === 'weather' && weatherData) {
      popupContent += `<div class="popup-data"><strong style="color: #00E676;">Weather Conditions</strong><br/>🌡️ Temperature: <strong>${weatherData.temp}°C</strong><br/>💧 Humidity: <strong>${weatherData.humidity}%</strong><br/>☁️ Condition: <strong>${weatherData.condition}</strong></div>`;
      popupContent += `<button class="nav-button" onclick="navigateToScreen('Weather', '${location.name.replace(/'/g, "\\'")}', ${location.lat}, ${location.lon})">📊 View Weather Details</button>`;
    } else if (state.dataLayer === 'aqi' && aqiData) {
      popupContent += `<div class="popup-data"><strong style="color: #00E676;">Air Quality Index</strong><br/>🌫️ PM2.5: <strong>${aqiData.pm25} μg/m³</strong><br/>🌪️ PM10: <strong>${aqiData.pm10} μg/m³</strong><br/>📊 AQI: <strong>${aqiData.aqi}</strong> (${aqiData.status})</div>`;
      popupContent += `<button class="nav-button" onclick="navigateToScreen('Aqi', '${location.name.replace(/'/g, "\\'")}', ${location.lat}, ${location.lon})">🌿 View AQI Details</button>`;
    } else {
      popupContent += '<div class="popup-data">📍 <strong>Searched Location</strong><br/>Select a data layer to view more information</div>';
    }
    
    popupContent += '</div>';

    const jsCode = `
      try {
        console.log('🔧 Adding search marker for: ${location.name}');
        
        // Remove existing search marker
        if (window.searchMarker) {
          console.log('🗑️ Removing existing search marker');
          map.removeLayer(window.searchMarker);
          window.searchMarker = null;
        }
        
        // Create custom icon for search marker
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
                background: ${pulseColorRgba};
                border-radius: 50%;
                animation: markerPulse 2s infinite;
              "></div>
              <div style="
                width: 20px;
                height: 20px;
                background: linear-gradient(135deg, ${markerColor} 0%, ${markerColor}dd 100%);
                border-radius: 50%;
                border: 3px solid rgba(255,255,255,0.9);
                box-shadow: 0 0 0 2px ${pulseColorRgba}, 0 3px 12px rgba(0,0,0,0.4);
                position: relative;
                z-index: 1;
              "></div>
            </div>
          \`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        
        // Add the marker to the map
        window.searchMarker = L.marker([${location.lat}, ${location.lon}], { 
          icon: customIcon,
          zIndexOffset: 1000 
        }).addTo(map);
        
        console.log('✅ Search marker added successfully');
        
        // Bind popup and open it
        window.searchMarker.bindPopup(\`${popupContent.replace(/`/g, '\\`')}\`, { 
          maxWidth: 280, 
          className: 'custom-popup' 
        }).openPopup();
        
        // Pan to the location with animation
        map.setView([${location.lat}, ${location.lon}], Math.max(map.getZoom(), 14), {
          animate: true,
          duration: 0.8,
          easeLinearity: 0.25
        });
        
        console.log('🎯 Map centered on search location');
        
      } catch (error) {
        console.error('❌ Error in addSearchMarker:', error);
      }
      
      true;
    `;

    console.log('🚀 Injecting search marker JavaScript');
    webViewRef.current.injectJavaScript(jsCode);
  }
};

 const handleLocationSelect = async (location) => {
  console.log('🖱️ Location selected:', location.name);
  
  // Update state immediately
  updateState({ 
    searchQuery: location.name,
    showSearchResults: false,
    selectedLocation: location
  });

  // Blur the search input
  searchInputRef.current?.blur();

  let weatherData = null;
  let aqiData = null;

  // Add marker first with current data (if available)
  const existingWeather = state.weatherData[location.name];
  const existingAqi = state.aqiData[location.name];
  
  // Add marker immediately with existing data
  setTimeout(() => {
    addSearchMarker(location, existingWeather, existingAqi);
  }, 100);

  // Fetch new data based on current layer
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
      
      // Update marker with fresh weather data
      setTimeout(() => {
        addSearchMarker(location, weatherData, existingAqi);
      }, 100);
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
      
      // Update marker with fresh AQI data
      setTimeout(() => {
        addSearchMarker(location, existingWeather, aqiData);
      }, 100);
    }
  }
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

  const setDataLayer = (layer) => {
    updateState({ dataLayer: layer });
    
    // If there's a selected location, update its marker with new data layer
    if (state.selectedLocation) {
      const location = state.selectedLocation;
      const weatherData = state.weatherData[location.name];
      const aqiData = state.aqiData[location.name];
      
      // Add marker with existing data
      setTimeout(() => {
        addSearchMarker(location, weatherData, aqiData);
      }, 100);
    }
  };

 const handleNavigation = (event) => {
  console.log('🚀 Raw event data:', event.nativeEvent.data);
  
  try {
    const data = JSON.parse(event.nativeEvent.data);
    console.log('📋 Parsed navigation data:', data);
    
    if (data.action === 'navigate') {
      console.log('🧭 Navigation triggered for:', data.screen, data.cityName);
      
      // Add a small delay to ensure state is properly updated
      setTimeout(() => {
        try {
          console.log('🎯 Attempting navigation to:', data.screen);
          
          // Navigate with parameters
          navigation.navigate(data.screen, {
            cityName: data.cityName,
            lat: parseFloat(data.lat),
            lon: parseFloat(data.lon)
          });
          
          console.log('✅ Navigation call completed');
        } catch (navError) {
          console.error('❌ Navigation error:', navError);
          console.error('Navigation object:', navigation);
          
          // Fallback: try going back and then navigating
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
    console.error('❌ JSON parse error:', parseError);
    console.error('Raw data:', event.nativeEvent.data);
  }
};

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  useEffect(() => {
    if (state.dataLayer === 'weather' && state.cities.length) {
      fetchWeatherData();
    }
  }, [state.dataLayer, state.cities, fetchWeatherData]);

  useEffect(() => {
    if (state.dataLayer === 'aqi' && state.cities.length) {
      fetchAQIData();
    }
  }, [state.dataLayer, state.cities, fetchAQIData]);

  const getHtmlContent = useCallback(() => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%); }
            #map { height: 100vh; width: 100%; border-radius: 0; filter: contrast(1.1) saturate(1.2) brightness(0.95); }
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
            .leaflet-tile { filter: hue-rotate(200deg) saturate(0.8) brightness(0.7) contrast(1.2); }
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
            
            const cities = ${JSON.stringify(state.cities)};
            const dataLayer = '${state.dataLayer}';
            const weatherData = ${JSON.stringify(state.weatherData)};
            const aqiData = ${JSON.stringify(state.aqiData)};
            
            const getWeatherColor = (condition, temp) => {
              if (temp >= 35) return '#FF5722';
              if (temp >= 30) return '#FF9800';
              if (temp >= 25) return '#FFC107';
              if (temp >= 20) return '#4CAF50';
              return '#2196F3';
            };
            
            const getAQIColor = (aqi) => {
              if (aqi <= 20) return '#4CAF50';
              if (aqi <= 40) return '#8BC34A';
              if (aqi <= 60) return '#FFC107';
              if (aqi <= 80) return '#FF9800';
              return '#F44336';
            };

            const navigateToScreen = (screen, cityName, lat, lon) => {
                console.log('🌐 WebView: Attempting to navigate', { screen, cityName, lat, lon });
                
                const navigationData = {
                    action: 'navigate',
                    screen: screen,
                    cityName: cityName,
                    lat: lat,
                    lon: lon
                };
                
                console.log('🌐 WebView: Sending message', navigationData);
                
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    try {
                        window.ReactNativeWebView.postMessage(JSON.stringify(navigationData));
                        console.log('✅ WebView: Message sent successfully');
                    } catch (error) {
                        console.error('❌ WebView: Message send error', error);
                    }
                } else {
                    console.error('❌ WebView: ReactNativeWebView not available');
                    console.log('Available objects:', Object.keys(window));
                }
            };
            
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
                    className: 'custom-marker',
                    html: \`<div class="marker-pulse" style="background: linear-gradient(135deg, \${markerColor} 0%, \${markerColor}dd 100%); width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.9); box-shadow: 0 0 0 4px \${pulseColor}, 0 2px 8px rgba(0,0,0,0.3); position: relative;"></div>\`,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                });
                
                const marker = L.marker([city.lat, city.lon], { icon: customIcon }).addTo(map);
                
                let content = '<div class="popup-content"><div class="popup-title">' + city.name + '</div>';
                
                if (dataLayer === 'weather' && weatherData[city.name]) {
                    const w = weatherData[city.name];
                    content += '<div class="popup-data"><strong style="color: #00E676;">Weather Conditions</strong><br/>🌡️ Temperature: <strong>' + w.temp + '°C</strong><br/>💧 Humidity: <strong>' + w.humidity + '%</strong><br/>☁️ Condition: <strong>' + w.condition + '</strong></div>';
                    content += '<button class="nav-button" onclick="navigateToScreen(\\'Weather\\', \\''+city.name+'\\', '+city.lat+', '+city.lon+')">📊 View Weather Details</button>';
                } else if (dataLayer === 'aqi' && aqiData[city.name]) {
                    const a = aqiData[city.name];
                    content += '<div class="popup-data"><strong style="color: #00E676;">Air Quality Index</strong><br/>🌫️ PM2.5: <strong>' + a.pm25 + ' μg/m³</strong><br/>🌪️ PM10: <strong>' + a.pm10 + ' μg/m³</strong><br/>📊 AQI: <strong>' + a.aqi + '</strong> (' + a.status + ')</div>';
                    content += '<button class="nav-button" onclick="navigateToScreen(\\'Aqi\\', \\''+city.name+'\\', '+city.lat+', '+city.lon+')">🌿 View AQI Details</button>';
                } else {
                    content += '<div class="popup-data">🏙️ <strong>Metro Manila LGU</strong><br/>Click the menu to view weather or air quality data</div>';
                }
                
                content += '</div>';
                marker.bindPopup(content, { maxWidth: 250, className: 'custom-popup' });
            });
            
            let legendCollapsed = false;
            
            if (dataLayer === 'weather') {
                const legend = document.createElement('div');
                legend.className = 'legend';
                legend.innerHTML = \`<div class="legend-header" onclick="toggleLegend()"><div class="legend-title">Temperature Scale</div><div class="legend-toggle" id="legendToggle">▼</div></div><div class="legend-content" id="legendContent"><div class="legend-item"><div class="legend-color" style="background: #FF5722;"></div><span class="legend-text">35°C+ Very Hot</span></div><div class="legend-item"><div class="legend-color" style="background: #FF9800;"></div><span class="legend-text">30-34°C Hot</span></div><div class="legend-item"><div class="legend-color" style="background: #FFC107;"></div><span class="legend-text">25-29°C Warm</span></div><div class="legend-item"><div class="legend-color" style="background: #4CAF50;"></div><span class="legend-text">20-24°C Pleasant</span></div><div class="legend-item"><div class="legend-color" style="background: #2196F3;"></div><span class="legend-text">&lt;20°C Cool</span></div></div>\`;
                document.body.appendChild(legend);
            } else if (dataLayer === 'aqi') {
                const legend = document.createElement('div');
                legend.className = 'legend';
                legend.innerHTML = \`<div class="legend-header" onclick="toggleLegend()"><div class="legend-title">Air Quality Index</div><div class="legend-toggle" id="legendToggle">▼</div></div><div class="legend-content" id="legendContent"><div class="legend-item"><div class="legend-color" style="background: #4CAF50;"></div><span class="legend-text">0-20 Good</span></div><div class="legend-item"><div class="legend-color" style="background: #8BC34A;"></div><span class="legend-text">21-40 Fair</span></div><div class="legend-item"><div class="legend-color" style="background: #FFC107;"></div><span class="legend-text">41-60 Moderate</span></div><div class="legend-item"><div class="legend-color" style="background: #FF9800;"></div><span class="legend-text">61-80 Poor</span></div><div class="legend-item"><div class="legend-color" style="background: #F44336;"></div><span class="legend-text">81+ Very Poor</span></div></div>\`;
                document.body.appendChild(legend);
            }
            
            window.toggleLegend = function() {
                const content = document.getElementById('legendContent');
                const toggle = document.getElementById('legendToggle');
                legendCollapsed = !legendCollapsed;
                if (legendCollapsed) {
                    content.classList.add('collapsed');
                    toggle.classList.add('collapsed');
                } else {
                    content.classList.remove('collapsed');
                    toggle.classList.remove('collapsed');
                }
            };
        </script>
    </body>
    </html>
  `, [state.cities, state.dataLayer, state.weatherData, state.aqiData]);

  const handleWebViewLoad = () => {
  console.log('🌐 WebView loaded');
  
  // Inject debugging script
  webViewRef.current?.injectJavaScript(`
    console.log('🔧 WebView: Checking ReactNativeWebView availability');
    console.log('ReactNativeWebView available:', !!window.ReactNativeWebView);
    if (window.ReactNativeWebView) {
      console.log('postMessage available:', !!window.ReactNativeWebView.postMessage);
    }
    true;
  `);
};
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
      {item.type === 'city' || item.type === 'town' ? (
        <Ionicons name="business" size={18} color="#00E676" />
      ) : (
        <Ionicons name="location" size={18} color="#00E676" />
      )}
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

  console.log('Search results:', state.searchResults);
  console.log('Show results:', state.showSearchResults);
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: getHtmlContent() }}
          style={styles.webView}
          onMessage={handleNavigation}
          onLoadEnd={handleWebViewLoad}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          mixedContentMode="compatibility"
          key={`${state.cities.length}-${state.dataLayer}-${Object.keys(state.weatherData).length}-${Object.keys(state.aqiData).length}`}
        />
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
                onFocus={() => updateState({ showSearchResults: state.searchResults.length > 0 })}
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

        {(state.showSearchResults && state.searchQuery.length > 2) && (
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
                keyExtractor={(item, index) => `${item.name}-${item.lat}-${item.lon}-${index}`}
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
                style={styles.searchResultsList}
                contentContainerStyle={styles.searchResultsContent}
              />
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search" size={24} color="rgba(255,255,255,0.4)" />
                <Text style={styles.noResultsText}>No locations found</Text>
                <Text style={styles.noResultsSubtext}>Try a different search term</Text>
              </View>
            )}
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

          {state.loading && (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color="#00E676" />
              <Text style={styles.loadingText}>Loading locations...</Text>
            </View>
          )}

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
  webView: { flex: 1 },
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
  overflow: 'hidden', // Add this to prevent content overflow
},

searchResultItem: {
  paddingVertical: 14,
  paddingHorizontal: 16,
  flexDirection: 'row',
  alignItems: 'center',
  minHeight: 60, // Ensure minimum height
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