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
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { getMyReports } from '../../api/report';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Date Picker Component
const DatePicker = ({ value, onSelect, placeholder }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'year'

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDateSelect = (date) => {
    onSelect(date);
    setShowDatePicker(false);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateYear = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(currentDate.getFullYear() + direction);
    setCurrentDate(newDate);
  };

  const DatePickerModal = () => (
    <Modal transparent visible={showDatePicker} animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
      <View style={styles.datePickerOverlay}>
        <View style={styles.datePickerContainer}>
          <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.datePickerGradient}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setViewMode(viewMode === 'month' ? 'year' : 'month')}>
                <Text style={styles.datePickerTitle}>
                  {viewMode === 'month' ? `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}` : currentDate.getFullYear()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {viewMode === 'month' ? (
              <>
                <View style={styles.monthNavigation}>
                  <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
                    <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
                    <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.weekDays}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <Text key={day} style={styles.weekDay}>{day}</Text>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {getDaysInMonth(currentDate).map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayButton,
                        !day && styles.emptyDay,
                        day && value && day.toDateString() === value.toDateString() && styles.selectedDay
                      ]}
                      onPress={() => day && handleDateSelect(day)}
                      disabled={!day}
                    >
                      {day && (
                        <Text style={[
                          styles.dayText,
                          day && value && day.toDateString() === value.toDateString() && styles.selectedDayText
                        ]}>
                          {day.getDate()}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.monthNavigation}>
                  <TouchableOpacity onPress={() => navigateYear(-1)} style={styles.navButton}>
                    <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigateYear(1)} style={styles.navButton}>
                    <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.yearGrid}>
                  {Array.from({ length: 12 }, (_, i) => {
                    const year = currentDate.getFullYear() - 6 + i;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[styles.yearButton, year === currentDate.getFullYear() && styles.selectedYear]}
                        onPress={() => {
                          const newDate = new Date(currentDate);
                          newDate.setFullYear(year);
                          setCurrentDate(newDate);
                          setViewMode('month');
                        }}
                      >
                        <Text style={[styles.yearText, year === currentDate.getFullYear() && styles.selectedYearText]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.datePickerFooter}>
              <TouchableOpacity style={styles.clearButton} onPress={() => handleDateSelect(null)}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.todayButton} onPress={() => handleDateSelect(new Date())}>
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
        <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.6)" />
        <Text style={[styles.dateInputText, !value && styles.placeholderText]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
      <DatePickerModal />
    </>
  );
};

