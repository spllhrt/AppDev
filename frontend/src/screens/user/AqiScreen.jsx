import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Platform, TouchableOpacity, Dimensions, StatusBar, RefreshControl, Alert, Modal } from 'react-native';
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
  const [useGPS, setUseGPS] = useState(false);
  const [pollutionSource, setPollutionSource] = useState(null);

  // Get location parameters from route
  const locationFromRoute = route?.params?.cityName && route?.params?.lat && route?.params?.lon;
  const cityName = locationFromRoute ? route.params.cityName : (user?.city || 'Unknown Location');
  const displayLocation = locationFromRoute ? cityName : (useGPS ? 'Current Location' : cityName);

  useEffect(() => { 
    initializeAQI(); 
  }, [useGPS, locationFromRoute]);

  const initializeAQI = async () => {
    try {
      setLoading(true);
      let coords;
      
      // If location came from route parameters, use those coordinates
      if (locationFromRoute) {
        coords = { latitude: route.params.lat, longitude: route.params.lon };
      } else {
        // Original logic for GPS or user city
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
                  <Text style={styles.headerSubtitle}>{displayLocation}</Text>
                </View>
                {/* Only show location toggle if no location parameter was passed */}
                {!locationFromRoute && (
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

          {/* Hourly Modal */}
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
  aqiCategory: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  
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
  sourceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, marginBottom: 20 },
  sourceInfo: { marginLeft: 12, flex: 1 },
  sourceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  sourceValue: { color: '#00E676', fontSize: 18, fontWeight: 'bold' },
  
  // Pollutants Section
  pollutantsSection: { marginBottom: 25 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  pollutantsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pollutantCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4 },
  pollutantLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  pollutantValue: { fontSize: 16, fontWeight: 'bold' },
  
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


  modalOverlay: { flex: 1,backgroundColor: 'rgba(0,0,0,0.8)',justifyContent: 'center',alignItems: 'center',padding: 20},
  hourlyModalContainer: {backgroundColor: '#1A1A2E',borderRadius: 20,width: '100%',maxHeight: '80%',borderWidth: 1,borderColor: 'rgba(0,230,118,0.3)'},
  hourlyModalHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 20,borderBottomWidth: 1,borderBottomColor: 'rgba(255,255,255,0.1)'},
  hourlyModalTitle: {color: '#fff',fontSize: 18,fontWeight: 'bold'},
  closeModalButton: {padding: 8,backgroundColor: 'rgba(255,255,255,0.1)',borderRadius: 20},
  hourlyModalContent: {padding: 20},
  hourlyAqiSection: {alignItems: 'center',marginBottom: 25},
  hourlyAqiValue: { color: '#fff', fontSize: 48, fontWeight: 'bold', marginBottom: 8},
  hourlyAqiCategory: { fontSize: 18, fontWeight: 'bold' },
  hourlyPollutantsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20},
  hourlyPollutantCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4},
  hourlyPollutantLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 4},
  hourlyPollutantValue: { fontSize: 16, fontWeight: 'bold'},
  hourlyDescription: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginTop: 10},
  hourlyDescriptionText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20, textAlign: 'center'
}
});

export default AqiScreen;