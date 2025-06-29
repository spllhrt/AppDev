import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, RefreshControl, Platform, StatusBar, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getUserAssessments, getAssessmentById } from '../../api/historyApi';

const AssessmentHistoryScreen = ({ navigation }) => {
  const [assessments, setAssessments] = useState([]);
  const [filteredAssessments, setFilteredAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const riskColors = {
    low: '#00E676',
    moderate: '#FFB74D', 
    high: '#FF7043',
    very_high: '#F44336'
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  useEffect(() => {
    filterAssessments();
  }, [assessments, searchQuery, selectedFilter, startDate, endDate]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const data = await getUserAssessments();
      const assessmentsArray = Array.isArray(data) ? data : 
                              Array.isArray(data?.assessments) ? data.assessments :
                              Array.isArray(data?.data) ? data.data : [];
      setAssessments(assessmentsArray);
    } catch (error) {
      console.error('Error loading assessments:', error);
      Alert.alert('Error', error.message || 'Failed to load assessment history');
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAssessments = () => {
    let filtered = assessments;
    
    // Risk level filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(a => a.riskLevel === selectedFilter);
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.riskLevel?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(a => new Date(a.assessedAt) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      filtered = filtered.filter(a => new Date(a.assessedAt) <= end);
    }
    
    setFilteredAssessments(filtered);
  };

  const loadAssessmentDetails = async (assessmentId) => {
    try {
      console.log('Loading details for assessment:', assessmentId);
      const detailedAssessment = await getAssessmentById(assessmentId);
      console.log('Detailed assessment data:', detailedAssessment);
      
      // Fix: Handle the nested assessment structure
      const assessment = detailedAssessment?.assessment || detailedAssessment?.data || detailedAssessment;
      setSelectedAssessment(assessment);
      setShowDetails(true);
    } catch (error) {
      console.error('Error loading assessment details:', error);
      Alert.alert('Error', error.message || 'Failed to load assessment details');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssessments();
    setRefreshing(false);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const renderFilterButtons = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
      {[
        { key: 'all', label: 'All' },
        { key: 'low', label: 'Low Risk' },
        { key: 'moderate', label: 'Moderate' },
        { key: 'high', label: 'High Risk' },
        { key: 'very_high', label: 'Very High' }
      ].map(filter => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            selectedFilter === filter.key && styles.filterButtonActive
          ]}
          onPress={() => setSelectedFilter(filter.key)}
        >
          <Text style={[
            styles.filterText,
            selectedFilter === filter.key && styles.filterTextActive
          ]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderAssessmentCard = (assessment) => (
    <TouchableOpacity
      key={assessment._id}
      style={styles.card}
      onPress={() => loadAssessmentDetails(assessment._id)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="analytics" size={20} color="#00E676" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.cardTitle}>Risk Score: {assessment.riskScore || 0}/100</Text>
            <Text style={styles.cardSubtitle}>{formatDate(assessment.assessedAt)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
      </View>

      <View style={[styles.riskBadge, { backgroundColor: `${riskColors[assessment.riskLevel] || riskColors.low}20` }]}>
        <Text style={[styles.riskText, { color: riskColors[assessment.riskLevel] || riskColors.low }]}>
          {assessment.riskLevel?.toUpperCase().replace('_', ' ') || 'LOW'}
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>AQI</Text>
          <Text style={styles.metricValue}>{assessment.aqi || 'N/A'}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>PM2.5</Text>
          <Text style={styles.metricValue}>{assessment.pm25 || 'N/A'}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>PM10</Text>
          <Text style={styles.metricValue}>{assessment.pm10 || 'N/A'}</Text>
        </View>
      </View>

      {assessment.location && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.locationText}>{assessment.location}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDetailsModal = () => (
    <Modal visible={showDetails} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.detailsModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assessment Details</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
            {/* Risk Assessment Section */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Risk Assessment</Text>
              <View style={[styles.riskCard, { 
                backgroundColor: `${riskColors[selectedAssessment?.riskLevel] || riskColors.low}10`, 
                borderColor: riskColors[selectedAssessment?.riskLevel] || riskColors.low 
              }]}>
                <Text style={[styles.riskScore, { color: riskColors[selectedAssessment?.riskLevel] || riskColors.low }]}>
                  {selectedAssessment?.riskScore || 0}
                </Text>
                <Text style={styles.riskLevel}>
                  {selectedAssessment?.riskLevel?.toUpperCase().replace('_', ' ') || 'LOW'}
                </Text>
                <Text style={styles.generatedBy}>
                  Generated by: {selectedAssessment?.generatedBy || 'Gemini AI'}
                </Text>
              </View>
            </View>

            {/* Environmental Data Section */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Environmental Data</Text>
              <View style={styles.environmentalGrid}>
                <View style={styles.envItem}>
                  <Text style={styles.envLabel}>AQI</Text>
                  <Text style={styles.envValue}>{selectedAssessment?.aqi || 'N/A'}</Text>
                </View>
                <View style={styles.envItem}>
                  <Text style={styles.envLabel}>PM2.5</Text>
                  <Text style={styles.envValue}>{selectedAssessment?.pm25 || 'N/A'}</Text>
                </View>
                <View style={styles.envItem}>
                  <Text style={styles.envLabel}>PM10</Text>
                  <Text style={styles.envValue}>{selectedAssessment?.pm10 || 'N/A'}</Text>
                </View>
                <View style={styles.envItem}>
                  <Text style={styles.envLabel}>Location</Text>
                  <Text style={styles.envValue}>{selectedAssessment?.location || 'N/A'}</Text>
                </View>
              </View>
            </View>

            {/* Risk Breakdown Section */}
            {selectedAssessment?.breakdown && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Risk Breakdown</Text>
                {Object.entries(selectedAssessment.breakdown).map(([key, value]) => (
                  <View key={key} style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                    <Text style={styles.breakdownValue}>{value || 0}%</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations Section */}
            {selectedAssessment?.recommendations?.length > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
                {selectedAssessment.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* AI Insights Section */}
            {selectedAssessment?.aiInsights?.length > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>AI Insights</Text>
                {selectedAssessment.aiInsights.map((insight, index) => (
                  <View key={index} style={styles.insightItem}>
                    <Ionicons name="bulb-outline" size={16} color="#00E676" />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#0A0A0A']} style={styles.gradient}>
        <View style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Assessment History</Text>
              <Text style={styles.headerSubtitle}>
                {filteredAssessments.length} of {assessments.length} assessments
              </Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color="#00E676" />
            </TouchableOpacity>
          </View>

          {/* Search and Filter Combined */}
          <View style={styles.searchFilterContainer}>
            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="rgba(255,255,255,0.5)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                ) : null}
              </View>
              
              <TouchableOpacity 
                style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Ionicons 
                  name={showFilters ? "filter" : "filter-outline"} 
                  size={18} 
                  color={showFilters ? "#00E676" : "rgba(255,255,255,0.7)"} 
                />
              </TouchableOpacity>
            </View>
            
            {showFilters && (
              <View style={styles.filtersContent}>
                {/* Risk Level Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'low', label: 'Low' },
                    { key: 'moderate', label: 'Mod' },
                    { key: 'high', label: 'High' },
                    { key: 'very_high', label: 'V.High' }
                  ].map(filter => (
                    <TouchableOpacity
                      key={filter.key}
                      style={[
                        styles.filterButton,
                        selectedFilter === filter.key && styles.filterButtonActive
                      ]}
                      onPress={() => setSelectedFilter(filter.key)}
                    >
                      <Text style={[
                        styles.filterText,
                        selectedFilter === filter.key && styles.filterTextActive
                      ]}>
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Date Range Filters */}
                <View style={styles.dateFilterRow}>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>From</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={startDate}
                      onChangeText={setStartDate}
                    />
                  </View>
                  
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>To</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={endDate}
                      onChangeText={setEndDate}
                    />
                  </View>
                  
                  <TouchableOpacity style={styles.clearButton} onPress={clearAllFilters}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E676" />}
          >
            {loading ? (
              <View style={styles.centeredContainer}>
                <Text style={styles.centeredText}>Loading assessments...</Text>
              </View>
            ) : filteredAssessments.length === 0 ? (
              <View style={styles.centeredContainer}>
                <Ionicons name="document-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyTitle}>
                  {assessments.length === 0 ? 'No Assessments Yet' : 'No Results Found'}
                </Text>
                <Text style={styles.emptyText}>
                  {assessments.length === 0 
                    ? 'Your assessment history will appear here once you complete your first health risk assessment.'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </Text>
              </View>
            ) : (
              filteredAssessments.map(renderAssessmentCard)
            )}
          </ScrollView>
        </View>
      </LinearGradient>
      {renderDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20, 
    paddingBottom: 20 
  },
  backButton: { 
    width: 36, height: 36, borderRadius: 18, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    justifyContent: 'center', alignItems: 'center', 
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 
  },
  refreshButton: { 
    width: 36, height: 36, borderRadius: 18, 
    backgroundColor: 'rgba(0,230,118,0.2)', 
    justifyContent: 'center', alignItems: 'center', 
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  
  // Compact Search and Filter Styles
  searchFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 12,
    borderColor: 'rgba(0,230,118,0.2)',
    borderWidth: 1
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#FFFFFF'
  },
  filterToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1
  },
  filterToggleActive: {
    backgroundColor: 'rgba(0,230,118,0.2)',
    borderColor: '#00E676'
  },
  filtersContent: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    borderColor: 'rgba(0,230,118,0.1)',
    borderWidth: 1
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 12
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 6,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0,230,118,0.2)',
    borderColor: '#00E676'
  },
  filterText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600'
  },
  filterTextActive: {
    color: '#00E676'
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  dateInputContainer: {
    flex: 1,
    marginRight: 8
  },
  dateLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    fontWeight: '600'
  },
  dateInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#FFFFFF',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1
  },
  clearButton: {
    backgroundColor: 'rgba(244,67,54,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderColor: '#F44336',
    borderWidth: 1
  },
  clearButtonText: {
    fontSize: 11,
    color: '#F44336',
    fontWeight: '600'
  },
  
  content: { flex: 1, paddingHorizontal: 20 },
  card: { 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 16, padding: 18, marginBottom: 16, 
    borderColor: 'rgba(0,230,118,0.2)', borderWidth: 1 
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  cardSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 12 },
  riskText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  metricItem: { alignItems: 'center' },
  metricLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  locationText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginLeft: 4 },
  
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  centeredText: { fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  detailsModal: { backgroundColor: '#1A1A2E', borderRadius: 16, margin: 20, maxHeight: '85%', width: '92%' },
  modalHeader: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' 
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  detailsContent: { paddingHorizontal: 20, paddingBottom: 20 },
  detailsSection: { marginBottom: 24, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  riskCard: { alignItems: 'center', padding: 20, borderRadius: 12, borderWidth: 1 },
  riskScore: { fontSize: 36, fontWeight: '900' },
  riskLevel: { fontSize: 12, fontWeight: '700', marginTop: 8, letterSpacing: 1, color: 'rgba(255,255,255,0.8)' },
  generatedBy: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  
  // Environmental Data Grid
  environmentalGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  envItem: { 
    width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', 
    padding: 12, borderRadius: 8, marginBottom: 8 
  },
  envLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  envValue: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  
  breakdownItem: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' 
  },
  breakdownLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  breakdownValue: { fontSize: 14, fontWeight: '600', color: '#00E676' },
  recommendationItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bulletPoint: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#00E676', marginTop: 8, marginRight: 12 },
  recommendationText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18, flex: 1 },
  insightItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  insightText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18, flex: 1, marginLeft: 8, fontStyle: 'italic' },
});

export default AssessmentHistoryScreen;