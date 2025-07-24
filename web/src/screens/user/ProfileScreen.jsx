import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
  Alert, TextInput, StatusBar, Platform, Image, Modal, Dimensions, FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../../redux/authSlice';
import { updateUserProfile } from '../../api/auth';
import { updateHealthProfile, getHealthProfile } from '../../api/health';
import * as ImagePicker from 'expo-image-picker';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
    name: user?.name || '', email: user?.email || '', city: user?.city || '',
    age: '', gender: '', isPregnant: false, isSmoker: false, hasAsthma: false,
    hasHeartDisease: false, hasRespiratoryIssues: false, outdoorExposure: '',
  });
  const [imageUri, setImageUri] = useState(user?.avatar?.url || null);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // Modal state for messages
  const [messageModal, setMessageModal] = useState({
    visible: false,
    type: 'info', // 'success', 'error', 'warning', 'info'
    title: '',
    message: '',
    buttons: []
  });
  
  const isWeb = screenWidth > 768;

  useEffect(() => {
    loadProfileData();
  }, [user]);

  // Function to show message modal
  const showMessageModal = (type, title, message, buttons = []) => {
    const defaultButtons = [
      {
        text: 'OK',
        onPress: () => setMessageModal(prev => ({ ...prev, visible: false })),
        style: 'default'
      }
    ];

    setMessageModal({
      visible: true,
      type,
      title,
      message,
      buttons: buttons.length > 0 ? buttons : defaultButtons
    });
  };

  const loadProfileData = async () => {
    try {
      const healthData = await getHealthProfile();
      setProfileData({
        name: user?.name || '', email: user?.email || '', city: user?.city || '',
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
      showMessageModal('info', 'Profile Loading', 'Using default profile settings. You can update your information anytime.');
    }
    setImageUri(user?.avatar?.url || null);
  };

  const saveProfile = async () => {
  try {
    const formData = new FormData();

    formData.append('name', profileData.name);
    formData.append('city', profileData.city);

    if (imageUri && imageUri !== user?.avatar?.url) {
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase();
      const type = ext ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        // Web: fetch the blob from the URI
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('avatar', blob, filename || 'avatar.jpg');
      } else {
        // Mobile: use uri, name, and type
        formData.append('avatar', {
          uri: imageUri,
          name: filename || 'avatar.jpg',
          type: type,
        });
      }
    }

    const userResponse = await updateUserProfile(formData);
    dispatch(updateUser(userResponse.user));

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
    showMessageModal('success', 'Success!', 'Your profile has been updated successfully.');
  } catch (error) {
    console.error('Error updating profile:', error);
    showMessageModal(
      'error',
      'Update Failed',
      error.message || 'Failed to update profile. Please try again.'
    );
    loadProfileData();
  }
};

  const handleImagePick = async () => {
    if (!isEditing) return;
    
    const buttons = [
      {
        text: 'Camera',
        onPress: () => {
          setMessageModal(prev => ({ ...prev, visible: false }));
          setTimeout(() => pickImage('camera'), 300);
        }
      },
      {
        text: 'Gallery',
        onPress: () => {
          setMessageModal(prev => ({ ...prev, visible: false }));
          setTimeout(() => pickImage('gallery'), 300);
        }
      },
      {
        text: 'Remove Photo',
        onPress: () => {
          setImageUri(null);
          setMessageModal(prev => ({ ...prev, visible: false }));
        },
        style: 'destructive'
      },
      {
        text: 'Cancel',
        onPress: () => setMessageModal(prev => ({ ...prev, visible: false })),
        style: 'cancel'
      }
    ];

    showMessageModal('info', 'Select Photo', 'Choose how you want to update your profile picture:', buttons);
  };

  const pickImage = async (source) => {
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      
      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
        showMessageModal('success', 'Photo Selected', 'Your profile photo has been updated. Don\'t forget to save your changes!');
      }
    } catch (error) {
      showMessageModal('error', 'Photo Selection Failed', 'Unable to select photo. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    const buttons = [
      {
        text: 'Discard Changes',
        onPress: () => {
          setIsEditing(false);
          loadProfileData();
          setMessageModal(prev => ({ ...prev, visible: false }));
        },
        style: 'destructive'
      },
      {
        text: 'Continue Editing',
        onPress: () => setMessageModal(prev => ({ ...prev, visible: false })),
        style: 'cancel'
      }
    ];

    showMessageModal('warning', 'Unsaved Changes', 'You have unsaved changes. Are you sure you want to discard them?', buttons);
  };

  const renderInput = (field, label, icon, options = {}) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, isEditing && styles.inputActive]}>
        <Ionicons name={icon} size={16} color="#00E676" />
        {field === 'city' && isEditing ? (
          <Picker
            selectedValue={profileData.city}
            onValueChange={(value) => setProfileData(prev => ({ ...prev, city: value }))}
            style={styles.picker}
          >
            {metroManilaCities.map(city => (
              <Picker.Item key={city} label={city} value={city} />
            ))}
          </Picker>
        ) : options.type === 'picker' ? (
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

  const ProfileCard = () => (
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
      
      <View style={styles.actionButtons}>
        {isEditing ? (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const formSections = [
    {
      id: 'personal',
      title: 'Personal Information',
      content: (
        <View style={styles.card}>
          <View style={styles.formRow}>
            <View style={styles.formColumn}>
              {renderInput('name', 'Full Name', 'person-outline')}
            </View>
            <View style={styles.formColumn}>
              {renderInput('email', 'Email', 'mail-outline')}
            </View>
          </View>
          <View style={styles.formRow}>
            <View style={styles.formColumn}>
              {renderInput('city', 'City', 'location-outline')}
            </View>
            <View style={styles.formColumn}>
              {renderInput('age', 'Age', 'calendar-outline', { keyboardType: 'numeric' })}
            </View>
          </View>
        </View>
      )
    },
    {
      id: 'health',
      title: 'Health Information',
      content: (
        <View style={styles.card}>
          <View style={styles.formRow}>
            <View style={styles.formColumn}>
              {renderInput('gender', 'Gender', 'person-outline', {
                type: 'picker',
                items: [
                  { label: 'Male', value: 'male' },
                  { label: 'Female', value: 'female' },
                  { label: 'Other', value: 'other' }
                ]
              })}
            </View>
            <View style={styles.formColumn}>
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
        </View>
      )
    },
    {
      id: 'conditions',
      title: 'Health Conditions',
      content: (
        <View style={styles.card}>
          <View style={styles.healthConditions}>
            {profileData.gender === 'female' && (
              <View style={styles.conditionItem}>
                {renderInput('isPregnant', 'Pregnant', 'heart-outline', { type: 'switch' })}
              </View>
            )}
            <View style={styles.conditionItem}>
              {renderInput('isSmoker', 'Smoker', 'ban-outline', { type: 'switch' })}
            </View>
            <View style={styles.conditionItem}>
              {renderInput('hasAsthma', 'Asthma', 'fitness-outline', { type: 'switch' })}
            </View>
            <View style={styles.conditionItem}>
              {renderInput('hasHeartDisease', 'Heart Disease', 'heart-outline', { type: 'switch' })}
            </View>
            <View style={styles.conditionItem}>
              {renderInput('hasRespiratoryIssues', 'Respiratory Issues', 'body-outline', { type: 'switch' })}
            </View>
          </View>
        </View>
      )
    }
  ];

  const renderSection = ({ item }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{item.title}</Text>
      {item.content}
    </View>
  );

  const getModalIconName = (type) => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'info':
      default: return 'information-circle';
    }
  };

  const getModalIconColor = (type) => {
    switch (type) {
      case 'success': return '#00E676';
      case 'error': return '#FF5252';
      case 'warning': return '#FFC107';
      case 'info':
      default: return '#2196F3';
    }
  };

  const MessageModal = () => (
    <Modal
      visible={messageModal.visible}
      transparent
      animationType="fade"
      onRequestClose={() => setMessageModal(prev => ({ ...prev, visible: false }))}
    >
      <View style={styles.messageModalOverlay}>
        <View style={styles.messageModalContainer}>
          <View style={styles.messageModalHeader}>
            <Ionicons 
              name={getModalIconName(messageModal.type)} 
              size={32} 
              color={getModalIconColor(messageModal.type)} 
            />
            <Text style={styles.messageModalTitle}>{messageModal.title}</Text>
          </View>
          
          <Text style={styles.messageModalText}>{messageModal.message}</Text>
          
          <View style={styles.messageModalButtons}>
            {messageModal.buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.messageModalButton,
                  button.style === 'destructive' && styles.messageModalButtonDestructive,
                  button.style === 'cancel' && styles.messageModalButtonCancel,
                  messageModal.buttons.length === 1 && styles.messageModalButtonSingle
                ]}
                onPress={button.onPress}
              >
                <Text style={[
                  styles.messageModalButtonText,
                  button.style === 'destructive' && styles.messageModalButtonTextDestructive,
                  button.style === 'cancel' && styles.messageModalButtonTextCancel
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Settings</Text>
          <TouchableOpacity
            style={[styles.headerBtn, isEditing && styles.saveBtn]}
            onPress={() => (isEditing ? saveProfile() : setIsEditing(true))}
          >
            <Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isWeb ? (
          <View style={styles.webLayout}>
            <View style={styles.leftColumn}>
              <ProfileCard />
            </View>
            <View style={styles.rightColumn}>
              <View style={styles.rightColumnContent}>
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  scrollIndicatorInsets={{ right: 2 }}
                  bounces={false}
                >
                  {formSections.map((section) => (
                    <View key={section.id} style={styles.section}>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      {section.content}
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        ) : (
          <FlatList
            data={[{ id: 'profile', content: <ProfileCard /> }, ...formSections]}
            renderItem={({ item }) => item.id === 'profile' ? item.content : renderSection({ item })}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
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

      {/* Message Modal */}
      <MessageModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1,
  },
  saveBtn: { backgroundColor: 'rgba(0,230,118,0.2)', borderColor: '#00E676' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  
  webLayout: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 32,
  },
  leftColumn: { 
    width: 400,
    flexShrink: 0,
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  rightColumnContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
    height: '100%',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 20, 
    padding: 30, 
    alignItems: 'center',
    marginBottom: 25, 
    borderColor: 'rgba(0,230,118,0.3)', 
    borderWidth: 1,
  },
  avatar: {
    width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#00E676', marginBottom: 20, overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
  avatarPlaceholder: {
    width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,230,118,0.2)',
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  cameraIcon: {
    position: 'absolute', bottom: 5, right: 5, width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#00E676', justifyContent: 'center', alignItems: 'center',
  },
  userName: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 6 },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  
  actionButtons: { marginTop: 30, width: '100%' },
  editActions: { gap: 15 },
  editButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,230,118,0.2)', borderColor: '#00E676', borderWidth: 1,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, gap: 8,
  },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#00E676', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, gap: 8,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  cancelButton: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20,
  },
  cancelButtonText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  
  section: { 
    marginBottom: 30,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 20, 
    padding: 25,
    borderColor: 'rgba(0,230,118,0.3)', 
    borderWidth: 1,
  },
  
  formRow: { flexDirection: 'row', gap: 20, marginBottom: 0 },
  formColumn: { flex: 1 },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 10 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15, paddingVertical: 14,
  },
  inputActive: { backgroundColor: 'rgba(0,230,118,0.1)', borderColor: '#00E676' },
  input: { flex: 1, fontSize: 14, color: '#FFFFFF', marginLeft: 12, fontWeight: '500' },
  inputDisabled: { color: 'rgba(255,255,255,0.7)' },
  picker: { flex: 1, color: '#FFFFFF', marginLeft: 8 },
  switch: {
    marginLeft: 12, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
  },
  switchActive: { backgroundColor: 'rgba(0,230,118,0.2)' },
  switchText: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  
  healthConditions: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  conditionItem: { width: '48%' },
  
  modal: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center',
  },
  fullImage: { width: '90%', height: '50%', borderRadius: 20 },
  closeBtn: {
    position: 'absolute', top: 60, right: 30, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },

  // Message Modal Styles
  messageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  messageModalContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 25,
    minWidth: 300,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  messageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  messageModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  messageModalText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: 25,
  },
  messageModalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  messageModalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00E676',
    minWidth: 80,
    alignItems: 'center',
  },
  messageModalButtonSingle: {
    flex: 1,
  },
  messageModalButtonDestructive: {
    backgroundColor: '#FF5252',
  },
  messageModalButtonCancel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  messageModalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  messageModalButtonTextDestructive: {
    color: '#FFFFFF',
  },
  messageModalButtonTextCancel: {
    color: 'rgba(255,255,255,0.9)',
  },
});

export default ProfileScreen;