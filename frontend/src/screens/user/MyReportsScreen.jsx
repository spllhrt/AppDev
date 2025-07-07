import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  Modal,
  StatusBar,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { getMyReports } from '../../api/report'; // Adjust path as needed

// Custom Alert Component for Web Compatibility
const CustomAlert = ({ visible, title, message, buttons, onClose }) => {
  if (!visible) return null;
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.alertOverlay}>
        <View style={styles.alertContainer}>
          <Text style={styles.alertTitle}>{title}</Text>
          {message && <Text style={styles.alertMessage}>{message}</Text>}
          <View style={styles.alertButtonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.alertButton,
                  button.style === 'destructive' && styles.alertButtonDestructive,
                  button.style === 'cancel' && styles.alertButtonCancel,
                ]}
                onPress={() => {
                  button.onPress && button.onPress();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.alertButtonText,
                    button.style === 'destructive' && styles.alertButtonTextDestructive,
                    button.style === 'cancel' && styles.alertButtonTextCancel,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Empty State Component
const EmptyState = ({ onRefresh }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.3)" />
    <Text style={styles.emptyTitle}>No Reports Yet</Text>
    <Text style={styles.emptySubtitle}>
      You haven't submitted any pollution reports yet. Start by creating your first report!
    </Text>
    <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.8}>
      <Ionicons name="refresh" size={16} color="#FFFFFF" />
      <Text style={styles.refreshButtonText}>Refresh</Text>
    </TouchableOpacity>
  </View>
);

// Report Card Component
const ReportCard = ({ report, onPress }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFC107';
      case 'verified':
        return '#2196F3';
      case 'resolved':
        return '#4CAF50';
      default:
        return '#FFC107';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'verified':
        return 'checkmark-circle-outline';
      case 'resolved':
        return 'checkmark-done-outline';
      default:
        return 'time-outline';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Smoke':
        return 'flame-outline';
      case 'Dust':
        return 'cloud-outline';
      case 'Odor':
        return 'alert-circle-outline';
      case 'Chemical Leak':
        return 'warning-outline';
      case 'Others':
        return 'ellipsis-horizontal-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity style={styles.reportCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTypeContainer}>
          <View style={[styles.typeIconContainer, { backgroundColor: 'rgba(0,230,118,0.2)' }]}>
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
          {report.isAnonymous && (
            <View style={styles.infoRow}>
              <Ionicons name="eye-off-outline" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.infoText}>Anonymous Report</Text>
            </View>
          )}
        </View>

        {report.photo?.url && (
          <Image source={{ uri: report.photo.url }} style={styles.reportImage} />
        )}
      </View>

      {report.description && (
        <Text style={styles.reportDescription} numberOfLines={2}>
          {report.description}
        </Text>
      )}

      {report.response && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Response:</Text>
          <Text style={styles.responseText} numberOfLines={2}>
            {report.response}
          </Text>
        </View>
      )}

      <View style={styles.reportFooter}>
        <Text style={styles.submittedDate}>
          Submitted: {formatDate(report.createdAt)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
      </View>
    </TouchableOpacity>
  );
};

