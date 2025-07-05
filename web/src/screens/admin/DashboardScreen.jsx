import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { getAllUsers } from '../../api/auth';

const { width } = Dimensions.get('window');

const AdminDashboard = ({ navigation }) => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch real users data
      const usersResponse = await getAllUsers();
      const users = usersResponse.users || [];
      
      // Calculate real stats from users
      const totalUsers = users.length;
      const activeUsers = users.filter(user => user.status === 'active').length;
      const adminUsers = users.filter(user => user.role === 'admin').length;
      
      // Set real stats with calculated values
      setStats({
        totalUsers: totalUsers,
        activeSessions: activeUsers,
        contentItems: Math.floor(totalUsers * 2.5), // Mock: estimate content items
        pendingReports: Math.floor(totalUsers * 0.1), // Mock: estimate reports
        adminUsers: adminUsers,
      });
      
      // Mock recent activity based on user data
      const mockActivity = [];
      if (users.length > 0) {
        mockActivity.push(
          { type: 'user', message: `New user registered: ${users[0]?.name || 'Unknown'}`, timestamp: new Date(Date.now() - 5 * 60000) },
          { type: 'user', message: `User role updated: ${users[Math.min(1, users.length - 1)]?.name || 'Unknown'}`, timestamp: new Date(Date.now() - 60 * 60000) }
        );
      }
      mockActivity.push(
        { type: 'system', message: 'System backup completed successfully', timestamp: new Date(Date.now() - 15 * 60000) },
        { type: 'content', message: 'Content moderation queue updated', timestamp: new Date(Date.now() - 30 * 60000) },
        { type: 'security', message: 'Security scan completed - no issues found', timestamp: new Date(Date.now() - 45 * 60000) }
      );
      setRecentActivity(mockActivity);
      
      // Mock system health (in production, this would come from monitoring APIs)
      setSystemHealth({
        database: 'healthy',
        api: 'healthy',
        storage: 'healthy',
      });
      
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch dashboard data');
      
      // Fallback to mock data if API fails
      setStats({
        totalUsers: 0,
        activeSessions: 0,
        contentItems: 0,
        pendingReports: 0,
        adminUsers: 0,
      });
      setRecentActivity([]);
      setSystemHealth({
        database: 'unknown',
        api: 'unknown',
        storage: 'unknown',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const navigateToSection = (section) => {
    navigation.navigate(section);
  };

  const renderStatCard = (title, value, icon, color, onPress) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statContent}>
        <View style={styles.statHeader}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={[styles.statIcon, { color }]}>{icon}</Text>
        </View>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderQuickAction = (title, description, icon, color, onPress) => (
    <TouchableOpacity
      style={styles.quickActionCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Text style={styles.actionIconText}>{icon}</Text>
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderActivityItem = (item, index) => (
    <View key={index} style={styles.activityItem}>
      <View style={[styles.activityDot, { backgroundColor: getActivityColor(item.type) }]} />
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>{item.message}</Text>
        <Text style={styles.activityTime}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  const getActivityColor = (type) => {
    switch (type) {
      case 'user': return '#3498db';
      case 'system': return '#e74c3c';
      case 'content': return '#f39c12';
      case 'security': return '#8e44ad';
      default: return '#95a5a6';
    }
  };

  const getHealthStatus = (status) => {
    switch (status) {
      case 'healthy': return { color: '#27ae60', text: '●' };
      case 'warning': return { color: '#f39c12', text: '●' };
      case 'critical': return { color: '#e74c3c', text: '●' };
      default: return { color: '#95a5a6', text: '●' };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3498db']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, {currentUser?.name}</Text>
      </View>

      {/* Statistics Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Users',
            stats.totalUsers || '0',
            '👥',
            '#3498db',
            () => navigateToSection('UserManagement')
          )}
          {renderStatCard(
            'Active Sessions',
            stats.activeSessions || '0',
            '🔄',
            '#27ae60',
            () => navigateToSection('Sessions')
          )}
          {renderStatCard(
            'Content Items',
            stats.contentItems || '0',
            '📄',
            '#f39c12',
            () => navigateToSection('ContentManagement')
          )}
          {renderStatCard(
            'Pending Reports',
            stats.pendingReports || '0',
            '⚠️',
            '#e74c3c',
            () => navigateToSection('Reports')
          )}
        </View>
      </View>

      {/* System Health */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Health</Text>
        <View style={styles.healthCard}>
          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>Database</Text>
            <View style={styles.healthStatus}>
              <Text style={[styles.healthDot, { color: getHealthStatus(systemHealth.database).color }]}>
                {getHealthStatus(systemHealth.database).text}
              </Text>
              <Text style={styles.healthText}>{systemHealth.database || 'Unknown'}</Text>
            </View>
          </View>
          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>API Server</Text>
            <View style={styles.healthStatus}>
              <Text style={[styles.healthDot, { color: getHealthStatus(systemHealth.api).color }]}>
                {getHealthStatus(systemHealth.api).text}
              </Text>
              <Text style={styles.healthText}>{systemHealth.api || 'Unknown'}</Text>
            </View>
          </View>
          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>Storage</Text>
            <View style={styles.healthStatus}>
              <Text style={[styles.healthDot, { color: getHealthStatus(systemHealth.storage).color }]}>
                {getHealthStatus(systemHealth.storage).text}
              </Text>
              <Text style={styles.healthText}>{systemHealth.storage || 'Unknown'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {renderQuickAction(
            'User Management',
            'Manage users, roles and permissions',
            '👤',
            '#3498db',
            () => navigateToSection('UserManagement')
          )}
          {renderQuickAction(
            'Content Moderation',
            'Review and moderate content',
            '🛡️',
            '#27ae60',
            () => navigateToSection('ContentModeration')
          )}
          {renderQuickAction(
            'Analytics',
            'View detailed analytics and reports',
            '📊',
            '#f39c12',
            () => navigateToSection('Analytics')
          )}
          {renderQuickAction(
            'System Settings',
            'Configure system preferences',
            '⚙️',
            '#8e44ad',
            () => navigateToSection('Settings')
          )}
          {renderQuickAction(
            'Security Center',
            'Monitor security and access logs',
            '🔒',
            '#e74c3c',
            () => navigateToSection('Security')
          )}
          {renderQuickAction(
            'Backup & Recovery',
            'Manage system backups',
            '💾',
            '#34495e',
            () => navigateToSection('Backup')
          )}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          {recentActivity.length > 0 ? (
            recentActivity.slice(0, 8).map((item, index) => renderActivityItem(item, index))
          ) : (
            <Text style={styles.noActivityText}>No recent activity</Text>
          )}
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => navigateToSection('ActivityLog')}
          >
            <Text style={styles.viewAllText}>View All Activity</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  section: {
    marginVertical: 10,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    width: (width - 40) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  statIcon: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  healthCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  healthLabel: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  healthStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthDot: {
    fontSize: 16,
    marginRight: 8,
  },
  healthText: {
    fontSize: 14,
    color: '#7f8c8d',
    textTransform: 'capitalize',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    width: (width - 40) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionIconText: {
    fontSize: 18,
    color: '#fff',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#95a5a6',
  },
  noActivityText: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 14,
    paddingVertical: 20,
  },
  viewAllButton: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminDashboard;