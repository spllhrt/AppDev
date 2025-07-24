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

  const getAQIStatus = (aqi) => getAQICategory(aqi).text;
  const getAQIColor = (aqi) => getAQICategory(aqi).color;

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
      
      setCityAQI({ worst: worstCities, best: bestCities });
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
    </View>
  );

  const renderMetricCard = (title, value, color, icon, onPress) => (
    <TouchableOpacity style={styles.metricCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={[color, color + '90']} style={styles.metricGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.metricContent}>
          <Text style={styles.metricIcon}>{icon}</Text>
          <View style={styles.metricInfo}>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricTitle}>{title}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderQuickActionCard = (title, description, icon, gradient, onPress) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={gradient} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.actionContent}>
          <Text style={styles.actionIcon}>{icon}</Text>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionDescription}>{description}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderReportCard = (title, items, navigateSection) => (
    <View style={styles.listCard}>
      <View style={styles.listHeader}>
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

  const renderBulletinFeed = () => (
    <View style={styles.bulletinFeed}>
      <View style={styles.listHeader}>
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
          
          {bulletin.photos && bulletin.photos.length > 0 && (
            <View style={styles.bulletinImages}>
              {bulletin.photos.slice(0, 4).map((photo, photoIndex) => {
                if (photoIndex === 3 && bulletin.photos.length > 4) {
                  return (
                    <View key={photoIndex} style={styles.moreImagesContainer}>
                      <Image 
                        source={{ uri: photo.url }} 
                        style={[styles.bulletinImage, styles.blurredImage]} 
                        blurRadius={3}
                      />
                      <View style={styles.moreImagesOverlay}>
                        <Text style={styles.moreImagesText}>+{bulletin.photos.length - 3}</Text>
                      </View>
                    </View>
                  );
                }
                return (
                  <Image 
                    key={photoIndex} 
                    source={{ uri: photo.url }} 
                    style={styles.bulletinImage} 
                  />
                );
              })}
            </View>
          )}
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

  const renderAQICard = (title, cities) => (
    <View style={styles.aqiCard}>
      <Text style={styles.aqiCardTitle}>{title}</Text>
      <View style={styles.aqiList}>
        {cities.length > 0 ? cities.map((city, index) => (
          <View key={index} style={styles.aqiItem}>
            <View style={styles.aqiCityInfo}>
              <Text style={styles.aqiCityName}>{city.name}</Text>
              <Text style={[styles.aqiCityStatus, { color: city.category.color }]}>{city.category.text}</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} tintColor="#3b82f6" />}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Key Metrics</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard('Total Users', stats.totalUsers || '0', '#3b82f6', '👥', () => navigation.navigate('Users'))}
            {renderMetricCard('Active Users', stats.activeUsers || '0', '#10b981', '🟢', () => navigation.navigate('Users'))}
            {renderMetricCard('Reports', stats.totalReports || '0', '#f59e0b', '📋', () => navigation.navigate('Reports'))}
            {renderMetricCard('Bulletins', stats.totalBulletins || '0', '#8b5cf6', '📢', () => navigation.navigate('BulletinManagement'))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {renderQuickActionCard('User Management', 'Manage users & clusters', '👤', ['#3b82f6', '#1e40af'], () => navigation.navigate('Users'))}
            {renderQuickActionCard('Pollution Monitor', 'Track pollution data', '🌍', ['#10b981', '#059669'], () => navigation.navigate('PollutionSources'))}
            {renderQuickActionCard('Analytics', 'View detailed reports', '📊', ['#f59e0b', '#d97706'], () => navigation.navigate('Analytics'))}
            {renderQuickActionCard('Bulletins', 'Manage announcements', '📢', ['#8b5cf6', '#7c3aed'], () => navigation.navigate('BulletinManagement'))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Recent Reports</Text>
          {renderReportCard('Latest Reports', recentReports, 'Reports')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📢 Recent Bulletins</Text>
          {renderBulletinFeed()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌬️ Metro Manila Air Quality</Text>
          <View style={styles.aqiContainer}>
            {renderAQICard('🟢 Best Air Quality', cityAQI.best || [])}
            {renderAQICard('🔴 Worst Air Quality', cityAQI.worst || [])}
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
  header: { backgroundColor: '#1e293b', paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { marginBottom: 20 },
  welcomeText: { fontSize: 16, color: '#94a3b8', marginBottom: 4 },
  adminName: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  headerStats: { flexDirection: 'row', justifyContent: 'space-around' },
  headerStat: { alignItems: 'center' },
  headerStatValue: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  headerStatLabel: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  metricCard: { width: (width - 52) / 2, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  metricGradient: { padding: 16 },
  metricContent: { flexDirection: 'row', alignItems: 'center' },
  metricIcon: { fontSize: 32, marginRight: 12 },
  metricInfo: { flex: 1 },
  metricValue: { fontSize: 24, fontWeight: '800', color: '#ffffff', marginBottom: 2 },
  metricTitle: { fontSize: 12, color: '#ffffff', opacity: 0.9, fontWeight: '600' },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  quickActionCard: { width: (width - 52) / 2, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  actionGradient: { padding: 16, minHeight: 90 },
  actionContent: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { fontSize: 28, marginRight: 12 },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  actionDescription: { fontSize: 11, color: '#ffffff', opacity: 0.9, lineHeight: 14 },
  listCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  viewAllLink: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
  listContent: { gap: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  listIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  listItemIcon: { fontSize: 16 },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  listItemSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  listItemTime: { fontSize: 10, color: '#94a3b8' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600', color: '#ffffff', textTransform: 'capitalize' },
  noDataContainer: { paddingVertical: 40, alignItems: 'center' },
  noDataText: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  bulletinFeed: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, marginBottom: 16 },
  bulletinPost: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e6ea', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  bulletinHeader: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  bulletinIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1877f2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bulletinIconText: { fontSize: 16, color: '#ffffff' },
  bulletinInfo: { flex: 1 },
  bulletinTitle: { fontSize: 16, fontWeight: '600', color: '#1c1e21', marginBottom: 2, lineHeight: 20 },
  bulletinCategory: { fontSize: 13, color: '#65676b', fontWeight: '400', marginBottom: 4 },
  bulletinTime: { fontSize: 12, color: '#65676b', fontWeight: '400' },
  bulletinMessage: { fontSize: 14, color: '#1c1e21', lineHeight: 20, marginBottom: 12 },
  bulletinImages: { flexDirection: 'row', gap: 2, marginBottom: 12, flexWrap: 'wrap' },
  bulletinImage: { width: (width + 15) / 3, height: 180, backgroundColor: '#f0f2f5', resizeMode: 'cover', borderRadius: 8 },
  moreImagesContainer: { position: 'relative', width: (width + 15) / 3, height: 180, borderRadius: 8, overflow: 'hidden' },
  blurredImage: { width: '100%', height: '100%' },
  moreImagesOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  moreImagesText: { color: '#ffffff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  bulletinFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e4e6ea' },
  bulletinReactions: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  reactionText: { fontSize: 14, color: '#65676b', fontWeight: '400', flexDirection: 'row', alignItems: 'center' },
  reactionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  reactionIcon: { marginRight: 4 },
  aqiContainer: { gap: 16 },
  aqiCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  aqiCardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  aqiList: { gap: 8 },
  aqiItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  aqiCityInfo: { flex: 1 },
  aqiCityName: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  aqiCityStatus: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase' },
  aqiValueSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aqiValueContainer: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  aqiValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  aqiIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    height: 20,
  },
});

export default AdminDashboard;