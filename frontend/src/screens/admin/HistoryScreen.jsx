import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getAllAssessments, deleteAssessment } from '../../api/historyApi';
import moment from 'moment';

const HistoryScreen = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const navigation = useNavigation();

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllAssessments();
      setAssessments(response.assessments || []);
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
            
            const response = await deleteAssessment(assessmentId);
            
            if (response.success) {
              setAssessments(prev => 
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
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
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
      <FlatList
        data={assessments}
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
            <Text style={styles.emptyText}>No assessment history found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingTop: 10,
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
});

export default HistoryScreen;