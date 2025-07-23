import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, 
  TextInput, Alert, Platform, StatusBar, Image
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Calendar } from 'react-native-calendars';
import { submitReport } from '../../api/report';

const ReportScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    type: '', location: '', time: '', description: '', isAnonymous: false,
  });
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const blurTimeoutRef = useRef(null);

  const reportTypes = [
    { id: 'Smoke', label: 'Smoke', icon: 'cloud-outline' },
    { id: 'Dust', label: 'Dust', icon: 'cloudy-outline' },
    { id: 'Odor', label: 'Odor', icon: 'alert-circle-outline' },
    { id: 'Chemical Leak', label: 'Chemical Leak', icon: 'flask-outline' },
    { id: 'Others', label: 'Others', icon: 'ellipsis-horizontal-outline' },
  ];

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
      Object.keys(formData).forEach(key => submitData.append(key, formData[key]));
      if (photo) {
        submitData.append('photo', {
          uri: photo.uri, type: 'image/jpeg', name: 'report.jpg',
        });
      }
      await submitReport(submitData);
      Alert.alert('Success', 'Report submitted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSelect = (location) => {
    setFormData({...formData, location: location.name});
    setLocationQuery(location.name);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
  };

  const handleLocationInputChange = (text) => {
    setLocationQuery(text);
    setFormData({...formData, location: text});
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
    setFormData({...formData, time: formattedDate});
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
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Environmental Report</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Report Type *</Text>
              <View style={styles.typeGrid}>
                {reportTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.typeCard, formData.type === type.id && styles.typeCardSelected]}
                    onPress={() => setFormData({...formData, type: type.id})}
                  >
                    <Ionicons
                      name={type.icon}
                      size={24}
                      color={formData.type === type.id ? '#00E676' : 'rgba(255,255,255,0.7)'}
                    />
                    <Text style={[styles.typeText, formData.type === type.id && styles.typeTextSelected]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date Occurred</Text>
              <TouchableOpacity style={styles.formCard} onPress={() => setShowCalendar(true)}>
                <Text style={[styles.input, {color: formData.time ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}]}>
                  {formData.time || 'Select date when this occurred'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#00E676" />
              </TouchableOpacity>
            </View>

            {showCalendar && (
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
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description *</Text>
              <View style={styles.formCard}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe the air quality issue in detail..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={formData.description}
                  onChangeText={(text) => setFormData({...formData, description: text})}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Photo Evidence</Text>
              <TouchableOpacity style={styles.photoCard} onPress={handleImagePicker}>
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera" size={32} color="#00E676" />
                    <Text style={styles.photoText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.anonymousCard}
              onPress={() => setFormData({...formData, isAnonymous: !formData.isAnonymous})}
            >
              <View style={styles.anonymousLeft}>
                <Ionicons name="shield-outline" size={20} color="#00E676" />
                <Text style={styles.anonymousText}>Submit Anonymously</Text>
              </View>
              <View style={[styles.checkbox, formData.isAnonymous && styles.checkboxSelected]}>
                {formData.isAnonymous && <Ionicons name="checkmark" size={14} color="#0A0A0A" />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', flex: 1 },
  placeholder: { width: 36 },
  content: { flex: 1, paddingHorizontal: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  typeCard: {
    width: '48%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 12, alignItems: 'center', marginBottom: 8, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeCardSelected: { backgroundColor: 'rgba(0,230,118,0.15)', borderColor: '#00E676' },
  typeText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' },
  typeTextSelected: { color: '#00E676', fontWeight: '600' },
  locationInputContainer: { position: 'relative' },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1, flexDirection: 'row',
    alignItems: 'center', paddingRight: 14,
  },
  input: { padding: 14, fontSize: 14, color: '#FFFFFF', flex: 1 },
  inputIcon: { marginLeft: 10 },
  textArea: { height: 80 },
  photoCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1, height: 120, overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photoText: { color: '#00E676', fontSize: 12, marginTop: 4 },
  anonymousCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1, marginBottom: 20,
  },
  anonymousLeft: { flexDirection: 'row', alignItems: 'center' },
  anonymousText: { color: '#FFFFFF', fontSize: 14, marginLeft: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: '#00E676', borderColor: '#00E676' },
  submitButton: {
    backgroundColor: '#00E676', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 40,
  },
  submitButtonDisabled: { backgroundColor: 'rgba(0,230,118,0.5)' },
  submitButtonText: { color: '#0A0A0A', fontSize: 16, fontWeight: '700' },
  loadingContainer: { padding: 20, alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  noResultsContainer: { padding: 20, alignItems: 'center' },
  noResultsText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  suggestionContainer: {
    position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 200,
    backgroundColor: 'rgba(26, 26, 46, 0.95)', borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)', borderTopWidth: 0, borderTopLeftRadius: 0,
    borderTopRightRadius: 0, zIndex: 1000, elevation: 10, overflow: 'hidden',
  },
  suggestionList: { maxHeight: 200 },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  suggestionTextContainer: { flex: 1, marginLeft: 10 },
  suggestionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  suggestionSubText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  calendarContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.95)', borderRadius: 12, padding: 16,
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1, marginBottom: 20,
  },
  closeCalendarButton: {
    backgroundColor: '#00E676', borderRadius: 8, paddingVertical: 12,
    alignItems: 'center', marginTop: 16,
  },
  closeCalendarText: { color: '#0A0A0A', fontSize: 14, fontWeight: '600' },
});

export default ReportScreen;