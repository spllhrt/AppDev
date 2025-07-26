import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, Alert,
  ActivityIndicator, ScrollView, Image, TextInput, RefreshControl,
  KeyboardAvoidingView, Platform, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllReports, updateReport } from '../../api/report';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';

const ReportsScreen = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'verified', label: 'Verified' },
    { id: 'resolved', label: 'Resolved' },
  ];

  useEffect(() => { fetchReports(); }, []);
  useEffect(() => { filterAndSearchReports(); }, [reports, searchQuery, activeFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await getAllReports();
      if (response.success) setReports(response.reports);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSearchReports = () => {
    let result = [...reports];
    if (activeFilter !== 'all') result = result.filter(report => report.status === activeFilter);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(report => 
        report.location.toLowerCase().includes(query) ||
        report.type.toLowerCase().includes(query) ||
        (report.description && report.description.toLowerCase().includes(query)) ||
        (!report.isAnonymous && report.user?.name?.toLowerCase().includes(query))
      );
    }
    setFilteredReports(result);
  };

  const generatePDFHTML = useCallback(() => {
    const currentDate = new Date().toLocaleDateString();
    const statusStats = {}, typeStats = {};
    
    reports.forEach(report => {
      const status = report.status || 'pending';
      const type = report.type || 'Others';
      statusStats[status] = (statusStats[status] || 0) + 1;
      typeStats[type] = (typeStats[type] || 0) + 1;
    });

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reports Summary</title><style>
      body { font-family: Arial, sans-serif; margin: 20px; color: #333; line-height: 1.4; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007AFF; padding-bottom: 15px; }
      .header h1 { color: #007AFF; margin: 0; font-size: 28px; }
      .header p { margin: 5px 0; color: #666; font-size: 14px; }
      .summary { display: flex; justify-content: space-between; margin-bottom: 30px; }
      .summary-card { background: #f8f9fa; border-radius: 8px; padding: 15px; border-left: 4px solid #007AFF; flex: 1; margin: 0 10px; }
      .summary-card h3 { margin: 0 0 10px 0; color: #007AFF; font-size: 16px; }
      .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
      .stats-section h3 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px; }
      .stats-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #eee; font-size: 13px; }
      .badge { padding: 3px 8px; border-radius: 12px; color: white; font-size: 10px; font-weight: bold; }
      .pending-badge { background: #FF9500; } .verified-badge { background: #007AFF; } .resolved-badge { background: #34C759; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      th { background: #007AFF; color: white; padding: 12px 8px; text-align: left; font-weight: 600; }
      td { padding: 10px 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) { background: #f8f9fa; } tr:hover { background: #e3f2fd; }
      .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
    </style></head><body>
      <div class="header">
        <h1>Reports Summary</h1>
        <p>Generated on: ${currentDate}</p>
        <p>Total Reports: ${reports.length}</p>
        ${searchQuery || activeFilter !== 'all' ? 
          `<p>Filters: ${[searchQuery && `Search: "${searchQuery}"`, activeFilter !== 'all' && `Status: ${activeFilter}`].filter(Boolean).join(', ')}</p>` : ''}
      </div>
      <div class="summary">
        <div class="summary-card"><h3>Total Reports</h3><div style="font-size: 24px; font-weight: bold; color: #007AFF;">${reports.length}</div></div>
        <div class="summary-card"><h3>Pending</h3><div style="font-size: 24px; font-weight: bold; color: #FF9500;">${statusStats.pending || 0}</div></div>
        <div class="summary-card"><h3>Resolved</h3><div style="font-size: 24px; font-weight: bold; color: #34C759;">${statusStats.resolved || 0}</div></div>
      </div>
      <div class="stats-grid">
        <div class="stats-section">
          <h3>Report Status</h3>
          ${Object.entries(statusStats).sort(([,a], [,b]) => b - a).map(([status, count]) => 
            `<div class="stats-item"><span><span class="badge ${status}-badge">${status.toUpperCase()}</span></span><span><strong>${count}</strong> (${((count/reports.length)*100).toFixed(1)}%)</span></div>`
          ).join('')}
        </div>
        <div class="stats-section">
          <h3>Report Types</h3>
          ${Object.entries(typeStats).sort(([,a], [,b]) => b - a).map(([type, count]) => 
            `<div class="stats-item"><span>${type}</span><span><strong>${count}</strong> (${((count/reports.length)*100).toFixed(1)}%)</span></div>`
          ).join('')}
        </div>
      </div>
      <div style="overflow-x: auto; margin-top: 20px;">
        <h3>Report Details</h3>
        <table>
          <thead><tr><th>Type</th><th>Location</th><th>Time</th><th>Status</th><th>Reporter</th><th>Description</th></tr></thead>
          <tbody>
            ${reports.map(report => 
              `<tr>
                <td>${report.type || 'N/A'}</td><td>${report.location || 'N/A'}</td>
                <td>${new Date(report.time).toLocaleDateString()}</td>
                <td><span class="badge ${(report.status || 'pending')}-badge">${(report.status || 'pending').toUpperCase()}</span></td>
                <td>${report.isAnonymous ? 'Anonymous' : (report.user?.name || 'Unknown')}</td>
                <td>${(report.description || 'No description').substring(0, 100)}${report.description?.length > 100 ? '...' : ''}</td>
              </tr>`
            ).join('')}
          </tbody>
        </table>
      </div>
      <div class="footer">
        <p>This report was automatically generated by the AirNet AI</p>
        <p>Report contains ${reports.length} report records</p>
      </div>
    </body></html>`;
  }, [reports, searchQuery, activeFilter]);

  const exportToPDF = useCallback(async () => {
    try {
      setExporting(true);
      setExportModalVisible(false);
      
      if (Platform.OS === 'web') {
        const htmlContent = generatePDFHTML();
        const win = window.open('', '_blank');
        win.document.write(htmlContent);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 300);
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required to save the PDF.');
        return;
      }

      const htmlContent = generatePDFHTML();
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false, width: 612, height: 792 });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `reports-summary-${timestamp}.pdf`;
      const downloadDir = `${FileSystem.documentDirectory}Download/`;
      
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      
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

      Alert.alert('Export Successful', `Reports summary saved as "${filename}"`, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Export Failed', 'Error generating PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [generatePDFHTML]);

  const showExportConfirmation = () => setExportModalVisible(true);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const openReportModal = (report) => {
    setSelectedReport(report);
    setResponseText(report.response || '');
    setSelectedStatus(report.status);
    setModalVisible(true);
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setModalVisible(false);
    setSelectedReport(null);
    setResponseText('');
    setSelectedStatus('');
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;
    try {
      setUpdating(true);
      const updateData = { status: selectedStatus, response: responseText };
      const response = await updateReport(selectedReport._id, updateData);
      
      if (response.success) {
        setReports(prevReports =>
          prevReports.map(report =>
            report._id === selectedReport._id
              ? { ...report, status: selectedStatus, response: responseText }
              : report
          )
        );
        Alert.alert('Success', 'Report updated successfully');
        closeModal();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update report');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'verified': return '#007AFF';
      case 'resolved': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Smoke': return 'cloud-outline';
      case 'Dust': return 'leaf-outline';
      case 'Odor': return 'alert-circle-outline';
      case 'Chemical Leak': return 'warning-outline';
      case 'Others': return 'help-circle-outline';
      default: return 'document-outline';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const renderReportItem = ({ item }) => (
    <TouchableOpacity style={s.reportCard} onPress={() => openReportModal(item)} activeOpacity={0.7}>
      <View style={s.reportHeader}>
        <View style={s.reportTypeContainer}>
          <Ionicons name={getTypeIcon(item.type)} size={20} color="#007AFF" style={s.typeIcon} />
          <Text style={s.reportType}>{item.type}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={s.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={s.reportLocation}>
        <Ionicons name="location-outline" size={16} color="#666" /> {item.location}
      </Text>
      
      <Text style={s.reportTime}>
        <Ionicons name="time-outline" size={16} color="#666" /> {formatDate(item.time)}
      </Text>
      
      {item.description && (
        <Text style={s.reportDescription} numberOfLines={2}>{item.description}</Text>
      )}
      
      <View style={s.reportFooter}>
        <Text style={s.reportUser}>
          {item.isAnonymous ? 'Anonymous' : item.user?.name || 'Unknown User'}
        </Text>
        <Text style={s.reportDate}>{formatDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const StatusButton = ({ status, label, selected, onPress }) => (
    <TouchableOpacity
      style={[s.statusButton, selected && { backgroundColor: getStatusColor(status) }]}
      onPress={onPress}
    >
      <Text style={[s.statusButtonText, selected && { color: 'white' }]}>{label}</Text>
    </TouchableOpacity>
  );

  const FilterButton = ({ id, label, active, onPress }) => (
    <TouchableOpacity
      style={[s.filterButton, active && { backgroundColor: '#007AFF' }]}
      onPress={onPress}
    >
      <Text style={[s.filterButtonText, active && { color: 'white' }]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={s.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Reports Management</Text>
            <Text style={s.headerSubtitle}>
              {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
            </Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity 
              style={[s.actionButton, refreshing && s.disabledButton]} 
              onPress={onRefresh} 
              disabled={refreshing}
            >
              {refreshing ? <ActivityIndicator size={16} color="#FFFFFF" /> : <Ionicons name="refresh" size={16} color="#FFFFFF" />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.exportButton, exporting && s.disabledButton]} 
              onPress={showExportConfirmation} 
              disabled={exporting}
            >
              {exporting ? <ActivityIndicator size={16} color="#FFFFFF" /> : <Ionicons name="document-outline" size={16} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={s.searchContainer}>
        <View style={s.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#8E8E93" style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search reports..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity 
          style={s.filterToggleButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name={showFilters ? "filter" : "filter-outline"} size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={s.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScrollContainer}>
            {statusFilters.map(filter => (
              <FilterButton
                key={filter.id}
                id={filter.id}
                label={filter.label}
                active={activeFilter === filter.id}
                onPress={() => setActiveFilter(filter.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredReports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#C7C7CC" />
            <Text style={s.emptyText}>No reports found</Text>
            <Text style={s.emptySubtext}>
              {reports.length === 0 
                ? 'Reports will appear here when submitted' 
                : 'Try adjusting your search or filter criteria'}
            </Text>
          </View>
        }
      />

      {/* Report Details Modal */}
      <Modal animationType="slide" transparent={false} visible={modalVisible} onRequestClose={closeModal} statusBarTranslucent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Report Details</Text>
              <TouchableOpacity onPress={closeModal} style={s.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {selectedReport && (
                <>
                  <View style={s.detailSection}>
                    <Text style={s.detailLabel}>Type</Text>
                    <View style={s.detailRow}>
                      <Ionicons name={getTypeIcon(selectedReport.type)} size={20} color="#007AFF" />
                      <Text style={s.detailValue}>{selectedReport.type}</Text>
                    </View>
                  </View>

                  <View style={s.detailSection}>
                    <Text style={s.detailLabel}>Location</Text>
                    <Text style={s.detailValue}>{selectedReport.location}</Text>
                  </View>

                  <View style={s.detailSection}>
                    <Text style={s.detailLabel}>Time of Incident</Text>
                    <Text style={s.detailValue}>{formatDate(selectedReport.time)}</Text>
                  </View>

                  <View style={s.detailSection}>
                    <Text style={s.detailLabel}>Reporter</Text>
                    <Text style={s.detailValue}>
                      {selectedReport.isAnonymous 
                        ? 'Anonymous' 
                        : selectedReport.user?.name || 'Unknown User'}
                    </Text>
                  </View>

                  {selectedReport.description && (
                    <View style={s.detailSection}>
                      <Text style={s.detailLabel}>Description</Text>
                      <Text style={s.detailValue}>{selectedReport.description}</Text>
                    </View>
                  )}

                  {selectedReport.photo?.url && (
                    <View style={s.detailSection}>
                      <Text style={s.detailLabel}>Photo Evidence</Text>
                      <Image source={{ uri: selectedReport.photo.url }} style={s.reportImage} resizeMode="contain" />
                    </View>
                  )}

                  <View style={s.detailSection}>
                    <Text style={s.detailLabel}>Current Status</Text>
                    <View style={s.statusContainer}>
                      <StatusButton status="pending" label="Pending" selected={selectedStatus === 'pending'} onPress={() => setSelectedStatus('pending')} />
                      <StatusButton status="verified" label="Verified" selected={selectedStatus === 'verified'} onPress={() => setSelectedStatus('verified')} />
                      <StatusButton status="resolved" label="Resolved" selected={selectedStatus === 'resolved'} onPress={() => setSelectedStatus('resolved')} />
                    </View>
                  </View>

                  <View style={s.detailSection}>
                    <Text style={s.detailLabel}>Response</Text>
                    <TextInput
                      style={s.responseInput}
                      multiline
                      placeholder="Enter your response to this report..."
                      value={responseText}
                      onChangeText={setResponseText}
                      textAlignVertical="top"
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity style={s.cancelButton} onPress={closeModal}>
                <Text style={s.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[s.updateButton, updating && s.updateButtonDisabled]}
                onPress={handleUpdateReport}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={s.updateButtonText}>Update Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Export Confirmation Modal */}
      <Modal visible={exportModalVisible} transparent animationType="fade">
        <View style={s.exportModalOverlay}>
          <View style={s.exportModalContent}>
            <View style={s.exportModalHeader}>
              <Text style={s.exportModalTitle}>Export Reports Summary</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={s.exportModalBody}>
              <Ionicons name="document-text-outline" size={48} color="#007AFF" style={s.exportModalIcon} />
              <Text style={s.exportModalText}>
                This will generate a PDF summary containing all report data with the current filters applied.
              </Text>
              <Text style={s.exportModalSubtext}>
                {reports.length} reports will be included in the summary.
              </Text>
            </View>

            <View style={s.exportModalActions}>
              <TouchableOpacity 
                style={[s.exportModalButton, s.exportCancelButton]} 
                onPress={() => setExportModalVisible(false)}
              >
                <Text style={s.exportCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.exportModalButton, s.exportConfirmButton, exporting && s.disabledButton]} 
                onPress={exportToPDF} 
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.exportConfirmButtonText}>Generate PDF</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { backgroundColor: 'white', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: '#8E8E93' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionButton: { backgroundColor: '#3B82F6', padding: 8, borderRadius: 8 },
  exportButton: { backgroundColor: '#10B981', padding: 8, borderRadius: 8 },
  disabledButton: { opacity: 0.5 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#1C1C1E', paddingVertical: 0 },
  filterToggleButton: { padding: 8 },
  filterContainer: { backgroundColor: 'white', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  filterScrollContainer: { paddingHorizontal: 16 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F2F2F7', marginRight: 8 },
  filterButtonText: { fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  listContainer: { padding: 16 },
  reportCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reportTypeContainer: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: { marginRight: 8 },
  reportType: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', color: 'white' },
  reportLocation: { fontSize: 14, color: '#666', marginBottom: 4 },
  reportTime: { fontSize: 14, color: '#666', marginBottom: 8 },
  reportDescription: { fontSize: 14, color: '#1C1C1E', lineHeight: 20, marginBottom: 12 },
  reportFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  reportUser: { fontSize: 14, fontWeight: '500', color: '#007AFF' },
  reportDate: { fontSize: 12, color: '#8E8E93' },
  
  // Loading State
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#8E8E93' },
  
  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#8E8E93', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#C7C7CC', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: '#F2F2F7' },
  modalContent: { flex: 1, backgroundColor: 'white' },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5EA',
    paddingTop: 60 // Account for status bar
  },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1E' },
  closeButton: { padding: 4 },
  modalBody: { flex: 1, padding: 20 },
  
  // Detail Sections
  detailSection: { marginBottom: 24 },
  detailLabel: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailValue: { fontSize: 16, color: '#666', lineHeight: 22, marginLeft: 8 },
  
  // Report Image
  reportImage: { 
    width: '100%', 
    height: 200, 
    borderRadius: 8, 
    backgroundColor: '#F2F2F7',
    marginTop: 8
  },
  
  // Status Selection
  statusContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statusButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  statusButtonText: { fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  
  // Response Input
  responseInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#F9F9F9',
    minHeight: 100,
    maxHeight: 150
  },
  
  // Modal Footer
  modalFooter: { 
    flexDirection: 'row', 
    padding: 20, 
    borderTopWidth: 1, 
    borderTopColor: '#E5E5EA',
    gap: 12
  },
  cancelButton: { 
    flex: 1, 
    backgroundColor: '#F2F2F7', 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  updateButton: { 
    flex: 1, 
    backgroundColor: '#007AFF', 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  updateButtonDisabled: { opacity: 0.5 },
  updateButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  
  // Export Modal Styles
  exportModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20
  },
  exportModalContent: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10
  },
  exportModalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  exportModalTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  exportModalBody: { 
    padding: 20, 
    alignItems: 'center' 
  },
  exportModalIcon: { marginBottom: 16 },
  exportModalText: { 
    fontSize: 16, 
    color: '#475569', 
    textAlign: 'center', 
    lineHeight: 22,
    marginBottom: 8
  },
  exportModalSubtext: { 
    fontSize: 14, 
    color: '#64748B', 
    textAlign: 'center' 
  },
  exportModalActions: { 
    flexDirection: 'row', 
    padding: 20,
    gap: 12
  },
  exportModalButton: { 
    flex: 1, 
    padding: 14, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  exportCancelButton: { 
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  exportCancelButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#475569' 
  },
  exportConfirmButton: { 
    backgroundColor: '#10B981' 
  },
  exportConfirmButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: 'white' 
  }
});

export default ReportsScreen;