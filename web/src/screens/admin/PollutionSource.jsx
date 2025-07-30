import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, Modal, ScrollView, Platform, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import { getPollutionClassificationLogs } from '../../api/pollutionSource';

const { width: screenWidth } = Dimensions.get('window');

const AdminPollutionLogsScreen = () => {
  const [state, setState] = useState({
    logs: [],
    loading: false,
    refreshing: false,
    filterModal: false,
    detailModal: false,
    chartModal: false,
    mapModal: false,
    selectedLog: null,
    locationCache: {},
    pendingGeocodes: {},
    filters: { sourceType: '', city: '', startDate: null, endDate: null },
    tempFilters: { sourceType: '', city: '', startDate: null, endDate: null },
    viewMode: 'list',
    exportingPDF: false,
    showPDFModal: false,
    pdfMessage: ''
  });

  const initialLoadRef = useRef(true);
  const prevFiltersRef = useRef(state.filters);

  const sourceTypes = ['Traffic', 'Industrial', 'Residential', 'Construction'];
  const colors = { Traffic: '#FF6B6B', Industrial: '#4ECDC4', Residential: '#45B7D1', Construction: '#96CEB4'};
  const thresholds = { pm2_5: { good: 12, moderate: 35, high: 55 }, no2: { good: 53, moderate: 100, high: 200 }, so2: { good: 35, moderate: 75, high: 185 } };

  const updateState = useCallback((updates) => setState(prev => ({ ...prev, ...updates })), []);

  const processGeocodes = useCallback(async () => {
    const pending = Object.keys(state.pendingGeocodes);
    if (pending.length === 0) return;

    const batch = pending.slice(0, 5);
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

  useEffect(() => {
    const timer = setTimeout(processGeocodes, 300);
    return () => clearTimeout(timer);
  }, [processGeocodes]);

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

      // First fetch all logs with date filters if specified
      const params = {
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      };

      const response = await getPollutionClassificationLogs(params);
      let logsData = response.data?.map(log => ({
        ...log,
        cityName: reverseGeocode(log.lat, log.lon)
      })) || [];

      // Apply client-side filters for source type and city
      logsData = logsData.filter(log => {
        const matchesSourceType = !sourceType ||
          (log.classificationResult?.source?.toLowerCase() === sourceType.toLowerCase());
        const matchesCity = !city ||
          (log.cityName && log.cityName.toLowerCase().includes(city.toLowerCase()));

        return matchesSourceType && matchesCity;
      });

      updateState({ logs: logsData });
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to fetch pollution logs');
    } finally {
      updateState({ loading: false, refreshing: false });
    }
  }, [state.filters, reverseGeocode]);

  useEffect(() => {
    const filtersChanged = JSON.stringify(prevFiltersRef.current) !== JSON.stringify(state.filters);

    if (initialLoadRef.current || filtersChanged) {
      fetchLogs();
      prevFiltersRef.current = state.filters;
      initialLoadRef.current = false;
    }
  }, [state.filters, fetchLogs]);

  const { cities, mapData } = useMemo(() => {
    const citySet = new Set();
    const mapPoints = [];

    state.logs.forEach(log => {
      if (log.cityName && log.cityName !== 'Loading...') citySet.add(log.cityName);

      // Calculate intensity based on pollution levels
      if (log.lat && log.lon) {
        const pollutants = log.pollutants || {};
        const pm25 = pollutants.pm2_5 || 0;
        const no2 = pollutants.no2 || 0;
        const so2 = pollutants.so2 || 0;

        // Normalize and combine pollution levels (0-1 scale)
        const intensity = Math.min(1,
          (pm25 / thresholds.pm2_5.high * 0.4) +
          (no2 / thresholds.no2.high * 0.3) +
          (so2 / thresholds.so2.high * 0.3)
        );

        mapPoints.push({
          lat: log.lat,
          lng: log.lon,
          intensity: intensity,
          source: log.classificationResult?.source || 'Unknown',
          pollutants: pollutants
        });
      }
    });

    return {
      cities: Array.from(citySet).sort(),
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
        .sort(([, a], [, b]) => b - a)
        .map(([source, count]) =>
          `<div class="stats-item">
                  <span><span class="badge source-${source.toLowerCase()}">${source}</span></span>
                  <span><strong>${count}</strong> (${((count / state.logs.length) * 100).toFixed(1)}%)</span>
                </div>`
        ).join('')}
          </div>
          <div class="stats-section">
            <h3>Top Cities</h3>
            ${Object.entries(cityStats)
        .sort(([, a], [, b]) => b - a)
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
    if (state.logs.length === 0) {
      updateState({
        pdfMessage: 'No pollution logs data available to export.',
        showPDFModal: true
      });
      return;
    }

    try {
      updateState({ exportingPDF: true });

      // Web-specific PDF generation
      if (Platform.OS === 'web') {
        const htmlContent = generatePDFHTML();

        // Create a blob from the HTML content
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        // Create a temporary iframe to load the HTML
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);

        iframe.onload = () => {
          // Use html2pdf library for better PDF generation
          const opt = {
            margin: 10,
            filename: `pollution_logs_report_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          // Use html2pdf.js if available, otherwise fallback to print
          if (window.html2pdf) {
            html2pdf().from(iframe.contentDocument.body).set(opt).save();
            updateState({
              pdfMessage: 'PDF report is being generated and will download shortly.',
              showPDFModal: true
            });
          } else {
            iframe.contentWindow.print();
            updateState({
              pdfMessage: 'PDF opened in print view. Use your browser\'s "Save as PDF" option.',
              showPDFModal: true
            });
          }

          // Clean up
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 1000);
        };

        return;
      }

      // Mobile PDF generation
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        updateState({
          pdfMessage: 'Permission to access media library is required to save the PDF.',
          showPDFModal: true
        });
        return;
      }

      const htmlContent = generatePDFHTML();
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612,
        height: 792,
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `pollution_logs_report_${timestamp}.pdf`;

      const downloadDir = `${FileSystem.documentDirectory}Download/`;
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }

      const finalUri = `${downloadDir}${filename}`;
      await FileSystem.copyAsync({ from: uri, to: finalUri });

      const asset = await MediaLibrary.createAssetAsync(finalUri);

      if (Platform.OS === 'android') {
        const album = await MediaLibrary.getAlbumAsync('Download');
        if (album == null) {
          await MediaLibrary.createAlbumAsync('Download', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      }

      updateState({
        pdfMessage: `PDF report has been saved to your device's Downloads folder as "${filename}"`,
        showPDFModal: true
      });

    } catch (error) {
      console.error('Export error:', error);
      updateState({
        pdfMessage: 'There was an error generating the PDF report. Please try again.',
        showPDFModal: true
      });
    } finally {
      updateState({ exportingPDF: false });
    }
  }, [generatePDFHTML, state.logs]);

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
    // Process heatmap data from logs
    const heatData = state.logs
      .filter(log => log.lat && log.lon)
      .map(log => {
        const pollutants = log.pollutants || {};
        const pm25 = pollutants.pm2_5 || 0;
        const no2 = pollutants.no2 || 0;
        const so2 = pollutants.so2 || 0;

        // Calculate intensity based on pollution levels (weighted average)
        const intensity = Math.min(1,
          (pm25 / thresholds.pm2_5.high * 0.4) +
          (no2 / thresholds.no2.high * 0.3) +
          (so2 / thresholds.so2.high * 0.3)
        );

        return [log.lat, log.lon, intensity * 10]; // Multiply by 10 to amplify effect
      });

    const mapHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100%; }
          .legend {
            position: absolute;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            background: white;
            padding: 25px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif;
          }
          .legend-title {
            font-weight: bold;
            margin-bottom: 5px;
            text-align: center;
            font-size: 20px;
          }
          .legend-item {
            display: flex;
            align-items: center;
            margin: 5px 0;
          }
          .legend-color {
            width: 25px;
            height: 25px;
            margin-right: 8px;
            border-radius: 3px;
          }
          .legend-label {
            font-size: 20px;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="legend">
          <div class="legend-title">Pollution Sources</div>
          <div class="legend-item">
            <div class="legend-color" style="background-color: #FF6B6B;"></div>
            <div class="legend-label">Traffic</div>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background-color: #4ECDC4;"></div>
            <div class="legend-label">Industrial</div>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background-color: #45B7D1;"></div>
            <div class="legend-label">Residential</div>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background-color: #96CEB4;"></div>
            <div class="legend-label">Construction</div>
          </div>
        </div>
        <script>
          const map = L.map('map').setView([14.5995, 120.9842], 11);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          
          // Heatmap data
          const heatData = ${JSON.stringify(heatData)};
          
          if (heatData.length > 0) {
            const heat = L.heatLayer(heatData, {
              radius: 25,
              blur: 15,
              maxZoom: 17,
              gradient: { 
                0.1: 'blue',
                0.3: 'cyan',
                0.5: 'lime',
                0.7: 'yellow',
                0.9: 'red'
              }
            }).addTo(map);
            
            // Add markers with source information
            const markers = L.layerGroup();
            ${state.logs
        .filter(log => log.lat && log.lon)
        .map(log => {
          const source = log.classificationResult?.source || 'Unknown';
          const pollutants = log.pollutants || {};
          return `
                  L.circleMarker(
                    [${log.lat}, ${log.lon}], 
                    {
                      radius: 10,
                      fillColor: '${colors[source] || '#95A5A6'}',
                      color: '#000',
                      weight: 1,
                      opacity: 1,
                      fillOpacity: 0.8
                    }
                  )
                  .bindPopup('<b>Source:</b> ${source.replace(/'/g, "\\'")}<br>' +
                            '<b>Location:</b> ${(log.cityName || 'Unknown').replace(/'/g, "\\'")}<br>' +
                            '<b>PM2.5:</b> ${pollutants.pm2_5 || 'N/A'} μg/m³<br>' +
                            '<b>NO2:</b> ${pollutants.no2 || 'N/A'} μg/m³<br>' +
                            '<b>SO2:</b> ${pollutants.so2 || 'N/A'} μg/m³')
                  .addTo(markers);`;
        })
        .join('\n')}
            
            markers.addTo(map);
            
            // Fit bounds to show all data
            const group = new L.featureGroup([heat, markers]);
            map.fitBounds(group.getBounds().pad(0.1));
          }
        </script>
      </body>
      </html>
    `;

    return <iframe
      srcDoc={mapHTML}
      style={{ width: '100%', height: '100vh', border: 'none' }}
      title="Pollution Map"
      sandbox="allow-scripts allow-same-origin"
    />
  };

  const renderContent = () => {
    if (state.loading) return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading logs...</Text>
      </View>
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
          <TouchableOpacity
            style={[styles.refreshButton, state.refreshing && styles.disabledButton]}
            onPress={() => fetchLogs(false)}
            disabled={state.refreshing}
          >
            {state.refreshing ? (
              <ActivityIndicator size={16} color="#007AFF" />
            ) : (
              <Ionicons name="refresh" size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => updateState({ tempFilters: { ...state.filters }, filterModal: true })}>
            <Ionicons name="filter" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={exportToPDF}
            style={[styles.headerButton, state.exportingPDF && styles.disabledButton]}
            disabled={state.exportingPDF}
          >
            {state.exportingPDF ? (
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
                {['', ...new Set(state.logs.map(l => l.classificationResult?.source).filter(Boolean))].map(type => (
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

      {/* PDF Export Modal */}
      <Modal visible={state.showPDFModal} transparent animationType="fade">
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModalContent}>
            <View style={styles.pdfModalHeader}>
              <Ionicons name="document-text" size={24} color="#007AFF" />
              <Text style={styles.pdfModalTitle}>PDF Export</Text>
            </View>
            <Text style={styles.pdfModalMessage}>{state.pdfMessage}</Text>
            <TouchableOpacity
              style={styles.pdfModalButton}
              onPress={() => updateState({ showPDFModal: false })}
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E1E8ED' },
  title: { fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
  headerButtons: { flexDirection: 'row', gap: 16 },
  headerButton: { marginLeft: 8 },
  refreshButton: { marginLeft: 8 },
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
  disabledButton: { opacity: 0.5 },
  // PDF Modal Styles
  pdfModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pdfModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    borderColor: '#007AFF',
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
    color: '#007AFF',
    marginLeft: 12
  },
  pdfModalMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  pdfModalButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 120,
    alignItems: 'center'
  },
  pdfModalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  }
});

export default AdminPollutionLogsScreen;