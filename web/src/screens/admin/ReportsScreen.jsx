import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllReports, updateReport } from '../../api/report';

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

  const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'verified', label: 'Verified' },
    { id: 'resolved', label: 'Resolved' },
  ];

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterAndSearchReports();
  }, [reports, searchQuery, activeFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await getAllReports();
      if (response.success) {
        setReports(response.reports);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSearchReports = () => {
    let result = [...reports];
    
    if (activeFilter !== 'all') {
      result = result.filter(report => report.status === activeFilter);
    }
    
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
      const updateData = {
        status: selectedStatus,
        response: responseText,
      };

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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderReportItem = ({ item }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => openReportModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportTypeContainer}>
          <Ionicons
            name={getTypeIcon(item.type)}
            size={20}
            color="#007AFF"
            style={styles.typeIcon}
          />
          <Text style={styles.reportType}>{item.type}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.reportLocation}>
        <Ionicons name="location-outline" size={16} color="#666" />
        {' '}{item.location}
      </Text>
      
      <Text style={styles.reportTime}>
        <Ionicons name="time-outline" size={16} color="#666" />
        {' '}{formatDate(item.time)}
      </Text>
      
      {item.description && (
        <Text style={styles.reportDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.reportFooter}>
        <Text style={styles.reportUser}>
          {item.isAnonymous ? 'Anonymous' : item.user?.name || 'Unknown User'}
        </Text>
        <Text style={styles.reportDate}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const StatusButton = ({ status, label, selected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.statusButton,
        selected && { backgroundColor: getStatusColor(status) },
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.statusButtonText,
        selected && { color: 'white' },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const FilterButton = ({ id, label, active, onPress }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        active && { backgroundColor: '#007AFF' },
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterButtonText,
        active && { color: 'white' },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports Management</Text>
        <Text style={styles.headerSubtitle}>
          {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
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
          style={styles.filterToggleButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons 
            name={showFilters ? "filter" : "filter-outline"} 
            size={22} 
            color="#007AFF" 
          />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContainer}
          >
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
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No reports found</Text>
            <Text style={styles.emptySubtext}>
              {reports.length === 0 
                ? 'Reports will appear here when submitted' 
                : 'Try adjusting your search or filter criteria'}
            </Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={closeModal}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Details</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {selectedReport && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <View style={styles.detailRow}>
                      <Ionicons
                        name={getTypeIcon(selectedReport.type)}
                        size={20}
                        color="#007AFF"
                      />
                      <Text style={styles.detailValue}>{selectedReport.type}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{selectedReport.location}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Time of Incident</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedReport.time)}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Reporter</Text>
                    <Text style={styles.detailValue}>
                      {selectedReport.isAnonymous 
                        ? 'Anonymous' 
                        : selectedReport.user?.name || 'Unknown User'}
                    </Text>
                  </View>

                  {selectedReport.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={styles.detailValue}>{selectedReport.description}</Text>
                    </View>
                  )}

                  {selectedReport.photo?.url && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Photo Evidence</Text>
                      <Image 
                        source={{ uri: selectedReport.photo.url }} 
                        style={styles.reportImage} 
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Current Status</Text>
                    <View style={styles.statusContainer}>
                      <StatusButton
                        status="pending"
                        label="Pending"
                        selected={selectedStatus === 'pending'}
                        onPress={() => setSelectedStatus('pending')}
                      />
                      <StatusButton
                        status="verified"
                        label="Verified"
                        selected={selectedStatus === 'verified'}
                        onPress={() => setSelectedStatus('verified')}
                      />
                      <StatusButton
                        status="resolved"
                        label="Resolved"
                        selected={selectedStatus === 'resolved'}
                        onPress={() => setSelectedStatus('resolved')}
                      />
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Response</Text>
                    <TextInput
                      style={styles.responseInput}
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

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.updateButton, updating && styles.updateButtonDisabled]}
                onPress={handleUpdateReport}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.updateButtonText}>Update Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 0,
  },
  filterToggleButton: {
    padding: 8,
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterScrollContainer: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  listContainer: {
    padding: 16,
  },
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  typeIcon: {
    marginRight: 8,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  reportLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reportTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 12,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  reportUser: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  reportDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'white',
    paddingBottom: 10
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
    paddingBottom: 20
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 22,
    marginLeft: 8,
  },
  reportImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  responseInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#F9F9F9',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  updateButton: {
    flex: 1,
    paddingVertical: 16,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ReportsScreen;