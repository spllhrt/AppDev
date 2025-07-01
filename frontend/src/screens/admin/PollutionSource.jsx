import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, Modal, ScrollView, Platform, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import { getPollutionClassificationLogs } from '../../api/pollutionSource';

const { width: screenWidth } = Dimensions.get('window');

const AdminPollutionLogsScreen = () => {
  const [state, setState] = useState({
    logs: [], loading: false, refreshing: false, filterModal: false, detailModal: false,
    chartModal: false, mapModal: false, selectedLog: null, locationCache: {}, pendingGeocodes: {},
    filters: { sourceType: '', city: '', startDate: null, endDate: null },
    tempFilters: { sourceType: '', city: '', startDate: null, endDate: null },
    viewMode: 'list', // 'list', 'chart', 'map'
    exporting: false
  });

  const sourceTypes = ['Traffic', 'Industrial', 'Residential', 'Construction', 'Natural', 'Unknown'];
  const colors = { Traffic: '#FF6B6B', Industrial: '#4ECDC4', Residential: '#45B7D1', Construction: '#96CEB4', Natural: '#FFEAA7', Unknown: '#DDA0DD' };
  const thresholds = { pm2_5: { good: 12, moderate: 35, high: 55 }, no2: { good: 53, moderate: 100, high: 200 }, so2: { good: 35, moderate: 75, high: 185 } };

  const updateState = useCallback((updates) => setState(prev => ({ ...prev, ...updates })), []);

  // Optimized geocoding with batching
  const processGeocodes = useCallback(async () => {
    const pending = Object.keys(state.pendingGeocodes);
    if (pending.length === 0) return;

    const batch = pending.slice(0, 5); // Process 5 at a time
    const remaining = pending.slice(5).reduce((acc, key) => ({ ...acc, [key]: state.pendingGeocodes[key] }), {});
    
    updateState({ pendingGeocodes: remaining });

    try {
      const results = await Promise.allSettled(
        batch.map(async (key) => {
          const { lat, lon } = state.pendingGeocodes[key];
          await new Promise(resolve => setTimeout(resolve, 200));
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`, {
            headers: { 'User-Agent': 'PollutionApp/1.0' }
          });
          const data = await response.json();
          const cityName = data.address?.city || data.address?.town || data.address?.municipality || 
                          data.address?.village || data.display_name?.split(',')[0] || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
          return { key, cityName };
        })
      );

      const newCache = { ...state.locationCache };
      results.forEach(result => {
        if (result.status === 'fulfilled') newCache[result.value.key] = result.value.cityName;
      });

      updateState({ 
        locationCache: newCache,
        logs: state.logs.map(log => {
          const key = `${log.lat.toFixed(4)},${log.lon.toFixed(4)}`;
          return { ...log, cityName: newCache[key] || log.cityName };
        })
      });
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  }, [state.pendingGeocodes, state.logs, state.locationCache]);

  useEffect(() => { const timer = setTimeout(processGeocodes, 300); return () => clearTimeout(timer); }, [processGeocodes]);

  const reverseGeocode = useCallback((lat, lon) => {
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (state.locationCache[key]) return state.locationCache[key];
    updateState({ pendingGeocodes: { ...state.pendingGeocodes, [key]: { lat, lon } } });
    return 'Loading...';
  }, [state.locationCache, state.pendingGeocodes]);

  const fetchLogs = useCallback(async (showLoading = true) => {
    try {
      updateState(showLoading ? { loading: true } : { refreshing: true });
      const { sourceType, city, startDate, endDate } = state.filters;
      const params = {
        ...(sourceType && { sourceType }),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      };
      const response = await getPollutionClassificationLogs(params);
      let logsData = response.data?.map(log => ({ ...log, cityName: reverseGeocode(log.lat, log.lon) })) || [];
      
      // Filter by city if specified
      if (city) logsData = logsData.filter(log => log.cityName?.toLowerCase().includes(city.toLowerCase()));
      
      updateState({ logs: logsData });
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch pollution logs');
    } finally {
      updateState({ loading: false, refreshing: false });
    }
  }, [state.filters, reverseGeocode]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Memoized computed values
  const { cities, chartData, mapData } = useMemo(() => {
    const citySet = new Set();
    const sourceCount = {};
    const mapPoints = [];

    state.logs.forEach(log => {
      if (log.cityName && log.cityName !== 'Loading...') citySet.add(log.cityName);
      const source = log.classificationResult?.source || 'Unknown';
      sourceCount[source] = (sourceCount[source] || 0) + 1;
      if (log.lat && log.lon) mapPoints.push([log.lat, log.lon, log.classificationResult?.source || 'Unknown']);
    });

    return {
      cities: Array.from(citySet).sort(),
      chartData: {
        labels: Object.keys(sourceCount),
        datasets: [{ data: Object.values(sourceCount), colors: Object.keys(sourceCount).map(s => () => colors[s] || '#95A5A6') }]
      },
      mapData: mapPoints
    };
  }, [state.logs]);

  const generatePDFHTML = useCallback(() => {
    const currentDate = new Date().toLocaleDateString();
    const data = state.logs.map(log => ({
      Date: new Date(log.createdAt).toLocaleDateString(),
      Time: new Date(log.createdAt).toLocaleTimeString(),
      City: log.cityName || 'Unknown',
      Source: log.classificationResult?.source || 'Unknown',
      PM2_5: log.pollutants?.pm2_5 || 'N/A',
      NO2: log.pollutants?.no2 || 'N/A',
      SO2: log.pollutants?.so2 || 'N/A',
      User: log.user?.name || log.user?.email || 'Unknown'
    }));

    // Calculate summary statistics
    const sourceStats = {};
    const cityStats = {};
    state.logs.forEach(log => {
      const source = log.classificationResult?.source || 'Unknown';
      const city = log.cityName || 'Unknown';
      sourceStats[source] = (sourceStats[source] || 0) + 1;
      cityStats[city] = (cityStats[city] || 0) + 1;
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pollution Logs Report</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #007AFF;
            padding-bottom: 15px;
          }
          .header h1 {
            color: #007AFF;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
          }
          .summary {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .summary-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            border-left: 4px solid #007AFF;
            flex: 1;
            margin: 0 10px;
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            color: #007AFF;
            font-size: 16px;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 12px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .stats-section h3 {
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
            margin-bottom: 15px;
            font-size: 16px;
          }
          .stats-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dotted #eee;
            font-size: 13px;
          }
          .stats-item:last-child {
            border-bottom: none;
          }
          .badge {
            padding: 3px 8px;
            border-radius: 12px;
            color: white;
            font-size: 10px;
            font-weight: bold;
          }
          .table-container {
            overflow-x: auto;
            margin-top: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          th {
            background: #007AFF;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            position: sticky;
            top: 0;
          }
          td {
            padding: 10px 8px;
            border-bottom: 1px solid #eee;
          }
          tr:nth-child(even) {
            background: #f8f9fa;
          }
          tr:hover {
            background: #e3f2fd;
          }
          .source-traffic { background: #FF6B6B; }
          .source-industrial { background: #4ECDC4; }
          .source-residential { background: #45B7D1; }
          .source-construction { background: #96CEB4; }
          .source-natural { background: #FFEAA7; color: #333; }
          .source-unknown { background: #DDA0DD; }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
          @media print {
            body { margin: 15px; }
            .summary { flex-direction: column; }
            .summary-card { margin: 5px 0; }
            .stats-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pollution Logs Report</h1>
          <p>Generated on: ${currentDate}</p>
          <p>Total Records: ${state.logs.length}</p>
          ${state.filters.sourceType || state.filters.city || state.filters.startDate ? 
            `<p>Filters Applied: ${[
              state.filters.sourceType && `Source: ${state.filters.sourceType}`,
              state.filters.city && `City: ${state.filters.city}`,
              state.filters.startDate && `From: ${state.filters.startDate.toLocaleDateString()}`
            ].filter(Boolean).join(', ')}</p>` : ''
          }
        </div>

        <div class="summary">
          <div class="summary-card">
            <h3>Total Logs</h3>
            <div style="font-size: 24px; font-weight: bold; color: #007AFF;">${state.logs.length}</div>
          </div>
          <div class="summary-card">
            <h3>Cities Covered</h3>
            <div style="font-size: 24px; font-weight: bold; color: #28a745;">${Object.keys(cityStats).length}</div>
          </div>
          <div class="summary-card">
            <h3>Source Types</h3>
            <div style="font-size: 24px; font-weight: bold; color: #dc3545;">${Object.keys(sourceStats).length}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stats-section">
            <h3>Pollution Sources</h3>
            ${Object.entries(sourceStats)
              .sort(([,a], [,b]) => b - a)
              .map(([source, count]) => 
                `<div class="stats-item">
                  <span><span class="badge source-${source.toLowerCase()}">${source}</span></span>
                  <span><strong>${count}</strong> (${((count/state.logs.length)*100).toFixed(1)}%)</span>
                </div>`
              ).join('')}
          </div>
          <div class="stats-section">
            <h3>Top Cities</h3>
            ${Object.entries(cityStats)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10)
              .map(([city, count]) => 
                `<div class="stats-item">
                  <span>${city}</span>
                  <span><strong>${count}</strong> logs</span>
                </div>`
              ).join('')}
          </div>
        </div>

        <div class="table-container">
          <h3>Detailed Log Data</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>City</th>
                <th>Source</th>
                <th>PM2.5</th>
                <th>NO2</th>
                <th>SO2</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(row => 
                `<tr>
                  <td>${row.Date}</td>
                  <td>${row.Time}</td>
                  <td>${row.City}</td>
                  <td><span class="badge source-${row.Source.toLowerCase()}">${row.Source}</span></td>
                  <td>${row.PM2_5}</td>
                  <td>${row.NO2}</td>
                  <td>${row.SO2}</td>
                  <td>${row.User}</td>
                </tr>`
              ).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>This report was automatically generated by the Pollution Monitoring System</p>
          <p>Report contains ${state.logs.length} pollution log entries</p>
        </div>
      </body>
      </html>
    `;
    return html;
  }, [state.logs, state.filters]);

  const exportToPDF = useCallback(async () => {
    try {
      updateState({ exporting: true });
      
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required to save the PDF.');
        return;
      }

      // Generate PDF
      const htmlContent = generatePDFHTML();
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612,
        height: 792,
      });

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `pollution-logs-${timestamp}.pdf`;
      
      // Copy to downloads directory
      const downloadDir = `${FileSystem.documentDirectory}Download/`;
      
      // Ensure Download directory exists
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }
      
      const finalUri = `${downloadDir}${filename}`;
      await FileSystem.copyAsync({ from: uri, to: finalUri });

      // Save to media library (Downloads folder on Android, Photos on iOS)
      const asset = await MediaLibrary.createAssetAsync(finalUri);
      
      // On Android, move to Downloads album
      if (Platform.OS === 'android') {
        const album = await MediaLibrary.getAlbumAsync('Download');
        if (album == null) {
          await MediaLibrary.createAlbumAsync('Download', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      }

      Alert.alert(
        'Export Successful', 
        `PDF report has been saved to your device's Downloads folder as "${filename}"`,
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'There was an error generating the PDF report. Please try again.');
    } finally {
      updateState({ exporting: false });
    }
  }, [generatePDFHTML]);

  const renderLogItem = ({ item }) => (
    <TouchableOpacity style={styles.logCard} onPress={() => updateState({ selectedLog: item, detailModal: true })}>
      <View style={styles.logHeader}>
        <View style={[styles.sourceTypeBadge, { backgroundColor: colors[item.classificationResult?.source] || '#95A5A6' }]}>
          <Text style={styles.sourceTypeText}>{item.classificationResult?.source || 'Unknown'}</Text>
        </View>
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.locationText}>{item.cityName}</Text>
      </View>
      <View style={styles.pollutantsRow}>
        {Object.entries(item.pollutants || {}).slice(0, 3).map(([key, val]) => 
          <Text key={key} style={styles.pollutantChip}>{key.toUpperCase()}: {val}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const MapView = () => {
    const mapHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
      </head>
      <body style="margin:0; padding:0;">
        <div id="map" style="height: 100vh; width: 100%;"></div>
        <script>
          const map = L.map('map').setView([14.5995, 120.9842], 11);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          
          const heatData = ${JSON.stringify(mapData)};
          if (heatData.length > 0) {
            const heat = L.heatLayer(heatData.map(point => [point[0], point[1], 1]), {
              radius: 25,
              blur: 15,
              maxZoom: 17,
            }).addTo(map);
            
            const group = new L.featureGroup(heatData.map(point => 
              L.marker([point[0], point[1]]).bindPopup(\`Source: \${point[2]}\`)
            ));
            group.addTo(map);
            map.fitBounds(group.getBounds().pad(0.1));
          }
        </script>
      </body>
      </html>
    `;
    return <WebView source={{ html: mapHTML }} style={{ flex: 1 }} />;
  };

  const renderContent = () => {
    if (state.loading) return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading logs...</Text>
      </View>
    );

    if (state.viewMode === 'chart') return (
      <ScrollView style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Pollution Sources Distribution</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          }}
          style={styles.chart}
        />
      </ScrollView>
    );

    if (state.viewMode === 'map') return <MapView />;

    return (
      <FlatList
        data={state.logs}
        keyExtractor={item => item._id}
        renderItem={renderLogItem}
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => fetchLogs(false)} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="document-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No pollution logs found</Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pollution Logs</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => updateState({ tempFilters: { ...state.filters }, filterModal: true })}>
            <Ionicons name="filter" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={exportToPDF} 
            style={[styles.headerButton, state.exporting && styles.disabledButton]}
            disabled={state.exporting}
          >
            {state.exporting ? (
              <ActivityIndicator size={16} color="#007AFF" />
            ) : (
              <Ionicons name="download" size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {[
          { key: 'list', icon: 'list', label: 'List' },
          { key: 'chart', icon: 'bar-chart', label: 'Chart' },
          { key: 'map', icon: 'map', label: 'Map' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, state.viewMode === tab.key && styles.activeTab]}
            onPress={() => updateState({ viewMode: tab.key })}
          >
            <Ionicons name={tab.icon} size={18} color={state.viewMode === tab.key ? '#007AFF' : '#666'} />
            <Text style={[styles.tabText, state.viewMode === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}

      {/* Filter Modal */}
      <Modal visible={state.filterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Logs</Text>
              <TouchableOpacity onPress={() => updateState({ filterModal: false })}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.filterLabel}>Source Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {['', ...sourceTypes].map(type => (
                  <TouchableOpacity
                    key={type || 'all'}
                    style={[styles.filterChip, state.tempFilters.sourceType === type && styles.filterChipActive]}
                    onPress={() => updateState({ tempFilters: { ...state.tempFilters, sourceType: type } })}
                  >
                    <Text style={[styles.filterChipText, state.tempFilters.sourceType === type && styles.filterChipTextActive]}>
                      {type || 'All'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.filterLabel}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter city name"
                value={state.tempFilters.city}
                onChangeText={text => updateState({ tempFilters: { ...state.tempFilters, city: text } })}
              />

              <Text style={styles.filterLabel}>Date Range</Text>
              <TextInput
                style={styles.input}
                placeholder="Start Date (YYYY-MM-DD)"
                value={state.tempFilters.startDate?.toISOString().split('T')[0] || ''}
                onChangeText={text => {
                  const date = text ? new Date(text) : null;
                  updateState({ tempFilters: { ...state.tempFilters, startDate: date && !isNaN(date) ? date : null } });
                }}
              />
              <TextInput
                style={styles.input}
                placeholder="End Date (YYYY-MM-DD)"
                value={state.tempFilters.endDate?.toISOString().split('T')[0] || ''}
                onChangeText={text => {
                  const date = text ? new Date(text) : null;
                  updateState({ tempFilters: { ...state.tempFilters, endDate: date && !isNaN(date) ? date : null } });
                }}
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => updateState({ filters: { sourceType: '', city: '', startDate: null, endDate: null }, filterModal: false })}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => updateState({ filters: { ...state.tempFilters }, filterModal: false })}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={state.detailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Details</Text>
              <TouchableOpacity onPress={() => updateState({ detailModal: false })}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {state.selectedLog && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.detailItem}>Source: {state.selectedLog.classificationResult?.source || 'Unknown'}</Text>
                <Text style={styles.detailItem}>City: {state.selectedLog.cityName}</Text>
                <Text style={styles.detailItem}>Date: {new Date(state.selectedLog.createdAt).toLocaleString()}</Text>
                <Text style={styles.sectionTitle}>Pollutants</Text>
                {Object.entries(state.selectedLog.pollutants || {}).map(([key, val]) => (
                  <Text key={key} style={styles.detailItem}>{key.toUpperCase()}: {val} μg/m³</Text>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E1E8ED' },
  title: { fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
  headerButtons: { flexDirection: 'row', gap: 16 },
  headerButton: { marginLeft: 8 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E1E8ED' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 4 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 12, color: '#666' },
  activeTabText: { color: '#007AFF', fontWeight: '500' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#666' },
  emptyText: { fontSize: 16, color: '#666', marginTop: 8 },
  listContainer: { padding: 16 },
  logCard: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sourceTypeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  sourceTypeText: { fontSize: 11, fontWeight: '600', color: '#FFF' },
  dateText: { fontSize: 11, color: '#666' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  locationText: { fontSize: 13, color: '#333', marginLeft: 4 },
  pollutantsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pollutantChip: { fontSize: 10, color: '#666', backgroundColor: '#F0F0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  chartContainer: { flex: 1, padding: 16 },
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 16, textAlign: 'center' },
  chart: { marginVertical: 8, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E1E8ED' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  modalBody: { padding: 16 },
  filterLabel: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8, marginTop: 12 },
  filterScroll: { marginBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E1E8ED', marginRight: 8, backgroundColor: '#FFF' },
  filterChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  filterChipText: { fontSize: 12, color: '#333' },
  filterChipTextActive: { color: '#FFF' },
  input: { padding: 10, borderWidth: 1, borderColor: '#E1E8ED', borderRadius: 6, marginBottom: 8, backgroundColor: '#FFF' },
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#E1E8ED', gap: 8 },
  clearButton: { flex: 1, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#E1E8ED', alignItems: 'center' },
  clearButtonText: { color: '#666' },
  applyButton: { flex: 1, padding: 10, borderRadius: 6, backgroundColor: '#007AFF', alignItems: 'center' },
  applyButtonText: { color: '#FFF', fontWeight: '500' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginVertical: 8 },
  detailItem: { fontSize: 13, color: '#333', marginBottom: 6 },
});

export default AdminPollutionLogsScreen;