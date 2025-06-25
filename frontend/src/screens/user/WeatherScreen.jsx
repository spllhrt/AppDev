import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Dimensions, StatusBar, Platform, RefreshControl, Alert, Modal
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
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
  const [useGPS, setUseGPS] = useState(false);
  const [chartDataModal, setChartDataModal] = useState({ visible: false, data: null });

  // Get parameters from navigation
  const { cityName, lat, lon } = route.params || {};
  const isFromExternalNavigation = cityName && lat && lon;

  useEffect(() => {
    initializeWeather();
  }, [useGPS, isFromExternalNavigation]);

  const initializeWeather = async () => {
    try {
      setLoading(true);
      let coords;

      if (isFromExternalNavigation) {
        // Use coordinates from navigation parameters
        coords = { latitude: lat, longitude: lon };
      } else {
        // Original logic for location detection
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

  const getLocationDisplayName = () => {
    if (isFromExternalNavigation) {
      return cityName;
    }
    if (useGPS) {
      return 'Current Location';
    }
    return user?.city || 'City';
  };

  const getLocationIcon = () => {
    if (isFromExternalNavigation) {
      return 'business';
    }
    return useGPS ? 'location' : 'business';
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F0F23', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F23" translucent={false} />
        <SafeAreaView style={styles.safeArea}>
          {/* Sticky Header */}
          <View style={styles.stickyHeader}>
            <LinearGradient colors={['#0F0F23', '#1A1A2E']} style={styles.stickyHeaderGradient}>
              <View style={styles.headerTop}>
                <View style={styles.headerContent}>
                  <Text style={styles.headerTitle}>Weather Forecast</Text>
                  <View style={styles.locationHeader}>
                    <Ionicons name={getLocationIcon()} size={14} color="#00E676" />
                    <Text style={styles.headerSubtitle}>{getLocationDisplayName()}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.headerButton} onPress={initializeWeather}>
                  <Ionicons name="refresh" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={initializeWeather} tintColor="#00E676" />}
          >
            {/* Location Toggle - Only show if not from external navigation */}
            {!isFromExternalNavigation && (
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

            <View style={styles.bottomPadding} />
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
  scrollView: { flex: 1 },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 90 : 90,
    paddingBottom: 100 
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#FFFFFF', marginTop: 20, fontWeight: '600' },

  // Sticky Header
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 },
  stickyHeaderGradient: { 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20 
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4, marginLeft: 4 },
  headerButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1,
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
    flexDirection: 'row', alignItems: 'center',
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
  forecastDay: {
    alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12,
    marginRight: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)',
    minWidth: 100, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
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

  // Charts
  chartTabs: { marginBottom: 15 },
  chartTab: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  activeChartTab: {
    backgroundColor: '#00E676',
  },
  chartTabText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeChartTabText: {
    color: '#000',
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