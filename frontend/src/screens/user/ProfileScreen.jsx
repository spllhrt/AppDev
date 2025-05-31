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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../../redux/authSlice';
import { updateUserProfile } from '../../api/auth'; // Import the API function

const ProfileScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Update profileData when user data changes
  useEffect(() => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  }, [user]);

  const handleEdit = async () => {
    if (isEditing) {
      // Save changes logic
      try {
        console.log('Saving profile changes:', profileData);
        
        // Dismiss keyboard first
        Keyboard.dismiss();
        
        // Prepare data for API call (exclude email as it's not editable)
        const updateData = {
          name: profileData.name,
          phone: profileData.phone,
        };
        
        // Make API call to update the database
        const response = await updateUserProfile(updateData);
        
        // Update Redux state only after successful API call
        dispatch(updateUser({
          name: profileData.name,
          phone: profileData.phone,
        }));
        
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } catch (error) {
        console.error('Error updating profile:', error);
        Alert.alert(
          'Error', 
          error.message || 'Failed to update profile. Please try again.'
        );
        
        // Reset to original data on error
        setProfileData({
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
        });
      }
    } else {
      setIsEditing(true);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCancelEdit = () => {
    // Reset to original data
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setIsEditing(false);
    Keyboard.dismiss();
  };

  const profileOptions = [
    {
      id: 1,
      title: 'Edit Profile',
      icon: 'create-outline',
      onPress: handleEdit,
      rightText: isEditing ? 'Save' : 'Edit',
      color: '#667eea',
    },
    {
      id: 2,
      title: 'Change Password',
      icon: 'lock-closed-outline',
      onPress: () => {
        if (!isEditing) {
          Alert.alert('Change Password', 'Feature coming soon!');
        }
      },
      color: '#764ba2',
      disabled: isEditing,
    },
  ];

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (isEditing) {
                Alert.alert(
                  'Unsaved Changes',
                  'You have unsaved changes. Do you want to save them before leaving?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Discard', onPress: () => navigation.goBack() },
                    { text: 'Save', onPress: handleEdit },
                  ]
                );
              } else {
                navigation.goBack();
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          {isEditing && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {!isEditing && <View style={styles.placeholder} />}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#667eea" />
              </View>
              <TouchableOpacity 
                style={styles.cameraButton} 
                activeOpacity={0.7}
                onPress={() => Alert.alert('Photo Upload', 'Photo upload feature coming soon!')}
                disabled={isEditing}
              >
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.userName}>
              {profileData.name || user?.email?.split('@')[0] || 'User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.userRole}>Role: {user?.role || 'User'}</Text>
          </View>

          {/* Profile Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[
                  styles.inputWrapper, 
                  isEditing && styles.inputWrapperActive
                ]}>
                  <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={profileData.name}
                    onChangeText={(text) => handleInputChange('name', text)}
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                    editable={isEditing}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={[
                  styles.inputWrapper, 
                  isEditing && styles.inputWrapperActive
                ]}>
                  <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={profileData.phone}
                    onChangeText={(text) => handleInputChange('phone', text)}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#999"
                    editable={isEditing}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, styles.textInputDisabled]}
                    value={profileData.email}
                    placeholder="Email address"
                    placeholderTextColor="#999"
                    editable={false}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Profile Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Settings</Text>
            <View style={styles.optionsCard}>
              {profileOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    index === profileOptions.length - 1 && styles.lastOptionItem,
                    option.disabled && styles.optionItemDisabled
                  ]}
                  onPress={option.onPress}
                  activeOpacity={option.disabled ? 1 : 0.7}
                  disabled={option.disabled}
                >
                  <View style={styles.optionLeft}>
                    <View style={[
                      styles.optionIconContainer, 
                      { backgroundColor: option.disabled ? '#ccc' : option.color }
                    ]}>
                      <Ionicons name={option.icon} size={20} color="#fff" />
                    </View>
                    <Text style={[
                      styles.optionTitle,
                      option.disabled && styles.optionTitleDisabled
                    ]}>
                      {option.title}
                    </Text>
                  </View>
                  <View style={styles.optionRight}>
                    {option.rightText && (
                      <Text style={[
                        styles.optionRightText, 
                        { color: option.disabled ? '#ccc' : option.color }
                      ]}>
                        {option.rightText}
                      </Text>
                    )}
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={option.disabled ? '#e0e0e0' : '#ccc'} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Add some bottom padding for better scrolling */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#999',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 15,
    height: 50,
  },
  inputWrapperActive: {
    borderColor: '#667eea',
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  textInputDisabled: {
    color: '#999',
  },
  optionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  optionItemDisabled: {
    opacity: 0.5,
  },
  lastOptionItem: {
    borderBottomWidth: 0,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionTitleDisabled: {
    color: '#999',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionRightText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  bottomPadding: {
    height: 50,
  },
});

export default ProfileScreen;