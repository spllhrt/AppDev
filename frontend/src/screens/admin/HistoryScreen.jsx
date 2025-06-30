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
    if (searchQuery.trim() === '') {
      setFilteredAssessments(assessments);
    } else {
      const filtered = assessments.filter(assessment => 
        assessment.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAssessments(filtered);
    }
  }, [searchQuery, assessments]);

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
          item.riskLevel === 'High' && styles.highRisk,
          item.riskLevel === 'Medium' && styles.mediumRisk,
          item.riskLevel === 'Low' && styles.lowRisk,
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
      </View>

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
              {searchQuery.trim() ? 'No matching assessments found' : 'No assessment history found'}
            </Text>
            {searchQuery.trim() && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchButtonText}>Clear search</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Assessment Details Modal */}
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
                  {renderDetailItem('Phone', selectedAssessment.user?.phone, 'call-outline')}
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
                  {renderDetailItem('Score', selectedAssessment.score, 'speedometer-outline')}
                </View>

                <View style={styles.questionsSection}>
                  <Text style={styles.sectionTitle}>Questions & Answers</Text>
                  {selectedAssessment.answers?.map((answer, index) => (
                    <View key={index} style={styles.qaItem}>
                      {renderQuestionAnswer(
                        answer.question || `Question ${index + 1}`,
                        answer.answer || 'No answer provided'
                      )}
                    </View>
                  ))}
                </View>

                {selectedAssessment.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.sectionTitle}>Additional Notes</Text>
                    <Text style={styles.notesText}>{selectedAssessment.notes}</Text>
                  </View>
                )}
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
  mediumRisk: {
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
  // Modal styles
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
  qaContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  questionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  answerText: {
    fontSize: 14,
    color: '#4b5563',
  },
  notesText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
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
});

export default HistoryScreen;