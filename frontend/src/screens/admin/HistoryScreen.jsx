import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  Modal,
  SafeAreaView,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getAllAssessments, deleteAssessment } from '../../api/historyApi';
import moment from 'moment';

const HistoryScreen = () => {
  const [assessments, setAssessments] = useState([]);
  const [filteredAssessments, setFilteredAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    city: '',
    riskLevel: '',
    dateFrom: '',
    dateTo: '',
    ageGroup: ''
  });
  const { user } = useSelector((state) => state.auth);
  const navigation = useNavigation();

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllAssessments();
      setAssessments(response.assessments || []);
      setFilteredAssessments(response.assessments || []);
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
      setError(err.message || 'Failed to load assessment history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, assessments]);

  const applyFilters = () => {
    let filtered = assessments;

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(assessment => 
        assessment.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.city.trim() !== '') {
      filtered = filtered.filter(assessment => 
        assessment.user?.city?.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    if (filters.riskLevel !== '') {
      filtered = filtered.filter(assessment => 
        assessment.riskLevel === filters.riskLevel
      );
    }

    if (filters.dateFrom !== '') {
      filtered = filtered.filter(assessment => 
        moment(assessment.assessedAt).isSameOrAfter(moment(filters.dateFrom))
      );
    }

    if (filters.dateTo !== '') {
      filtered = filtered.filter(assessment => 
        moment(assessment.assessedAt).isSameOrBefore(moment(filters.dateTo))
      );
    }

    if (filters.ageGroup !== '') {
      filtered = filtered.filter(assessment => {
        const age = assessment.user?.age;
        if (!age) return false;
        
        switch (filters.ageGroup) {
          case '18-25':
            return age >= 18 && age <= 25;
          case '26-35':
            return age >= 26 && age <= 35;
          case '36-45':
            return age >= 36 && age <= 45;
          case '46-55':
            return age >= 46 && age <= 55;
          case '56+':
            return age >= 56;
          default:
            return true;
        }
      });
    }

    setFilteredAssessments(filtered);
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      riskLevel: '',
      dateFrom: '',
      dateTo: '',
      ageGroup: ''
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAssessments();
  };

  const handleDelete = async (assessmentId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this assessment?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setAssessments(prev => 
                prev.map(assessment => 
                  assessment._id === assessmentId 
                    ? { ...assessment, isDeleting: true } 
                    : assessment
                )
              );
              setFilteredAssessments(prev => 
                prev.map(assessment => 
                  assessment._id === assessmentId 
                    ? { ...assessment, isDeleting: true } 
                    : assessment
                )
              );
              
              const response = await deleteAssessment(assessmentId);
              
              if (response.success) {
                setAssessments(prev => 
                  prev.filter(assessment => assessment._id !== assessmentId)
                );
                setFilteredAssessments(prev => 
                  prev.filter(assessment => assessment._id !== assessmentId)
                );
                Alert.alert('Success', 'Assessment deleted successfully');
              } else {
                throw new Error(response.message || 'Delete failed');
              }
            } catch (error) {
              console.error('Delete failed:', error);
              setAssessments(prev => 
                prev.map(assessment => 
                  assessment._id === assessmentId 
                    ? { ...assessment, isDeleting: false } 
                    : assessment
                )
              );
              setFilteredAssessments(prev => 
                prev.map(assessment => 
                  assessment._id === assessmentId 
                    ? { ...assessment, isDeleting: false } 
                    : assessment
                )
              );
              Alert.alert(
                'Error', 
                error.message || 'Failed to delete assessment. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = (assessment) => {
    setSelectedAssessment(assessment);
    setModalVisible(true);
  };

  const renderAssessmentItem = ({ item }) => (
    <View style={styles.assessmentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.user?.name || 'Unknown User'}</Text>
          <Text style={styles.userEmail}>{item.user?.email || 'No email'}</Text>
        </View>
        {user.role === 'admin' && (
          <TouchableOpacity 
            onPress={() => handleDelete(item._id)}
            style={styles.deleteButton}
            disabled={item.isDeleting}
          >
            {item.isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            )}
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color="#3b82f6" />
          <Text style={styles.detailText}>
            {moment(item.assessedAt).format('MMM D, YYYY h:mm A')}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={16} color="#3b82f6" />
          <Text style={styles.detailText}>
            {item.user?.city || 'Unknown location'}
          </Text>
        </View>
      </View>
      
      <View style={styles.riskContainer}>
        <Text style={styles.riskLabel}>Risk Level:</Text>
        <View style={[
          styles.riskBadge,
            item.riskLevel === 'high' && styles.highRisk,
            item.riskLevel === 'very_high' && styles.veryHighRisk,
            item.riskLevel === 'moderate' && styles.moderateRisk,
            item.riskLevel === 'low' && styles.lowRisk,
          ]}>
          <Text style={styles.riskText}>{item.riskLevel}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.viewDetailsButton}
        onPress={() => handleViewDetails(item)}
      >
        <Text style={styles.viewDetailsButtonText}>View Details</Text>
        <Ionicons name="chevron-forward-outline" size={18} color="#3b82f6" />
      </TouchableOpacity>
    </View>
  );

  const renderDetailItem = (label, value, iconName) => (
    <View style={styles.detailRow}>
      <View style={styles.detailIconContainer}>
        <Ionicons name={iconName} size={20} color="#3b82f6" />
      </View>
      <View style={styles.detailTextContainer}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || 'N/A'}</Text>
      </View>
    </View>
  );

  const renderQuestionAnswer = (question, answer) => (
    <View style={styles.qaContainer}>
      <Text style={styles.questionText}>{question}</Text>
      <Text style={styles.answerText}>{answer}</Text>
    </View>
  );

  const renderFilterOption = (label, value, options, onSelect) => (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
        <TouchableOpacity
          style={[styles.filterOption, value === '' && styles.filterOptionActive]}
          onPress={() => onSelect('')}
        >
          <Text style={[styles.filterOptionText, value === '' && styles.filterOptionTextActive]}>All</Text>
        </TouchableOpacity>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.filterOption, value === option.value && styles.filterOptionActive]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.filterOptionText, value === option.value && styles.filterOptionTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={50} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchAssessments}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const riskLevelOptions = [
    { value: 'low', label: 'Low' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'high', label: 'High' },
    { value: 'very_high', label: 'Very High' }
  ];

  const ageGroupOptions = [
    { value: '18-25', label: '18-25' },
    { value: '26-35', label: '26-35' },
    { value: '36-45', label: '36-45' },
    { value: '46-55', label: '46-55' },
    { value: '56+', label: '56+' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter-outline" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView style={styles.filtersScroll}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>City</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Enter city name..."
                placeholderTextColor="#9ca3af"
                value={filters.city}
                onChangeText={(value) => setFilters(prev => ({ ...prev, city: value }))}
              />
            </View>

            {renderFilterOption(
              'Risk Level',
              filters.riskLevel,
              riskLevelOptions,
              (value) => setFilters(prev => ({ ...prev, riskLevel: value }))
            )}

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateInputs}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateInputLabel}>From</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9ca3af"
                    value={filters.dateFrom}
                    onChangeText={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
                  />
                </View>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateInputLabel}>To</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9ca3af"
                    value={filters.dateTo}
                    onChangeText={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
                  />
                </View>
              </View>
            </View>

            {renderFilterOption(
              'Age Group',
              filters.ageGroup,
              ageGroupOptions,
              (value) => setFilters(prev => ({ ...prev, ageGroup: value }))
            )}

            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
            
            <View style={styles.bottomSpace} />
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredAssessments}
        renderItem={renderAssessmentItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {searchQuery.trim() || Object.values(filters).some(f => f.trim() !== '') 
                ? 'No matching assessments found' 
                : 'No assessment history found'}
            </Text>
            {(searchQuery.trim() || Object.values(filters).some(f => f.trim() !== '')) && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearchQuery('');
                  clearFilters();
                }}
              >
                <Text style={styles.clearSearchButtonText}>Clear search and filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {selectedAssessment && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="arrow-back-outline" size={24} color="#3b82f6" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Assessment Details</Text>
                <View style={styles.closeButton} />
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.userSection}>
                  <Text style={styles.sectionTitle}>User Information</Text>
                  {renderDetailItem('Name', selectedAssessment.user?.name, 'person-outline')}
                  {renderDetailItem('Email', selectedAssessment.user?.email, 'mail-outline')}
                  {renderDetailItem('Location', selectedAssessment.user?.city, 'location-outline')}
                  {renderDetailItem('Age', selectedAssessment.user?.age, 'calendar-outline')}
                </View>

                <View style={styles.assessmentSection}>
                  <Text style={styles.sectionTitle}>Assessment Details</Text>
                  {renderDetailItem(
                    'Date Assessed', 
                    moment(selectedAssessment.assessedAt).format('MMM D, YYYY h:mm A'), 
                    'time-outline'
                  )}
                  {renderDetailItem('Risk Level', selectedAssessment.riskLevel, 'alert-circle-outline')}
                  {renderDetailItem('Score', selectedAssessment.riskScore, 'speedometer-outline')}
                </View>
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  filterToggle: {
    padding: 5,
    marginLeft: 10,
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersScroll: {
    maxHeight: 180,
    padding: 10,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  filterOptions: {
    flexDirection: 'row',
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  filterOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterOptionText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#ffffff',
  },
  dateInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInputContainer: {
    flex: 0.48,
  },
  dateInputLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  clearFiltersButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginVertical: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#9ca3af',
    marginTop: 15,
    textAlign: 'center',
  },
  clearSearchButton: {
    marginTop: 15,
    padding: 10,
  },
  clearSearchButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  assessmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  deleteButton: {
    padding: 5,
    marginLeft: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 5,
  },
  riskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  riskLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 10,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  highRisk: {
    backgroundColor: '#ef4444',
  },
  veryHighRisk: {
    backgroundColor: '#dc2626',
  },
  moderateRisk: {
    backgroundColor: '#f59e0b',
  },
  lowRisk: {
    backgroundColor: '#10b981',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  viewDetailsButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    marginTop: 2,
  },
  userSection: {
    marginBottom: 20,
  },
  assessmentSection: {
    marginBottom: 20,
  },
  questionsSection: {
    marginBottom: 20,
  },
  notesSection: {
    marginBottom: 20,
  },
  qaItem: {
    marginBottom: 10,
  },

  bottomSpace: { height: 20 }
});

export default HistoryScreen;