import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
  Modal, StatusBar, Image, RefreshControl, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { getMyReports } from '../../api/report';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return '#FFC107';
    case 'verified': return '#2196F3';
    case 'resolved': return '#4CAF50';
    default: return '#FFC107';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending': return 'time-outline';
    case 'verified': return 'checkmark-circle-outline';
    case 'resolved': return 'checkmark-done-outline';
    default: return 'time-outline';
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'Smoke': return 'flame-outline';
    case 'Dust': return 'cloud-outline';
    case 'Odor': return 'nose-outline';
    case 'Chemical Leak': return 'warning-outline';
    case 'Others': return 'ellipsis-horizontal-outline';
    default: return 'alert-circle-outline';
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const MyReportsScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setError(null);
      const response = await getMyReports();
      if (response.success) {
        setReports(response.reports || []);
      } else {
        setError(response.message || 'Failed to fetch reports');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  }, [fetchReports]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleReportPress = (report) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedReport(null);
    setModalVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>My Reports</Text>
              <View style={styles.placeholder} />
            </View>
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#00E676" />
              <Text style={styles.loadingText}>Loading your reports...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>My Reports</Text>
              <View style={styles.placeholder} />
            </View>
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle-outline" size={64} color="#E91E63" />
              <Text style={styles.errorTitle}>Error Loading Reports</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchReports(); }}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Reports</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('SubmitReport')}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{reports.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{reports.filter(r => r.status === 'pending').length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{reports.filter(r => r.status === 'resolved').length}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00E676']} tintColor="#00E676" />}
          >
            {reports.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyTitle}>No Reports Yet</Text>
                <Text style={styles.emptySubtitle}>You haven't submitted any pollution reports yet.</Text>
              </View>
            ) : (
              <View style={styles.reportsContainer}>
                {reports.map((report) => (
                  <TouchableOpacity key={report._id} style={styles.reportCard} onPress={() => handleReportPress(report)}>
                    <View style={styles.reportHeader}>
                      <View style={styles.reportTypeContainer}>
                        <View style={styles.typeIconContainer}>
                          <Ionicons name={getTypeIcon(report.type)} size={16} color="#00E676" />
                        </View>
                        <Text style={styles.reportType}>{report.type}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '20' }]}>
                        <Ionicons name={getStatusIcon(report.status)} size={12} color={getStatusColor(report.status)} />
                        <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reportContent}>
                      <View style={styles.reportInfo}>
                        <View style={styles.infoRow}>
                          <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.6)" />
                          <Text style={styles.infoText} numberOfLines={1}>{report.location}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
                          <Text style={styles.infoText}>{formatDate(report.time)}</Text>
                        </View>
                      </View>
                      {report.photo?.url && <Image source={{ uri: report.photo.url }} style={styles.reportImage} />}
                    </View>
                    {report.description && (
                      <Text style={styles.reportDescription} numberOfLines={2}>{report.description}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Details</Text>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {selectedReport && (
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.modalSection}>
                  <View style={styles.modalTypeContainer}>
                    <View style={styles.modalTypeIcon}>
                      <Ionicons name={getTypeIcon(selectedReport.type)} size={20} color="#00E676" />
                    </View>
                    <Text style={styles.modalTypeText}>{selectedReport.type}</Text>
                  </View>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedReport.status) + '20' }]}>
                    <Ionicons name={getStatusIcon(selectedReport.status)} size={16} color={getStatusColor(selectedReport.status)} />
                    <Text style={[styles.modalStatusText, { color: getStatusColor(selectedReport.status) }]}>
                      {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {selectedReport.photo?.url && (
                  <View style={styles.modalImageContainer}>
                    <Image source={{ uri: selectedReport.photo.url }} style={styles.modalImage} />
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={18} color="rgba(255,255,255,0.6)" style={styles.detailIcon} />
                  <View>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{selectedReport.location}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.6)" style={styles.detailIcon} />
                  <View>
                    <Text style={styles.detailLabel}>Incident Time</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedReport.time)}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={18} color="rgba(255,255,255,0.6)" style={styles.detailIcon} />
                  <View>
                    <Text style={styles.detailLabel}>Submitted</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedReport.createdAt)}</Text>
                  </View>
                </View>

                {selectedReport.description && (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={18} color="rgba(255,255,255,0.6)" style={styles.detailIcon} />
                    <View>
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={styles.detailValue}>{selectedReport.description}</Text>
                    </View>
                  </View>
                )}

                {selectedReport.response && (
                  <View style={styles.responseContainer}>
                    <View style={styles.responseHeader}>
                      <Ionicons name="shield-checkmark-outline" size={18} color="#00E676" style={styles.detailIcon} />
                      <Text style={styles.responseTitle}>Admin Response</Text>
                    </View>
                    <View style={styles.responseBubble}>
                      <Text style={styles.responseText}>{selectedReport.response}</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20, 
    paddingBottom: 20 
  },
  backButton: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  addButton: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#00E676', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  placeholder: { width: 36 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 12 },
  statCard: { 
    flex: 1, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center' 
  },
  statNumber: { fontSize: 20, fontWeight: '900', color: '#00E676', marginBottom: 4 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  content: { flex: 1, paddingHorizontal: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  errorMessage: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: '#00E676', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  reportsContainer: { flex: 1 },
  reportCard: { 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16 
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reportTypeContainer: { flexDirection: 'row', alignItems: 'center' },
  typeIconContainer: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: 'rgba(0,230,118,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 8 
  },
  reportType: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', marginLeft: 4 },
  reportContent: { flexDirection: 'row', marginBottom: 12 },
  reportInfo: { flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginLeft: 6, flex: 1 },
  reportImage: { width: 60, height: 60, borderRadius: 8, marginLeft: 12 },
  reportDescription: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'flex-end' },
  modalContainer: { 
    backgroundColor: '#1A1A2E', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    maxHeight: '90%',
    paddingBottom: 20
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255, 255, 255, 0.1)' 
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  closeButton: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { paddingHorizontal: 20 },
  modalSection: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  modalTypeContainer: { flexDirection: 'row', alignItems: 'center' },
  modalTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,230,118,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  modalTypeText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  modalStatusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12 
  },
  modalStatusText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  modalImageContainer: { marginBottom: 20, borderRadius: 12, overflow: 'hidden' },
  modalImage: { width: '100%', height: 200 },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start'
  },
  detailIcon: {
    marginRight: 15,
    marginTop: 2
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    lineHeight: 20
  },
  responseContainer: {
    backgroundColor: 'rgba(0,230,118,0.08)',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#00E676'
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00E676',
    marginLeft: 8
  },
  responseBubble: {
    backgroundColor: 'rgba(0,230,118,0.15)',
    borderRadius: 8,
    padding: 12
  },
  responseText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20
  }
});

export default MyReportsScreen;