// Image Viewer Modal
const ImageViewerModal = ({ visible, imageUri, onClose }) => {
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (visible) {
      setImageScale(1);
      setImagePosition({ x: 0, y: 0 });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.imageViewerOverlay}>
        <View style={styles.imageViewerHeader}>
          <TouchableOpacity style={styles.imageViewerClose} onPress={onClose}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.imageViewerContent}>
          <ScrollView
            contentContainerStyle={styles.imageScrollContainer}
            maximumZoomScale={3}
            minimumZoomScale={0.5}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </ScrollView>
        </View>

        <View style={styles.imageViewerFooter}>
          <TouchableOpacity style={styles.imageActionButton}>
            <Ionicons name="download-outline" size={24} color="#FFFFFF" />
            <Text style={styles.imageActionText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageActionButton}>
            <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            <Text style={styles.imageActionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Filter Component
const FilterPanel = ({ visible, onToggle, filters, onFilterChange, onClearFilters }) => {
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'resolved', label: 'Resolved' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'Smoke', label: 'Smoke' },
    { value: 'Dust', label: 'Dust' },
    { value: 'Odor', label: 'Odor' },
    { value: 'Chemical Leak', label: 'Chemical Leak' },
    { value: 'Others', label: 'Others' },
  ];

  return (
    <View style={[styles.filterContainer, visible && styles.filterContainerExpanded]}>
      <TouchableOpacity style={styles.filterToggle} onPress={onToggle}>
        <View style={styles.filterToggleContent}>
          <Ionicons name="filter" size={20} color="#00E676" />
          <Text style={styles.filterToggleText}>Filters</Text>
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>
              {Object.values(filters).filter(v => v && v !== '').length}
            </Text>
          </View>
        </View>
        <Ionicons 
          name={visible ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="rgba(255,255,255,0.6)" 
        />
      </TouchableOpacity>

      {visible && (
        <View style={styles.filterContent}>
          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptions}>
                {statusOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      filters.status === option.value && styles.filterOptionActive
                    ]}
                    onPress={() => onFilterChange('status', option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.status === option.value && styles.filterOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Type</Text>
              <View style={styles.filterOptions}>
                {typeOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      filters.type === option.value && styles.filterOptionActive
                    ]}
                    onPress={() => onFilterChange('type', option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.type === option.value && styles.filterOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>From Date</Text>
              <DatePicker
                value={filters.fromDate}
                onSelect={(date) => onFilterChange('fromDate', date)}
                placeholder="Select start date"
              />
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>To Date</Text>
              <DatePicker
                value={filters.toDate}
                onSelect={(date) => onFilterChange('toDate', date)}
                placeholder="Select end date"
              />
            </View>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={onClearFilters}>
              <Ionicons name="refresh-outline" size={18} color="#E91E63" />
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// Custom Alert Component
const CustomAlert = ({ visible, title, message, buttons, onClose }) => {
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.alertOverlay}>
        <View style={styles.alertContainer}>
          <Text style={styles.alertTitle}>{title}</Text>
          {message && <Text style={styles.alertMessage}>{message}</Text>}
          <View style={styles.alertButtonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.alertButton, button.style === 'destructive' && styles.alertButtonDestructive]}
                onPress={() => { button.onPress && button.onPress(); onClose(); }}
              >
                <Text style={[styles.alertButtonText, button.style === 'destructive' && styles.alertButtonTextDestructive]}>
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
const EmptyState = ({ onRefresh, hasFilters }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="document-text-outline" size={80} color="rgba(255,255,255,0.3)" />
    <Text style={styles.emptyTitle}>
      {hasFilters ? 'No Matching Reports' : 'No Reports Yet'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {hasFilters 
        ? 'Try adjusting your filters to see more results.'
        : 'You haven\'t submitted any pollution reports yet. Start by creating your first report!'
      }
    </Text>
    <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
      <Ionicons name="refresh" size={18} color="#FFFFFF" />
      <Text style={styles.refreshButtonText}>Refresh</Text>
    </TouchableOpacity>
  </View>
);

// Report Card Component
const ReportCard = ({ report, onPress }) => {
  const getStatusColor = (status) => {
    const colors = { pending: '#FFC107', verified: '#2196F3', resolved: '#4CAF50' };
    return colors[status] || '#FFC107';
  };

  const getStatusIcon = (status) => {
    const icons = { pending: 'time-outline', verified: 'checkmark-circle-outline', resolved: 'checkmark-done-outline' };
    return icons[status] || 'time-outline';
  };

  const getTypeIcon = (type) => {
    const icons = { 
      'Smoke': 'flame-outline', 'Dust': 'cloud-outline', 'Odor': 'alert-circle-outline',
      'Chemical Leak': 'warning-outline', 'Others': 'ellipsis-horizontal-outline'
    };
    return icons[type] || 'alert-circle-outline';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity style={styles.reportCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTypeContainer}>
          <View style={styles.typeIconContainer}>
            <Ionicons name={getTypeIcon(report.type)} size={20} color="#00E676" />
          </View>
          <Text style={styles.reportType}>{report.type}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '20', borderColor: getStatusColor(report.status) }]}>
          <Ionicons name={getStatusIcon(report.status)} size={14} color={getStatusColor(report.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.reportContent}>
        <View style={styles.reportInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.infoText} numberOfLines={1}>{report.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.infoText}>{formatDate(report.time)}</Text>
          </View>
          {report.isAnonymous && (
            <View style={styles.infoRow}>
              <Ionicons name="eye-off-outline" size={16} color="rgba(255,255,255,0.6)" />
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
          <Text style={styles.responseText} numberOfLines={2}>{report.response}</Text>
        </View>
      )}

      <View style={styles.reportFooter}>
        <Text style={styles.submittedDate}>Submitted: {formatDate(report.createdAt)}</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
      </View>
    </TouchableOpacity>
  );
};

// Main MyReports Screen Component
const MyReportsScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    fromDate: null,
    toDate: null,
  });
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  const showAlert = (title, message, buttons) => {
    if (Platform.OS === 'web') {
      setAlertConfig({ visible: true, title, message, buttons });
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const closeAlert = () => setAlertConfig({ visible: false, title: '', message: '', buttons: [] });

  const applyFilters = useCallback(() => {
    let filtered = [...reports];

    if (filters.status) {
      filtered = filtered.filter(report => report.status === filters.status);
    }

    if (filters.type) {
      filtered = filtered.filter(report => report.type === filters.type);
    }

    if (filters.fromDate) {
      filtered = filtered.filter(report => new Date(report.createdAt) >= filters.fromDate);
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(report => new Date(report.createdAt) <= toDate);
    }

    setFilteredReports(filtered);
  }, [reports, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', type: '', fromDate: null, toDate: null });
  };

  const hasActiveFilters = Object.values(filters).some(value => value && value !== '');

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  }, [fetchReports]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleReportPress = (report) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  const handleImagePress = (imageUri) => {
    setSelectedImage(imageUri);
    setImageViewerVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedReport(null);
  };

  const handleRetry = () => {
    setLoading(true);
    fetchReports();
  };

  const getStatusColor = (status) => {
    const colors = { pending: '#FFC107', verified: '#2196F3', resolved: '#4CAF50' };
    return colors[status] || '#FFC107';
  };

  const getStatusIcon = (status) => {
    const icons = { pending: 'time-outline', verified: 'checkmark-circle-outline', resolved: 'checkmark-done-outline' };
    return icons[status] || 'time-outline';
  };

  const getTypeIcon = (type) => {
    const icons = { 
      'Smoke': 'flame-outline', 'Dust': 'cloud-outline', 'Odor': 'alert-circle-outline',
      'Chemical Leak': 'warning-outline', 'Others': 'ellipsis-horizontal-outline'
    };
    return icons[type] || 'alert-circle-outline';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>My Reports</Text>
              <View style={styles.placeholder} />
            </View>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={80} color="#E91E63" />
              <Text style={styles.errorTitle}>Error Loading Reports</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
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
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Reports</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.refreshHeaderButton} onPress={onRefresh}>
                <Ionicons name="refresh" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('SubmitReport')}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content Wrapper */}
          <View style={styles.contentWrapper}>
          
            {/* Filter Panel */}
            <FilterPanel
              visible={filterVisible}
              onToggle={() => setFilterVisible(!filterVisible)}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
            />

            {/* Content */}
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00E676']} tintColor="#00E676" />}
            >
              {filteredReports.length === 0 ? (
                <EmptyState onRefresh={onRefresh} hasFilters={hasActiveFilters} />
              ) : (
                <View style={styles.reportsContainer}>
                  <Text style={styles.sectionTitle}>
                    {hasActiveFilters ? `Filtered Reports (${filteredReports.length})` : `Your Reports (${filteredReports.length})`}
                  </Text>
                  <View style={styles.reportsGrid}>
                    {filteredReports.map((report) => (
                      <ReportCard key={report._id} report={report} onPress={() => handleReportPress(report)} />
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Report Details Modal */}
          <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.modalGradient}>
                  {selectedReport && (
                    <>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Report Details</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                          <Ionicons name="close" size={28} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>

                      <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                        <View style={styles.modalSection}>
                          <View style={styles.statusRow}>
                            <View style={styles.statusContainer}>
                              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(selectedReport.status) }]}>
                                <Ionicons name={getStatusIcon(selectedReport.status)} size={20} color="#FFFFFF" />
                              </View>
                              <Text style={styles.statusLabel}>
                                {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                              </Text>
                            </View>
                            <Text style={styles.reportId}>ID: {selectedReport._id.slice(-8)}</Text>
                          </View>
                        </View>

                        <View style={styles.modalSection}>
                          <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                              <Ionicons name={getTypeIcon(selectedReport.type)} size={24} color="#00E676" />
                              <Text style={styles.detailLabel}>Type</Text>
                              <Text style={styles.detailValue}>{selectedReport.type}</Text>
                            </View>
                            <View style={styles.detailItem}>
                              <Ionicons name="location" size={24} color="#00E676" />
                              <Text style={styles.detailLabel}>Location</Text>
                              <Text style={styles.detailValue}>{selectedReport.location}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.modalSection}>
                          <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                              <Ionicons name="time" size={24} color="#00E676" />
                              <Text style={styles.detailLabel}>Incident Time</Text>
                              <Text style={styles.detailValue}>{new Date(selectedReport.time).toLocaleString()}</Text>
                            </View>
                            <View style={styles.detailItem}>
                              <Ionicons name="calendar" size={24} color="#00E676" />
                              <Text style={styles.detailLabel}>Submitted</Text>
                              <Text style={styles.detailValue}>{new Date(selectedReport.createdAt).toLocaleString()}</Text>
                            </View>
                          </View>
                        </View>

                        {selectedReport.photo?.url && (
                          <View style={styles.modalSection}>
                            <Text style={styles.sectionTitle}>Photo Evidence</Text>
                            <TouchableOpacity 
                              style={styles.photoContainer} 
                              onPress={() => handleImagePress(selectedReport.photo.url)}
                            >
                              <Image source={{ uri: selectedReport.photo.url }} style={styles.modalPhoto} resizeMode="cover" />
                              <View style={styles.photoOverlay}>
                                <Ionicons name="expand-outline" size={24} color="#FFFFFF" />
                              </View>
                            </TouchableOpacity>
                          </View>
                        )}

                        {selectedReport.description && (
                          <View style={styles.modalSection}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <View style={styles.descriptionContainer}>
                              <Text style={styles.descriptionText}>{selectedReport.description}</Text>
                            </View>
                          </View>
                        )}

                        {selectedReport.response && (
                          <View style={styles.modalSection}>
                            <Text style={styles.sectionTitle}>Official Response</Text>
                            <View style={styles.responseBox}>
                              <View style={styles.responseHeader}>
                                <Ionicons name="shield-checkmark" size={20} color="#00E676" />
                                <Text style={styles.responseTitle}>Administrator Response</Text>
                              </View>
                              <Text style={styles.responseContent}>{selectedReport.response}</Text>
                            </View>
                          </View>
                        )}

                        {selectedReport.isAnonymous && (
                          <View style={styles.modalSection}>
                            <View style={styles.anonymousBadge}>
                              <Ionicons name="eye-off" size={20} color="#FFC107" />
                              <Text style={styles.anonymousText}>This report was submitted anonymously</Text>
                            </View>
                          </View>
                        )}
                      </ScrollView>
                    </>
                  )}
                </LinearGradient>
              </View>
            </View>
          </Modal>

          {/* Image Viewer Modal */}
          <ImageViewerModal
            visible={imageViewerVisible}
            imageUri={selectedImage}
            onClose={() => setImageViewerVisible(false)}
          />

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
  // Base styles
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  
  // Header styles
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 40, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 40, 
    paddingBottom: 30 
  },
  backButton: { 
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', flex: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshHeaderButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  addButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#00E676', justifyContent: 'center', alignItems: 'center' },
  placeholder: { width: 48 },

  // Content wrapper
  contentWrapper: { flex: 1, maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: 40 },
  // Filter styles
  filterContainer: { 
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, marginBottom: 20,
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1, overflow: 'hidden'
  },
  filterContainerExpanded: { marginBottom: 20 },
  filterToggle: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: 20, backgroundColor: 'rgba(0,230,118,0.05)'
  },
  filterToggleContent: { flexDirection: 'row', alignItems: 'center' },
  filterToggleText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginLeft: 8, marginRight: 12 },
  filterBadge: { 
    backgroundColor: '#00E676', borderRadius: 10, minWidth: 20, height: 20, 
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 
  },
  filterBadgeText: { fontSize: 12, fontWeight: '700', color: '#0A0A0A' },
  filterContent: { padding: 20, paddingTop: 0 },
  filterRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  filterGroup: { flex: 1 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: { 
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  filterOptionActive: { backgroundColor: '#00E676', borderColor: '#00E676' },
  filterOptionText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  filterOptionTextActive: { color: '#0A0A0A', fontWeight: '600' },
  filterActions: { alignItems: 'flex-end', marginTop: 10 },
  clearFiltersButton: { 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, 
    borderRadius: 8, backgroundColor: 'rgba(233,30,99,0.1)', borderWidth: 1, borderColor: 'rgba(233,30,99,0.3)'
  },
  clearFiltersText: { fontSize: 14, color: '#E91E63', fontWeight: '600', marginLeft: 6 },

  // Date picker styles
  dateInput: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' 
  },
  dateInputText: { flex: 1, fontSize: 14, color: '#FFFFFF', marginLeft: 8 },
  placeholderText: { color: 'rgba(255,255,255,0.5)' },
  datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  datePickerContainer: { width: '100%', maxWidth: 400, borderRadius: 16, overflow: 'hidden' },
  datePickerGradient: { padding: 20 },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  datePickerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  monthNavigation: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  navButton: { 
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  weekDays: { flexDirection: 'row', marginBottom: 10 },
  weekDay: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayButton: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyDay: { opacity: 0 },
  selectedDay: { backgroundColor: '#00E676', borderRadius: 6 },
  dayText: { fontSize: 14, color: '#FFFFFF' },
  selectedDayText: { color: '#0A0A0A', fontWeight: '600' },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  yearButton: { 
    flex: 1, minWidth: '30%', paddingVertical: 12, borderRadius: 8, 
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' 
  },
  selectedYear: { backgroundColor: '#00E676' },
  yearText: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  selectedYearText: { color: '#0A0A0A', fontWeight: '700' },
  datePickerFooter: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, gap: 10 },
  clearButton: { 
    flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: 'rgba(233,30,99,0.2)', 
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(233,30,99,0.4)' 
  },
  clearButtonText: { fontSize: 14, color: '#E91E63', fontWeight: '600' },
  todayButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#00E676', alignItems: 'center' },
  todayButtonText: { fontSize: 14, color: '#0A0A0A', fontWeight: '600' },

  // Content styles
  content: { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  // Loading and error states
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60 },
  errorTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 20, marginBottom: 12 },
  errorMessage: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 32 },
  retryButton: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#00E676', 
    paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 12 },

  // Empty state
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60, paddingVertical: 100 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 24, marginBottom: 12 },
  emptySubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  refreshButton: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 
  },
  refreshButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },

  // Reports container
  reportsContainer: { flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 24 },
  reportsGrid: { gap: 20 },

  // Report card
  reportCard: { 
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 24, 
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  reportTypeContainer: { flexDirection: 'row', alignItems: 'center' },
  typeIconContainer: { 
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,230,118,0.2)', 
    justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' 
  },
  reportType: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  statusBadge: { 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 12, borderWidth: 1 
  },
  statusText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  reportContent: { flexDirection: 'row', marginBottom: 16 },
  reportInfo: { flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginLeft: 8, flex: 1 },
  reportImage: { width: 80, height: 80, borderRadius: 12, marginLeft: 16 },
  reportDescription: { fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 22, marginBottom: 16 },
  responseContainer: { 
    backgroundColor: 'rgba(0,230,118,0.1)', borderRadius: 12, padding: 16, marginBottom: 16, 
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 
  },
  responseLabel: { fontSize: 14, fontWeight: '600', color: '#00E676', marginBottom: 6 },
  responseText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 20 },
  reportFooter: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' 
  },
  submittedDate: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  modalContainer: { width: '100%', maxWidth: 800, maxHeight: '90%', borderRadius: 24, overflow: 'hidden' },
  modalGradient: { flex: 1 },
  modalHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: 32, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' 
  },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  closeButton: { 
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  modalContent: { flex: 1 },
  modalScrollContent: { padding: 32, paddingBottom: 60 },
  modalSection: { marginBottom: 32 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  statusLabel: { fontSize: 20, fontWeight: '600', color: '#FFFFFF' },
  reportId: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace' },
  detailRow: { flexDirection: 'row', gap: 20 },
  detailItem: { 
    flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 20, 
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 230, 118, 0.2)' 
  },
  detailLabel: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', marginTop: 8, marginBottom: 6 },
  detailValue: { fontSize: 16, color: '#FFFFFF', fontWeight: '600', textAlign: 'center' },
  photoContainer: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
  modalPhoto: { width: '100%', height: 300, borderRadius: 16 },
  photoOverlay: { 
    position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    borderRadius: 16, padding: 8 
  },
  descriptionContainer: { 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 20, 
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' 
  },
  descriptionText: { fontSize: 16, color: '#FFFFFF', lineHeight: 24 },
  responseBox: { 
    backgroundColor: 'rgba(0, 230, 118, 0.1)', borderRadius: 16, padding: 20, 
    borderWidth: 1, borderColor: 'rgba(0, 230, 118, 0.3)' 
  },
  responseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  responseTitle: { fontSize: 16, fontWeight: '600', color: '#00E676', marginLeft: 8 },
  responseContent: { fontSize: 16, color: '#FFFFFF', lineHeight: 24 },
  anonymousBadge: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 193, 7, 0.1)', 
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 193, 7, 0.3)' 
  },
  anonymousText: { fontSize: 16, color: '#FFC107', marginLeft: 12, fontWeight: '500' },

  // Image viewer styles
  imageViewerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' },
  imageViewerHeader: { 
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10, 
    right: 20, zIndex: 1000 
  },
  imageViewerClose: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  imageViewerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageScrollContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: screenHeight },
  fullScreenImage: { width: screenWidth, height: screenHeight * 0.8 },
  imageViewerFooter: { 
    position: 'absolute', bottom: Platform.OS === 'ios' ? 50 : 30, left: 0, right: 0, 
    flexDirection: 'row', justifyContent: 'center', gap: 40 
  },
  imageActionButton: { 
    alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingHorizontal: 20, 
    paddingVertical: 12, borderRadius: 25 
  },
  imageActionText: { fontSize: 12, color: '#FFFFFF', marginTop: 4, fontWeight: '500' },

  // Alert styles
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  alertContainer: { 
    backgroundColor: '#1A1A2E', borderRadius: 20, padding: 32, minWidth: 400, maxWidth: 600, 
    borderColor: 'rgba(0, 230, 118, 0.3)', borderWidth: 1 
  },
  alertTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  alertMessage: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 24, textAlign: 'center', lineHeight: 24 },
  alertButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  alertButton: { 
    flex: 1, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, 
    backgroundColor: '#00E676', alignItems: 'center' 
  },
  alertButtonDestructive: { backgroundColor: '#E91E63' },
  alertButtonText: { fontSize: 16, fontWeight: '600', color: '#0A0A0A' },
  alertButtonTextDestructive: { color: '#FFFFFF' },
});

export default MyReportsScreen;