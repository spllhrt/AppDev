import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Platform, TouchableOpacity, Dimensions, StatusBar, RefreshControl, Alert, Modal } from 'react-native';
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
      
      // Use parameter location if provided
      if (isParameterLocation) {
        coords = { latitude: lat, longitude: lon, name: cityName };
      } else {
        coords = useGPS || !user?.city ? await getCurrentLocation() : await geocodeCity(user.city).catch(() => getCurrentLocation());
      }
      
      if (coords) {
        await fetchAQIData(coords.latitude, coords.longitude);
        setLocation(coords);
      }
    } catch (error) {
      Alert.alert('AQI Error', 'Failed to load air quality data.', [{ text: 'Retry', onPress: initializeAQI }, { text: 'Cancel', style: 'cancel' }]);
    } finally {
      setLoading(false);
    }
  };

    const getLocationDisplayText = () => {
    if (isParameterLocation) {
      return cityName;
    }
    return useGPS ? 'Current Location' : user?.city || 'Unknown Location';
  };
  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Location permission denied');
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeout: 15000, maximumAge: 300000 });
    return { latitude: location.coords.latitude, longitude: location.coords.longitude };
  };

  const geocodeCity = async (city) => {
    const queries = [`${city}, Philippines`, city, city.replace(/\s+City$/i, '').trim()];
    for (const query of queries) {
      try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        if (!response.ok) continue;
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const result = data.results.find(r => r.country === 'Philippines') || data.results[0];
          return { latitude: result.latitude, longitude: result.longitude, name: result.name, country: result.country };
        }
      } catch (error) { continue; }
    }
    throw new Error(`Location "${city}" not found`);
  };

  const fetchAQIData = async (lat, lon) => {
    const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust,uv_index,ammonia&forecast_days=5&timezone=auto`);
    if (!response.ok) throw new Error(`AQI API error: ${response.status}`);
    const data = await response.json();
    if (!data.hourly || !data.hourly.pm2_5) throw new Error('Invalid AQI data');
    
    const processedData = { ...data, daily: calculateDailyAQI(data.hourly) };
    
    // Classify pollution source
    const currentPM25 = data.hourly.pm2_5[0] || 0;
    const currentNO2 = data.hourly.nitrogen_dioxide[0] || 0;
    const currentSO2 = data.hourly.sulphur_dioxide[0] || 0;
    await classifySource(lat, lon, currentPM25, currentNO2, currentSO2);

    setAqiData(processedData);
  };
  
  const classifySource = async (lat, lon, pm25, no2 = 0, so2 = 0) => {
    try {
      const result = await classifyPollutionSource({ lat, lon, pollutants: { pm2_5: pm25, no2, so2 } });
      setPollutionSource(result.source);
    } catch (error) {
      console.log('Source classification failed:', error.message);
      setPollutionSource('Unknown');
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
        const map = L.map('map', {${controls}}).setView([${lat}, ${lon}], ${fullScreen ? 9 : 11});
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
                            const popupContent = \`<div class="popup-content"><div class="popup-title">\${locationTitle}</div><div class="aqi-badge" style="background-color:\${category.color};">AQI: \${aqi} (\${category.text})</div><div class="detail-item"><strong>Pollutant Concentrations:</strong><div class="pollutant"><span>PM2.5 (24h avg):</span><span>\${formatPollutantValue(current.pm2_5, 'μg/m³')}</span></div><div class="pollutant"><span>PM10:</span><span>\${formatPollutantValue(current.pm10, 'μg/m³')}</span></div><div class="pollutant"><span>NO₂:</span><span>\${formatPollutantValue(current.nitrogen_dioxide, 'μg/m³')}</span></div><div class="pollutant"><span>O₃:</span><span>\${formatPollutantValue(current.ozone, 'μg/m³')}</span></div><div class="pollutant"><span>SO₂:</span><span>\${formatPollutantValue(current.sulphur_dioxide, 'μg/m³')}</span></div><div class="pollutant"><span>CO:</span><span>\${formatPollutantValue(current.carbon_monoxide, 'μg/m³')}</span></div></div><div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:8px;">AQI calculated from 24-hour average PM2.5 using EPA standards</div></div>\`;
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
    const filteredData = hourlyData.filter((_, i) => i % 3 === 0);
    const selectedData = filteredData[data.index];
    if (selectedData) {
      setSelectedHourData(selectedData);
      setShowHourlyModal(true);
    }
  }
};


  const renderChart = () => {
  const hourlyData = getHourlyData(selectedDay);
  if (hourlyData.length === 0) return <Text style={styles.noDataText}>No data available</Text>;
  
  const filteredData = hourlyData.filter((_, i) => i % 3 === 0);
  const labels = filteredData.map(d => `${d.hour}h`);
  const chartConfigs = {
    aqi: { data: filteredData.map(d => d.aqi), color: '#00E676' },
    pm25: { data: filteredData.map(d => d.pm25), color: '#2196F3' },
    pm10: { data: filteredData.map(d => d.pm10), color: '#FF9800' },
    co: { data: filteredData.map(d => d.co), color: '#9C27B0' },
    no2: { data: filteredData.map(d => d.no2), color: '#F44336' },
    ozone: { data: filteredData.map(d => d.ozone), color: '#FFC107' }
  };
  const config = chartConfigs[activeChart];
  
  if (!config.data.length || config.data.every(val => val === 0)) return <Text style={styles.noDataText}>No data available</Text>;
  
  return (
    <LineChart
      data={{ labels, datasets: [{ data: config.data, color: () => config.color, strokeWidth: 3 }] }}
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
        propsForDots: { r: '4', strokeWidth: '2', stroke: config.color, fill: config.color }
      }}
      bezier
      style={styles.chart}
      withInnerLines={false}
      withOuterLines={false}
      withVerticalLines={false}
      withHorizontalLines={true}
      onDataPointClick={handleChartPress}
    />
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
              <Ionicons name="leaf" size={60} color="#00E676" />
              <Text style={styles.loadingText}>Loading Air Quality...</Text>
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
              <Ionicons name="alert-circle" size={60} color="#F44336" />
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
          {/* Header */}
          <View style={styles.stickyHeader}>
            <LinearGradient colors={['#0F0F23', '#1A1A2E']} style={styles.stickyHeaderGradient}>
               <View style={styles.headerTop}>
                  <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Air Quality</Text>
                    <Text style={styles.headerSubtitle}>{getLocationDisplayText()}</Text>
                  </View>
                  {!isParameterLocation && (
                    <TouchableOpacity style={styles.locationButton} onPress={() => setUseGPS(!useGPS)}>
                      <Ionicons name={useGPS ? "location" : "location-outline"} size={24} color="#00E676" />
                    </TouchableOpacity>
                  )}
                </View>
            </LinearGradient>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent} 
            refreshControl={<RefreshControl refreshing={loading} onRefresh={initializeAQI} tintColor="#00E676" colors={['#00E676']} />} 
            showsVerticalScrollIndicator={false}
          >
            {/* Main AQI Card */}
            <View style={[styles.mainCard, { borderColor: category.color }]}>
              <View style={styles.aqiSection}>
                <Text style={styles.aqiValue}>{currentAQI?.aqi || 0}</Text>
                <Text style={[styles.aqiCategory, { color: category.color }]}>{category.text}</Text>
                  {pollutionSource && (
                  <View style={styles.sourceCard}>
                    <Ionicons name="analytics-outline" size={24} color="#00E676" />
                    <View style={styles.sourceInfo}>
                      <Text style={styles.sourceLabel}>Likely Main Pollution Source</Text>
                      <Text style={styles.sourceValue}>{pollutionSource}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Pollutants Grid */}
            <View style={styles.pollutantsSection}>
              <Text style={styles.sectionTitle}>Current Pollutant Levels</Text>
              <View style={styles.pollutantsGrid}>
                {[
                  { key: 'pm25', label: 'PM2.5', value: pollutants.pm25, unit: 'μg/m³', color: '#2196F3' },
                  { key: 'pm10', label: 'PM10', value: pollutants.pm10, unit: 'μg/m³', color: '#FF9800' },
                  { key: 'co', label: 'CO', value: pollutants.co, unit: 'μg/m³', color: '#9C27B0' },
                  { key: 'no2', label: 'NO₂', value: pollutants.no2, unit: 'μg/m³', color: '#F44336' },
                  { key: 'so2', label: 'SO₂', value: pollutants.so2, unit: 'μg/m³', color: '#795548' },
                  { key: 'ozone', label: 'O₃', value: pollutants.ozone, unit: 'μg/m³', color: '#FFC107' }
                ].map((pollutant) => (
                  <View key={pollutant.key} style={[styles.pollutantCard, { borderLeftColor: pollutant.color }]}>
                    <Text style={styles.pollutantLabel}>{pollutant.label}</Text>
                    <Text style={[styles.pollutantValue, { color: pollutant.color }]}>
                      {pollutant.value.toFixed(1)} {pollutant.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Map Section */}
            <View style={styles.mapSection}>
              <View style={styles.mapHeader}>
                <Text style={styles.sectionTitle}>Location Overview</Text>
                <TouchableOpacity style={styles.fullMapButton} onPress={() => setShowMap(true)}>
                  <Text style={styles.fullMapButtonText}>View Full Map</Text>
                  <Ionicons name="expand-outline" size={16} color="#00E676" />
                </TouchableOpacity>
              </View>
              <View style={styles.mapContainer}>
                <WebView source={{ html: getMapHTML(location) }} style={styles.mapWebView} scrollEnabled={false} />
              </View>
            </View>

            {/* 5-Day Forecast */}
            <View style={styles.forecastSection}>
              <Text style={styles.sectionTitle}>5-Day Forecast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {aqiData.daily.map((day, index) => {
                  const dayCategory = getAQICategory(day.aqi);
                  const isSelected = selectedDay === index;
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.forecastCard, isSelected && styles.forecastCardSelected, { borderColor: dayCategory.color }]} 
                      onPress={() => setSelectedDay(index)}
                    >
                      <Text style={styles.forecastDay}>{formatDate(day.date, index)}</Text>
                      <Text style={[styles.forecastAqi, { color: dayCategory.color }]}>{day.aqi}</Text>
                      <Text style={styles.forecastCategory}>{dayCategory.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Hourly Chart */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>Hourly Data - {formatDate(aqiData.daily[selectedDay]?.date, selectedDay)}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartTabs}>
                {['aqi', 'pm25', 'pm10', 'co', 'no2', 'ozone'].map((type) => (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.chartTab, activeChart === type && styles.chartTabActive]} 
                    onPress={() => setActiveChart(type)}
                  >
                    <Text style={[styles.chartTabText, activeChart === type && styles.chartTabTextActive]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.chartContainer}>
                {renderChart()}
              </View>
            </View>

            <View style={styles.bottomPadding} />
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
              <WebView source={{ html: getMapHTML(location, true) }} style={styles.fullMapWebView} />
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
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 90 : 90 },
  
  // Loading States
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#FFFFFF', marginTop: 20, fontWeight: '600' },
  retryButton: { backgroundColor: '#00E676', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25, marginTop: 30 },
  retryButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  
  // Header
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 },
  stickyHeaderGradient: { paddingBottom: 15, paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20 },
  headerContent: { flex: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4 },
  locationButton: { padding: 12, backgroundColor: 'rgba(0,230,118,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  
  // Main AQI Card
  mainCard: { borderRadius: 20, marginBottom: 25, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  aqiSection: { padding: 30, alignItems: 'center' },
  aqiValue: { color: '#fff', fontSize: 64, fontWeight: 'bold', marginBottom: 8 },
  sourceCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 20 
  },
  sourceInfo: { 
    marginLeft: 12, 
    flex: 1 
  },
  sourceLabel: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: 14 
  },
  sourceValue: { 
    color: '#00E676', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  
  // Pollutants Section
  pollutantsSection: { marginBottom: 25 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  pollutantsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pollutantCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4 },
  pollutantLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  pollutantValue: { fontSize: 16, fontWeight: 'bold' },
  
  // Map Section
  mapSection: { marginBottom: 25 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  fullMapButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,230,118,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  fullMapButtonText: { color: '#00E676', fontSize: 14, fontWeight: '600', marginRight: 4 },
  mapContainer: { height: 200, borderRadius: 15, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  mapWebView: { flex: 1, backgroundColor: 'transparent' },
  
  // Forecast Section
  forecastSection: { marginBottom: 25 },
  forecastCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginRight: 12, minWidth: 100, alignItems: 'center', borderWidth: 1 },
  forecastCardSelected: { backgroundColor: 'rgba(0,230,118,0.1)', borderColor: '#00E676' },
  forecastDay: { color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  forecastAqi: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  forecastCategory: { color: 'rgba(255,255,255,0.7)', fontSize: 10, textAlign: 'center' },
  
  // Chart Section
  chartSection: { marginBottom: 20 },
  chartTabs: { marginBottom: 15 },
  chartTab: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  chartTabActive: { backgroundColor: '#00E676' },
  chartTabText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  chartTabTextActive: { color: '#000' },
  chartContainer: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 15 },
  chart: { borderRadius: 16 },
  noDataText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center', padding: 40 },
  bottomPadding: { height: 100 },
  
  // Full Map Modal
  fullMapContainer: { flex: 1, backgroundColor: '#000' },
  fullMapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.8)', paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 15, paddingHorizontal: 20 },
  closeMapButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  fullMapTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  fullMapHeaderSpacer: { width: 40 },
  fullMapWebView: { flex: 1 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  hourlyModalContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)'
  },
  hourlyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  hourlyModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeModalButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20
  },
  hourlyModalContent: {
    padding: 20
  },
  hourlyAqiSection: {
    alignItems: 'center',
    marginBottom: 25
  },
  hourlyAqiValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8
  },
  hourlyAqiCategory: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  hourlyPollutantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  hourlyPollutantCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4
  },
  hourlyPollutantLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4
  },
  hourlyPollutantValue: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  hourlyDescription: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 12,
    marginTop: 10
  },
  hourlyDescriptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  }
});

export default AqiScreen;