import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView,ActivityIndicator , Platform, TouchableOpacity, Dimensions, StatusBar, RefreshControl, Alert, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import * as Location from 'expo-location';
import { LineChart } from 'react-native-chart-kit';
import { classifyPollutionSource } from '../../api/pollutionSource';

const { width } = Dimensions.get('window');

const AqiScreen = ({ navigation, route }) => {
  const { user } = useSelector((state) => state.auth);
  const [aqiData, setAqiData] = useState(null);
  const [showHourlyModal, setShowHourlyModal] = useState(false);
  const [selectedHourData, setSelectedHourData] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeChart, setActiveChart] = useState('aqi');
  const [showMap, setShowMap] = useState(false);
  const [useGPS, setUseGPS] = useState(false);
  const [pollutionSource, setPollutionSource] = useState(null);
  const [displayLocationName, setDisplayLocationName] = useState('');

  // Get parameters from navigation
  const { cityName, lat, lon } = route?.params || {};
  const isParameterLocation = !!(cityName && lat && lon);

  useEffect(() => { 
    initializeAQI(); 
  }, [useGPS, cityName, lat, lon]);
const initializeAQI = async () => {
  try {
    setLoading(true);
    let coords;
    let locationName = '';
    
    try {
      // Priority 1: Use parameter location if provided
      if (isParameterLocation) {
        coords = { latitude: lat, longitude: lon };
        locationName = cityName;
        const address = await reverseGeocode(lat, lon);
        locationName = address?.city || address?.region || cityName;
      } 
      // Priority 2: Use GPS if enabled
      else if (useGPS) {
        coords = await getCurrentLocation();
        const address = await reverseGeocode(coords.latitude, coords.longitude);
        locationName = address?.city || address?.region || 'Current Location';
      }
      // Priority 3: Use user's city from profile
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
          'User-Agent': 'YourAppName/1.0 (your@email.com)' // Required by Nominatim usage policy
        }
      }
    );
    
    // First check if response is HTML
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
    // First try with Philippines-specific query
    let response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}, Philippines&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'YourAppName/1.0 (your@email.com)' // Required by Nominatim usage policy
        }
      }
    );
    
    // Check if response is HTML (indicating an error)
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
    
    // Fallback to our predefined city coordinates if Nominatim fails
    const philippineCities = {
      'manila': { lat: 14.5995, lon: 120.9842 },
      'makati': { lat: 14.5547, lon: 121.0244 },
      'quezon city': { lat: 14.6760, lon: 121.0437 },
      'cebu': { lat: 10.3157, lon: 123.8854 },
      'davao': { lat: 7.1907, lon: 125.4553 },
      // Add more cities as needed
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

      // Classify pollution source using the same coordinates
      const currentPM25 = data.hourly.pm2_5[0] || 0;
      const currentNO2 = data.hourly.nitrogen_dioxide[0] || 0;
      const currentSO2 = data.hourly.sulphur_dioxide[0] || 0;
      
      await classifySource(lat, lon, currentPM25, currentNO2, currentSO2);
    } catch (error) {
      console.error('Failed to fetch AQI data:', error);
      throw error;
    }
  };

  const classifySource = async (lat, lon, pm25, no2 = 0, so2 = 0) => {
    try {
      console.log(`Classifying source for ${lat}, ${lon}`);
      const result = await classifyPollutionSource({
        lat,
        lon, 
        pollutants: { pm2_5: pm25, no2, so2 }
      });
      setPollutionSource(result.source);
    } catch (error) {
      console.log('Source classification failed:', error.message);
      setPollutionSource('Unknown');
    }
  };

   const getLocationDisplayText = () => {
    if (isParameterLocation) return displayLocationName || cityName;
    return displayLocationName || (useGPS ? 'Current Location' : user?.city || 'Unknown Location');
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
    if (aqi <= 50) return { text: 'Good', color: '#00E676' };
    if (aqi <= 100) return { text: 'Moderate', color: '#FFC107' };
    if (aqi <= 150) return { text: 'Unhealthy for Sensitive', color: '#FF9800' };
    if (aqi <= 200) return { text: 'Unhealthy', color: '#F44336' };
    if (aqi <= 300) return { text: 'Very Unhealthy', color: '#9C27B0' };
    return { text: 'Hazardous', color: '#B71C1C' };
  };

  const getAQIDescription = (aqi) => {
  if (aqi <= 50) return "Air quality is good. Ideal for outdoor activities.";
  if (aqi <= 100) return "Air quality is acceptable. Sensitive individuals should consider limiting outdoor activities.";
  if (aqi <= 150) return "Sensitive groups may experience health effects. Consider reducing outdoor activities.";
  if (aqi <= 200) return "Everyone may experience health effects. Limit outdoor activities.";
  if (aqi <= 300) return "Health alert: everyone may experience serious health effects. Avoid outdoor activities.";
  return "Health emergency: everyone is at risk. Stay indoors.";
};

