import React, { useState, useEffect } from 'react';
  import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    Dimensions, StatusBar, Platform, RefreshControl, Alert, Modal
  } from 'react-native';
  import { WebView } from 'react-native-webview';
  import { Ionicons } from '@expo/vector-icons';
  import { LinearGradient } from 'expo-linear-gradient';
  import { useSelector } from 'react-redux';
  import * as Location from 'expo-location';
  import { LineChart } from 'react-native-chart-kit';

  const { width } = Dimensions.get('window');

 const WeatherScreen = ({ navigation, route }) => {
  const { user } = useSelector((state) => state.auth);
  const [weatherData, setWeatherData] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeChart, setActiveChart] = useState('temperature');
  const [showWindyMap, setShowWindyMap] = useState(false);
  const [useGPS, setUseGPS] = useState(false);
  const [chartDataModal, setChartDataModal] = useState({ visible: false, data: null });

  // Get navigation parameters
  const { cityName, lat, lon } = route.params || {};
  const isFromNavigation = !!(cityName && lat && lon);

  useEffect(() => {
    initializeWeather();
  }, [useGPS, isFromNavigation]);

  const initializeWeather = async () => {
    try {
      setLoading(true);
      let coords;
      
      // If navigation parameters exist, use them directly
      if (isFromNavigation) {
        coords = { latitude: lat, longitude: lon };
      } else {
        // Original logic for user location or GPS
        coords = useGPS || !user?.city 
          ? await getCurrentLocation() 
          : await geocodeCity(user.city).catch(() => getCurrentLocation());
      }

      if (coords) {
        await fetchWeatherData(coords.latitude, coords.longitude);
        setLocation(coords);
      }
    } catch (error) {
      Alert.alert('Weather Error', 'Failed to load weather data. Please try again.', [
        { text: 'Retry', onPress: initializeWeather },
        { text: 'Cancel', style: 'cancel' }
      ]);
    } finally {
      setLoading(false);
    }
  };

    const getCurrentLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied');
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
        maximumAge: 300000,
      });
      
      return { latitude: location.coords.latitude, longitude: location.coords.longitude };
    };

    const geocodeCity = async (city) => {
      const queries = [city, city.replace(/\s+City$/i, '').trim(), `${city}, Philippines`];

      for (const query of queries) {
        try {
          const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`
          );
          const data = await response.json();
          if (data.results?.[0]) {
            return { latitude: data.results[0].latitude, longitude: data.results[0].longitude };
          }
        } catch (error) {
          continue;
        }
      }
      throw new Error(`Location "${city}" not found`);
    };

    const fetchWeatherData = async (lat, lon) => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max,winddirection_10m_dominant,uv_index_max,relative_humidity_2m_mean&hourly=temperature_2m,precipitation,weathercode,windspeed_10m,relative_humidity_2m,uv_index,visibility,pressure_msl&timezone=auto&forecast_days=14`
      );
      
      if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
      const data = await response.json();
      if (!data.daily || !data.hourly) throw new Error('Invalid weather data');
      
      setWeatherData(data);
    };
  const getWindyMapHTML = (isFullscreen = false) => {
    const lat = location?.latitude || 14.5995;
    const lon = location?.longitude || 120.9842;
    const zoom = isFullscreen ? 10 : 8;
    
    const currentWeather = weatherData ? {
      temp: Math.round(weatherData.daily.temperature_2m_max[0] || 0),
      tempMin: Math.round(weatherData.daily.temperature_2m_min[0] || 0),
      precipitation: weatherData.daily.precipitation_sum[0] || 0,
      windSpeed: Math.round(weatherData.daily.windspeed_10m_max[0] || 0),
      humidity: Math.round(weatherData.daily.relative_humidity_2m_mean[0] || 0),
      uvIndex: weatherData.daily.uv_index_max[0] || 0,
      weatherCode: weatherData.daily.weathercode[0] || 0
    } : null;
    
    return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Windy Map with Weather Data</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body, #windy { margin: 0; padding: 0; height: 100vh; width: 100vw; overflow: hidden; ${!isFullscreen ? 'pointer-events: none;' : ''} }
      ${!isFullscreen ? '.leaflet-control-container { display: none; }' : ''}
      
      .weather-popup {
        background: linear-gradient(135deg, rgba(15,15,35,0.95) 0%, rgba(26,26,46,0.95) 100%);
        border: 2px solid rgba(0,230,118,0.3); border-radius: 16px; padding: 16px; min-width: 250px; color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5); backdrop-filter: blur(10px);
      }
      
      .city-popup {
        background: linear-gradient(135deg, rgba(15,15,35,0.95) 0%, rgba(26,26,46,0.95) 100%);
        border: 2px solid rgba(244,67,54,0.3); border-radius: 16px; padding: 16px; min-width: 250px; color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5); backdrop-filter: blur(10px);
      }
      
      .weather-popup h3, .city-popup h3 { margin: 0 0 12px 0; font-size: 18px; font-weight: 700; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }
      .weather-popup h3 { color: #00E676; }
      .city-popup h3 { color: #f44336; }
      .weather-main { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; }
      .weather-icon { font-size: 48px; margin-right: 16px; }
      .temp-info { text-align: right; }
      .current-temp { font-size: 32px; font-weight: 300; color: #FFFFFF; line-height: 1; }
      .temp-range { font-size: 14px; color: rgba(255,255,255,0.7); font-weight: 500; margin-top: 4px; }
      .weather-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .detail-item { display: flex; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid; }
      .detail-item.precipitation { border-left-color: #2196F3; }
      .detail-item.wind { border-left-color: #4CAF50; }
      .detail-item.humidity { border-left-color: #FF9800; }
      .detail-item.uv { border-left-color: #FFC107; }
      .detail-icon { font-size: 16px; margin-right: 8px; width: 20px; text-align: center; }
      .detail-text { font-size: 13px; font-weight: 600; color: #FFFFFF; }
      .detail-label { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px; }
      
      .loading { text-align: center; color: rgba(255,255,255,0.7); font-style: italic; }
      
      .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; border-radius: 0 !important; }
      .leaflet-popup-content { margin: 0 !important; }
      .leaflet-popup-tip { background: rgba(15,15,35,0.95) !important; border: 1px solid rgba(0,230,118,0.3) !important; }
      
      /* Weather Legend Styles */
      .weather-legend {
        position: absolute;
        top: 20px;
        left: 20px;
        z-index: 1000;
        background: linear-gradient(135deg, rgba(15,15,35,0.95) 0%, rgba(26,26,46,0.95) 100%);
        border: 2px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        overflow: hidden;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.3s ease;
        min-width: 200px;
      }
      
      .legend-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: rgba(255,255,255,0.05);
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      
      .legend-title {
        color: #FFFFFF;
        font-weight: 600;
        font-size: 14px;
        margin: 0;
      }
      
      .legend-toggle {
        color: rgba(255,255,255,0.7);
        font-size: 16px;
        transition: transform 0.3s ease;
      }
      
      .legend-toggle.collapsed {
        transform: rotate(-90deg);
      }
      
      .legend-content {
        padding: 16px;
        transition: all 0.3s ease;
        overflow: hidden;
      }
      
      .legend-content.collapsed {
        max-height: 0;
        padding: 0 16px;
        opacity: 0;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;
        color: #FFFFFF;
      }
      
      .legend-item:last-child {
        margin-bottom: 0;
      }
      
      .legend-marker {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        margin-right: 12px;
        border: 2px solid rgba(255,255,255,0.8);
        flex-shrink: 0;
      }
      
      .legend-marker.temp-cold { background: #2196F3; }
      .legend-marker.temp-cool { background: #03A9F4; }
      .legend-marker.temp-mild { background: #4CAF50; }
      .legend-marker.temp-warm { background: #FF9800; }
      .legend-marker.temp-hot { background: #FF5722; }
      .legend-marker.temp-extreme { background: #E91E63; }
      .legend-marker.user-location { background: #00E676; }
    </style>
    <script src="https://unpkg.com/leaflet@1.4.0/dist/leaflet.js"></script>
    <script src="https://api.windy.com/assets/map-forecast/libBoot.js"></script>
  </head>
  <body>
    <div id="windy"></div>
    
    <!-- Weather Legend -->
    <div class="weather-legend">
      <div class="legend-header" onclick="toggleLegend()">
        <h4 class="legend-title">Weather Legend</h4>
        <span class="legend-toggle collapsed">▼</span>
      </div>
      <div class="legend-content collapsed">
        <div class="legend-item">
          <div class="legend-marker user-location"></div>
          <span>Your Location</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker temp-cold"></div>
          <span>Cold (< 10°C)</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker temp-cool"></div>
          <span>Cool (10-20°C)</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker temp-mild"></div>
          <span>Mild (20-25°C)</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker temp-warm"></div>
          <span>Warm (25-30°C)</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker temp-hot"></div>
          <span>Hot (30-35°C)</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker temp-extreme"></div>
          <span>Extreme (> 35°C)</span>
        </div>
      </div>
    </div>

    <script>
      const getWeatherIcon = (code) => ({ 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌧️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '⛈️', 71: '🌨️', 73: '❄️', 75: '❄️', 95: '⛈️' }[code] || '☁️');
      
      // Get color based on temperature
      const getTemperatureColor = (temp) => {
        if (temp < 10) return '#2196F3';      // Cold - Blue
        if (temp < 20) return '#03A9F4';      // Cool - Light Blue
        if (temp < 25) return '#4CAF50';      // Mild - Green
        if (temp < 30) return '#FF9800';      // Warm - Orange
        if (temp < 35) return '#FF5722';      // Hot - Red Orange
        return '#E91E63';                     // Extreme - Pink/Red
      };
      
      // Create weather marker icon
      const createWeatherMarker = (temperature, isUserLocation = false) => {
        const color = isUserLocation ? '#00E676' : getTemperatureColor(temperature);
        const size = isUserLocation ? 20 : 16;
        
        return L.divIcon({
          className: 'weather-marker',
          html: \`<div style="
            background: \${color};
            border-radius: 50%;
            width: \${size}px;
            height: \${size}px;
            border: 3px solid rgba(255,255,255,0.8);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            \${isUserLocation ? 'animation: pulse 2s infinite;' : ''}
          "></div>
          \${isUserLocation ? \`<style>
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.7); }
              70% { box-shadow: 0 0 0 10px rgba(0, 230, 118, 0); }
              100% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0); }
            }
          </style>\` : ''}\`,
          iconSize: [size + 6, size + 6],
          iconAnchor: [(size + 6) / 2, (size + 6) / 2]
        });
      };
      
      // Toggle legend function
      const toggleLegend = () => {
        const content = document.querySelector('.legend-content');
        const toggle = document.querySelector('.legend-toggle');
        
        content.classList.toggle('collapsed');
        toggle.classList.toggle('collapsed');
      };
      
      const createWeatherPopup = (weatherData, title = "Current Weather") => {
        if (!weatherData) {
          return \`<div class="weather-popup"><h3>\${title}</h3><div class="loading">Loading weather data...</div></div>\`;
        }
        
        return \`<div class="weather-popup">
          <h3>\${title}</h3>
          <div class="weather-main">
            <div class="weather-icon">\${getWeatherIcon(weatherData.weatherCode)}</div>
            <div class="temp-info">
              <div class="current-temp">\${weatherData.temp}°</div>
              <div class="temp-range">H:\${weatherData.temp}° L:\${weatherData.tempMin}°</div>
            </div>
          </div>
          <div class="weather-details">
            <div class="detail-item precipitation">
              <div class="detail-icon">💧</div>
              <div>
                <div class="detail-text">\${weatherData.precipitation}mm</div>
                <div class="detail-label">Precipitation</div>
              </div>
            </div>
            <div class="detail-item wind">
              <div class="detail-icon">💨</div>
              <div>
                <div class="detail-text">\${weatherData.windSpeed}km/h</div>
                <div class="detail-label">Wind Speed</div>
              </div>
            </div>
            <div class="detail-item humidity">
              <div class="detail-icon">💦</div>
              <div>
                <div class="detail-text">\${weatherData.humidity}%</div>
                <div class="detail-label">Humidity</div>
              </div>
            </div>
            <div class="detail-item uv">
              <div class="detail-icon">☀️</div>
              <div>
                <div class="detail-text">\${weatherData.uvIndex.toFixed(1)}</div>
                <div class="detail-label">UV Index</div>
              </div>
            </div>
          </div>
        </div>\`;
      };
      
      const fetchWeatherData = async (lat, lon) => {
        try {
          const url = \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,relative_humidity_2m_mean,uv_index_max,weathercode&timezone=auto\`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.daily) {
            return {
              temp: Math.round(data.daily.temperature_2m_max[0] || 0),
              tempMin: Math.round(data.daily.temperature_2m_min[0] || 0),
              precipitation: data.daily.precipitation_sum[0] || 0,
              windSpeed: Math.round(data.daily.windspeed_10m_max[0] || 0),
              humidity: Math.round(data.daily.relative_humidity_2m_mean[0] || 0),
              uvIndex: data.daily.uv_index_max[0] || 0,
              weatherCode: data.daily.weathercode[0] || 0
            };
          }
          return null;
        } catch (error) {
          console.error('Error fetching weather data:', error);
          return null;
        }
      };
      
      const fetchNearbyCities = async (lat, lon) => {
        try {
          const response = await fetch(\`https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];(node["place"~"^(city|town)$"]["population"](around:50000,\${lat},\${lon}););out meta;\`);
          const data = await response.json();
          return data.elements
            .filter(e => e.tags.name && e.tags.population)
            .slice(0, 15)
            .map(e => ({
              name: e.tags.name,
              lat: e.lat,
              lon: e.lon,
              population: parseInt(e.tags.population) || 0,
              country: e.tags['addr:country'] || e.tags.country
            }));
        } catch (error) {
          console.error('Error fetching cities:', error);
          return [];
        }
      };
      
      windyInit({ key: 'hoJfWD9PMGa5LzrkrHR8y51lleNLTBpy', lat: ${lat}, lon: ${lon}, zoom: ${zoom}, marker: false }, async windyAPI => {
        const { map } = windyAPI;
        
        // User location marker with special styling
        const userTemp = ${currentWeather ? currentWeather.temp : 25};
        const userMarker = L.marker([${lat}, ${lon}], {
          icon: createWeatherMarker(userTemp, true)
        }).addTo(map);
        
        userMarker.bindPopup(createWeatherPopup(${JSON.stringify(currentWeather)}, "Your Location"), { 
          maxWidth: 300, 
          closeButton: true, 
          autoClose: false, 
          closeOnClick: false 
        });
        ${isFullscreen ? 'setTimeout(() => userMarker.openPopup(), 500);' : ''}
        
        // Fetch and add nearby cities with weather data
        const cities = await fetchNearbyCities(${lat}, ${lon});
        
        cities.forEach(async city => {
          // Create marker with default temperature (will be updated when weather data loads)
          const cityMarker = L.marker([city.lat, city.lon], {
            icon: createWeatherMarker(20) // Default temperature for initial display
          }).addTo(map);
          
          // Bind initial popup with loading state
          cityMarker.bindPopup(createWeatherPopup(null, \`🏙️ \${city.name}\`), { 
            maxWidth: 300, 
            closeButton: true,
            autoClose: false,
            closeOnClick: false
          });
          
          // Fetch weather data and update marker color
          const cityWeather = await fetchWeatherData(city.lat, city.lon);
          if (cityWeather) {
            // Update marker icon with correct temperature color
            cityMarker.setIcon(createWeatherMarker(cityWeather.temp));
            
            // Update popup content
            cityMarker.setPopupContent(createWeatherPopup(cityWeather, \`🏙️ \${city.name}\`));
          }
          
          cityMarker.on('click', () => {
            cityMarker.openPopup();
          });
        });
        
        ${!isFullscreen ? 'map.dragging.disable(); map.touchZoom.disable(); map.doubleClickZoom.disable(); map.scrollWheelZoom.disable();' : ''}
      });
    </script>
  </body>
  </html>`;
  };
    const getWeatherIcon = (code) => {
      const iconMap = {
        0: 'sunny', 1: 'partly-sunny', 2: 'cloudy', 3: 'cloudy', 45: 'cloudy', 48: 'cloudy',
        51: 'rainy', 53: 'rainy', 55: 'rainy', 61: 'rainy', 63: 'rainy', 65: 'rainy',
        71: 'snow', 73: 'snow', 75: 'snow', 95: 'thunderstorm',
      };
      return iconMap[code] || 'cloudy';
    };

    const formatDate = (dateStr, index) => {
      const date = new Date(dateStr);
      if (index === 0) return 'Today';
      if (index === 1) return 'Tomorrow';
      return date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const getAdvisories = () => {
      if (!weatherData) return [];
      const advisories = [];
      const today = weatherData.daily;
      
      if (today.precipitation_sum[0] > 10) {
        advisories.push({ type: 'rain', text: 'Heavy rain expected', icon: 'rainy', color: '#2196F3' });
      }
      if (today.windspeed_10m_max[0] > 25) {
        advisories.push({ type: 'wind', text: 'Strong winds expected', icon: 'leaf', color: '#FF9800' });
      }
      if (today.temperature_2m_max[0] > 35) {
        advisories.push({ type: 'heat', text: 'High temperature warning', icon: 'thermometer', color: '#FF5722' });
      }
      if (today.uv_index_max[0] > 7) {
        advisories.push({ type: 'uv', text: 'High UV index', icon: 'sunny', color: '#FFC107' });
      }
      
      return advisories;
    };

    const getHourlyData = (dayIndex) => {
      if (!weatherData) return [];
      const startHour = dayIndex * 24;
      return Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        temp: weatherData.hourly.temperature_2m[startHour + i] || 0,
        precipitation: weatherData.hourly.precipitation[startHour + i] || 0,
        humidity: weatherData.hourly.relative_humidity_2m[startHour + i] || 0,
        windspeed: weatherData.hourly.windspeed_10m[startHour + i] || 0,
        pressure: weatherData.hourly.pressure_msl[startHour + i] || 0,
        uv: weatherData.hourly.uv_index[startHour + i] || 0,
      }));
    };

    const handleChartDataPointClick = (data) => {
      const hourlyData = getHourlyData(selectedDay);
      const dataIndex = data.index;
      const actualIndex = dataIndex * 3; // Since we filter every 3rd item
      const pointData = hourlyData[actualIndex];
      
      if (pointData) {
        setChartDataModal({
          visible: true,
          data: {
            hour: pointData.hour,
            temp: pointData.temp,
            precipitation: pointData.precipitation,
            humidity: pointData.humidity,
            windspeed: pointData.windspeed,
            pressure: pointData.pressure,
            uv: pointData.uv,
          }
        });
      }
    };

    const renderChart = () => {
      const hourlyData = getHourlyData(selectedDay);
      const labels = hourlyData.filter((_, i) => i % 3 === 0).map(d => `${d.hour}h`);
      
      const chartConfigs = {
        temperature: { data: hourlyData.filter((_, i) => i % 3 === 0).map(d => d.temp), color: '#00E676', suffix: '°C' },
        precipitation: { data: hourlyData.filter((_, i) => i % 3 === 0).map(d => d.precipitation), color: '#2196F3', suffix: 'mm' },
        humidity: { data: hourlyData.filter((_, i) => i % 3 === 0).map(d => d.humidity), color: '#FF9800', suffix: '%' },
        windspeed: { data: hourlyData.filter((_, i) => i % 3 === 0).map(d => d.windspeed), color: '#9C27B0', suffix: 'km/h' },
        pressure: { data: hourlyData.filter((_, i) => i % 3 === 0).map(d => d.pressure), color: '#F44336', suffix: 'hPa' },
        uv: { data: hourlyData.filter((_, i) => i % 3 === 0).map(d => d.uv), color: '#FFC107', suffix: '' },
      };

      const config = chartConfigs[activeChart];

      return (
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels,
              datasets: [{ data: config.data, color: () => config.color, strokeWidth: 3 }]
            }}
            width={width - 60}
            height={220}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'rgba(0,0,0,0.1)',
              backgroundGradientTo: 'rgba(0,0,0,0.1)',
              decimalPlaces: 1,
              color: () => config.color,
              labelColor: () => 'rgba(255,255,255,0.9)',
              style: { borderRadius: 16 },
              propsForBackgroundLines: { strokeWidth: 1, stroke: 'rgba(255,255,255,0.1)' },
              propsForDots: { r: '6', strokeWidth: '2', stroke: config.color, fill: config.color },
              propsForLabels: { fontSize: 12, fontWeight: '600' },
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            onDataPointClick={handleChartDataPointClick}
          />
          <Text style={[styles.chartUnit, { color: config.color }]}>
            {activeChart.charAt(0).toUpperCase() + activeChart.slice(1)} {config.suffix}
          </Text>
        </View>
      );
    };

    const displayDays = 14;

    if (loading) {
      return (
        <View style={styles.container}>
          <LinearGradient colors={['#0F0F23', '#1A1A2E', '#16213E']} style={styles.gradient}>
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.loadingContainer}>
                <Ionicons name="partly-sunny" size={60} color="#00E676" />
                <Text style={styles.loadingText}>Loading Weather...</Text>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </View>
      );
    }

    if (showWindyMap) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0F0F23" />
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <TouchableOpacity style={styles.headerButton} onPress={() => setShowWindyMap(false)}>
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Weather Map</Text>
              <TouchableOpacity style={styles.headerButton} onPress={initializeWeather}>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <WebView
              source={{ html: getWindyMapHTML(true) }}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <Ionicons name="map" size={40} color="#00E676" />
                  <Text style={styles.loadingText}>Loading Map...</Text>
                </View>
              )}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={['#0F0F23', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Weather Forecast</Text>
              <TouchableOpacity style={styles.headerButton} onPress={initializeWeather}>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={initializeWeather} tintColor="#00E676" />}
            >
              {/* Location Toggle */}
             {!isFromNavigation && (
                <View style={styles.locationToggle}>
                  <TouchableOpacity
                    style={[styles.toggleButton, !useGPS && styles.activeToggle]}
                    onPress={() => setUseGPS(false)}
                  >
                    <Ionicons name="business" size={16} color={!useGPS ? "#00E676" : "rgba(255,255,255,0.7)"} />
                    <Text style={[styles.toggleText, !useGPS && styles.activeToggleText]}>
                      {user?.city || 'City'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, useGPS && styles.activeToggle]}
                    onPress={() => setUseGPS(true)}
                  >
                    <Ionicons name="location" size={16} color={useGPS ? "#00E676" : "rgba(255,255,255,0.7)"} />
                    <Text style={[styles.toggleText, useGPS && styles.activeToggleText]}>GPS</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Current Weather */}
              <View style={styles.card}>
                <View style={styles.locationHeader}>
                  <Ionicons name={isFromNavigation ? "business" : (useGPS ? "location" : "business")} size={16} color="#00E676" />
                  <Text style={styles.locationText}>
                    {isFromNavigation 
                      ? cityName 
                      : (useGPS ? 'Current Location' : (user?.city || 'City'))
                    }
                  </Text>
                </View>
                <View style={styles.currentMain}>
                  <Ionicons name={getWeatherIcon(weatherData?.daily?.weathercode?.[0])} size={70} color="#00E676" />
                  <View style={styles.tempContainer}>
                    <Text style={styles.currentTemp}>{Math.round(weatherData?.daily?.temperature_2m_max?.[0] || 0)}°</Text>
                    <Text style={styles.tempRange}>
                      H:{Math.round(weatherData?.daily?.temperature_2m_max?.[0] || 0)}° L:{Math.round(weatherData?.daily?.temperature_2m_min?.[0] || 0)}°
                    </Text>
                  </View>
                </View>
                
                <View style={styles.weatherDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="water" size={16} color="#2196F3" />
                    <Text style={styles.detailText}>{weatherData?.daily?.precipitation_sum?.[0] || 0}mm</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="leaf" size={16} color="#4CAF50" />
                    <Text style={styles.detailText}>{Math.round(weatherData?.daily?.windspeed_10m_max?.[0] || 0)}km/h</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="water-outline" size={16} color="#FF9800" />
                    <Text style={styles.detailText}>{Math.round(weatherData?.daily?.relative_humidity_2m_mean?.[0] || 0)}%</Text>
                  </View>
                </View>
              </View>

              {/* Weather Map Overview */}
              <View style={styles.card}>
                <View style={styles.mapOverviewHeader}>
                  <Text style={styles.sectionTitle}>Weather Map</Text>
                  <TouchableOpacity 
                    style={styles.fullscreenButton} 
                    onPress={() => setShowWindyMap(true)}
                  >
                    <Ionicons name="expand" size={18} color="#00E676" />
                    <Text style={styles.fullscreenButtonText}>Full View</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.mapOverviewContainer}>
                  <WebView
                    source={{ html: getWindyMapHTML(false) }}
                    style={styles.mapOverview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    scrollEnabled={false}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.mapOverviewLoading}>
                        <Ionicons name="map" size={30} color="#00E676" />
                        <Text style={styles.mapLoadingText}>Loading Map...</Text>
                      </View>
                    )}
                  />
                  <TouchableOpacity 
                    style={styles.mapOverlay} 
                    onPress={() => setShowWindyMap(true)}
                    activeOpacity={0.7}
                  >
                  </TouchableOpacity>
                </View>
              </View>

              {/* Advisories */}
              {getAdvisories().length > 0 && (
                <View style={styles.advisoriesCard}>
                  <Text style={styles.sectionTitle}>Weather Advisories</Text>
                  <View style={styles.advisoriesContainer}>
                    {getAdvisories().map((advisory, index) => (
                      <View key={index} style={[styles.advisoryItem, { borderLeftColor: advisory.color }]}>
                        <Ionicons name={advisory.icon} size={18} color={advisory.color} />
                        <Text style={[styles.advisoryText, { color: advisory.color }]}>{advisory.text}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}


              {/* Horizontal Forecast */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{displayDays}-Day Forecast</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
                  {weatherData?.daily?.time?.slice(0, displayDays).map((date, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.forecastDay, selectedDay === index && styles.selectedDay]}
                      onPress={() => setSelectedDay(index)}
                    >
                      <Text style={styles.dayText}>{formatDate(date, index)}</Text>
                      <Ionicons name={getWeatherIcon(weatherData.daily.weathercode[index])} size={32} color="#00E676" />
                      <Text style={styles.forecastTemp}>
                        {Math.round(weatherData.daily.temperature_2m_max[index])}°
                      </Text>
                      <Text style={styles.forecastTempMin}>
                        {Math.round(weatherData.daily.temperature_2m_min[index])}°
                      </Text>
                      <Text style={styles.precipText}>{weatherData.daily.precipitation_sum[index]}mm</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Charts */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Hourly Forecast - {formatDate(weatherData?.daily?.time?.[selectedDay], selectedDay)}</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartTabs}>
                  {['temperature', 'precipitation', 'humidity', 'windspeed', 'pressure', 'uv'].map(chart => (
                    <TouchableOpacity
                      key={chart}
                      style={[styles.chartTab, activeChart === chart && styles.activeChartTab]}
                      onPress={() => setActiveChart(chart)}
                    >
                      <Text style={[styles.chartTabText, activeChart === chart && styles.activeChartTabText]}>
                        {chart.charAt(0).toUpperCase() + chart.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {renderChart()}
              </View>
            </ScrollView>

            {/* Chart Data Modal */}
            <Modal
              visible={chartDataModal.visible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setChartDataModal({ visible: false, data: null })}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    {chartDataModal.data?.hour}:00 Details
                  </Text>
                  {chartDataModal.data && (
                    <View style={styles.modalData}>
                      <View style={styles.modalRow}>
                        <Ionicons name="thermometer" size={16} color="#00E676" />
                        <Text style={styles.modalText}>Temperature: {chartDataModal.data.temp.toFixed(1)}°C</Text>
                      </View>
                      <View style={styles.modalRow}>
                        <Ionicons name="water" size={16} color="#2196F3" />
                        <Text style={styles.modalText}>Precipitation: {chartDataModal.data.precipitation.toFixed(1)}mm</Text>
                      </View>
                      <View style={styles.modalRow}>
                        <Ionicons name="water-outline" size={16} color="#FF9800" />
                        <Text style={styles.modalText}>Humidity: {chartDataModal.data.humidity.toFixed(0)}%</Text>
                      </View>
                      <View style={styles.modalRow}>
                        <Ionicons name="leaf" size={16} color="#9C27B0" />
                        <Text style={styles.modalText}>Wind Speed: {chartDataModal.data.windspeed.toFixed(1)}km/h</Text>
                      </View>
                      <View style={styles.modalRow}>
                        <Ionicons name="speedometer" size={16} color="#F44336" />
                        <Text style={styles.modalText}>Pressure: {chartDataModal.data.pressure.toFixed(0)}hPa</Text>
                      </View>
                      <View style={styles.modalRow}>
                        <Ionicons name="sunny" size={16} color="#FFC107" />
                        <Text style={styles.modalText}>UV Index: {chartDataModal.data.uv.toFixed(1)}</Text>
                      </View>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setChartDataModal({ visible: false, data: null })}
                  >
                    <Text style={styles.modalCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F0F23' },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 20,
      paddingBottom: 15,
    },
    headerButton: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', flex: 1 },
    content: { flex: 1, paddingHorizontal: 20 },
    scrollContent: { paddingBottom: 100 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: 16, color: '#FFFFFF', marginTop: 20, fontWeight: '600' },
    
    // Map styles
    mapContainer: { flex: 1, backgroundColor: '#0F0F23', paddingBottom: 110 },
    mapHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 50,
      paddingBottom: 10, backgroundColor: '#0F0F23',
    },
    webView: { flex: 1 },
    webViewLoading: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F23',
    },
    
    // Map Overview styles
    mapOverviewHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 15,
    },
    fullscreenButton: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,230,118,0.1)',
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
      borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1,
    },
    fullscreenButtonText: {
      fontSize: 14, color: '#00E676', fontWeight: '600', marginLeft: 6,
    },
    mapOverviewContainer: {
      height: 200, borderRadius: 16, overflow: 'hidden', position: 'relative',
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    mapOverview: {
      flex: 1, backgroundColor: 'transparent',
    },
  mapOverviewLoading: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15,15,35,0.8)',
    },
    mapLoadingText: {
      fontSize: 14, color: '#FFFFFF', marginTop: 8, fontWeight: '500',
    },
    mapOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center',
    },
    mapOverlayContent: {
      alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25,
    },
    mapOverlayText: {
      fontSize: 14, color: '#FFFFFF', fontWeight: '600', marginTop: 4,
    },

    // Card styles
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 20,
      padding: 20, marginBottom: 16, borderColor: 'rgba(0,230,118,0.15)', borderWidth: 1,
    },
    locationToggle: {
      flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 25, padding: 4, marginBottom: 20, alignSelf: 'center',
    },
    toggleButton: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 20, minWidth: 80, justifyContent: 'center',
    },
    activeToggle: {
      backgroundColor: 'rgba(0,230,118,0.2)', borderColor: 'rgba(0,230,118,0.4)', borderWidth: 1,
    },
    toggleText: {
      fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginLeft: 4,
    },
    activeToggleText: { color: '#00E676' },
    
    // Current weather
    locationHeader: {
      flexDirection: 'row', alignItems: 'center', marginBottom: 20,
    },
    locationText: {
      fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginLeft: 8,
    },
    currentMain: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
    },
    tempContainer: { alignItems: 'flex-end' },
    currentTemp: {
      fontSize: 56, fontWeight: '300', color: '#FFFFFF', lineHeight: 60,
    },
    tempRange: {
      fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '500',
    },
    weatherDetails: {
      flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16,
      borderTopColor: 'rgba(255,255,255,0.1)', borderTopWidth: 1,
    },
    detailItem: {
      flexDirection: 'row', alignItems: 'center',
    },
    detailText: {
      fontSize: 14, color: '#FFFFFF', fontWeight: '600', marginLeft: 6,
    },

    // Advisories
    advisoriesCard: {
      backgroundColor: 'rgba(255, 87, 34, 0.1)', borderRadius: 20,
      padding: 20, marginBottom: 16, borderColor: 'rgba(255,87,34,0.3)', borderWidth: 1,
    },
    advisoriesContainer: { marginTop: 12 },
    advisoryItem: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
      paddingLeft: 12, borderLeftWidth: 3, marginBottom: 8,
      backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8,
    },
    advisoryText: {
      fontSize: 14, fontWeight: '600', marginLeft: 12,
    },

    // Section title
    sectionTitle: {
      fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 16,
    },

    // Forecast
    forecastScroll: { marginTop: 8 },
    forecastDay: {
      alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12,
      marginRight: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)',
      minWidth: 80, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
    },
    selectedDay: {
      backgroundColor: 'rgba(0,230,118,0.15)', borderColor: 'rgba(0,230,118,0.4)',
    },
    dayText: {
      fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 8,
    },
    forecastTemp: {
      fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 8,
    },
    forecastTempMin: {
      fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginTop: 2,
    },
    precipText: {
      fontSize: 10, color: '#2196F3', fontWeight: '600', marginTop: 4,
    },
    chart: {
      borderRadius: 16,
    },
    chartTabs: {
      marginBottom: 20,
      paddingHorizontal: 0,
    },
    chartTab: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
    },
    activeChartTab: {
      backgroundColor: 'rgba(0,230,118,0.2)',
      borderColor: '#00E676',
      borderWidth: 2,
    },
    chartTabText: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    activeChartTabText: {
      color: '#00E676',
      fontWeight: '700',
    },

  chartContainer: {
      alignItems: 'center',
      marginBottom: 20,
      borderRadius: 16,
      padding: 15,
    },
    
    chart: {
      borderRadius: 16,
    },
    
    // Chart unit text
    chartUnit: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 15,
      textAlign: 'center',
      opacity: 1,
    },

    // Modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center',
      alignItems: 'center', paddingHorizontal: 20,
    },
    modalContent: {
      backgroundColor: '#1A1A2E', borderRadius: 20, padding: 24,
      width: '100%', maxWidth: 350, borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1,
    },
    modalTitle: {
      fontSize: 18, fontWeight: '700', color: '#FFFFFF', textAlign: 'center',
      marginBottom: 20,
    },
    modalData: { marginBottom: 20 },
    modalRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
      borderBottomColor: 'rgba(255,255,255,0.1)', borderBottomWidth: 1,
    },
    modalText: {
      fontSize: 14, color: '#FFFFFF', fontWeight: '500', marginLeft: 12,
    },
    modalCloseButton: {
      backgroundColor: 'rgba(0,230,118,0.2)', paddingVertical: 12,
      borderRadius: 12, alignItems: 'center', borderColor: 'rgba(0,230,118,0.4)', borderWidth: 1,
    },
    modalCloseText: {
      fontSize: 16, fontWeight: '600', color: '#00E676',
    },
  });

  export default WeatherScreen;