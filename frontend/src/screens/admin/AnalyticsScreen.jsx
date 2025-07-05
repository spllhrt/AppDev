// AdminAnalyticsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Rect, Line, Text as SvgText, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Picker } from '@react-native-picker/picker';
import { getAssessmentHistory } from '../../api/health';
import { getPollutionClassificationLogs } from '../../api/pollutionSource';
import { getAllUsers } from '../../api/auth';

const { width: screenWidth } = Dimensions.get('window');

const AdminAnalyticsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('last30days');
  const [riskLevelData, setRiskLevelData] = useState([]);
  const [pollutionSourceData, setPollutionSourceData] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    deactivatedUsers: 0,
    adminUsers: 0,
    regularUsers: 0,
    monthlyRegistrations: [],
    userStatusDistribution: [],
  });

  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAnalyticsData(),
        fetchRiskLevelData(),
        fetchPollutionSourceData()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const response = await getAllUsers();
      const usersData = response.users || [];
      setUsers(usersData);
      processAnalyticsData(usersData);
    } catch (error) {
      throw error;
    }
  };

  const fetchRiskLevelData = async () => {
    try {
      // Calculate date range
      const { startDate } = getDateRange();
      
      // Fetch risk level data
      const response = await getAssessmentHistory(1000); // Get all assessments
      const filteredData = response.assessments.filter(assessment => {
        if (!startDate) return true;
        const assessedDate = new Date(assessment.assessedAt);
        return assessedDate >= startDate;
      });

      // Process risk levels
      const riskLevelCounts = {
        low: 0,
        moderate: 0,
        high: 0,
        very_high: 0
      };
      
      filteredData.forEach(assessment => {
        const level = assessment.riskLevel;
        if (riskLevelCounts.hasOwnProperty(level)) {
          riskLevelCounts[level]++;
        }
      });

      const totalAssessments = filteredData.length;
      const chartData = Object.keys(riskLevelCounts).map(level => ({
        name: level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' '),
        count: riskLevelCounts[level],
        color: getRiskLevelColor(level),
        percentage: totalAssessments > 0 ? (riskLevelCounts[level] / totalAssessments) * 100 : 0
      }));

      setRiskLevelData(chartData);
    } catch (error) {
      throw error;
    }
  };

  const fetchPollutionSourceData = async () => {
    try {
      // Calculate date range
      const { startDate, endDate } = getDateRange();
      
      // Fetch pollution source data
      const response = await getPollutionClassificationLogs({
        startDate: startDate?.toISOString(),
        endDate: endDate.toISOString()
      });

      // Process pollution sources
      const sourceCounts = {};
      response.data.forEach(item => {
        const source = item.predicted_source || 'Unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      const totalSources = response.count;
      const chartData = Object.keys(sourceCounts).map(source => ({
        name: source,
        count: sourceCounts[source],
        color: getPollutionSourceColor(source),
        percentage: totalSources > 0 ? (sourceCounts[source] / totalSources) * 100 : 0
      }));

      setPollutionSourceData(chartData);
    } catch (error) {
      throw error;
    }
  };

  const getDateRange = () => {
    const endDate = new Date();
    let startDate = new Date();
    
    switch(dateRange) {
      case 'last7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'last30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'last90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'alltime':
      default:
        startDate = null;
    }
    
    return { startDate, endDate };
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      'low': '#4CAF50',      // Green
      'moderate': '#FFC107',  // Amber
      'high': '#FF9800',      // Orange
      'very_high': '#F44336'  // Red
    };
    return colors[level] || '#9E9E9E';
  };

  const getPollutionSourceColor = (source) => {
    const sourceColors = {
      'vehicular': '#FF5722',
      'industrial': '#607D8B',
      'construction': '#795548',
      'wildfire': '#FF9800',
      'agricultural': '#4CAF50',
      'residential': '#9C27B0',
      'default': '#2196F3'
    };
    
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('vehicle')) return sourceColors.vehicular;
    if (lowerSource.includes('industry')) return sourceColors.industrial;
    if (lowerSource.includes('construct')) return sourceColors.construction;
    if (lowerSource.includes('wildfire')) return sourceColors.wildfire;
    if (lowerSource.includes('agricultur')) return sourceColors.agricultural;
    if (lowerSource.includes('resident')) return sourceColors.residential;
    return sourceColors.default;
  };

  const processAnalyticsData = (usersData) => {
    const regularUsersOnly = usersData.filter(user => user.role !== 'admin');
    const totalUsers = regularUsersOnly.length;
    
    const adminUsers = usersData.filter(user => user.role === 'admin').length;
    const regularUsers = regularUsersOnly.length;
    
    const activeUsers = regularUsersOnly.filter(user => {
      if (!user.status) return true;
      const status = user.status.toLowerCase();
      return status === 'active' || status === 'verified' || status === 'enabled';
    }).length;
    
    const deactivatedUsers = regularUsersOnly.filter(user => {
      if (!user.status) return false;
      const status = user.status.toLowerCase();
      return status === 'inactive' || status === 'deactivated' || status === 'suspended' || status === 'disabled';
    }).length;
    
    const monthlyData = generateRealMonthlyRegistrations(regularUsersOnly);
    
    const statusDistribution = [
      {
        name: 'Active',
        count: activeUsers,
        color: '#10b981',
        percentage: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
      },
      {
        name: 'Deactivated',
        count: deactivatedUsers,
        color: '#ef4444',
        percentage: totalUsers > 0 ? (deactivatedUsers / totalUsers) * 100 : 0,
      }
    ];

    setAnalytics({
      totalUsers,
      activeUsers,
      deactivatedUsers,
      adminUsers,
      regularUsers,
      monthlyRegistrations: monthlyData,
      userStatusDistribution: statusDistribution,
    });
  };

  const generateRealMonthlyRegistrations = (usersData) => {
    const currentDate = new Date();
    const monthlyData = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const registrationsCount = usersData.filter(user => {
        if (!user.createdAt) return false;
        const userDate = new Date(user.createdAt);
        return userDate.getFullYear() === year && userDate.getMonth() === month;
      }).length;
      
      monthlyData.push({ 
        month: monthName, 
        count: registrationsCount,
        fullDate: date 
      });
    }
    
    return monthlyData;
  };

  const calculateTrend = (currentValue, previousValue) => {
    if (previousValue === 0) return 0;
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  };

  const getTrendData = () => {
    const currentMonth = analytics.monthlyRegistrations[analytics.monthlyRegistrations.length - 1]?.count || 0;
    const lastMonth = analytics.monthlyRegistrations[analytics.monthlyRegistrations.length - 2]?.count || 0;
    
    return {
      userRegistrationTrend: calculateTrend(currentMonth, lastMonth),
      activeUsersTrend: Math.round((analytics.activeUsers / analytics.totalUsers) * 100) - 70,
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const StatCard = ({ title, value, icon, color = '#6366f1', subtitle, trend }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <View style={styles.statCardTitleContainer}>
          <Text style={styles.statCardTitle}>{title}</Text>
          {trend !== undefined && trend !== 0 && (
            <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? '#dcfce7' : '#fef2f2' }]}>
              <Ionicons 
                name={trend > 0 ? 'trending-up' : 'trending-down'} 
                size={12} 
                color={trend > 0 ? '#16a34a' : '#dc2626'} 
              />
              <Text style={[styles.trendText, { color: trend > 0 ? '#16a34a' : '#dc2626' }]}>
                {Math.abs(trend)}%
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.statCardIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
      </View>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
    </View>
  );

  const PieChart = ({ data, size = 140 }) => {
    const radius = size / 2 - 15;
    const centerX = size / 2;
    const centerY = size / 2;
    
    const validData = data.filter(item => item.count > 0 && item.percentage > 0);
    
    if (validData.length === 0) {
      return (
        <View style={styles.pieChartContainer}>
          <View style={[styles.noDataContainer, { width: size, height: size }]}>
            <Ionicons name="pie-chart-outline" size={48} color="#cbd5e1" />
            <Text style={styles.noDataText}>No data available</Text>
          </View>
        </View>
      );
    }
    
    let cumulativePercentage = 0;
    
    const createArcPath = (startAngle, endAngle, radius, centerX, centerY) => {
      const start = polarToCartesian(centerX, centerY, radius, startAngle);
      const end = polarToCartesian(centerX, centerY, radius, endAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      
      return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
    };
    
    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    };

    return (
      <View style={styles.pieChartContainer}>
        <Svg width={size} height={size}>
          <Defs>
            {validData.map((item, index) => (
              <LinearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={item.color} stopOpacity="1" />
                <Stop offset="100%" stopColor={item.color} stopOpacity="0.8" />
              </LinearGradient>
            ))}
          </Defs>
          
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="#f1f5f9"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          
          {validData.map((item, index) => {
            const startAngle = cumulativePercentage * 3.6;
            const endAngle = (cumulativePercentage + item.percentage) * 3.6;
            cumulativePercentage += item.percentage;
            
            if (endAngle - startAngle < 1) return null;
            
            return (
              <Path
                key={index}
                d={createArcPath(startAngle, endAngle, radius, centerX, centerY)}
                fill={`url(#gradient-${index})`}
                stroke="#fff"
                strokeWidth="2"
              />
            );
          })}
        </Svg>
        <View style={styles.pieChartLegend}>
          {validData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>
                {item.name}: {item.count} ({item.percentage.toFixed(1)}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const LineChart = ({ data, width = screenWidth - 80, height = 180 }) => {
    if (!data || data.length === 0) {
      return (
        <View style={[styles.lineChartContainer, { height, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      );
    }

    const maxValue = Math.max(...data.map(item => item.count), 1);
    const minValue = Math.min(...data.map(item => item.count));
    const stepX = (width - 80) / Math.max(data.length - 1, 1);
    
    const yAxisSteps = 4;
    const yAxisLabels = [];
    for (let i = 0; i <= yAxisSteps; i++) {
      const value = Math.round(minValue + (maxValue - minValue) * (i / yAxisSteps));
      yAxisLabels.push(value);
    }
    
    let pathData = '';
    data.forEach((item, index) => {
      const x = 40 + index * stepX;
      const y = height - 40 - ((item.count / maxValue) * (height - 80));
      
      if (index === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
    });

    return (
      <View style={styles.lineChartContainer}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
              <Stop offset="100%" stopColor="#06b6d4" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          
          {yAxisLabels.map((label, index) => {
            const y = height - 40 - ((label / maxValue) * (height - 80));
            return (
              <React.Fragment key={`y-${index}`}>
                <Line
                  x1={40}
                  y1={y}
                  x2={width - 20}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <SvgText
                  x={30}
                  y={y + 4}
                  fontSize="10"
                  fill="#6b7280"
                  textAnchor="end"
                >
                  {label}
                </SvgText>
              </React.Fragment>
            );
          })}
          
          <Path
            d={pathData}
            stroke="url(#lineGrad)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          
          {data.map((item, index) => {
            const x = 40 + index * stepX;
            const y = height - 40 - ((item.count / maxValue) * (height - 80));
            
            return (
              <React.Fragment key={index}>
                <Circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#fff"
                  stroke="#22d3ee"
                  strokeWidth="2"
                />
                <SvgText
                  x={x}
                  y={height - 15}
                  fontSize="12"
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {item.month}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  const trendData = getTrendData();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Monitor platform performance and environmental data
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title="Total Users"
              value={analytics.totalUsers.toLocaleString()}
              icon="people"
              color="#6366f1"
              trend={trendData.userRegistrationTrend}
            />
            <StatCard
              title="Active Users"
              value={analytics.activeUsers.toLocaleString()}
              icon="checkmark-circle"
              color="#10b981"
              subtitle={`${analytics.totalUsers > 0 ? Math.round((analytics.activeUsers / analytics.totalUsers) * 100) : 0}% of total`}
              trend={trendData.activeUsersTrend}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Admin Users"
              value={analytics.adminUsers.toLocaleString()}
              icon="shield-checkmark"
              color="#f59e0b"
            />
            <StatCard
              title="Deactivated"
              value={analytics.deactivatedUsers.toLocaleString()}
              icon="ban"
              color="#ef4444"
              subtitle={`${analytics.totalUsers > 0 ? Math.round((analytics.deactivatedUsers / analytics.totalUsers) * 100) : 0}% of total`}
            />
          </View>
        </View>

        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Date Range:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={dateRange}
              onValueChange={(itemValue) => setDateRange(itemValue)}
              style={styles.picker}
              dropdownIconColor="#64748b"
            >
              <Picker.Item label="Last 7 Days" value="last7days" />
              <Picker.Item label="Last 30 Days" value="last30days" />
              <Picker.Item label="Last 90 Days" value="last90days" />
              <Picker.Item label="All Time" value="alltime" />
            </Picker>
          </View>
        </View>

        <View style={styles.chartsSection}>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>User Status Distribution</Text>
            <PieChart data={analytics.userStatusDistribution} />
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Health Risk Levels</Text>
            <PieChart data={riskLevelData} />
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Pollution Sources</Text>
            <PieChart data={pollutionSourceData} />
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Monthly Registrations</Text>
            <LineChart data={analytics.monthlyRegistrations} />
          </View>
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color="#6366f1" />
              <Text style={styles.actionButtonText}>Refresh Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="download" size={20} color="#6366f1" />
              <Text style={styles.actionButtonText}>Export Report</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '400',
  },
  statsGrid: {
    padding: 20,
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statCardTitleContainer: {
    flex: 1,
  },
  statCardTitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statCardSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginRight: 10,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
    color: '#1e293b',
  },
  chartsSection: {
    padding: 20,
    gap: 20,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  pieChartContainer: {
    alignItems: 'center',
  },
  pieChartLegend: {
    marginTop: 20,
    alignItems: 'flex-start',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  lineChartContainer: {
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  noDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionsCard: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  bottomPadding: {
    height: 20,
  },
});

export default AdminAnalyticsScreen;