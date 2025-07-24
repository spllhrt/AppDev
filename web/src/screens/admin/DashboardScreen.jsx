import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, RefreshControl, Dimensions, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { getAllUsers } from '../../api/auth';
import { getAllReports } from '../../api/report';
import { getAllBulletins } from '../../api/bulletin';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

const PHILIPPINE_CITIES = [
  { name: 'Manila', lat: 14.5995, lon: 120.9842 },
  { name: 'Quezon City', lat: 14.6760, lon: 121.0437 },
  { name: 'Caloocan', lat: 14.6507, lon: 120.9676 },
  { name: 'Las Piñas', lat: 14.4649, lon: 120.9779 },
  { name: 'Makati', lat: 14.5547, lon: 121.0244 },
  { name: 'Malabon', lat: 14.6619, lon: 120.9569 },
  { name: 'Mandaluyong', lat: 14.5794, lon: 121.0359 },
  { name: 'Marikina', lat: 14.6507, lon: 121.1029 },
  { name: 'Muntinlupa', lat: 14.3832, lon: 121.0409 },
  { name: 'Navotas', lat: 14.6691, lon: 120.9469 },
  { name: 'Parañaque', lat: 14.4793, lon: 121.0198 },
  { name: 'Pasay', lat: 14.5378, lon: 120.9896 },
  { name: 'Pasig', lat: 14.5764, lon: 121.0851 },
  { name: 'San Juan', lat: 14.6019, lon: 121.0355 },
  { name: 'Taguig', lat: 14.5176, lon: 121.0509 },
  { name: 'Valenzuela', lat: 14.7000, lon: 120.9820 },
  { name: 'Pateros', lat: 14.5443, lon: 121.0699 },
];

