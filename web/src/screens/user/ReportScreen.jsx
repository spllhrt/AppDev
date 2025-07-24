import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  TextInput, Alert, Platform, StatusBar, Image, Dimensions, Modal
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Calendar } from 'react-native-calendars';
import { submitReport } from '../../api/report';

const { width: screenWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxContentWidth = 1200;
const isLargeScreen = screenWidth > 768;

const ReportScreen = ({ navigation }) => {
  const initialFormData = {
    type: '', location: '', time: '', description: '', isAnonymous: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const blurTimeoutRef = useRef(null);

  const reportTypes = [
    { id: 'Smoke', label: 'Smoke', icon: 'cloud-outline' },
    { id: 'Dust', label: 'Dust', icon: 'cloudy-outline' },
    { id: 'Odor', label: 'Odor', icon: 'alert-circle-outline' },
    { id: 'Chemical Leak', label: 'Chemical Leak', icon: 'flask-outline' },
    { id: 'Others', label: 'Others', icon: 'ellipsis-horizontal-outline' },
  ];

  const clearForm = () => {
    setFormData(initialFormData);
    setPhoto(null);
    setLocationQuery('');
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  };

  const fetchLocationSuggestions = async (query) => {
    if (query.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    setIsLoadingLocations(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=ph&format=json&limit=10&addressdetails=1`,
        { headers: { 'User-Agent': 'EnvironmentalReportApp/1.0' } }
      );
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      const formattedSuggestions = data.map(item => ({
        id: item.place_id.toString(),
        name: item.display_name.replace(', Philippines', ''),
        shortName: item.name || item.display_name.split(',')[0],
        icon: getLocationIcon(item.type, item.class),
        type: item.type
      }));
      setLocationSuggestions(formattedSuggestions);
    } catch (error) {
      console.error('Location fetch error:', error);
      setLocationSuggestions(getMockLocationSuggestions(query));
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const getLocationIcon = (type, className) => {
    if (type === 'school' || className === 'amenity') return 'school-outline';
    if (type === 'hospital') return 'medical-outline';
    if (type === 'mall' || type === 'shopping') return 'storefront-outline';
    if (type === 'restaurant') return 'restaurant-outline';
    if (type === 'gas_station') return 'car-outline';
    if (className === 'building') return 'business-outline';
    return 'location-outline';
  };

  const getMockLocationSuggestions = (query) => {
    const locations = [
      { name: 'SM Mall of Asia, Pasay', type: 'shopping', icon: 'storefront-outline' },
      { name: 'Ayala Center, Makati', type: 'shopping', icon: 'storefront-outline' },
      { name: 'University of the Philippines Diliman', type: 'school', icon: 'school-outline' },
      { name: 'Philippine General Hospital', type: 'hospital', icon: 'medical-outline' },
      { name: 'Rizal Park, Manila', type: 'place', icon: 'leaf-outline' },
      { name: 'Bonifacio Global City', type: 'place', icon: 'business-outline' },
    ];
    return locations
      .filter(location => location.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map((location, index) => ({
        id: `mock_${index}`,
        name: location.name,
        shortName: location.name.split(',')[0],
        type: location.type,
        icon: location.icon
      }));
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (locationQuery.trim()) {
        fetchLocationSuggestions(locationQuery.trim());
      } else {
        setLocationSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [locationQuery]);

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permission is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

const handleSubmit = async () => {
  if (!formData.type || !formData.location || !formData.description) {
    Alert.alert('Error', 'Please fill in all required fields');
    return;
  }

  setIsSubmitting(true);
  try {
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
    });

    if (photo) {
      if (Platform.OS === 'web') {
        const response = await fetch(photo.uri);
        const blob = await response.blob();
        submitData.append('photo', blob, 'report.jpg');
      } else {
        submitData.append('photo', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: 'report.jpg',
        });
      }
    }

    await submitReport(submitData);
    setShowSuccessModal(true);
  } catch (error) {
    Alert.alert('Error', error.message || 'Failed to submit report');
  } finally {
    setIsSubmitting(false);
  }
};


  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    clearForm();
  };

  const handleLocationSelect = (location) => {
    setFormData({ ...formData, location: location.name });
    setLocationQuery(location.name);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
  };

  const handleLocationInputChange = (text) => {
    setLocationQuery(text);
    setFormData({ ...formData, location: text });
    setShowLocationSuggestions(text.length > 0);
    if (text.length === 0) setLocationSuggestions([]);
  };

  const handleLocationBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowLocationSuggestions(false);
    }, 150);
  };

  const handleLocationFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    if (locationQuery.length > 0) {
      setShowLocationSuggestions(true);
    }
  };

  const handleDateSelect = (day) => {
    const selectedDate = new Date(day.timestamp);
    const formattedDate = selectedDate.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    setFormData({ ...formData, time: formattedDate });
    setShowCalendar(false);
  };

  const LocationSuggestionItem = ({ item, onPress }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={item.icon} size={20} color="#00E676" />
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.suggestionText}>{item.shortName}</Text>
        <Text style={styles.suggestionSubText}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F0F23', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Environmental Report</Text>
              <View style={styles.placeholder} />
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.mainContainer}>
            <ScrollView
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.contentWrapper}>
                {/* Left Column */}
                <View style={styles.leftColumn}>
                  {/* Report Type Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Report Type *</Text>
                    <View style={styles.typeGrid}>
                      {reportTypes.map((type) => (
                        <TouchableOpacity
                          key={type.id}
                          style={[styles.typeCard, formData.type === type.id && styles.typeCardSelected]}
                          onPress={() => setFormData({ ...formData, type: type.id })}
                        >
                          <Ionicons
                            name={type.icon}
                            size={isLargeScreen ? 28 : 24}
                            color={formData.type === type.id ? '#00E676' : 'rgba(255,255,255,0.7)'}
                          />
                          <Text style={[styles.typeText, formData.type === type.id && styles.typeTextSelected]}>
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Location Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Location *</Text>
                    <View style={styles.locationInputContainer}>
                      <View style={styles.formCard}>
                        <TextInput
                          style={styles.input}
                          placeholder="Search for a specific location..."
                          placeholderTextColor="rgba(255,255,255,0.5)"
                          value={locationQuery}
                          onChangeText={handleLocationInputChange}
                          onFocus={handleLocationFocus}
                          onBlur={handleLocationBlur}
                        />
                        <Ionicons name="search" size={20} color="#00E676" style={styles.inputIcon} />
                      </View>

                      {showLocationSuggestions && (
                        <View style={styles.suggestionContainer}>
                          {isLoadingLocations ? (
                            <View style={styles.loadingContainer}>
                              <Text style={styles.loadingText}>Searching locations...</Text>
                            </View>
                          ) : locationSuggestions.length > 0 ? (
                            <ScrollView
                              style={styles.suggestionList}
                              nestedScrollEnabled={true}
                              keyboardShouldPersistTaps="handled"
                            >
                              {locationSuggestions.map((item) => (
                                <LocationSuggestionItem
                                  key={item.id}
                                  item={item}
                                  onPress={() => handleLocationSelect(item)}
                                />
                              ))}
                            </ScrollView>
                          ) : locationQuery.length >= 2 && (
                            <View style={styles.noResultsContainer}>
                              <Text style={styles.noResultsText}>No results found</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Date Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Date Occurred</Text>
                    <TouchableOpacity style={styles.formCard} onPress={() => setShowCalendar(true)}>
                      <Text style={[styles.input, { color: formData.time ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }]}>
                        {formData.time || 'Select date when this occurred'}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color="#00E676" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Right Column */}
                <View style={styles.rightColumn}>
                  {/* Description Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description *</Text>
                    <View style={styles.formCard}>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Describe the air quality issue in detail..."
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        multiline
                        numberOfLines={isLargeScreen ? 8 : 4}
                        textAlignVertical="top"
                      />
                    </View>
                  </View>

                  {/* Photo Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Photo Evidence</Text>
                    <TouchableOpacity style={styles.photoCard} onPress={handleImagePicker}>
                      {photo ? (
                        <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Ionicons name="camera" size={isLargeScreen ? 40 : 32} color="#00E676" />
                          <Text style={styles.photoText}>Add Photo</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Anonymous Option */}
                  <TouchableOpacity
                    style={styles.anonymousCard}
                    onPress={() => setFormData({ ...formData, isAnonymous: !formData.isAnonymous })}
                  >
                    <View style={styles.anonymousLeft}>
                      <Ionicons name="shield-outline" size={20} color="#00E676" />
                      <Text style={styles.anonymousText}>Submit Anonymously</Text>
                    </View>
                    <View style={[styles.checkbox, formData.isAnonymous && styles.checkboxSelected]}>
                      {formData.isAnonymous && <Ionicons name="checkmark" size={14} color="#0A0A0A" />}
                    </View>
                  </TouchableOpacity>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.submitButtonText}>
                      {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Calendar Modal */}
              {showCalendar && (
                <View style={styles.calendarOverlay}>
                  <View style={styles.calendarContainer}>
                    <Calendar
                      onDayPress={handleDateSelect}
                      maxDate={new Date().toISOString().split('T')[0]}
                      theme={{
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        calendarBackground: 'rgba(26, 26, 46, 0.95)',
                        textSectionTitleColor: '#FFFFFF',
                        selectedDayBackgroundColor: '#00E676',
                        selectedDayTextColor: '#0A0A0A',
                        todayTextColor: '#00E676',
                        dayTextColor: '#FFFFFF',
                        textDisabledColor: 'rgba(255,255,255,0.3)',
                        dotColor: '#00E676',
                        selectedDotColor: '#0A0A0A',
                        arrowColor: '#00E676',
                        monthTextColor: '#FFFFFF',
                        indicatorColor: '#00E676',
                        textDayFontWeight: '300',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '300',
                        textDayFontSize: 16,
                        textMonthFontSize: 16,
                        textDayHeaderFontSize: 13
                      }}
                    />
                    <TouchableOpacity
                      style={styles.closeCalendarButton}
                      onPress={() => setShowCalendar(false)}
                    >
                      <Text style={styles.closeCalendarText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Success Modal */}
          <Modal
            visible={showSuccessModal}
            transparent={true}
            animationType="fade"
            onRequestClose={handleSuccessModalClose}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.successModalContainer}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={60} color="#00E676" />
                </View>

                <Text style={styles.successTitle}>Report Submitted Successfully!</Text>
                <Text style={styles.successMessage}>
                  Thank you for your environmental report. Your submission helps us monitor and improve air quality in our community.
                </Text>

                <View style={styles.successButtonContainer}>
                  <TouchableOpacity
                    style={styles.successButton}
                    onPress={handleSuccessModalClose}
                  >
                    <Text style={styles.successButtonText}>Submit Another Report</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.successSecondaryButton}
                    onPress={() => {
                      setShowSuccessModal(false);
                      clearForm();
                      navigation.goBack();
                    }}
                  >
                    <Text style={styles.successSecondaryButtonText}>Back to Home</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A'
  },
  gradient: {
    flex: 1
  },
  safeArea: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20
  },

  // Header Styles
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15, 15, 35, 0.8)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isLargeScreen ? 40 : 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 20,
    alignSelf: 'center',
    width: '100%',
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
    fontSize: isLargeScreen ? 20 : 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1
  },
  placeholder: {
    width: 36
  },

  // Main Layout
  mainContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentWrapper: {
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: isLargeScreen ? 40 : 20,
    paddingTop: 30,
    flexDirection: isLargeScreen ? 'row' : 'column',
    gap: isLargeScreen ? 40 : 0,
  },
  leftColumn: {
    flex: isLargeScreen ? 1 : undefined,
    marginRight: isLargeScreen ? 20 : 0,
  },
  rightColumn: {
    flex: isLargeScreen ? 1 : undefined,
    marginLeft: isLargeScreen ? 20 : 0,
  },

  // Section Styles
  section: {
    marginBottom: isLargeScreen ? 30 : 20
  },
  sectionTitle: {
    fontSize: isLargeScreen ? 16 : 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: isLargeScreen ? 16 : 12
  },

  // Type Grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: isLargeScreen ? 12 : 8,
  },
  typeCard: {
    width: isLargeScreen ? 'calc(33.33% - 8px)' : '48%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: isLargeScreen ? 16 : 12,
    padding: isLargeScreen ? 20 : 12,
    alignItems: 'center',
    marginBottom: isLargeScreen ? 12 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: isLargeScreen ? 100 : 80,
    justifyContent: 'center',
  },
  typeCardSelected: {
    backgroundColor: 'rgba(0,230,118,0.15)',
    borderColor: '#00E676'
  },
  typeText: {
    fontSize: isLargeScreen ? 14 : 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: isLargeScreen ? 8 : 4,
    textAlign: 'center'
  },
  typeTextSelected: {
    color: '#00E676',
    fontWeight: '600'
  },

  // Form Elements
  locationInputContainer: {
    position: 'relative'
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: isLargeScreen ? 16 : 12,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: isLargeScreen ? 20 : 14,
  },
  input: {
    padding: isLargeScreen ? 18 : 14,
    fontSize: isLargeScreen ? 16 : 14,
    color: '#FFFFFF',
    flex: 1
  },
  inputIcon: {
    marginLeft: 10
  },
  textArea: {
    height: isLargeScreen ? 160 : 80,
    textAlignVertical: 'top',
  },

  // Photo Card
  photoCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: isLargeScreen ? 16 : 12,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
    height: isLargeScreen ? 200 : 120,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  photoText: {
    color: '#00E676',
    fontSize: isLargeScreen ? 14 : 12,
    marginTop: isLargeScreen ? 8 : 4
  },

  // Anonymous Card
  anonymousCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: isLargeScreen ? 16 : 12,
    padding: isLargeScreen ? 20 : 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
    marginBottom: isLargeScreen ? 30 : 20,
  },
  anonymousLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  anonymousText: {
    color: '#FFFFFF',
    fontSize: isLargeScreen ? 16 : 14,
    marginLeft: 8
  },
  checkbox: {
    width: isLargeScreen ? 24 : 20,
    height: isLargeScreen ? 24 : 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#00E676',
    borderColor: '#00E676'
  },

  // Submit Button
  submitButton: {
    backgroundColor: '#00E676',
    borderRadius: isLargeScreen ? 16 : 12,
    paddingVertical: isLargeScreen ? 20 : 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(0,230,118,0.5)'
  },
  submitButtonText: {
    color: '#0A0A0A',
    fontSize: isLargeScreen ? 18 : 16,
    fontWeight: '700'
  },

  // Suggestion Styles
  loadingContainer: {
    padding: 20,
    alignItems: 'center'
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center'
  },
  noResultsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14
  },
  suggestionContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    zIndex: 1000,
    elevation: 10,
    overflow: 'hidden',
  },
  suggestionList: {
    maxHeight: 200
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isLargeScreen ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  suggestionTextContainer: {
    flex: 1,
    marginLeft: 10
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: isLargeScreen ? 16 : 14,
    fontWeight: '600'
  },
  suggestionSubText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: isLargeScreen ? 13 : 12,
    marginTop: 2
  },

  // Calendar Styles
  calendarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    paddingHorizontal: 20,
  },
  calendarContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: isLargeScreen ? 20 : 12,
    padding: isLargeScreen ? 24 : 16,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
    maxWidth: isLargeScreen ? 500 : '100%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  closeCalendarButton: {
    backgroundColor: '#00E676',
    borderRadius: isLargeScreen ? 12 : 8,
    paddingVertical: isLargeScreen ? 16 : 12,
    alignItems: 'center',
    marginTop: isLargeScreen ? 20 : 16,
  },
  closeCalendarText: {
    color: '#0A0A0A',
    fontSize: isLargeScreen ? 16 : 14,
    fontWeight: '600'
  },

  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successModalContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: isLargeScreen ? 24 : 16,
    padding: isLargeScreen ? 32 : 24,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
    maxWidth: isLargeScreen ? 450 : '100%',
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 25,
  },
  successIconContainer: {
    width: isLargeScreen ? 100 : 80,
    height: isLargeScreen ? 100 : 80,
    borderRadius: isLargeScreen ? 50 : 40,
    backgroundColor: 'rgba(0,230,118,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isLargeScreen ? 24 : 20,
    borderWidth: 2,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  successTitle: {
    fontSize: isLargeScreen ? 24 : 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: isLargeScreen ? 16 : 12,
  },
  successMessage: {
    fontSize: isLargeScreen ? 16 : 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: isLargeScreen ? 24 : 20,
    marginBottom: isLargeScreen ? 32 : 24,
  },
  successButtonContainer: {
    width: '100%',
    gap: isLargeScreen ? 16 : 12,
  },
  successButton: {
    backgroundColor: '#00E676',
    borderRadius: isLargeScreen ? 16 : 12,
    paddingVertical: isLargeScreen ? 18 : 14,
    alignItems: 'center',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successButtonText: {
    color: '#0A0A0A',
    fontSize: isLargeScreen ? 16 : 14,
    fontWeight: '700',
  },
  successSecondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: isLargeScreen ? 16 : 12,
    paddingVertical: isLargeScreen ? 18 : 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  successSecondaryButtonText: {
    color: '#FFFFFF',
    fontSize: isLargeScreen ? 16 : 14,
    fontWeight: '600',
  },
});

export default ReportScreen;