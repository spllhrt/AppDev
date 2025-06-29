import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
  Alert, TextInput, StatusBar, Platform, Image, Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../../redux/authSlice';
import { updateUserProfile } from '../../api/auth';
import { updateHealthProfile, getHealthProfile } from '../../api/health';
import * as ImagePicker from 'expo-image-picker';


// List of all cities in Metro Manila
const metroManilaCities = [
  'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong',
  'Manila', 'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque',
  'Pasay', 'Pasig', 'Quezon City', 'San Juan', 'Taguig', 'Valenzuela'
];


const ProfileScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
 
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    city: user?.city || '',
    // Health fields
    age: '',
    gender: '',
    isPregnant: false,
    isSmoker: false,
    hasAsthma: false,
    hasHeartDisease: false,
    hasRespiratoryIssues: false,
    outdoorExposure: '',
  });
  const [imageUri, setImageUri] = useState(user?.avatar?.url || null);
  const [showImageModal, setShowImageModal] = useState(false);


  useEffect(() => {
    loadProfileData();
  }, [user]);


  const loadProfileData = async () => {
    try {
      // Load health profile data
      const healthData = await getHealthProfile();
      setProfileData({
        name: user?.name || '',
        email: user?.email || '',
        city: user?.city || '',
        age: healthData.healthProfile?.age?.toString() || '',
        gender: healthData.healthProfile?.gender || '',
        isPregnant: healthData.healthProfile?.isPregnant || false,
        isSmoker: healthData.healthProfile?.isSmoker || false,
        hasAsthma: healthData.healthProfile?.hasAsthma || false,
        hasHeartDisease: healthData.healthProfile?.hasHeartDisease || false,
        hasRespiratoryIssues: healthData.healthProfile?.hasRespiratoryIssues || false,
        outdoorExposure: healthData.healthProfile?.outdoorExposure || '',
      });
    } catch (error) {
      console.log('No health profile found, using defaults');
    }
    setImageUri(user?.avatar?.url || null);
  };


  const saveProfile = async () => {
    try {
      // Update user profile
      const formData = new FormData();
      formData.append('name', profileData.name);
      formData.append('city', profileData.city);
     
      if (imageUri && imageUri !== user?.avatar?.url) {
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('avatar', { uri: imageUri, name: filename || 'avatar.jpg', type });
      }
     
      const userResponse = await updateUserProfile(formData);
      dispatch(updateUser(userResponse.user));


      // Update health profile
      const healthData = {
        age: parseInt(profileData.age) || undefined,
        gender: profileData.gender || undefined,
        isPregnant: profileData.isPregnant,
        isSmoker: profileData.isSmoker,
        hasAsthma: profileData.hasAsthma,
        hasHeartDisease: profileData.hasHeartDisease,
        hasRespiratoryIssues: profileData.hasRespiratoryIssues,
        outdoorExposure: profileData.outdoorExposure || undefined,
      };
     
      await updateHealthProfile(healthData);
     
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
      loadProfileData(); // Reset on error
    }
  };


  const handleImagePick = async () => {
    if (!isEditing) return;
   
    Alert.alert('Select Photo', '', [
      { text: 'Camera', onPress: () => pickImage('camera') },
      { text: 'Gallery', onPress: () => pickImage('gallery') },
      { text: 'Remove', onPress: () => setImageUri(null), style: 'destructive' },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };


  const pickImage = async (source) => {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });


    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };


  const renderInput = (field, label, icon, options = {}) => {
    if (field === 'city') {
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{label}</Text>
          <View style={[styles.inputContainer, isEditing && styles.inputActive]}>
            <Ionicons name={icon} size={16} color="#00E676" />
            {isEditing ? (
              <Picker
                selectedValue={profileData.city}
                onValueChange={(value) => setProfileData(prev => ({ ...prev, city: value }))}
                style={[styles.input, { flex: 1, marginLeft: 12 }]}
                dropdownIconColor="#FFFFFF"
              >
                {metroManilaCities.map(city => (
                  <Picker.Item key={city} label={city} value={city} />
                ))}
              </Picker>
            ) : (
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={profileData.city}
                editable={false}
                placeholder="Select your city"
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
            )}
          </View>
        </View>
      );
    }


    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.inputContainer, isEditing && styles.inputActive]}>
          <Ionicons name={icon} size={16} color="#00E676" />
          {options.type === 'picker' ? (
            <Picker
              selectedValue={profileData[field]}
              onValueChange={(value) => setProfileData(prev => ({ ...prev, [field]: value }))}
              style={styles.picker}
              enabled={isEditing}
            >
              <Picker.Item label="Select..." value="" />
              {options.items.map(item => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
          ) : options.type === 'switch' ? (
            <TouchableOpacity
              style={[styles.switch, profileData[field] && styles.switchActive]}
              onPress={() => isEditing && setProfileData(prev => ({ ...prev, [field]: !prev[field] }))}
              disabled={!isEditing}
            >
              <Text style={styles.switchText}>{profileData[field] ? 'Yes' : 'No'}</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={profileData[field]}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, [field]: text }))}
              placeholder={options.placeholder || `Enter ${label.toLowerCase()}`}
              placeholderTextColor="rgba(255,255,255,0.5)"
              editable={isEditing && field !== 'email'}
              keyboardType={options.keyboardType || 'default'}
            />
          )}
        </View>
      </View>
    );
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
         
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity
              style={[styles.headerBtn, isEditing && styles.saveBtn]}
              onPress={() => isEditing ? saveProfile() : setIsEditing(true)}
            >
              <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>


          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
           
            {/* Profile Header */}
            <View style={styles.profileCard}>
              <TouchableOpacity style={styles.avatar} onPress={handleImagePick}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {profileData.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                {isEditing && (
                  <View style={styles.cameraIcon}>
                    <Ionicons name="camera" size={12} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.userName}>{profileData.name || 'User'}</Text>
              <Text style={styles.userEmail}>{profileData.email}</Text>
            </View>


            {/* Personal Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.card}>
                {renderInput('name', 'Full Name', 'person-outline')}
                {renderInput('email', 'Email', 'mail-outline')}
                {renderInput('city', 'City', 'location-outline')}
              </View>
            </View>


            {/* Health Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Health Information</Text>
              <View style={styles.card}>
                {renderInput('age', 'Age', 'calendar-outline', { keyboardType: 'numeric' })}
                {renderInput('gender', 'Gender', 'person-outline', {
                  type: 'picker',
                  items: [
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' },
                    { label: 'Other', value: 'other' }
                  ]
                })}
                {renderInput('outdoorExposure', 'Outdoor Exposure', 'sunny-outline', {
                  type: 'picker',
                  items: [
                    { label: 'Low (< 2 hours/day)', value: 'low' },
                    { label: 'Moderate (2-6 hours/day)', value: 'moderate' },
                    { label: 'High (> 6 hours/day)', value: 'high' }
                  ]
                })}
              </View>
            </View>


            {/* Health Conditions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Health Conditions</Text>
              <View style={styles.card}>
                {profileData.gender === 'female' && renderInput('isPregnant', 'Pregnant', 'heart-outline', { type: 'switch' })}
                {renderInput('isSmoker', 'Smoker', 'ban-outline', { type: 'switch' })}
                {renderInput('hasAsthma', 'Asthma', 'fitness-outline', { type: 'switch' })}
                {renderInput('hasHeartDisease', 'Heart Disease', 'heart-outline', { type: 'switch' })}
                {renderInput('hasRespiratoryIssues', 'Respiratory Issues', 'body-outline', { type: 'switch' })}
              </View>
            </View>


            {isEditing && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setIsEditing(false); loadProfileData(); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>


      {/* Image Modal */}
      <Modal visible={showImageModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modal} onPress={() => setShowImageModal(false)}>
          <Image source={{ uri: imageUri }} style={styles.fullImage} />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setShowImageModal(false)}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 20,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1,
  },
  saveBtn: { backgroundColor: 'rgba(0,230,118,0.2)', borderColor: '#00E676' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  content: { flex: 1, paddingHorizontal: 20 },
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, padding: 30, alignItems: 'center',
    marginBottom: 25, borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#00E676', marginBottom: 15, overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 40 },
  avatarPlaceholder: {
    width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,230,118,0.2)',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#00E676', justifyContent: 'center', alignItems: 'center',
  },
  userName: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  userEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 15 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 15, padding: 20,
    borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15, paddingVertical: 12,
  },
  inputActive: { backgroundColor: 'rgba(0,230,118,0.1)', borderColor: '#00E676' },
  input: { flex: 1, fontSize: 14, color: '#FFFFFF', marginLeft: 12, fontWeight: '500' },
  inputDisabled: { color: 'rgba(255,255,255,0.7)' },
  picker: { flex: 1, color: '#FFFFFF', marginLeft: 8 },
  switch: {
    marginLeft: 12, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
  },
  switchActive: { backgroundColor: 'rgba(0,230,118,0.2)' },
  switchText: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 15, alignItems: 'center', borderRadius: 12,
    marginTop: 20, marginBottom: 40,
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  modal: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullImage: { width: '90%', height: '50%', borderRadius: 20 },
  closeBtn: {
    position: 'absolute', top: 60, right: 30,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
});


export default ProfileScreen;















