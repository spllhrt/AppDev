import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  Keyboard,
  Dimensions,
  StatusBar,
  Platform,
  Image,
  ActionSheetIOS,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../../redux/authSlice';
import { updateUserProfile } from '../../api/auth';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [imageUri, setImageUri] = useState(user?.avatar?.url || null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setImageUri(user?.avatar?.url || null);
  }, [user]);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await ImagePicker.requestCameraPermissionsAsync();
  };

  const handleEdit = async () => {
    if (isEditing) {
      await saveProfile();
    } else {
      setIsEditing(true);
    }
  };

  const saveProfile = async () => {
    try {
      Keyboard.dismiss();
      
      // Create FormData for proper multipart handling
      const formData = new FormData();
      
      // Add text fields
      formData.append('name', profileData.name);
      formData.append('phone', profileData.phone);

      // Handle image upload properly
      if (imageUri && imageUri !== user?.avatar?.url) {
        // Create proper file object for React Native
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('avatar', {
          uri: imageUri,
          name: filename || 'avatar.jpg',
          type: type,
        });
      }
      
      const response = await updateUserProfile(formData);
      
      // Use the complete user object from response
      dispatch(updateUser(response.user));
      
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
      resetProfileData();
    }
  };

  const resetProfileData = () => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setImageUri(user?.avatar?.url || null);
  };

  const handleAvatarPress = () => {
    if (isEditing) {
      showImagePicker();
    } else if (imageUri) {
      setShowImageModal(true);
    }
  };

  const showImagePicker = () => {
    const options = ['Take Photo', 'Choose from Library', 'Remove Photo', 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 3,
          destructiveButtonIndex: 2,
        },
        handleImagePickerResponse
      );
    } else {
      Alert.alert('Select Profile Picture', 'Choose an option', [
        { text: 'Take Photo', onPress: () => handleImagePickerResponse(0) },
        { text: 'Choose from Library', onPress: () => handleImagePickerResponse(1) },
        { text: 'Remove Photo', onPress: () => handleImagePickerResponse(2), style: 'destructive' },
        { text: 'Cancel', onPress: () => handleImagePickerResponse(3), style: 'cancel' },
      ]);
    }
  };

  const handleImagePickerResponse = async (buttonIndex) => {
    setIsImageLoading(true);
    
    try {
      switch (buttonIndex) {
        case 0:
          await openCamera();
          break;
        case 1:
          await openImageLibrary();
          break;
        case 2:
          setImageUri(null);
          break;
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsImageLoading(false);
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Camera result:', result); // Debug log

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        // Ensure we're getting the URI as a string
        const uri = typeof selectedImage.uri === 'string' ? selectedImage.uri : selectedImage.uri?.toString();
        
        if (uri) {
          setImageUri(uri);
        } else {
          console.error('No valid URI found in camera result');
          Alert.alert('Error', 'Failed to get image from camera');
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImageLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Library result:', result); // Debug log

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        // Ensure we're getting the URI as a string
        const uri = typeof selectedImage.uri === 'string' ? selectedImage.uri : selectedImage.uri?.toString();
        
        if (uri) {
          setImageUri(uri);
        } else {
          console.error('No valid URI found in library result');
          Alert.alert('Error', 'Failed to get image from library');
        }
      }
    } catch (error) {
      console.error('Image library error:', error);
      Alert.alert('Error', 'Failed to open image library');
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    resetProfileData();
    setIsEditing(false);
    Keyboard.dismiss();
  };

  const handleBack = () => {
    if (isEditing) {
      Alert.alert('Unsaved Changes', 'You have unsaved changes. Do you want to save them before leaving?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', onPress: () => navigation.goBack() },
        { text: 'Save', onPress: handleEdit },
      ]);
    } else {
      navigation.goBack();
    }
  };
  
  const getInitials = (name) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const renderAvatar = () => {
    // Ensure imageUri is a valid string before rendering
    if (imageUri && typeof imageUri === 'string') {
      return (
        <Image
          source={{ uri: imageUri }}
          style={styles.avatarImage}
          onError={(error) => {
            console.error('Image load error:', error);
            setImageUri(null);
          }}
        />
      );
    }
    
    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>
          {getInitials(profileData.name)}
        </Text>
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
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Profile</Text>
            
            <TouchableOpacity
              style={[styles.editButton, isEditing && styles.saveButton]}
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isEditing ? "checkmark" : "create-outline"} 
                size={18} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Profile Header Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarSection}>
                <TouchableOpacity 
                  style={styles.avatar}
                  onPress={handleAvatarPress}
                  activeOpacity={0.8}
                  disabled={isImageLoading}
                >
                  {renderAvatar()}
                  
                  {isImageLoading && (
                    <View style={styles.loadingOverlay}>
                      <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                
                {isEditing && (
                  <TouchableOpacity 
                    style={styles.cameraButton} 
                    activeOpacity={0.8}
                    onPress={showImagePicker}
                    disabled={isImageLoading}
                  >
                    <Ionicons 
                      name={isImageLoading ? "refresh" : "camera"} 
                      size={14} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={styles.userName}>
                {profileData.name || user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              
              <View style={styles.roleBadge}>
                <Ionicons name="star" size={10} color="#00E676" />
                <Text style={styles.roleText}>{user?.role || 'User'}</Text>
              </View>
            </View>

            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <View style={styles.formCard}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={[styles.inputContainer, isEditing && styles.inputContainerActive]}>
                    <Ionicons name="person-outline" size={18} color="#00E676" />
                    <TextInput
                      style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                      value={profileData.name}
                      onChangeText={(text) => handleInputChange('name', text)}
                      placeholder="Enter your full name"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      editable={isEditing}
                      returnKeyType="next"
                    />
                    {isEditing && <Ionicons name="create-outline" size={14} color="#00E676" />}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={[styles.inputContainer, isEditing && styles.inputContainerActive]}>
                    <Ionicons name="call-outline" size={18} color="#00E676" />
                    <TextInput
                      style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                      value={profileData.phone}
                      onChangeText={(text) => handleInputChange('phone', text)}
                      placeholder="Enter your phone number"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      editable={isEditing}
                      keyboardType="phone-pad"
                      returnKeyType="done"
                    />
                    {isEditing && <Ionicons name="create-outline" size={14} color="#00E676" />}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.6)" />
                    <TextInput
                      style={[styles.textInput, styles.textInputDisabled]}
                      value={profileData.email}
                      placeholder="Email address"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      editable={false}
                    />
                    <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.6)" />
                  </View>
                  <Text style={styles.helperText}>Email cannot be changed</Text>
                </View>
              </View>
            </View>

            {/* Cancel Button for Edit Mode */}
            {isEditing && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel Changes</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Image View Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => setShowImageModal(false)}
          >
            <View style={styles.modalContent}>
              {imageUri && typeof imageUri === 'string' && (
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.fullImage}
                  onError={(error) => {
                    console.error('Modal image load error:', error);
                    setShowImageModal(false);
                  }}
                />
              )}
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowImageModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: 'rgba(0,230,118,0.2)',
    borderColor: '#00E676',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
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
  avatarSection: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,230,118,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00E676',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,230,118,0.2)',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,230,118,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00E676',
    marginLeft: 4,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 15,
    padding: 20,
    borderColor: 'rgba(0,230,118,0.3)',
    borderWidth: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  inputContainerActive: {
    backgroundColor: 'rgba(0,230,118,0.1)',
    borderColor: '#00E676',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 12,
    fontWeight: '500',
  },
  textInputDisabled: {
    color: 'rgba(255,255,255,0.7)',
  },
  helperText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
    fontStyle: 'italic',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    position: 'relative',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: 20,
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileScreen;