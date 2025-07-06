import React, { useState, useEffect, useCallback } from 'react';
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
import { getAllAssessments } from '../../api/historyApi';
import { getPollutionClassificationLogs } from '../../api/pollutionSource';
import { getAllUsers } from '../../api/auth';
import * as Print from 'expo-print';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const { width: screenWidth } = Dimensions.get('window');

const AdminAnalyticsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('last30days');
  const [riskLevelData, setRiskLevelData] = useState([]);
  const [pollutionSourceData, setPollutionSourceData] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    deactivatedUsers: 0,
    adminUsers: 0,
    monthlyRegistrations: [],
    userStatusDistribution: [],
  });
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfMessage, setPdfMessage] = useState('');

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
      processAnalyticsData(usersData);
    } catch (error) {
      throw error;
    }
  };

  const fetchRiskLevelData = async () => {
    try {
      const response = await getAllAssessments();
      const assessments = response.assessments || [];
      
      const { startDate } = getDateRange();
      const filteredData = assessments.filter(assessment => {
        if (!assessment?.riskLevel) return false;
        if (startDate && new Date(assessment.assessedAt) < startDate) return false;
        return true;
      });

      const riskLevelCounts = { low: 0, moderate: 0, high: 0, very_high: 0 };
      
      filteredData.forEach(assessment => {
        const level = assessment.riskLevel.toLowerCase().replace(/\s+/g, '_');
        if (level in riskLevelCounts) {
          riskLevelCounts[level]++;
        }
      });

      const totalAssessments = filteredData.length;
      const chartData = [
        { name: 'Low', count: riskLevelCounts.low, color: '#4CAF50', percentage: totalAssessments > 0 ? (riskLevelCounts.low / totalAssessments) * 100 : 0 },
        { name: 'Moderate', count: riskLevelCounts.moderate, color: '#FFC107', percentage: totalAssessments > 0 ? (riskLevelCounts.moderate / totalAssessments) * 100 : 0 },
        { name: 'High', count: riskLevelCounts.high, color: '#FF9800', percentage: totalAssessments > 0 ? (riskLevelCounts.high / totalAssessments) * 100 : 0 },
        { name: 'Very High', count: riskLevelCounts.very_high, color: '#F44336', percentage: totalAssessments > 0 ? (riskLevelCounts.very_high / totalAssessments) * 100 : 0 }
      ];

      setRiskLevelData(chartData);
    } catch (error) {
      console.error('Failed to fetch risk level data:', error);
      setRiskLevelData([
        { name: 'Low', count: 0, color: '#4CAF50', percentage: 0 },
        { name: 'Moderate', count: 0, color: '#FFC107', percentage: 0 },
        { name: 'High', count: 0, color: '#FF9800', percentage: 0 },
        { name: 'Very High', count: 0, color: '#F44336', percentage: 0 }
      ]);
    }
  };

  const fetchPollutionSourceData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      const response = await getPollutionClassificationLogs({
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      });

      const logs = Array.isArray(response.data) ? response.data : [];
      const sourceCounts = {};
      let totalCount = 0;

      logs.forEach(item => {
        const source = item?.classificationResult?.source || 'unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        totalCount++;
      });

      const chartData = Object.keys(sourceCounts).map(source => ({
        name: source.charAt(0).toUpperCase() + source.slice(1),
        count: sourceCounts[source],
        color: getPollutionSourceColor(source),
        percentage: totalCount > 0 ? (sourceCounts[source] / totalCount) * 100 : 0
      }));

      chartData.sort((a, b) => b.count - a.count);
      setPollutionSourceData(chartData);
    } catch (error) {
      console.error('Failed to fetch pollution source data:', error);
      setPollutionSourceData([]);
    }
  };

  const getPollutionSourceColor = (source) => {
    const lowerSource = source.toLowerCase();
    
    switch(lowerSource) {
      case 'vehicular':
        return '#FF5722';
      case 'industrial':
        return '#607D8B';
      case 'construction':
        return '#795548';
      case 'wildfire':
        return '#FF9800';
      case 'agricultural':
        return '#4CAF50';
      case 'residential':
        return '#9C27B0';
      case 'unknown':
      default:
        return '#9E9E9E';
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

  const processAnalyticsData = (usersData) => {
    const regularUsersOnly = usersData.filter(user => user.role !== 'admin');
    const totalUsers = regularUsersOnly.length;
    const adminUsers = usersData.filter(user => user.role === 'admin').length;
    
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
    
    const monthlyData = generateMonthlyRegistrations(regularUsersOnly);
    
    const statusDistribution = [
      { name: 'Active', count: activeUsers, color: '#10b981', percentage: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0 },
      { name: 'Deactivated', count: deactivatedUsers, color: '#ef4444', percentage: totalUsers > 0 ? (deactivatedUsers / totalUsers) * 100 : 0 }
    ];

    setAnalytics({
      totalUsers,
      activeUsers,
      deactivatedUsers,
      adminUsers,
      monthlyRegistrations: monthlyData,
      userStatusDistribution: statusDistribution,
    });
  };

  const generateMonthlyRegistrations = (usersData) => {
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
      
      monthlyData.push({ month: monthName, count: registrationsCount });
    }
    
    return monthlyData;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const generatePDFHTML = useCallback(() => {
    const currentDate = new Date().toLocaleDateString();
    const dateRangeText = dateRange === 'last7days' ? 'Last 7 Days' :
                         dateRange === 'last30days' ? 'Last 30 Days' :
                         dateRange === 'last90days' ? 'Last 90 Days' : 'All Time';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Analytics Report</title><style>
      body { font-family: Arial, sans-serif; margin: 20px; color: #333; line-height: 1.4; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 15px; }
      .header h1 { color: #6366f1; margin: 0; font-size: 28px; }
      .header p { margin: 5px 0; color: #666; font-size: 14px; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
      .summary-card { background: #f8f9fa; border-radius: 8px; padding: 15px; border-left: 4px solid #6366f1; }
      .summary-card h3 { margin: 0 0 10px 0; color: #6366f1; font-size: 16px; }
      .summary-value { font-size: 24px; font-weight: bold; }
      .chart-section { margin-bottom: 30px; }
      .chart-title { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 15px; font-size: 18px; }
      .chart-container { display: flex; justify-content: space-between; margin-top: 20px; }
      .chart { flex: 1; margin: 0 10px; }
      .legend { margin-top: 20px; }
      .legend-item { display: flex; align-items: center; margin-bottom: 8px; }
      .legend-color { width: 16px; height: 16px; border-radius: 4px; margin-right: 8px; }
      .legend-text { font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; }
      th { background: #6366f1; color: white; padding: 10px; text-align: left; }
      td { padding: 8px 10px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) { background: #f8f9fa; }
      .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
    </style></head><body>
      <div class="header">
        <h1>Analytics Dashboard Report</h1>
        <p>Generated on: ${currentDate}</p>
        <p>Date Range: ${dateRangeText}</p>
      </div>

      <div class="summary">
        <div class="summary-card">
          <h3>Total Users</h3>
          <div class="summary-value" style="color: #6366f1;">${analytics.totalUsers}</div>
        </div>
        <div class="summary-card">
          <h3>Active Users</h3>
          <div class="summary-value" style="color: #10b981;">${analytics.activeUsers}</div>
        </div>
        <div class="summary-card">
          <h3>Admin Users</h3>
          <div class="summary-value" style="color: #f59e0b;">${analytics.adminUsers}</div>
        </div>
        <div class="summary-card">
          <h3>Deactivated Users</h3>
          <div class="summary-value" style="color: #ef4444;">${analytics.deactivatedUsers}</div>
        </div>
      </div>

      <div class="chart-section">
        <h3 class="chart-title">User Status Distribution</h3>
        <div class="chart-container">
          <div class="chart">
            <div style="text-align: center; margin-bottom: 15px;">
              <svg width="200" height="200" viewBox="0 0 200 200">
                ${analytics.userStatusDistribution.map((item, i) => {
                  const startAngle = i === 0 ? 0 : analytics.userStatusDistribution.slice(0, i).reduce((sum, curr) => sum + curr.percentage, 0) * 3.6;
                  const endAngle = startAngle + item.percentage * 3.6;
                  const startX = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
                  const startY = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
                  const endX = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
                  const endY = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
                  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
                  return `<path d="M100,100 L${startX},${startY} A80,80 0 ${largeArcFlag},1 ${endX},${endY} Z" fill="${item.color}" />`;
                }).join('')}
              </svg>
            </div>
            <div class="legend">
              ${analytics.userStatusDistribution.map(item => `
                <div class="legend-item">
                  <div class="legend-color" style="background-color: ${item.color};"></div>
                  <div class="legend-text">${item.name}: ${item.count} (${item.percentage.toFixed(1)}%)</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="chart-section">
        <h3 class="chart-title">Health Risk Levels</h3>
        <div class="chart-container">
          <div class="chart">
            <div style="text-align: center; margin-bottom: 15px;">
              <svg width="200" height="200" viewBox="0 0 200 200">
                ${riskLevelData.map((item, i) => {
                  const startAngle = i === 0 ? 0 : riskLevelData.slice(0, i).reduce((sum, curr) => sum + curr.percentage, 0) * 3.6;
                  const endAngle = startAngle + item.percentage * 3.6;
                  const startX = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
                  const startY = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
                  const endX = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
                  const endY = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
                  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
                  return `<path d="M100,100 L${startX},${startY} A80,80 0 ${largeArcFlag},1 ${endX},${endY} Z" fill="${item.color}" />`;
                }).join('')}
              </svg>
            </div>
            <div class="legend">
              ${riskLevelData.map(item => `
                <div class="legend-item">
                  <div class="legend-color" style="background-color: ${item.color};"></div>
                  <div class="legend-text">${item.name}: ${item.count} (${item.percentage.toFixed(1)}%)</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="chart-section">
        <h3 class="chart-title">Pollution Sources</h3>
        <div class="chart-container">
          <div class="chart">
            <div style="text-align: center; margin-bottom: 15px;">
              <svg width="200" height="200" viewBox="0 0 200 200">
                ${pollutionSourceData.map((item, i) => {
                  const startAngle = i === 0 ? 0 : pollutionSourceData.slice(0, i).reduce((sum, curr) => sum + curr.percentage, 0) * 3.6;
                  const endAngle = startAngle + item.percentage * 3.6;
                  const startX = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
                  const startY = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
                  const endX = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
                  const endY = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
                  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
                  return `<path d="M100,100 L${startX},${startY} A80,80 0 ${largeArcFlag},1 ${endX},${endY} Z" fill="${item.color}" />`;
                }).join('')}
              </svg>
            </div>
            <div class="legend">
              ${pollutionSourceData.map(item => `
                <div class="legend-item">
                  <div class="legend-color" style="background-color: ${item.color};"></div>
                  <div class="legend-text">${item.name}: ${item.count} (${item.percentage.toFixed(1)}%)</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="chart-section">
  <h3 class="chart-title">Monthly Registrations</h3>
  <div style="height: 300px; position: relative;">
    <svg width="100%" height="100%" viewBox="0 0 600 300">
      <path d="M50,250 L${analytics.monthlyRegistrations.map((item, i) => 
        `${50 + (i * 100)},${250 - (item.count / Math.max(...analytics.monthlyRegistrations.map(m => m.count), 1) * 200)}`
      ).join(' L')}" 
      stroke="#06b6d4" stroke-width="4" fill="none" />
      ${analytics.monthlyRegistrations.map((item, i) => `
        <circle cx="${50 + (i * 100)}" cy="${250 - (item.count / Math.max(...analytics.monthlyRegistrations.map(m => m.count), 1) * 200)}" r="6" fill="#06b6d4" />
        <text x="${50 + (i * 100)}" y="280" text-anchor="middle" font-size="12">${item.month}</text>
        <text x="${50 + (i * 100)}" y="${240 - (item.count / Math.max(...analytics.monthlyRegistrations.map(m => m.count), 1) * 200)}" text-anchor="middle" font-size="12">${item.count}</text>
      `).join('')}
    </svg>
  </div>
</div>

<div class="footer">
  <p>This report was automatically generated by the Health Risk Management System</p>
</div>
</body></html>`;
  }, [analytics, riskLevelData, pollutionSourceData, dateRange]);

  const exportToPDF = async () => {
    try {
      setExportingPDF(true);
      
      // Generate HTML content
      const html = generatePDFHTML();
      
      // Print to PDF file
      const { uri } = await Print.printToFileAsync({ html });
      
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setPdfMessage('Permission to access media library is required to save the PDF.');
        setShowPDFModal(true);
        return;
      }
      
      // Create downloads directory if it doesn't exist
      const downloadDir = `${FileSystem.documentDirectory}Download/`;
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `analytics_report_${timestamp}.pdf`;
      const finalUri = `${downloadDir}${filename}`;
      
      // Copy file to downloads directory
      await FileSystem.copyAsync({ from: uri, to: finalUri });
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(finalUri);
      
      // For Android, add to downloads album
      if (Platform.OS === 'android') {
        const album = await MediaLibrary.getAlbumAsync('Download');
        if (album == null) {
          await MediaLibrary.createAlbumAsync('Download', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      }
      
      setPdfMessage(`PDF report has been saved to your device's Downloads folder as "${filename}"`);
      setShowPDFModal(true);
      
    } catch (error) {
      console.error('PDF export error:', error);
      setPdfMessage('Failed to generate PDF report. Please try again.');
      setShowPDFModal(true);
    } finally {
      setExportingPDF(false);
    }
  };

  const StatCard = ({ title, value, icon, color = '#6366f1', subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <Text style={styles.statCardTitle}>{title}</Text>
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
    
    const validData = Array.isArray(data) ? data.filter(item => item && typeof item.count === 'number' && item.count >= 0) : [];

    if (validData.length === 0 || validData.every(item => item.count === 0)) {
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
          
          <Circle cx={centerX} cy={centerY} r={radius} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
          
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
    const stepX = (width - 80) / Math.max(data.length - 1, 1);
    
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
          
          <Path d={pathData} stroke="url(#lineGrad)" strokeWidth="3" fill="none" strokeLinecap="round" />
          
          {data.map((item, index) => {
            const x = 40 + index * stepX;
            const y = height - 40 - ((item.count / maxValue) * (height - 80));
            
            return (
              <React.Fragment key={index}>
                <Circle cx={x} cy={y} r="4" fill="#fff" stroke="#22d3ee" strokeWidth="2" />
                <SvgText x={x} y={height - 15} fontSize="12" fill="#6b7280" textAnchor="middle">
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Analytics Dashboard</Text>
              <Text style={styles.headerSubtitle}>Monitor platform performance and environmental data</Text>
            </View>
            <TouchableOpacity 
              style={[styles.exportButton, exportingPDF && styles.disabledButton]} 
              onPress={exportToPDF} 
              disabled={exportingPDF}
            >
              {exportingPDF ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Ionicons name="document-outline" size={24} color="#6366f1" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard title="Total Users" value={analytics.totalUsers.toLocaleString()} icon="people" color="#6366f1" />
            <StatCard title="Active Users" value={analytics.activeUsers.toLocaleString()} icon="checkmark-circle" color="#10b981" />
          </View>
          <View style={styles.statsRow}>
            <StatCard title="Admin Users" value={analytics.adminUsers.toLocaleString()} icon="shield-checkmark" color="#f59e0b" />
            <StatCard title="Deactivated" value={analytics.deactivatedUsers.toLocaleString()} icon="ban" color="#ef4444" />
          </View>
        </View>

        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Date Range:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={dateRange}
              onValueChange={(itemValue) => setDateRange(itemValue)}
              style={styles.picker}
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
      </ScrollView>

      {/* PDF Export Modal */}
      <Modal visible={showPDFModal} transparent animationType="fade">
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModalContent}>
            <View style={styles.pdfModalHeader}>
              <Ionicons name="document-text" size={24} color="#6366f1" />
              <Text style={styles.pdfModalTitle}>PDF Export</Text>
            </View>
            <Text style={styles.pdfModalMessage}>{pdfMessage}</Text>
            <TouchableOpacity 
              style={styles.pdfModalButton} 
              onPress={() => setShowPDFModal(false)}
            >
              <Text style={styles.pdfModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748b', fontWeight: '500' },
  header: { padding: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1e293b' },
  headerSubtitle: { fontSize: 15, color: '#64748b', marginTop: 4 },
  exportButton: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  disabledButton: { opacity: 0.5 },
  statsGrid: { padding: 20, gap: 16 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 20, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  statCardTitle: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  statCardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statCardValue: { fontSize: 24, fontWeight: '700' },
  statCardSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  filterContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  filterLabel: { fontSize: 14, color: '#64748b', fontWeight: '500', marginRight: 10 },
  pickerContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  picker: { height: 50 },
  chartsSection: { padding: 20, gap: 20 },
  chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  chartTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  pieChartContainer: { alignItems: 'center' },
  pieChartLegend: { marginTop: 20, alignItems: 'flex-start', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  lineChartContainer: { alignItems: 'center' },
  noDataText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  noDataContainer: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  // PDF Modal Styles
  pdfModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  pdfModalContent: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 24, 
    width: '90%', 
    maxWidth: 400, 
    alignItems: 'center', 
    borderColor: '#6366f1', 
    borderWidth: 1 
  },
  pdfModalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  pdfModalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#6366f1', 
    marginLeft: 12 
  },
  pdfModalMessage: { 
    fontSize: 16, 
    color: '#64748B', 
    textAlign: 'center', 
    marginBottom: 24, 
    lineHeight: 22 
  },
  pdfModalButton: { 
    backgroundColor: '#6366f1', 
    paddingHorizontal: 32, 
    paddingVertical: 12, 
    borderRadius: 24,
    minWidth: 120,
    alignItems: 'center'
  },
  pdfModalButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '700' 
  },
});

export default AdminAnalyticsScreen;