// Main MyReports Screen Component
const MyReportsScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Custom alert state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  // Cross-platform alert function
  const showAlert = (title, message, buttons) => {
    if (Platform.OS === 'web') {
      setAlertConfig({
        visible: true,
        title,
        message,
        buttons,
      });
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const closeAlert = () => {
    setAlertConfig({
      visible: false,
      title: '',
      message: '',
      buttons: [],
    });
  };

  // Helper functions for modal
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFC107';
      case 'verified':
        return '#2196F3';
      case 'resolved':
        return '#4CAF50';
      default:
        return '#FFC107';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'verified':
        return 'checkmark-circle-outline';
      case 'resolved':
        return 'checkmark-done-outline';
      default:
        return 'time-outline';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Smoke':
        return 'flame-outline';
      case 'Dust':
        return 'cloud-outline';
      case 'Odor':
        return 'alert-circle-outline';
      case 'Chemical Leak':
        return 'warning-outline';
      case 'Others':
        return 'ellipsis-horizontal-outline';
      default:
        return 'alert-circle-outline';
    }
  };
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
      console.error('Error fetching reports:', err);
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  }, [fetchReports]);

  // Initial load
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Modal state
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Handle report press
  const handleReportPress = (report) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  // Close modal
  const closeModal = () => {
    setModalVisible(false);
    setSelectedReport(null);
  };

  // Handle error retry
  const handleRetry = () => {
    setLoading(true);
    fetchReports();
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>My Reports</Text>
              <View style={styles.placeholder} />
            </View>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00E676" />
              <Text style={styles.loadingText}>Loading your reports...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>My Reports</Text>
              <View style={styles.placeholder} />
            </View>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color="#E91E63" />
              <Text style={styles.errorTitle}>Error Loading Reports</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Reports</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('SubmitReport')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Stats Summary */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{reports.length}</Text>
              <Text style={styles.statLabel}>Total Reports</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {reports.filter(r => r.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {reports.filter(r => r.status === 'resolved').length}
              </Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#00E676']}
                tintColor="#00E676"
              />
            }
          >
            {reports.length === 0 ? (
              <EmptyState onRefresh={onRefresh} />
            ) : (
              <View style={styles.reportsContainer}>
                <Text style={styles.sectionTitle}>
                  Your Reports ({reports.length})
                </Text>
                {reports.map((report) => (
                  <ReportCard
                    key={report._id}
                    report={report}
                    onPress={() => handleReportPress(report)}
                  />
                ))}
              </View>
            )}
          </ScrollView>

          {/* Report Details Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={closeModal}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <LinearGradient
                  colors={['#1A1A2E', '#16213E', '#0A0A0A']}
                  style={styles.modalGradient}
                >
                  {selectedReport && (
                    <>
                      {/* Modal Header */}
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Report Details</Text>
                        <TouchableOpacity
                          style={styles.closeButton}
                          onPress={closeModal}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>

                      {/* Modal Content */}
                      <ScrollView
                        style={styles.modalContent}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.modalScrollContent}
                      >
                        {/* Status Section */}
                        <View style={styles.modalSection}>
                          <View style={styles.statusRow}>
                            <View style={styles.statusContainer}>
                              <View style={[
                                styles.statusIndicator,
                                { backgroundColor: getStatusColor(selectedReport.status) }
                              ]}>
                                <Ionicons
                                  name={getStatusIcon(selectedReport.status)}
                                  size={16}
                                  color="#FFFFFF"
                                />
                              </View>
                              <Text style={styles.statusLabel}>
                                {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                              </Text>
                            </View>
                            <Text style={styles.reportId}>
                              ID: {selectedReport._id.slice(-8)}
                            </Text>
                          </View>
                        </View>

                        {/* Type and Location */}
                        <View style={styles.modalSection}>
                          <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                              <Ionicons name={getTypeIcon(selectedReport.type)} size={18} color="#00E676" />
                              <Text style={styles.detailLabel}>Type</Text>
                              <Text style={styles.detailValue}>{selectedReport.type}</Text>
                            </View>
                            <View style={styles.detailItem}>
                              <Ionicons name="location" size={18} color="#00E676" />
                              <Text style={styles.detailLabel}>Location</Text>
                              <Text style={styles.detailValue}>{selectedReport.location}</Text>
                            </View>
                          </View>
                        </View>

                        {/* Date and Time */}
                        <View style={styles.modalSection}>
                          <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                              <Ionicons name="time" size={18} color="#00E676" />
                              <Text style={styles.detailLabel}>Incident Time</Text>
                              <Text style={styles.detailValue}>
                                {new Date(selectedReport.time).toLocaleString()}
                              </Text>
                            </View>
                            <View style={styles.detailItem}>
                              <Ionicons name="calendar" size={18} color="#00E676" />
                              <Text style={styles.detailLabel}>Submitted</Text>
                              <Text style={styles.detailValue}>
                                {new Date(selectedReport.createdAt).toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Photo Section */}
                        {selectedReport.photo?.url && (
                          <View style={styles.modalSection}>
                            <Text style={styles.sectionTitle}>Photo Evidence</Text>
                            <TouchableOpacity
                              style={styles.photoContainer}
                              onPress={() => {
                                // You can add image viewer here
                                showAlert('Photo', 'Full image viewer coming soon!', [{ text: 'OK' }]);
                              }}
                              activeOpacity={0.8}
                            >
                              <Image
                                source={{ uri: selectedReport.photo.url }}
                                style={styles.modalPhoto}
                                resizeMode="cover"
                              />
                              <View style={styles.photoOverlay}>
                                <Ionicons name="expand-outline" size={20} color="#FFFFFF" />
                              </View>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Description */}
                        {selectedReport.description && (
                          <View style={styles.modalSection}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <View style={styles.descriptionContainer}>
                              <Text style={styles.descriptionText}>
                                {selectedReport.description}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Response Section */}
                        {selectedReport.response && (
                          <View style={styles.modalSection}>
                            <Text style={styles.sectionTitle}>Official Response</Text>
                            <View style={styles.responseBox}>
                              <View style={styles.responseHeader}>
                                <Ionicons name="shield-checkmark" size={16} color="#00E676" />
                                <Text style={styles.responseTitle}>Administrator Response</Text>
                              </View>
                              <Text style={styles.responseContent}>
                                {selectedReport.response}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Anonymous Badge */}
                        {selectedReport.isAnonymous && (
                          <View style={styles.modalSection}>
                            <View style={styles.anonymousBadge}>
                              <Ionicons name="eye-off" size={16} color="#FFC107" />
                              <Text style={styles.anonymousText}>
                                This report was submitted anonymously
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.modalActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                              closeModal();
                              // Navigate to edit or share functionality
                              showAlert('Share Report', 'Share functionality coming soon!', [{ text: 'OK' }]);
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Share</Text>
                          </TouchableOpacity>
                          
                          {selectedReport.status === 'pending' && (
                            <TouchableOpacity
                              style={[styles.actionButton, styles.editButton]}
                              onPress={() => {
                                closeModal();
                                showAlert('Edit Report', 'Edit functionality coming soon!', [{ text: 'OK' }]);
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>Edit</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </ScrollView>
                    </>
                  )}
                </LinearGradient>
              </View>
            </View>
          </Modal>

          {/* Custom Alert for Web */}
          <CustomAlert
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={alertConfig.buttons}
            onClose={closeAlert}
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 36,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00E676',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E676',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  reportsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  reportCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  reportType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  reportContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 6,
    flex: 1,
  },
  reportImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 12,
  },
  reportDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: 12,
  },
  responseContainer: {
    backgroundColor: 'rgba(0,230,118,0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  responseLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00E676',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  submittedDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    maxHeight: '90%',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalSection: {
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reportId: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'monospace',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  detailLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 6,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  photoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  modalPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  photoOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 6,
  },
  descriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  descriptionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  responseBox: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  responseTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00E676',
    marginLeft: 6,
  },
  responseContent: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  anonymousBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  anonymousText: {
    fontSize: 12,
    color: '#FFC107',
    marginLeft: 8,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  editButton: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    minWidth: 280,
    maxWidth: 400,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    borderWidth: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
  alertButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#00E676',
    alignItems: 'center',
  },
  alertButtonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  alertButtonDestructive: {
    backgroundColor: '#E91E63',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  alertButtonTextCancel: {
    color: '#FFFFFF',
  },
  alertButtonTextDestructive: {
    color: '#FFFFFF',
  },
});

export default MyReportsScreen;