const renderMap = () => {
  const mapHTML = getMapHTML(location, showMap); // Use your existing `getMapHTML`

  if (Platform.OS === 'web') {
    return (
      <iframe
        srcDoc={mapHTML}
        style={{
          width: '100%',
          height: showMap ? '100vh' : 300,
          border: 'none',
          borderRadius: 12,
          overflow: 'hidden',
        }}
        title="AQI Map"
      />
    );
  }

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: mapHTML }}
      style={{
        width: '100%',
        height: showMap ? '100%' : 300,
        borderRadius: 12,
        overflow: 'hidden',
      }}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (message.action === 'openFullMap') {
            setShowMap(true);
          }
        } catch (err) {
          console.log('Invalid message from WebView:', err);
        }
      }}
    />
  );
};

  const getMapHTML = (location, fullScreen = false) => {
    const lat = location?.latitude || 14.5995;
    const lon = location?.longitude || 120.9842;
    const interactive = fullScreen ? 'true' : 'false';
    const controls = fullScreen ? '' : 'zoomControl: false, attributionControl: false, touchZoom: false, doubleClickZoom: false, scrollWheelZoom: false, boxZoom: false, keyboard: false, dragging: false,';
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/><title>AQI Map</title><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
        html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#0F0F23;color:#fff}
        .legend{position:absolute;top:10px;right:10px;background:rgba(26,26,46,0.95);border-radius:12px;font-family:Arial;font-size:12px;z-index:1000;box-shadow:0 4px 20px rgba(0,0,0,0.5);transition:all 0.3s ease;max-width:280px;border:1px solid rgba(0,230,118,0.3)}
        .legend-header{display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border-bottom:1px solid rgba(255,255,255,0.1);cursor:pointer;background:rgba(0,230,118,0.1);border-radius:12px 12px 0 0}
        .legend-title{font-weight:bold;font-size:14px;color:#fff;margin:0}.legend-toggle{font-size:16px;color:#00E676;user-select:none;transition:transform 0.3s ease}
        .legend-content{padding:10px 15px;max-height:400px;overflow-y:auto}.legend-section{margin-bottom:15px}
        .legend-section-title{font-weight:bold;margin-bottom:8px;color:#00E676;border-bottom:1px solid rgba(0,230,118,0.3);padding-bottom:4px}
        .legend-item{display:flex;align-items:center;margin:4px 0}.legend-color{width:18px;height:12px;margin-right:8px;border:1px solid rgba(255,255,255,0.3);border-radius:3px}
        .legend-collapsed .legend-content{display:none}.legend-collapsed .legend-toggle{transform:rotate(180deg)}
        .popup-content{font-family:Arial,sans-serif;min-width:200px;background:#1A1A2E;color:#fff;border-radius:8px;padding:10px}
        .popup-title{font-size:16px;font-weight:bold;margin-bottom:10px;color:#00E676}
        .aqi-badge{display:inline-block;padding:8px 12px;border-radius:8px;color:#fff;font-weight:bold;margin:5px 0}
        .detail-item{margin:8px 0;padding:8px;background:rgba(255,255,255,0.1);border-radius:6px;font-size:13px}
        .pollutant{display:flex;justify-content:space-between;margin:4px 0;color:rgba(255,255,255,0.9)}
        .loading-overlay{position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(15,15,35,0.9);display:flex;justify-content:center;align-items:center;color:#00E676;font-size:16px;z-index:999;font-weight:bold}
        .current-location-marker{animation:pulse 2s infinite;border:3px solid #00E676 !important;box-shadow:0 0 20px rgba(0,230,118,0.8),0 4px 12px rgba(0,0,0,0.5) !important}
        @keyframes pulse{0%{box-shadow:0 0 20px rgba(0,230,118,0.8),0 4px 12px rgba(0,0,0,0.5)}50%{box-shadow:0 0 30px rgba(0,230,118,1),0 4px 12px rgba(0,0,0,0.5)}100%{box-shadow:0 0 20px rgba(0,230,118,0.8),0 4px 12px rgba(0,0,0,0.5)}}
        .leaflet-container{background:#16213E !important}
        .leaflet-control-attribution{background:rgba(26,26,46,0.8) !important;color:rgba(255,255,255,0.7) !important}
    </style>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
    <div id="map"></div><div id="loading" class="loading-overlay">Loading AQI data...</div>
    <div class="legend legend-collapsed" id="legend">
        <div class="legend-header" onclick="toggleLegend()"><h4 class="legend-title">Air Quality Index</h4><span class="legend-toggle">+</span></div>
        <div class="legend-content">
            <div class="legend-section">
                <div class="legend-section-title">AQI Categories</div>
                <div class="legend-item"><div class="legend-color" style="background-color:#00E676;"></div><span style="color:#fff">Good (0-50)</span></div>
                <div class="legend-item"><div class="legend-color" style="background-color:#FFC107;"></div><span style="color:#fff">Moderate (51-100)</span></div>
                <div class="legend-item"><div class="legend-color" style="background-color:#FF9800;"></div><span style="color:#fff">Unhealthy for Sensitive (101-150)</span></div>
                <div class="legend-item"><div class="legend-color" style="background-color:#F44336;"></div><span style="color:#fff">Unhealthy (151-200)</span></div>
                <div class="legend-item"><div class="legend-color" style="background-color:#9C27B0;"></div><span style="color:#fff">Very Unhealthy (201-300)</span></div>
                <div class="legend-item"><div class="legend-color" style="background-color:#B71C1C;"></div><span style="color:#fff">Hazardous (301+)</span></div>
            </div>
            <div class="legend-section">
                <div class="legend-section-title">Markers</div>
                <div class="legend-item"><div class="legend-color" style="background-color:#00E676;border:2px solid #00E676;animation:pulse 1s infinite;"></div><span style="color:#fff">Your Location</span></div>
                <div class="legend-item"><div class="legend-color" style="background-color:#2196F3;"></div><span style="color:#fff">Cities/Towns</span></div>
            </div>
        </div>
    </div>
    <script>
        const map = L.map('map', {${controls}}).setView([${lat}, ${lon}], ${fullScreen ? 11.5 : 11});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '© OpenStreetMap'}).addTo(map);
        let loadingCount = 0;
        const updateLoadingStatus = () => { if (--loadingCount <= 0) document.getElementById('loading').style.display = 'none'; };
        const pm25ToAQI = pm25 => {
            if (isNaN(pm25) || pm25 < 0) return 0;
            const bp = [[0,12.0,0,50],[12.1,35.4,51,100],[35.5,55.4,101,150],[55.5,150.4,151,200],[150.5,250.4,201,300],[250.5,500.4,301,500]];
            for (const [cLo,cHi,iLo,iHi] of bp) if (pm25 >= cLo && pm25 <= cHi) return Math.max(0, Math.min(500, Math.round(((iHi - iLo) / (cHi - cLo)) * (pm25 - cLo) + iLo)));
            return 500;
        };
        const getAQICategory = aqi => aqi <= 50 ? {text: 'Good', color: '#00E676'} : aqi <= 100 ? {text: 'Moderate', color: '#FFC107'} : aqi <= 150 ? {text: 'Unhealthy for Sensitive', color: '#FF9800'} : aqi <= 200 ? {text: 'Unhealthy', color: '#F44336'} : aqi <= 300 ? {text: 'Very Unhealthy', color: '#9C27B0'} : {text: 'Hazardous', color: '#B71C1C'};
        const formatPollutantValue = (value, unit) => value ? value.toFixed(1) + ' ' + unit : 'N/A';
        const toggleLegend = () => {
            const legend = document.getElementById('legend'), toggle = legend.querySelector('.legend-toggle');
            if (legend.classList.contains('legend-collapsed')) { legend.classList.remove('legend-collapsed'); toggle.textContent = '−'; } 
            else { legend.classList.add('legend-collapsed'); toggle.textContent = '+'; }
        };
        const fetchAQIForPoint = (lat, lng, isCurrentLocation = false, cityName = '') => {
            return fetch(\`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=\${lat}&longitude=\${lng}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust&timezone=auto\`)
                .then(r => r.json()).then(data => {
                    if (data.hourly?.pm2_5) {
                        const h = data.hourly, dayHours = h.pm2_5.slice(0, 24).filter(val => val !== null && val !== undefined && !isNaN(val));
                        const avgPM25 = dayHours.length > 0 ? dayHours.reduce((sum, val) => sum + val, 0) / dayHours.length : 0;
                        const aqi = pm25ToAQI(avgPM25), category = getAQICategory(aqi);
                        const current = {pm2_5: avgPM25, pm10: h.pm10[0] || 0, carbon_monoxide: h.carbon_monoxide[0] || 0, nitrogen_dioxide: h.nitrogen_dioxide[0] || 0, sulphur_dioxide: h.sulphur_dioxide[0] || 0, ozone: h.ozone[0] || 0};
                        const [markerSize, fontSize, iconAnchor] = [${fullScreen ? '36' : '28'}, ${fullScreen ? '14' : '11'}, ${fullScreen ? '18' : '14'}];
                        const markerClass = isCurrentLocation ? 'current-location-marker' : '', borderColor = isCurrentLocation ? '#00E676' : 'rgba(255,255,255,0.8)', borderWidth = isCurrentLocation ? '4px' : '2px';
                        const icon = L.divIcon({className: 'custom-div-icon', html: \`<div class="\${markerClass}" style="background-color:\${category.color};width:\${markerSize}px;height:\${markerSize}px;border-radius:50%;border:\${borderWidth} solid \${borderColor};box-shadow:0 4px 12px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:\${fontSize}px;font-weight:bold;z-index:1001;">\${aqi}</div>\`, iconSize: [markerSize, markerSize], iconAnchor: [iconAnchor, iconAnchor]});
                        const marker = L.marker([lat, lng], {icon}).addTo(map);
                        if (${fullScreen}) {
                            const locationTitle = isCurrentLocation ? 'Your Current Location' : (cityName || 'Air Quality Data');
                            const popupContent = \`<div class="popup-content"><div class="popup-title">\${locationTitle}</div><div class="aqi-badge" style="background-color:\${category.color};">AQI: \${aqi} μg/m³ (\${category.text})</div><div class="detail-item"><strong>Pollutant Concentrations:</strong><div class="pollutant"><span>PM2.5 (24h avg):</span><span>\${formatPollutantValue(current.pm2_5, 'μg/m³')}</span></div><div class="pollutant"><span>PM10:</span><span>\${formatPollutantValue(current.pm10, 'μg/m³')}</span></div><div class="pollutant"><span>NO₂:</span><span>\${formatPollutantValue(current.nitrogen_dioxide, 'μg/m³')}</span></div><div class="pollutant"><span>O₃:</span><span>\${formatPollutantValue(current.ozone, 'μg/m³')}</span></div><div class="pollutant"><span>SO₂:</span><span>\${formatPollutantValue(current.sulphur_dioxide, 'μg/m³')}</span></div><div class="pollutant"><span>CO:</span><span>\${formatPollutantValue(current.carbon_monoxide, 'μg/m³')}</span></div></div><div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:8px;">AQI calculated from 24-hour average PM2.5 using EPA standards</div></div>\`;
                            marker.bindPopup(popupContent); if (isCurrentLocation) marker.openPopup();
                        }
                        return {aqi, data: current};
                    }
                    return null;
                }).catch(e => {
                    console.error('Error fetching AQI data:', e);
                    const [markerSize, fontSize, iconAnchor] = [${fullScreen ? '36' : '28'}, ${fullScreen ? '14' : '11'}, ${fullScreen ? '18' : '14'}];
                    const markerClass = isCurrentLocation ? 'current-location-marker' : '', borderColor = isCurrentLocation ? '#00E676' : 'rgba(255,255,255,0.8)', borderWidth = isCurrentLocation ? '4px' : '2px';
                    const fallbackIcon = L.divIcon({className: 'custom-div-icon', html: \`<div class="\${markerClass}" style="background-color:#666;width:\${markerSize}px;height:\${markerSize}px;border-radius:50%;border:\${borderWidth} solid \${borderColor};box-shadow:0 4px 12px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:\${fontSize}px;z-index:1001;">?</div>\`, iconSize: [markerSize, markerSize], iconAnchor: [iconAnchor, iconAnchor]});
                    const marker = L.marker([lat, lng], {icon: fallbackIcon}).addTo(map);
                    if (${fullScreen}) { const locationTitle = isCurrentLocation ? 'Your Current Location' : (cityName || 'Location'); marker.bindPopup(\`<div class="popup-content"><div class="popup-title">\${locationTitle}</div><div style="color:rgba(255,255,255,0.7);">Unable to load air quality data</div></div>\`); }
                    return null;
                }).finally(() => updateLoadingStatus());
        };
        const fetchNearbyCities = (centerLat, centerLon, radius = 100) => {
            const overpassQuery = \`[out:json][timeout:25];(node["place"~"^(city|town|municipality)$"]["name"](around:\${radius * 1000},\${centerLat},\${centerLon}););out geom;\`;
            return fetch('https://overpass-api.de/api/interpreter', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: 'data=' + encodeURIComponent(overpassQuery)})
                .then(response => { if (!response.ok) throw new Error('Overpass API request failed'); return response.json(); })
                .then(data => data.elements?.length > 0 ? data.elements.filter(el => el.tags?.name && el.lat && el.lon).map(el => ({name: el.tags.name, lat: el.lat, lon: el.lon, place: el.tags.place, distance: getDistance(centerLat, centerLon, el.lat, el.lon)})).sort((a, b) => a.distance - b.distance).slice(0, 20) : [])
                .catch(error => { console.error('Error fetching cities:', error); return [{name: 'Manila', lat: 14.5995, lon: 120.9842}, {name: 'Quezon City', lat: 14.6760, lon: 121.0437}, {name: 'Makati', lat: 14.5547, lon: 121.0244}, {name: 'Pasig', lat: 14.5764, lon: 121.0851}, {name: 'Taguig', lat: 14.5176, lon: 121.0509}, {name: 'Cebu City', lat: 10.3157, lon: 123.8854}, {name: 'Davao City', lat: 7.1907, lon: 125.4553}, {name: 'Iloilo City', lat: 10.7202, lon: 122.5621}]; });
        };
        const getDistance = (lat1, lon1, lat2, lon2) => { const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180, a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2), c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); return R * c; };
        const initializeMap = async () => {
            try {
                loadingCount++; await fetchAQIForPoint(${lat}, ${lon}, true, 'Current Location');
                const cities = await fetchNearbyCities(${lat}, ${lon}, ${fullScreen ? '200' : '100'});
                loadingCount += Math.min(cities.length, 20);
                cities.slice(0, 20).forEach(city => { const distance = getDistance(${lat}, ${lon}, city.lat, city.lon); if (distance > 5) fetchAQIForPoint(city.lat, city.lon, false, city.name); else updateLoadingStatus(); });
            } catch (error) { console.error('Error initializing map:', error); document.getElementById('loading').style.display = 'none'; }
        };
        ${!fullScreen ? `
        // Add tap handler for minimized map
        map.on('click', function(e) {
            // Send message to React Native to open full map
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({action: 'openFullMap'}));
            }
        });
        ` : ''}
        initializeMap();
    </script>
</body>
</html>`;
};
const getCurrentPollutants = () => {
  if (!aqiData?.hourly) return {};
  
  // Get current hour index (first available data point)
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
  const getHourlyData = (dayIndex) => {
  if (!aqiData?.hourly) return [];
  const startHour = dayIndex * 24;
  const maxHours = Math.min(24, aqiData.hourly.pm2_5.length - startHour);
  
  return Array.from({ length: maxHours }, (_, i) => {
    const hourIndex = startHour + i;
    const pm25 = aqiData.hourly.pm2_5[hourIndex] || 0;
    const hour = new Date(Date.now() + dayIndex * 24 * 60 * 60 * 1000 + i * 60 * 60 * 1000).getHours();
    return {
      hour: i,
      actualHour: hour,
      aqi: pm25ToAQI(pm25),
      pm25,
      pm10: aqiData.hourly.pm10[hourIndex] || 0,
      co: aqiData.hourly.carbon_monoxide[hourIndex] || 0,
      no2: aqiData.hourly.nitrogen_dioxide[hourIndex] || 0,
      so2: aqiData.hourly.sulphur_dioxide[hourIndex] || 0,
      ozone: aqiData.hourly.ozone[hourIndex] || 0
    };
  });
};


const handleChartPress = (data) => {
  if (data && data.index !== undefined) {
    const hourlyData = getHourlyData(selectedDay);
    const selectedData = hourlyData[data.index];
    if (selectedData) {
      setSelectedHourData(selectedData);
      setShowHourlyModal(true);
    }
  }
};
const renderChart = () => {
  const hourlyData = getHourlyData(selectedDay);
  if (hourlyData.length === 0) return <Text style={styles.noDataText}>No data available</Text>;

  // Generate labels for 24 hours (0-23)
  const labels = Array.from({ length: 24 }, (_, i) => `${i}`);
  
  const chartConfigs = {
    aqi: { data: hourlyData.map(d => d.aqi), color: '#00E676' },
    pm25: { data: hourlyData.map(d => d.pm25), color: '#2196F3' },
    pm10: { data: hourlyData.map(d => d.pm10), color: '#FF9800' },
    co: { data: hourlyData.map(d => d.co), color: '#9C27B0' },
    no2: { data: hourlyData.map(d => d.no2), color: '#F44336' },
    ozone: { data: hourlyData.map(d => d.ozone), color: '#FFC107' }
  };
  const config = chartConfigs[activeChart];
  
  if (!config.data.length || config.data.every(val => val === 0)) {
    return <Text style={styles.noDataText}>No data available</Text>;
  }

  const maxValue = Math.max(...config.data);
  const minValue = Math.min(...config.data.filter(val => val !== null && val !== undefined));
  const range = maxValue - minValue;
  
  const yAxisMax = Math.ceil(maxValue / 50) * 50;
  const yAxisMin = Math.max(0, Math.floor(minValue / 50) * 50);
  
  const baseHeight = 400;
  const heightAdjustment = Math.min(2, 1 + (range / 200)); 
  const chartHeight = Math.floor(baseHeight * heightAdjustment);

  return (
    <View style={styles.chartContainer}>
      <LineChart
        data={{ 
          labels, 
          datasets: [{ 
            data: config.data, 
            color: () => config.color, 
            strokeWidth: 3,
            withDots: true
          }] 
        }}
        width={Dimensions.get('window').width - 80}
        height={chartHeight}
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: 'rgba(15,15,35,0.8)',
          backgroundGradientTo: 'rgba(26,26,46,0.8)',
          decimalPlaces: 1,
          color: () => config.color,
          labelColor: () => 'rgba(255,255,255,0.9)',
          style: { borderRadius: 20 },
          propsForDots: { 
            r: 5, 
            strokeWidth: 2, 
            stroke: config.color, 
            fill: config.color 
          },
          propsForLabels: {
            fontSize: 10
          }
        }}
        fromZero={false}
        yAxisInterval={20}
        segments={5} 
        yAxisLabel=""
        yAxisSuffix=""
        xAxisLabel="Hour"
        yAxisMinimum={yAxisMin}
        yAxisMaximum={yAxisMax}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        onDataPointClick={handleChartPress}
        withCustomYAxis={true}
        formatYLabel={(value) => Math.round(value)}
        getDotColor={(dataPoint, index) => config.color}
      />
    </View>
  );
};
const formatDate = (dateStr, index) => {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
};

if (loading) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F0F23', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Ionicons name="leaf" size={80} color="#00E676" />
            <Text style={styles.loadingText}>Loading Air Quality...</Text>
            <View style={styles.loadingSpinner}>
              <ActivityIndicator size="large" color="#00E676" />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

if (!aqiData?.daily?.length) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F0F23', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle" size={80} color="#F44336" />
            <Text style={styles.loadingText}>No Data Available</Text>
            <TouchableOpacity style={styles.retryButton} onPress={initializeAQI}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const currentAQI = aqiData.daily[selectedDay];
const category = getAQICategory(currentAQI?.aqi || 0);
const pollutants = getCurrentPollutants();

return (
  <View style={styles.container}>
    <LinearGradient colors={['#0F0F23', '#1A1A2E', '#16213E']} style={styles.gradient}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F23" translucent={false} />
      <SafeAreaView style={styles.safeArea}>
        
        <View style={styles.webHeader}>
          <LinearGradient colors={['#0F0F23', '#1A1A2E']} style={styles.headerGradient}>
            <View style={styles.headerContainer}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack?.() || console.log('Back pressed')}>
                <Ionicons name="arrow-back" size={24} color="#00E676" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              
              <View style={styles.headerCenter}>
                <Text style={styles.webHeaderTitle}>Air Quality Monitor</Text>
                <Text style={styles.webHeaderSubtitle}>{getLocationDisplayText()}</Text>
              </View>
              
              <View style={styles.headerActions}>
                {!isParameterLocation && (
                  <TouchableOpacity style={styles.locationToggle} onPress={() => setUseGPS(!useGPS)}>
                    <Ionicons name={useGPS ? "location" : "location-outline"} size={20} color="#00E676" />
                    <Text style={styles.locationToggleText}>
                      {useGPS ? 'GPS Active' : 'Manual Location'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>

        <ScrollView 
          style={styles.webScrollView} 
          contentContainerStyle={styles.webScrollContent} 
          refreshControl={<RefreshControl refreshing={loading} onRefresh={initializeAQI} tintColor="#00E676" colors={['#00E676']} />} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.webMainGrid}>
            
            <View style={styles.webLeftColumn}>
              
              <View style={[styles.webMainCard, { borderColor: category.color, shadowColor: category.color }]}>
                <View style={styles.webAqiHeader}>
                  <Text style={styles.webCardTitle}>Current Air Quality Index</Text>
                  <View style={[styles.webStatusBadge, { backgroundColor: category.color }]}>
                    <Text style={styles.webStatusText}>{category.text}</Text>
                  </View>
                </View>
                
                <View style={styles.webAqiContent}>
                  <Text style={[styles.webAqiValue, { color: category.color }]}>{currentAQI?.aqi || 0}</Text>
                  <Text style={styles.webAqiLabel}>μg/m³</Text>
                  <Text style={styles.webAqiLabel}>AQI Level</Text>
                </View>

                {pollutionSource && (
                  <View style={styles.webSourceCard}>
                    <Ionicons name="analytics-outline" size={28} color="#00E676" />
                    <View style={styles.webSourceInfo}>
                      <Text style={styles.webSourceLabel}>Primary Pollution Source</Text>
                      <Text style={styles.webSourceValue}>{pollutionSource}</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.webPollutantsCard}>
                <Text style={styles.webCardTitle}>Real-time Pollutant Levels</Text>
                <View style={styles.webPollutantsGrid}>
                  {[
                    { key: 'pm25', label: 'PM2.5', value: pollutants.pm25, unit: 'μg/m³', color: '#2196F3', icon: 'ellipse' },
                    { key: 'pm10', label: 'PM10', value: pollutants.pm10, unit: 'μg/m³', color: '#FF9800', icon: 'ellipse' },
                    { key: 'co', label: 'CO', value: pollutants.co, unit: 'μg/m³', color: '#9C27B0', icon: 'cloud' },
                    { key: 'no2', label: 'NO₂', value: pollutants.no2, unit: 'μg/m³', color: '#F44336', icon: 'flame' },
                    { key: 'so2', label: 'SO₂', value: pollutants.so2, unit: 'μg/m³', color: '#795548', icon: 'warning' },
                    { key: 'ozone', label: 'O₃', value: pollutants.ozone, unit: 'μg/m³', color: '#FFC107', icon: 'sunny' }
                  ].map((pollutant) => (
                    <View key={pollutant.key} style={[styles.webPollutantCard, { borderLeftColor: pollutant.color }]}>
                      <View style={styles.webPollutantHeader}>
                        <Ionicons name={pollutant.icon} size={16} color={pollutant.color} />
                        <Text style={styles.webPollutantLabel}>{pollutant.label}</Text>
                      </View>
                      <Text style={[styles.webPollutantValue, { color: pollutant.color }]}>
                        {pollutant.value.toFixed(1)}
                      </Text>
                      <Text style={styles.webPollutantUnit}>{pollutant.unit}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.webRightColumn}>
              
              <View style={styles.webMapCard}>
                <View style={styles.webMapHeader}>
                  <Text style={styles.webCardTitle}>Location Overview</Text>
                  <TouchableOpacity style={styles.webFullMapButton} onPress={() => setShowMap(true)}>
                    <Ionicons name="expand-outline" size={18} color="#00E676" />
                    <Text style={styles.webFullMapButtonText}>Expand Map</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.webMapContainer}>
                  {renderMap(location, false)}
                </View>
              </View>

              {/* 5-Day Forecast */}
              <View style={styles.webForecastCard}>
                    <Text style={styles.webCardTitle}>5-Day Air Quality Forecast</Text>
                    <ScrollView 
                      horizontal={false}
                      vertical={true}
                      showsVerticalScrollIndicator={false}
                      style={styles.forecastScrollContainer}
                      contentContainerStyle={styles.forecastScrollContent}
                    >
                      {aqiData.daily.map((day, index) => {
                        const dayCategory = getAQICategory(day.aqi);
                        const isSelected = selectedDay === index;
                        return (
                          <TouchableOpacity 
                            key={index} 
                            style={[
                              styles.webForecastItem, 
                              isSelected && styles.webForecastItemSelected,
                              { borderColor: dayCategory.color }
                            ]} 
                            onPress={() => setSelectedDay(index)}
                          >
                            <Text style={styles.webForecastDay}>{formatDate(day.date, index)}</Text>
                            <Text style={[styles.webForecastAqi, { color: dayCategory.color }]}>{day.aqi} μg/m³</Text>
                            <Text style={styles.webForecastCategory}>{dayCategory.text}</Text>
                            <View style={[styles.webForecastIndicator, { backgroundColor: dayCategory.color }]} />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
            </View>
          </View>

          {/* Full-width Chart Section */}
          <View style={styles.webChartSection}>
            <View style={styles.webChartHeader}>
              <Text style={styles.webCardTitle}>
                Hourly Analysis - {formatDate(aqiData.daily[selectedDay]?.date, selectedDay)}
              </Text>
              <View style={styles.webChartTabs}>
                {['aqi', 'pm25', 'pm10', 'co', 'no2', 'ozone'].map((type) => (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.webChartTab, activeChart === type && styles.webChartTabActive]} 
                    onPress={() => setActiveChart(type)}
                  >
                    <Text style={[styles.webChartTabText, activeChart === type && styles.webChartTabTextActive]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.webChartContainer}>
              {renderChart()}
            </View>
          </View>
        </ScrollView>

        {/* Full Map Modal */}
        <Modal visible={showMap} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowMap(false)}>
          <View style={styles.fullMapContainer}>
            <View style={styles.fullMapHeader}>
              <TouchableOpacity style={styles.closeMapButton} onPress={() => setShowMap(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.fullMapTitle}>Air Quality Map</Text>
              <View style={styles.fullMapHeaderSpacer} />
            </View>
            {renderMap(location, true)}
          </View>
        </Modal>

        <Modal 
          visible={showHourlyModal} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setShowHourlyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.hourlyModalContainer}>
              <View style={styles.hourlyModalHeader}>
                <Text style={styles.hourlyModalTitle}>
                  Hourly Details - {selectedHourData?.actualHour || 0}:00
                </Text>
                <TouchableOpacity 
                  style={styles.closeModalButton} 
                  onPress={() => setShowHourlyModal(false)}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              {selectedHourData && (
                <View style={styles.hourlyModalContent}>
                  <View style={styles.hourlyAqiSection}>
                    <Text style={styles.hourlyAqiValue}>{selectedHourData.aqi}</Text>
                    <Text style={[styles.hourlyAqiCategory, { color: getAQICategory(selectedHourData.aqi).color }]}>
                      μg/m³
                    </Text>
                    <Text style={[styles.hourlyAqiCategory, { color: getAQICategory(selectedHourData.aqi).color }]}>
                      {getAQICategory(selectedHourData.aqi).text} 
                    </Text>
                  </View>
                  
                  <View style={styles.hourlyPollutantsGrid}>
                    {[
                      { key: 'pm25', label: 'PM2.5', value: selectedHourData.pm25, unit: 'μg/m³', color: '#2196F3' },
                      { key: 'pm10', label: 'PM10', value: selectedHourData.pm10, unit: 'μg/m³', color: '#FF9800' },
                      { key: 'co', label: 'CO', value: selectedHourData.co, unit: 'μg/m³', color: '#9C27B0' },
                      { key: 'no2', label: 'NO₂', value: selectedHourData.no2, unit: 'μg/m³', color: '#F44336' },
                      { key: 'so2', label: 'SO₂', value: selectedHourData.so2, unit: 'μg/m³', color: '#795548' },
                      { key: 'ozone', label: 'O₃', value: selectedHourData.ozone, unit: 'μg/m³', color: '#FFC107' }
                    ].map((pollutant) => (
                      <View key={pollutant.key} style={[styles.hourlyPollutantCard, { borderLeftColor: pollutant.color }]}>
                        <Text style={styles.hourlyPollutantLabel}>{pollutant.label}</Text>
                        <Text style={[styles.hourlyPollutantValue, { color: pollutant.color }]}>
                          {pollutant.value.toFixed(1)} {pollutant.unit}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  </View>
);
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  
  // Loading States
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 40
  },
  loadingText: { 
    fontSize: 20, 
    color: '#FFFFFF', 
    marginTop: 30, 
    fontWeight: '600',
    textAlign: 'center'
  },
  loadingSpinner: {
    marginTop: 20
  },
  retryButton: { 
    backgroundColor: '#00E676', 
    paddingHorizontal: 40, 
    paddingVertical: 15, 
    borderRadius: 30, 
    marginTop: 40,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  retryButtonText: { 
    color: '#000', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  
  // Web-style Header
  webHeader: { 
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  headerGradient: { 
    paddingVertical: 20, 
    paddingHorizontal: 30
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,230,118,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)'
  },
  backButtonText: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  webHeaderTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFFFFF',
    marginBottom: 4
  },
  webHeaderSubtitle: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: 14
  },
  headerActions: {
    minWidth: 120,
    alignItems: 'flex-end'
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,230,118,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)'
  },
  locationToggleText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6
  },
  
  // Web-style Scroll Content
  webScrollView: { flex: 1 },
  webScrollContent: { 
    padding: 30,
    paddingTop: 20
  },
  
  // Web-style Main Grid Layout
  webMainGrid: {
    flexDirection: width > 1000 ? 'row' : 'column',
    gap: 30,
    marginBottom: 30
  },
  webLeftColumn: {
    flex: width > 1000 ? 2 : 1,
    gap: 25
  },
  webRightColumn: {
    flex: width > 1000 ? 1 : 1,
    gap: 25
  },
  
  // Web-style Cards
  webMainCard: { 
    borderRadius: 25, 
    borderWidth: 2, 
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 35,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12
  },
  webAqiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25
  },
  webCardTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold'
  },
  webStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  webStatusText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold'
  },
  webAqiContent: {
    alignItems: 'center',
    marginBottom: 25
  },
  webAqiValue: { 
    fontSize: 84, 
    fontWeight: 'bold', 
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  webAqiLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600'
  },
  webSourceCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,230,118,0.1)', 
    borderRadius: 20, 
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)'
  },
  webSourceInfo: { 
    marginLeft: 15, 
    flex: 1 
  },
  webSourceLabel: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 14,
    marginBottom: 4
  },
  webSourceValue: { 
    color: '#00E676', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  
  // Web Pollutants Section
  webPollutantsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 25,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  webPollutantsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 15,
    marginTop: 20
  },
  webPollutantCard: { 
    width: width > 1000 ? '30%' : '47%',
    backgroundColor: 'rgba(255,255,255,0.08)', 
    padding: 20, 
    borderRadius: 16,
    borderLeftWidth: 4,
    minHeight: 90,
    justifyContent: 'space-between'
  },
  webPollutantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  webPollutantLabel: { 
    color: 'rgba(255,255,255,0.9)', 
    fontSize: 14, 
    fontWeight: '600',
    marginLeft: 8
  },
  webPollutantValue: { 
    fontSize: 24, 
    fontWeight: 'bold',
    marginBottom: 4
  },
  webPollutantUnit: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500'
  },
  
  // Web Map Section
  webMapCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  webMapHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20
  },
  webFullMapButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,230,118,0.1)', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)'
  },
  webFullMapButtonText: { 
    color: '#00E676', 
    fontSize: 14, 
    fontWeight: '600', 
    marginLeft: 6
  },
  webMapContainer: { 
    height: 250, 
    borderRadius: 18, 
    overflow: 'hidden', 
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  
  // Web Forecast Section
   forecastScrollContainer: {
    maxHeight: 298, // Adjust this value as needed
    marginTop: 20
  },
  forecastScrollContent: {
    gap: 12
  },
  webForecastCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  webForecastGrid: {
    gap: 12,
    marginTop: 20
  },
 webForecastItem: { 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    padding: 20, 
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    height: '16.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    width: '100%' // Make sure it takes full width
  },
  webForecastItemSelected: { 
    backgroundColor: 'rgba(0,230,118,0.15)', 
    borderColor: '#00E676',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  webForecastDay: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '600',
    flex: 1
  },
  webForecastAqi: { 
    fontSize: 20, 
    fontWeight: 'bold',
    marginHorizontal: 15
  },
  webForecastCategory: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: 12,
    flex: 1,
    textAlign: 'right'
  },
  webForecastIndicator: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4
  },
  
  // Web Chart Section
  webChartSection: { 
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 25,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20
  },
  webChartHeader: {
    flexDirection: width > 800 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: width > 800 ? 'center' : 'flex-start',
    marginBottom: 25,
    gap: width > 800 ? 0 : 15
  },
  webChartTabs: { 
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  webChartTab: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  webChartTabActive: { 
    backgroundColor: '#00E676',
    borderColor: '#00E676',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  webChartTabText: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 13, 
    fontWeight: '600'
  },
  webChartTabTextActive: { 
    color: '#000',
    fontWeight: 'bold'
  },
  webChartContainer: { 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 20, 
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 350
  },
  chart: { 
    borderRadius: 20,
    backgroundColor: 'rgba(13, 18, 34, 0.82)', 
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  noDataText: { 
    color: 'rgba(255,255,255,0.6)', 
    fontSize: 18, 
    textAlign: 'center', 
    padding: 60,
    fontWeight: '500'
  },
  webBottomPadding: { height: 50 },
  
  // Modal Styles (keeping original)
  fullMapContainer: { flex: 1, backgroundColor: '#000' },
  fullMapHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: 'rgba(0,0,0,0.9)', 
    paddingTop: Platform.OS === 'ios' ? 50 : 30, 
    paddingBottom: 15, 
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  closeMapButton: { 
    padding: 12, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  fullMapTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  fullMapHeaderSpacer: { width: 48 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  hourlyModalContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 25,
    width: '100%',
    maxWidth: 500,
    maxHeight: '100%',
    borderWidth: 2,
    borderColor: 'rgba(0,230,118,0.3)',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20
  },
  hourlyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 25,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  hourlyModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  closeModalButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  hourlyModalContent: {
    padding: 25
  },
  hourlyAqiSection: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20
  },
  hourlyAqiValue: {
    color: '#fff',
    fontSize: 56,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  hourlyAqiCategory: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  hourlyPollutantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12
  },
  hourlyPollutantCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    borderRadius: 16,
    borderLeftWidth: 4,
    minHeight: 80,
    justifyContent: 'space-between'
  },
  hourlyPollutantLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6
  },
  hourlyPollutantValue: {
    fontSize: 18,
    fontWeight: 'bold'
  }
});
export default AqiScreen;