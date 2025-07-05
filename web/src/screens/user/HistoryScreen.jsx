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
    <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
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

        {/* Main Content - Two Column Layout */}
        <View style={styles.mainContent}>
          {/* Left Column - Search and Filters */}
          <View style={styles.leftColumn}>
            {/* Search Section */}
            <View style={styles.searchSection}>
              <Text style={styles.sectionTitle}>Search & Filter</Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="rgba(255,255,255,0.5)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by location or risk level..."
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
            </View>

            {/* Risk Level Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Risk Level</Text>
              <View style={styles.filterGrid}>
                {[
                  { key: 'all', label: 'All Levels' },
                  { key: 'low', label: 'Low Risk' },
                  { key: 'moderate', label: 'Moderate Risk' },
                  { key: 'high', label: 'High Risk' },
                  { key: 'very_high', label: 'Very High Risk' }
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
              </View>
            </View>

            {/* Date Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Date Range</Text>
              <View style={styles.dateFilterContainer}>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateLabel}>From Date</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                </View>
                
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateLabel}>To Date</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                </View>
              </View>
              
              <TouchableOpacity style={styles.clearButton} onPress={clearAllFilters}>
                <Ionicons name="refresh-outline" size={16} color="#F44336" />
                <Text style={styles.clearButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Column - Assessment List */}
          <View style={styles.rightColumn}>
            <View style={styles.assessmentHeader}>
              <Text style={styles.assessmentTitle}>Assessment Results</Text>
              <Text style={styles.assessmentCount}>
                {filteredAssessments.length} {filteredAssessments.length === 1 ? 'assessment' : 'assessments'}
              </Text>
            </View>

            <ScrollView
              style={styles.assessmentList}
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
        </View>
      </View>
    </LinearGradient>
    {renderDetailsModal()}
    <View style={styles.bottomSpace} />
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
    paddingHorizontal: 32, 
    paddingTop: 20, 
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  backButton: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    justifyContent: 'center', alignItems: 'center', 
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 
  },
  refreshButton: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: 'rgba(0,230,118,0.2)', 
    justifyContent: 'center', alignItems: 'center', 
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  
  // Two Column Layout
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingTop: 24,
    gap: 32,
    paddingBottom: 24,
  },
  
  // Left Column - Search and Filters
  leftColumn: {
    width: 320,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
    borderColor: 'rgba(0,230,118,0.1)',
    borderWidth: 1,
  },
  
  searchSection: {
    marginBottom: 24
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16
  },
  
 searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255,255,255,0.08)',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderColor: 'rgba(0,230,118,0.2)',
  borderWidth: 1
},

searchInput: {
  flex: 1,
  marginLeft: 8,
  fontSize: 12,
  color: '#FFFFFF'
},

filterSection: {
  marginBottom: 16
},

filterTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#FFFFFF',
  marginBottom: 8
},

filterGrid: {
  gap: 6
},

filterButton: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 6,
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderColor: 'rgba(255,255,255,0.2)',
  borderWidth: 1
},

filterButtonActive: {
  backgroundColor: 'rgba(0,230,118,0.2)',
  borderColor: '#00E676'
},

filterText: {
  fontSize: 12,
  color: 'rgba(255,255,255,0.7)',
  fontWeight: '500'
},

filterTextActive: {
  color: '#00E676',
  fontWeight: '600'
},

dateFilterContainer: {
  gap: 8
},

dateInputGroup: {
  
},

dateLabel: {
  fontSize: 10,
  color: 'rgba(255,255,255,0.6)',
  marginBottom: 4,
  fontWeight: '600'
},

dateInput: {
  backgroundColor: 'rgba(255,255,255,0.08)',
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 6,
  fontSize: 12,
  color: '#FFFFFF',
  borderColor: 'rgba(255,255,255,0.2)',
  borderWidth: 1
},

clearButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(244,67,54,0.1)',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
  borderColor: 'rgba(244,67,54,0.3)',
  borderWidth: 1,
  marginTop: 6,
  gap: 6
},

clearButtonText: {
  fontSize: 12,
  color: '#F44336',
  fontWeight: '600'
},
  
  // Right Column - Assessment List
  rightColumn: {
    flex: 1,
    minWidth: 0
  },
  
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  
  assessmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  
  assessmentCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)'
  },
  
  assessmentList: {
    flex: 1
  },
  
  // Assessment Card Styles
  card: { 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16, 
    borderColor: 'rgba(0,230,118,0.2)', 
    borderWidth: 1,
    cursor: 'pointer'
  },
  
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 16 
  },
  
  cardHeaderLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#FFFFFF' 
  },
  
  cardSubtitle: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.6)', 
    marginTop: 4 
  },
  
  riskBadge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12, 
    marginBottom: 16 
  },
  
  riskText: { 
    fontSize: 12, 
    fontWeight: '700', 
    letterSpacing: 0.5 
  },
  
  metricsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 12 
  },
  
  metricItem: { 
    alignItems: 'center' 
  },
  
  metricLabel: { 
    fontSize: 11, 
    color: 'rgba(255,255,255,0.6)', 
    marginBottom: 4 
  },
  
  metricValue: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#FFFFFF' 
  },
  
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8 
  },
  
  locationText: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.6)', 
    marginLeft: 4 
  },
  
  // Empty State and Loading
  centeredContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 80 
  },
  
  centeredText: { 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.7)' 
  },
  
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    marginTop: 16, 
    marginBottom: 8 
  },
  
  emptyText: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.7)', 
    textAlign: 'center', 
    lineHeight: 20, 
    paddingHorizontal: 40 
  },
  
  // Modal Styles (keeping original)
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  detailsModal: { 
    backgroundColor: '#1A1A2E', 
    borderRadius: 16, 
    margin: 20, 
    maxHeight: '85%', 
    width: '92%',
    maxWidth: 800
  },
  
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.1)' 
  },
  
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#FFFFFF' 
  },
  
  detailsContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 20 
  },
  
  detailsSection: { 
    marginBottom: 24, 
    marginTop: 16 
  },
  
  riskCard: { 
    alignItems: 'center', 
    padding: 20, 
    borderRadius: 12, 
    borderWidth: 1 
  },
  
  riskScore: { 
    fontSize: 36, 
    fontWeight: '900' 
  },
  
  riskLevel: { 
    fontSize: 12, 
    fontWeight: '700', 
    marginTop: 8, 
    letterSpacing: 1, 
    color: 'rgba(255,255,255,0.8)' 
  },
  
  generatedBy: { 
    fontSize: 10, 
    color: 'rgba(255,255,255,0.6)', 
    marginTop: 4 
  },
  
  // Environmental Data Grid
  environmentalGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  
  envItem: { 
    width: '48%', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 8 
  },
  
  envLabel: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.6)', 
    marginBottom: 4 
  },
  
  envValue: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#FFFFFF' 
  },
  
  breakdownItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.1)' 
  },
  
  breakdownLabel: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.8)' 
  },
  
  breakdownValue: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#00E676' 
  },
  
  recommendationItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 8 
  },
  
  bulletPoint: { 
    width: 4, 
    height: 4, 
    borderRadius: 2, 
    backgroundColor: '#00E676', 
    marginTop: 8, 
    marginRight: 12 
  },
  
  recommendationText: { 
    fontSize: 13, 
    color: 'rgba(255,255,255,0.9)', 
    lineHeight: 18, 
    flex: 1 
  },
  
  insightItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 12 
  },
  
  insightText: { 
    fontSize: 13, 
    color: 'rgba(255,255,255,0.9)', 
    lineHeight: 18, 
    flex: 1, 
    marginLeft: 8, 
    fontStyle: 'italic' 
  },
  
});
export default AssessmentHistoryScreen;