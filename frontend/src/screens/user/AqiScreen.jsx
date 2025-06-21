import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Platform, TouchableOpacity, Dimensions, StatusBar, RefreshControl, Alert, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import * as Location from 'expo-location';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const AqiScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [aqiData, setAqiData] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeChart, setActiveChart] = useState('aqi');
  const [showMap, setShowMap] = useState(false);
  const [useGPS, setUseGPS] = useState(false);
  const [chartModal, setChartModal] = useState({ visible: false, data: null });

  useEffect(() => { initializeAQI(); }, [useGPS]);

  const initializeAQI = async () => {
    try {
      setLoading(true);
      const coords = useGPS || !user?.city ? await getCurrentLocation() : await geocodeCity(user.city).catch(() => getCurrentLocation());
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
    
    const processedData = { ...data, daily: calculateDailyAQI(data.hourly), hourly: { ...data.hourly, pm2_5: data.hourly.pm2_5.map(val => val !== null ? val : 0), pm10: data.hourly.pm10.map(val => val !== null ? val : 0), carbon_monoxide: data.hourly.carbon_monoxide.map(val => val !== null ? val : 0), nitrogen_dioxide: data.hourly.nitrogen_dioxide.map(val => val !== null ? val : 0), sulphur_dioxide: data.hourly.sulphur_dioxide.map(val => val !== null ? val : 0), ozone: data.hourly.ozone.map(val => val !== null ? val : 0) }};
    setAqiData(processedData);
  };

  const calculateDailyAQI = (hourly) => {
    const days = [];
    const totalHours = Math.min(hourly.pm2_5.length, 120);
    for (let i = 0; i < 5; i++) {
      const dayStart = i * 24;
      const dayEnd = Math.min(dayStart + 24, totalHours);
      if (dayStart >= totalHours) break;
      const dayHours = hourly.pm2_5.slice(dayStart, dayEnd);
      const validHours = dayHours.filter(val => val !== null && val !== undefined && !isNaN(val));
      if (validHours.length === 0) continue;
      const avgPM25 = validHours.reduce((sum, val) => sum + val, 0) / validHours.length;
      const calculatedAQI = pm25ToAQI(avgPM25);
      days.push({ date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0], aqi: calculatedAQI, pm25: avgPM25, category: getAQICategory(calculatedAQI) });
    }
    return days;
  };

  const pm25ToAQI = (pm25) => {
    if (isNaN(pm25) || pm25 < 0) return 0;
    const breakpoints = [{ cLo: 0, cHi: 12.0, iLo: 0, iHi: 50 }, { cLo: 12.1, cHi: 35.4, iLo: 51, iHi: 100 }, { cLo: 35.5, cHi: 55.4, iLo: 101, iHi: 150 }, { cLo: 55.5, cHi: 150.4, iLo: 151, iHi: 200 }, { cLo: 150.5, cHi: 250.4, iLo: 201, iHi: 300 }, { cLo: 250.5, cHi: 500.4, iLo: 301, iHi: 500 }];
    for (const bp of breakpoints) {
      if (pm25 >= bp.cLo && pm25 <= bp.cHi) {
        const aqi = Math.round(((bp.iHi - bp.iLo) / (bp.cHi - bp.cLo)) * (pm25 - bp.cLo) + bp.iLo);
        return Math.max(0, Math.min(500, aqi));
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
const getMapHTML = (location, fullScreen = false) => {
    const lat = location?.latitude || 14.5995;
    const lon = location?.longitude || 120.9842;
    const interactive = fullScreen ? 'true' : 'false';
    const controls = fullScreen ? '' : 'zoomControl: false, attributionControl: false, dragging: false, touchZoom: false, doubleClickZoom: false, scrollWheelZoom: false, boxZoom: false, keyboard: false,';
    
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>AQI Map</title><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>html,body,#map{margin:0;padding:0;height:100%;width:100%}.legend{position:absolute;top:10px;right:10px;background:rgba(255,255,255,0.9);padding:10px;border-radius:5px;font-family:Arial;font-size:12px;z-index:1000;box-shadow:0 2px 5px rgba(0,0,0,0.2)}.legend-item{display:flex;align-items:center;margin:2px 0}.legend-color{width:20px;height:15px;margin-right:5px;border:1px solid #ccc}.popup-content{font-family:Arial,sans-serif;min-width:200px}.popup-title{font-size:16px;font-weight:bold;margin-bottom:10px;color:#333}.aqi-badge{display:inline-block;padding:8px 12px;border-radius:5px;color:white;font-weight:bold;margin:5px 0}.detail-item{margin:5px 0;padding:5px;background:#f5f5f5;border-radius:3px;font-size:13px}.pollutant{display:flex;justify-content:space-between;margin:3px 0}</style><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script></head><body><div id="map"></div>${fullScreen ? '<div class="legend"><h4>Air Quality Index</h4><div class="legend-item"><div class="legend-color" style="background-color:#00E676;"></div><span>Good (0-50)</span></div><div class="legend-item"><div class="legend-color" style="background-color:#FFC107;"></div><span>Moderate (51-100)</span></div><div class="legend-item"><div class="legend-color" style="background-color:#FF9800;"></div><span>Unhealthy for Sensitive (101-150)</span></div><div class="legend-item"><div class="legend-color" style="background-color:#F44336;"></div><span>Unhealthy (151-200)</span></div><div class="legend-item"><div class="legend-color" style="background-color:#9C27B0;"></div><span>Very Unhealthy (201-300)</span></div><div class="legend-item"><div class="legend-color" style="background-color:#B71C1C;"></div><span>Hazardous (301+)</span></div></div>' : ''}<script>const map=L.map('map',{${controls}}).setView([${lat},${lon}],${fullScreen ? 10 : 12});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map);function pm25ToAQI(pm25){if(isNaN(pm25)||pm25<0)return 0;const breakpoints=[{cLo:0,cHi:12.0,iLo:0,iHi:50},{cLo:12.1,cHi:35.4,iLo:51,iHi:100},{cLo:35.5,cHi:55.4,iLo:101,iHi:150},{cLo:55.5,cHi:150.4,iLo:151,iHi:200},{cLo:150.5,cHi:250.4,iLo:201,iHi:300},{cLo:250.5,cHi:500.4,iLo:301,iHi:500}];for(const bp of breakpoints){if(pm25>=bp.cLo&&pm25<=bp.cHi){const aqi=Math.round(((bp.iHi-bp.iLo)/(bp.cHi-bp.cLo))*(pm25-bp.cLo)+bp.iLo);return Math.max(0,Math.min(500,aqi));}}return 500;}function getAQICategory(aqi){if(aqi<=50)return{text:'Good',color:'#00E676'};if(aqi<=100)return{text:'Moderate',color:'#FFC107'};if(aqi<=150)return{text:'Unhealthy for Sensitive',color:'#FF9800'};if(aqi<=200)return{text:'Unhealthy',color:'#F44336'};if(aqi<=300)return{text:'Very Unhealthy',color:'#9C27B0'};return{text:'Hazardous',color:'#B71C1C'};}function formatPollutantValue(value,unit){return value?value.toFixed(1)+' '+unit:'N/A'}fetch(\`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust&timezone=auto\`).then(r=>r.json()).then(data=>{if(data.hourly&&data.hourly.pm2_5){const hourly=data.hourly;const dayHours=hourly.pm2_5.slice(0,24);const validHours=dayHours.filter(val=>val!==null&&val!==undefined&&!isNaN(val));const avgPM25=validHours.length>0?validHours.reduce((sum,val)=>sum+val,0)/validHours.length:0;const pm25=avgPM25;const aqi=pm25ToAQI(pm25);const current={pm2_5:avgPM25,pm10:hourly.pm10[0]||0,carbon_monoxide:hourly.carbon_monoxide[0]||0,nitrogen_dioxide:hourly.nitrogen_dioxide[0]||0,sulphur_dioxide:hourly.sulphur_dioxide[0]||0,ozone:hourly.ozone[0]||0};const category=getAQICategory(aqi);const color=category.color;const categoryText=category.text;const icon=L.divIcon({className:'custom-div-icon',html:\`<div style="background-color:\${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">\${aqi}</div>\`,iconSize:[24,24],iconAnchor:[12,12]});const popupContent=\`<div class="popup-content"><div class="popup-title">Air Quality - Current Location</div><div class="aqi-badge" style="background-color:\${color};">AQI: \${aqi} (\${categoryText})</div><div class="detail-item"><strong>Pollutant Concentrations:</strong><div class="pollutant"><span>PM2.5 (24h avg):</span><span>\${formatPollutantValue(current.pm2_5,'μg/m³')}</span></div><div class="pollutant"><span>PM10:</span><span>\${formatPollutantValue(current.pm10,'μg/m³')}</span></div><div class="pollutant"><span>NO₂:</span><span>\${formatPollutantValue(current.nitrogen_dioxide,'μg/m³')}</span></div><div class="pollutant"><span>O₃:</span><span>\${formatPollutantValue(current.ozone,'μg/m³')}</span></div><div class="pollutant"><span>SO₂:</span><span>\${formatPollutantValue(current.sulphur_dioxide,'μg/m³')}</span></div><div class="pollutant"><span>CO:</span><span>\${formatPollutantValue(current.carbon_monoxide,'μg/m³')}</span></div></div><div style="font-size:11px;color:#666;margin-top:8px;">AQI calculated from 24-hour average PM2.5 using EPA standards<br>Data from Open-Meteo</div></div>\`;L.marker([${lat},${lon}],{icon:icon}).addTo(map).bindPopup(popupContent)${fullScreen ? '.openPopup()' : ''};}}).catch(e=>{console.error('Error fetching air quality data:',e);const fallbackIcon=L.divIcon({className:'custom-div-icon',html:'<div style="background-color:#CCCCCC;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;">?</div>',iconSize:[24,24],iconAnchor:[12,12]});L.marker([${lat},${lon}],{icon:fallbackIcon}).addTo(map).bindPopup('<div class="popup-content"><div class="popup-title">Air Quality Data</div><div style="color:#666;">Unable to load air quality data</div></div>');});</script></body></html>`;
};

  const getHourlyData = (dayIndex) => {
    if (!aqiData || !aqiData.hourly) return [];
    const startHour = dayIndex * 24;
    const maxHours = Math.min(24, aqiData.hourly.pm2_5.length - startHour);
    return Array.from({ length: maxHours }, (_, i) => {
      const hourIndex = startHour + i;
      const pm25 = aqiData.hourly.pm2_5[hourIndex] || 0;
      return { hour: i, aqi: pm25ToAQI(pm25), pm25: pm25, pm10: aqiData.hourly.pm10[hourIndex] || 0, co: aqiData.hourly.carbon_monoxide[hourIndex] || 0, no2: aqiData.hourly.nitrogen_dioxide[hourIndex] || 0, so2: aqiData.hourly.sulphur_dioxide[hourIndex] || 0, ozone: aqiData.hourly.ozone[hourIndex] || 0 };
    });
  };

  const getAdvisories = () => {
    if (!aqiData?.daily?.[0]) return [];
    const advisories = [];
    const today = aqiData.daily[0];
    if (today.aqi > 100) advisories.push({ text: 'Air quality unhealthy for sensitive groups', icon: 'warning', color: '#FF9800' });
    if (today.aqi > 150) advisories.push({ text: 'Limit outdoor activities', icon: 'home', color: '#F44336' });
    if (today.pm25 > 35) advisories.push({ text: 'Consider wearing a mask outdoors', icon: 'shield', color: '#9C27B0' });
    return advisories;
  };

  const formatDate = (dateStr, index) => {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const renderChart = () => {
    const hourlyData = getHourlyData(selectedDay);
    if (hourlyData.length === 0) return <View style={styles.chartContainer}><Text style={styles.noDataText}>No data available</Text></View>;
    
    const filteredData = hourlyData.filter((_, i) => i % 3 === 0);
    const labels = filteredData.map(d => `${d.hour}h`);
    const chartConfigs = { aqi: { data: filteredData.map(d => d.aqi), color: '#00E676', suffix: '' }, pm25: { data: filteredData.map(d => d.pm25), color: '#2196F3', suffix: 'μg/m³' }, pm10: { data: filteredData.map(d => d.pm10), color: '#FF9800', suffix: 'μg/m³' }, co: { data: filteredData.map(d => d.co), color: '#9C27B0', suffix: 'μg/m³' }, no2: { data: filteredData.map(d => d.no2), color: '#F44336', suffix: 'μg/m³' }, ozone: { data: filteredData.map(d => d.ozone), color: '#FFC107', suffix: 'μg/m³' } };
    const config = chartConfigs[activeChart];
    
    if (!config.data.length || config.data.every(val => val === 0)) return <View style={styles.chartContainer}><Text style={styles.noDataText}>No data available</Text></View>;
    
    return (
      <View style={styles.chartContainer}>
        <LineChart data={{ labels, datasets: [{ data: config.data, color: () => config.color, strokeWidth: 3 }] }} width={width - 60} height={220} chartConfig={{ backgroundColor: 'transparent', backgroundGradientFrom: 'rgba(0,0,0,0.1)', backgroundGradientTo: 'rgba(0,0,0,0.1)', decimalPlaces: 1, color: () => config.color, labelColor: () => 'rgba(255,255,255,0.9)', style: { borderRadius: 16 }, propsForDots: { r: '6', strokeWidth: '2', stroke: config.color, fill: config.color } }} bezier style={styles.chart} withInnerLines={true} withOuterLines={false} withVerticalLines={false} withHorizontalLines={true} onDataPointClick={(data) => { const hourlyData = getHourlyData(selectedDay); const actualIndex = data.index * 3; const pointData = hourlyData[actualIndex]; if (pointData) setChartModal({ visible: true, data: pointData }); }} />
        <Text style={[styles.chartUnit, { color: config.color }]}>{activeChart.toUpperCase()} {config.suffix}</Text>
      </View>
    );
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

  if (!aqiData || !aqiData.daily || aqiData.daily.length === 0) {
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
  const advisories = getAdvisories();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F0F23', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F23" translucent={false} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stickyHeader}>
            <LinearGradient colors={['#0F0F23', '#1A1A2E']} style={styles.stickyHeaderGradient}>
              <View style={styles.headerTop}>
                <View style={styles.headerContent}>
                  <Text style={styles.headerTitle}>Air Quality</Text>
                  <Text style={styles.headerSubtitle}>{useGPS ? 'Current Location' : user?.city || 'Unknown Location'}</Text>
                </View>
                <TouchableOpacity style={styles.locationButton} onPress={() => setUseGPS(!useGPS)}>
                  <Ionicons name={useGPS ? "location" : "location-outline"} size={24} color="#00E676" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={initializeAQI} tintColor="#00E676" colors={['#00E676']} />} showsVerticalScrollIndicator={false}>
            
            <View style={[styles.aqiCard, { borderColor: category.color }]}>
              <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.aqiCardGradient}>
                <Text style={styles.aqiValue}>{currentAQI?.aqi || 0}</Text>
                <Text style={[styles.aqiCategory, { color: category.color }]}>{category.text}</Text>
                <Text style={styles.aqiDescription}>PM2.5: {currentAQI?.pm25?.toFixed(1) || 0} μg/m³</Text>
              </LinearGradient>
            </View>

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

            {advisories.length > 0 && (
              <View style={styles.advisoriesSection}>
                <Text style={styles.sectionTitle}>Health Advisories</Text>
                {advisories.map((advisory, index) => (
                  <View key={index} style={[styles.advisoryCard, { borderLeftColor: advisory.color }]}>
                    <Ionicons name={advisory.icon} size={20} color={advisory.color} />
                    <Text style={styles.advisoryText}>{advisory.text}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.forecastSection}>
              <Text style={styles.sectionTitle}>5-Day Forecast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
                {aqiData.daily.map((day, index) => {
                  const dayCategory = getAQICategory(day.aqi);
                  const isSelected = selectedDay === index;
                  return (
                    <TouchableOpacity key={index} style={[styles.forecastCard, isSelected && styles.forecastCardSelected, { borderColor: dayCategory.color }]} onPress={() => setSelectedDay(index)}>
                      <Text style={styles.forecastDay}>{formatDate(day.date, index)}</Text>
                      <Text style={[styles.forecastAqi, { color: dayCategory.color }]}>{day.aqi}</Text>
                      <Text style={styles.forecastCategory}>{dayCategory.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.chartControls}>
              <Text style={styles.sectionTitle}>Hourly Data - {formatDate(aqiData.daily[selectedDay]?.date, selectedDay)}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartTabs}>
                {['aqi', 'pm25', 'pm10', 'co', 'no2', 'ozone'].map((type) => (
                  <TouchableOpacity key={type} style={[styles.chartTab, activeChart === type && styles.chartTabActive]} onPress={() => setActiveChart(type)}>
                    <Text style={[styles.chartTabText, activeChart === type && styles.chartTabTextActive]}>{type.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {renderChart()}
            <View style={styles.bottomPadding} />
          </ScrollView>

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

          <Modal visible={chartModal.visible} animationType="fade" transparent={true} onRequestClose={() => setChartModal({ visible: false, data: null })}>
            <View style={styles.modalOverlay}>
              <View style={styles.chartModalContent}>
                {chartModal.data && (
                  <>
                    <Text style={styles.modalTitle}>{chartModal.data.hour}:00 - {formatDate(aqiData.daily[selectedDay]?.date, selectedDay)}</Text>
                    <View style={styles.modalData}>
                      {[['AQI', chartModal.data.aqi, getAQICategory(chartModal.data.aqi).color], ['PM2.5', `${chartModal.data.pm25.toFixed(1)} μg/m³`, '#fff'], ['PM10', `${chartModal.data.pm10.toFixed(1)} μg/m³`, '#fff'], ['CO', `${chartModal.data.co.toFixed(1)} μg/m³`, '#fff'], ['NO₂', `${chartModal.data.no2.toFixed(1)} μg/m³`, '#fff'], ['O₃', `${chartModal.data.ozone.toFixed(1)} μg/m³`, '#fff']].map(([label, value, color], i) => (
                        <View key={i} style={styles.modalDataRow}>
                          <Text style={styles.modalDataLabel}>{label}:</Text>
                          <Text style={[styles.modalDataValue, { color }]}>{value}</Text>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity style={styles.modalCloseButton} onPress={() => setChartModal({ visible: false, data: null })}>
                      <Text style={styles.modalCloseButtonText}>Close</Text>
                    </TouchableOpacity>
                  </>
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
  scrollContent: { paddingHorizontal: 20,  paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 90 : 90 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
  retryButton: { backgroundColor: '#00E676', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25, marginTop: 30 },
  retryButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  stickyHeader: {   position: 'absolute',   top: 0,   left: 0,   right: 0,   zIndex: 1000, }, 
  stickyHeaderGradient: {   paddingBottom: 15,   paddingHorizontal: 20,  paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,},  
  headerContent: { flex: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4 },
  locationButton: { padding: 12, backgroundColor: 'rgba(0,230,118,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  aqiCard: { borderRadius: 20, marginBottom: 25, borderWidth: 2, overflow: 'hidden' },
  aqiCardGradient: { padding: 30, alignItems: 'center' },
  aqiValue: { color: '#fff', fontSize: 64, fontWeight: 'bold', marginBottom: 8 },
  aqiCategory: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  aqiDescription: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  mapSection: { marginBottom: 25 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  fullMapButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,230,118,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  fullMapButtonText: { color: '#00E676', fontSize: 14, fontWeight: '600', marginRight: 4 },
  mapContainer: { height: 200, borderRadius: 15, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  mapWebView: { flex: 1, backgroundColor: 'transparent' },
  advisoriesSection: { marginBottom: 25 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  advisoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor:'rgba(255,255,255,0.1)',padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4,},
  advisoryText: { color: '#fff', fontSize: 14, marginLeft: 12, flex: 1, },
  forecastSection: {marginBottom: 25,},
  forecastScroll: {flexDirection: 'row',},
  forecastCard: {  backgroundColor: 'rgba(255,255,255,0.1)',  padding: 15,  borderRadius: 12,  marginRight: 12,  minWidth: 100,  alignItems: 'center',  borderWidth: 1,},
  forecastCardSelected: {  backgroundColor: 'rgba(0,230,118,0.2)',  borderColor: '#00E676',},
  forecastDay: {  color: '#fff',  fontSize: 12,  fontWeight: '600',  marginBottom: 8,},
  forecastAqi: {  fontSize: 24,  fontWeight: 'bold',  marginBottom: 4,},
  forecastCategory: {  color: 'rgba(255,255,255,0.7)',  fontSize: 10,  textAlign: 'center',},
  chartControls: {  marginBottom: 20,},
  chartTabs: {  flexDirection: 'row',},
  chartTab: {  backgroundColor: 'rgba(255,255,255,0.1)',  paddingHorizontal: 16,  paddingVertical: 8,  borderRadius: 20,  marginRight: 10,},
  chartTabActive: { backgroundColor: '#00E676' },
  chartTabText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  chartTabTextActive: { color: '#000' },
  chartContainer: { alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 15 },
  chart: { borderRadius: 16 },
  chartUnit: { fontSize: 12, fontWeight: 'bold', marginTop: 10 },
  noDataText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center', padding: 40 },
  bottomPadding: { height: 100 }, // Add padding to avoid navigation tab overlap
  // Full Map Modal Styles
  fullMapContainer: { flex: 1, backgroundColor: '#000' },
  fullMapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.8)', paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 15, paddingHorizontal: 20 },
  closeMapButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  fullMapTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  fullMapHeaderSpacer: { width: 40 },
  fullMapWebView: { flex: 1 },
  // Chart Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  chartModalContent: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, width: width * 0.85, maxWidth: 350 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalData: { marginBottom: 20 },
  modalDataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalDataLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  modalDataValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalCloseButton: { backgroundColor: '#00E676', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalCloseButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  
  });

  export default AqiScreen;