const AdminDashboard = ({ navigation }) => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({});
  const [recentReports, setRecentReports] = useState([]);
  const [recentBulletins, setRecentBulletins] = useState([]);
  const [cityAQI, setCityAQI] = useState({ worst: [], best: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchDashboardData(); }, []);

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
    if (aqi <= 50) return { text: 'Good', color: '#10b981', bgColor: '#ecfdf5' };
    if (aqi <= 100) return { text: 'Moderate', color: '#f59e0b', bgColor: '#fef3c7' };
    if (aqi <= 150) return { text: 'Unhealthy for Sensitive', color: '#f97316', bgColor: '#fed7aa' };
    if (aqi <= 200) return { text: 'Unhealthy', color: '#ef4444', bgColor: '#fecaca' };
    if (aqi <= 300) return { text: 'Very Unhealthy', color: '#a855f7', bgColor: '#e9d5ff' };
    return { text: 'Hazardous', color: '#dc2626', bgColor: '#fee2e2' };
  };

  const getAQIStatus = (aqi) => {
    return getAQICategory(aqi).text;
  };

  const getAQIColor = (aqi) => {
    return getAQICategory(aqi).color;
  };

  const fetchAQIData = async () => {
    try {
      const aqiPromises = PHILIPPINE_CITIES.map(async city => {
        try {
          const response = await fetch(
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&hourly=pm2_5&forecast_days=1&timezone=auto`
          );
          if (!response.ok) return null;
          const data = await response.json();
          if (!data.hourly?.pm2_5) return null;
          
          const pm25Values = data.hourly.pm2_5.filter(val => val !== null);
          const avgPM25 = pm25Values.reduce((sum, val) => sum + val, 0) / pm25Values.length;
          const aqi = pm25ToAQI(avgPM25);
          
          return {
            ...city,
            aqi,
            pm2_5: avgPM25,
            status: getAQIStatus(aqi),
            category: getAQICategory(aqi)
          };
        } catch (error) {
          console.error(`Failed to fetch AQI for ${city.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(aqiPromises);
      const validResults = results.filter(city => city !== null);
      
      validResults.sort((a, b) => a.aqi - b.aqi);
      
      const bestCities = validResults.slice(0, 5);
      const worstCities = [...validResults].reverse().slice(0, 5);
      
      setCityAQI({ 
        worst: worstCities, 
        best: bestCities 
      });
    } catch (error) {
      console.error('Error fetching AQI data:', error);
      setCityAQI({ worst: [], best: [] });
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [usersResponse, reportsResponse, bulletinsResponse] = await Promise.all([
        getAllUsers(),
        getAllReports(),
        getAllBulletins()
      ]);

      const users = usersResponse.users || [];
      const reports = reportsResponse.reports || [];
      const bulletins = Array.isArray(bulletinsResponse) ? bulletinsResponse : (bulletinsResponse.bulletins || []);

      setStats({
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        totalReports: reports.length,
        totalBulletins: bulletins.length,
      });

      setRecentReports(reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3));
      setRecentBulletins(bulletins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3));
      
      await fetchAQIData();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to fetch dashboard data');
      setStats({ totalUsers: 0, activeUsers: 0, totalReports: 0, totalBulletins: 0 });
      setRecentReports([]);
      setRecentBulletins([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatTimeAgo = (dateString) => {
    const diffInMinutes = Math.floor((new Date() - new Date(dateString)) / (1000 * 60));
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getStatusColor = (status) => {
    const colors = {
      resolved: '#10b981',
      in_progress: '#f59e0b',
      urgent: '#ef4444',
      pending: '#6b7280'
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  };

  const getReportIcon = (type) => {
    const icons = { air: '🌬️', water: '💧', noise: '🔊', waste: '🗑️' };
    return icons[type?.toLowerCase()] || '🚨';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Environmental Alert': '🌍',
      'Weather Update': '🌤️',
      'Public Safety': '🚨',
      'Emergency': '🚨',
      'Event Notice': '📅',
      'Service Disruption': '⚠️',
      'Health Advisory': '🏥',
      'Traffic Alert': '🚦',
      'Community Announcement': '📢',
      'General': '📢'
    };
    return icons[category] || '📢';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.adminName}>{currentUser?.name || 'Admin'}</Text>
      </View>
      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={onRefresh}
        disabled={refreshing}
      >
        <Ionicons 
          name="refresh" 
          size={24} 
          color="#ffffff" 
          style={refreshing ? styles.refreshIcon : null}
        />
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMetricCard = (title, value, color, icon, onPress) => (
    <TouchableOpacity style={styles.metricCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient 
        colors={[color, color + '90']} 
        style={styles.gradientStyle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardContent}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardValue}>{value}</Text>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderQuickActionCard = (title, description, icon, gradient, onPress) => (
    <TouchableOpacity style={styles.metricCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient 
        colors={gradient} 
        style={[styles.gradientStyle, styles.actionGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardContent}>
          <Text style={styles.actionIcon}>{icon}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionDescription}>{description}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderReportCard = (title, items, navigateSection) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.listTitle}>{title}</Text>
        <TouchableOpacity onPress={() => navigation.navigate(navigateSection)}>
          <Text style={styles.viewAllLink}>View All →</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.listContent}>
        {items.length > 0 ? items.map((item, index) => (
          <TouchableOpacity key={index} style={styles.listItem} activeOpacity={0.7}>
            <View style={[styles.listIconContainer, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.listItemIcon, { color: getStatusColor(item.status) }]}>
                {getReportIcon(item.pollutionType)}
              </Text>
            </View>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle} numberOfLines={1}>{item.title || 'Pollution Report'}</Text>
              <Text style={styles.listItemSubtitle} numberOfLines={1}>📍 {item.location || 'Unknown location'}</Text>
              <Text style={styles.listItemTime}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status || 'Pending'}</Text>
            </View>
          </TouchableOpacity>
        )) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No recent reports found</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Updated renderPhotoLayout function (add this to AdminDashboard component)
const renderPhotoLayout = (photos) => {
  if (!photos || photos.length === 0) return null;

  switch (photos.length) {
    case 1:
      return (
        <View style={styles.photoContainer}>
          <Image source={{ uri: photos[0].url }} style={styles.singlePhoto} />
        </View>
      );
    case 2:
      return (
        <View style={styles.photoContainer}>
          <View style={styles.photoRow}>
            <Image source={{ uri: photos[0].url }} style={styles.halfPhoto} />
            <Image source={{ uri: photos[1].url }} style={styles.halfPhoto} />
          </View>
        </View>
      );
    case 3:
      return (
        <View style={styles.photoContainer}>
          <Image source={{ uri: photos[0].url }} style={styles.mainPhoto} />
          <View style={styles.photoRow}>
            <Image source={{ uri: photos[1].url }} style={styles.halfPhoto} />
            <Image source={{ uri: photos[2].url }} style={styles.halfPhoto} />
          </View>
        </View>
      );
    default:
      return (
        <View style={styles.photoContainer}>
          <View style={styles.photoRow}>
            <Image source={{ uri: photos[0].url }} style={styles.halfPhoto} />
            <Image source={{ uri: photos[1].url }} style={styles.halfPhoto} />
          </View>
          <View style={styles.photoRow}>
            <Image source={{ uri: photos[2].url }} style={styles.halfPhoto} />
            <View style={styles.morePhotosContainer}>
              <Image 
                source={{ uri: photos[3].url }} 
                style={[styles.halfPhoto, photos.length > 4 && styles.blurredPhoto]} 
                blurRadius={photos.length > 4 ? 2 : 0} 
              />
              {photos.length > 4 && (
                <View style={styles.morePhotosOverlay}>
                  <Text style={styles.morePhotosText}>+{photos.length - 4}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      );
  }
};

  const renderBulletinFeed = () => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.listTitle}>Latest Bulletins</Text>
      <TouchableOpacity onPress={() => navigation.navigate('BulletinManagement')}>
        <Text style={styles.viewAllLink}>View All →</Text>
      </TouchableOpacity>
    </View>
    {recentBulletins.length > 0 ? recentBulletins.map((bulletin, index) => (
      <View key={index} style={styles.bulletinPost}>
        <View style={styles.bulletinHeader}>
          <View style={styles.bulletinIcon}>
            <Text style={styles.bulletinIconText}>{getCategoryIcon(bulletin.category)}</Text>
          </View>
          <View style={styles.bulletinInfo}>
            <Text style={styles.bulletinTitle}>{bulletin.title}</Text>
            <Text style={styles.bulletinCategory}>{bulletin.category}</Text>
            <Text style={styles.bulletinTime}>{formatTimeAgo(bulletin.createdAt)}</Text>
          </View>
        </View>
        
        <Text style={styles.bulletinMessage}>{bulletin.message}</Text>
        
        {renderPhotoLayout(bulletin.photos)}
        
        <View style={styles.bulletinFooter}>
          <View style={styles.bulletinReactions}>
            <View style={styles.reactionButton}>
              <Ionicons name="thumbs-up-outline" size={16} color="#10B981" style={styles.reactionIcon} />
              <Text style={styles.reactionText}>{bulletin.reactions?.filter(r => r.type === 'upvote').length || 0}</Text>
            </View>
            <View style={styles.reactionButton}>
              <Ionicons name="thumbs-down-outline" size={16} color="#EF4444" style={styles.reactionIcon} />
              <Text style={styles.reactionText}>{bulletin.reactions?.filter(r => r.type === 'downvote').length || 0}</Text>
            </View>
          </View>
          <Text style={styles.commentCount}>💬 {bulletin.comments?.length || 0} comments</Text>
        </View>
      </View>
    )) : (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No recent bulletins found</Text>
      </View>
    )}
  </View>
);


  const renderAQICard = (title, cities, isBest = false) => (
    <View style={styles.card}>
      <Text style={styles.aqiCardTitle}>{title}</Text>
      <View style={styles.aqiList}>
        {cities.length > 0 ? cities.map((city, index) => (
          <View key={index} style={styles.aqiItem}>
            <View style={styles.aqiCityInfo}>
              <Text style={styles.aqiCityName}>{city.name}</Text>
              <Text style={[styles.aqiCityStatus, { color: city.category.color }]}>
                {city.category.text}
              </Text>
            </View>
            <View style={styles.aqiValueSection}>
              <View style={[styles.aqiValueContainer, { backgroundColor: city.category.bgColor }]}>
                <Text style={[styles.aqiValue, { color: city.category.color }]}>{city.aqi}</Text>
              </View>
              <View style={[styles.aqiIndicator, { backgroundColor: city.category.color }]} />
            </View>
          </View>
        )) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No AQI data available</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Left Column */}
          <View style={styles.leftColumn}>
            {/* Key Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Key Metrics</Text>
              <View style={styles.grid}>
                {renderMetricCard('Total Users', stats.totalUsers || '0', '#3b82f6', '👥', () => navigation.navigate('Users'))}
                {renderMetricCard('Active Users', stats.activeUsers || '0', '#10b981', '🟢', () => navigation.navigate('Users'))}
                {renderMetricCard('Reports', stats.totalReports || '0', '#f59e0b', '📋', () => navigation.navigate('Reports'))}
                {renderMetricCard('Bulletins', stats.totalBulletins || '0', '#8b5cf6', '📢', () => navigation.navigate('BulletinManagement'))}
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
              <View style={styles.grid}>
                {renderQuickActionCard('User Management', 'Manage users & clusters', '👤', ['#3b82f6', '#1e40af'], () => navigation.navigate('Users'))}
                {renderQuickActionCard('Pollution Monitor', 'Track pollution data', '🌍', ['#10b981', '#059669'], () => navigation.navigate('PollutionSources'))}
                {renderQuickActionCard('Analytics', 'View detailed reports', '📊', ['#f59e0b', '#d97706'], () => navigation.navigate('Analytics'))}
                {renderQuickActionCard('Bulletins', 'Manage announcements', '📢', ['#8b5cf6', '#7c3aed'], () => navigation.navigate('BulletinManagement'))}
              </View>
            </View>

            {/* Recent Reports */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Recent Reports</Text>
              {renderReportCard('Latest Reports', recentReports, 'Reports')}
            </View>

            {/* Recent Bulletins */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📢 Recent Bulletins</Text>
              {renderBulletinFeed()}
            </View>
          </View>

          {/* Right Column */}
          <View style={styles.rightColumn}>
            {/* AQI Data */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌬️ Metro Manila Air Quality</Text>
              <View style={styles.aqiContainer}>
                {renderAQICard('🟢 Best Air Quality', cityAQI.best || [], true)}
                {renderAQICard('🔴 Worst Air Quality', cityAQI.worst || [], false)}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b', fontWeight: '500' },
  
  header: { 
    backgroundColor: '#1e293b', 
    paddingTop: 40, 
    paddingBottom: 30, 
    paddingHorizontal: 40, 
    borderBottomLeftRadius: 24, 
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerContent: { marginBottom: 20 },
  welcomeText: { fontSize: 16, color: '#94a3b8', marginBottom: 4 },
  adminName: { fontSize: 28, fontWeight: '700', color: '#ffffff' },
  
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8
  },
  refreshText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  refreshIcon: { transform: [{ rotate: '360deg' }] },
  
  mainContent: { 
    flexDirection: 'row', 
    paddingHorizontal: 40, 
    gap: 30, 
    maxWidth: 1400, 
    alignSelf: 'center', 
    width: '100%' 
  },
  leftColumn: { flex: 2 },
  rightColumn: { flex: 1, minWidth: 350 },
  
  section: { marginTop: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  
  metricCard: { 
    width: 200, 
    borderRadius: 20, 
    overflow: 'hidden', 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8 
  },
  
  gradientStyle: { padding: 24 },
  actionGradient: { minHeight: 130 },
  
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { fontSize: 36, marginRight: 16 },
  cardInfo: { flex: 1 },
  cardValue: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  cardTitle: { fontSize: 14, color: '#ffffff', opacity: 0.9, fontWeight: '600' },
  
  actionIcon: { fontSize: 32, marginRight: 16 },
  actionTitle: { fontSize: 14.5, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
  actionDescription: { fontSize: 13, color: '#ffffff', opacity: 0.9, lineHeight: 18 },
  
  card: { 
    backgroundColor: '#ffffff', 
    borderRadius: 20, 
    padding: 24, 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8 
  },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  listTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  viewAllLink: { fontSize: 16, color: '#3b82f6', fontWeight: '600' },
  
  listContent: { gap: 12 },
  listItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    backgroundColor: '#f8fafc', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#e2e8f0' 
  },
  
  listIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  listItemIcon: { fontSize: 20 },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 6 },
  listItemSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  listItemTime: { fontSize: 12, color: '#94a3b8' },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#ffffff', textTransform: 'capitalize' },
  
  noDataContainer: { paddingVertical: 60, alignItems: 'center' },
  noDataText: { fontSize: 16, color: '#94a3b8', textAlign: 'center' },
  
  bulletinPost: { 
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#e4e6ea', 
    elevation: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 2 
  },
  
  bulletinHeader: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  bulletinIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  bulletinIconText: { fontSize: 20, color: '#ffffff' },
  bulletinInfo: { flex: 1 },
  bulletinTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 4, lineHeight: 24 },
  bulletinCategory: { fontSize: 14, color: '#64748b', fontWeight: '500', marginBottom: 4 },
  bulletinTime: { fontSize: 12, color: '#94a3b8', fontWeight: '400' },
  bulletinMessage: { fontSize: 16, color: '#1e293b', lineHeight: 24, marginBottom: 16 },
  
  // New photo layout styles matching bulletin feed
photoContainer: { marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
singlePhoto: { width: '100%', height: 320, resizeMode: 'cover' },
mainPhoto: { width: '100%', height: 280, resizeMode: 'cover', marginBottom: 4 },
photoRow: { flexDirection: 'row', gap: 4 },
halfPhoto: { flex: 1, height: 200, resizeMode: 'cover' },
morePhotosContainer: { flex: 1, position: 'relative' },
blurredPhoto: { position: 'relative' },
morePhotosOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
morePhotosText: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  
  // Remove old bulletin image styles and replace with new ones
  bulletinFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e6ea',
  },
  bulletinReactions: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reactionIcon: {
    marginRight: 4,
  },
  reactionText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  commentCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  aqiContainer: {
    gap: 20,
  },
  aqiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  aqiCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  aqiList: {
    gap: 12,
  },
  aqiItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  aqiCityInfo: {
    flex: 1,
  },
  aqiCityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  aqiCityStatus: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  aqiValueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aqiValueContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  aqiValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  aqiIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footer: {
    height: 40,
  },
});
export default AdminDashboard;