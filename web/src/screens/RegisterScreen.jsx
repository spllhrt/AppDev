import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  Modal,
  FlatList,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { registerUser } from '../api/auth';

const { width, height } = Dimensions.get('window');

const metroManilaCities = [
  'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong', 'Manila',
  'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay', 'Pasig',
  'Quezon City', 'San Juan', 'Taguig', 'Valenzuela',
];

const RegisterScreen = ({ navigation }) => {
  const isLargeScreen = width > 768;
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', city: '', profileImage: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  }, [errors]);

  const handleCitySelect = useCallback((city) => {
    setFormData(prev => ({ ...prev, city }));
    setShowCityDropdown(false);
    if (errors.city) setErrors(prev => ({ ...prev, city: '' }));
  }, [errors.city]);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to select a profile image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormData(prev => ({ ...prev, profileImage: result.assets[0] }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    else if (formData.name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.profileImage) newErrors.profileImage = 'Profile image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleRegister = useCallback(async () => {
    if (loading || !validateForm()) return;

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('email', formData.email.trim());
      formDataToSend.append('password', formData.password);
      formDataToSend.append('city', formData.city.trim());

      if (formData.profileImage) {
        if (Platform.OS === 'web') {
          const response = await fetch(formData.profileImage.uri);
          const blob = await response.blob();
          formDataToSend.append('avatar', new File([blob], 'avatar.jpg', { type: blob.type }));
        } else {
          formDataToSend.append('avatar', {
            uri: formData.profileImage.uri.replace('file://', ''),
            type: 'image/jpeg',
            name: 'avatar.jpg',
          });
        }
      }

      await registerUser(formDataToSend);
      setShowActivationModal(true); // Show activation modal instead of success modal
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  }, [formData, loading, validateForm]);

  const handleActivationModalClose = useCallback(() => {
    setShowActivationModal(false);
    navigation.navigate('Login');
  }, [navigation]);

  const handleSuccessModalClose = useCallback(() => {
    setShowSuccessModal(false);
    navigation.navigate('Login');
  }, [navigation]);

  const renderCityItem = useCallback(({ item }) => (
    <TouchableOpacity style={styles.cityItem} onPress={() => handleCitySelect(item)}>
      <Text style={styles.cityText}>{item}</Text>
    </TouchableOpacity>
  ), [handleCitySelect]);

  const renderLeftPanel = () => (
    <View style={styles.leftPanel}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.brandSection}>
        <Text style={styles.brandName}>AirNet AI</Text>
        <Text style={styles.brandTagline}>Smart Air Quality Monitoring</Text>

        <View style={styles.iconContainer}>
          <View style={styles.cloudBase}>
            <View style={styles.cloudPart1} />
            <View style={styles.cloudPart2} />
            <View style={styles.cloudPart3} />
          </View>
          <View style={styles.windLines}>
            <View style={[styles.windLine, styles.windLine1]} />
            <View style={[styles.windLine, styles.windLine2]} />
            <View style={[styles.windLine, styles.windLine3]} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderRightPanel = () => (
    <View style={styles.rightPanel}>
      <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Create Account</Text>
          <Text style={styles.formSubtitle}>Join us and start your journey</Text>
        </View>

        {/* Profile Image */}
        <View style={styles.imageSection}>
          <TouchableOpacity
            style={[styles.imagePicker, errors.profileImage && styles.imagePickerError]}
            onPress={pickImage}
            disabled={loading}
          >
            {formData.profileImage ? (
              <View style={styles.imagePreview}>
                <Text style={styles.imagePreviewText}>✓</Text>
              </View>
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Ionicons name="camera-outline" size={24} color="#10b981" />
                <Text style={styles.imagePickerText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {errors.profileImage && <Text style={styles.errorText}>{errors.profileImage}</Text>}
        </View>

        {/* Form Fields */}
        <View style={styles.formFields}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
              <Ionicons name="person-outline" size={18} color="#10b981" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Full Name"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                autoCapitalize="words"
                maxLength={30}
                editable={!loading}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={18} color="#10b981" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Email"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* City */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={[styles.inputWrapper, errors.city && styles.inputError]}
              onPress={() => setShowCityDropdown(true)}
              disabled={loading}
            >
              <Ionicons name="location-outline" size={18} color="#10b981" style={styles.inputIcon} />
              <Text style={[styles.cityInputText, !formData.city && { color: 'rgba(255, 255, 255, 0.5)' }]}>
                {formData.city || 'Select City'}
              </Text>
              <Ionicons name="chevron-down-outline" size={18} color="#10b981" />
            </TouchableOpacity>
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color="#10b981" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#10b981" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color="#10b981" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Confirm Password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading}>
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#10b981" />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.registerButton, loading && styles.registerButtonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <LinearGradient colors={loading ? ['#ccc', '#ccc'] : ['#10b981', '#059669']} style={styles.buttonGradient}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.loadingText}>Creating Account...</Text>
              </View>
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
            <Text style={[styles.loginLink, loading && styles.disabledText]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.mainContent}>
          {isLargeScreen ? (
            <>
              {renderLeftPanel()}
              {renderRightPanel()}
            </>
          ) : (
            <ScrollView style={styles.mobileScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.mobileHeader}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.mobileTitle}>Sign Up</Text>
              </View>
              <View style={styles.mobileForm}>
                {renderRightPanel()}
              </View>
            </ScrollView>
          )}
        </View>

        {/* City Modal */}
        <Modal visible={showCityDropdown} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCityDropdown(false)}>
            <View style={styles.modalContent}>
              <FlatList
                data={metroManilaCities}
                renderItem={renderCityItem}
                keyExtractor={(item) => item}
                style={styles.cityList}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Success Modal */}
        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.successModalContent}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={60} color="#10b981" />
              </View>
              <Text style={styles.successModalTitle}>Registration Successful!</Text>
              <Text style={styles.successModalText}>Your account has been created successfully.</Text>
              <TouchableOpacity
                style={styles.successModalButton}
                onPress={handleSuccessModalClose}
              >
                <Text style={styles.successModalButtonText}>Continue to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Activation Link Sent Modal */}
        <Modal visible={showActivationModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.successModalContent}>
              <View style={styles.successIconContainer}>
                <Ionicons name="mail-outline" size={60} color="#10b981" />
              </View>
              <Text style={styles.successModalTitle}>Activation Link Sent!</Text>
              <Text style={styles.successModalText}>
                An activation link has been sent to {formData.email}. Please check your email and click the link to activate your account.
              </Text>
              <TouchableOpacity
                style={styles.successModalButton}
                onPress={handleActivationModalClose}
              >
                <Text style={styles.successModalButtonText}>Continue to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  mainContent: {
    flex: 1,
    flexDirection: width > 768 ? 'row' : 'column',
  },

  // Left Panel (updated for larger logo)
  leftPanel: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 60,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  brandSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 52, // Increased from 48
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 10,
  },
  brandTagline: {
    fontSize: 20, // Increased from 18
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 60,
  },
  iconContainer: {
    position: 'relative',
    width: 360,  // 3x from original 120
    height: 360, // 3x from original 120
  },
  cloudBase: {
    position: 'relative',
    width: 240,  // 3x from original 80
    height: 180, // 3x from original 60
    alignSelf: 'center',
  },
  cloudPart1: {
    position: 'absolute',
    width: 150,  // 3x from original 50
    height: 150, // 3x from original 50
    borderRadius: 75,  // 3x from original 25
    backgroundColor: 'rgba(232, 244, 253, 0.9)',
    left: 0,
    top: 0,
  },
  cloudPart2: {
    position: 'absolute',
    width: 180,  // 3x from original 60
    height: 135,  // 3x from original 45
    borderRadius: 90,  // 3x from original 30
    backgroundColor: 'rgba(240, 248, 255, 0.9)',
    right: 0,
    top: 15,  // 3x from original 5
  },
  cloudPart3: {
    position: 'absolute',
    width: 135,  // 3x from original 45
    height: 105,  // 3x from original 35
    borderRadius: 60,  // 3x from original 20
    backgroundColor: 'rgba(248, 252, 255, 0.9)',
    left: 60,  // 3x from original 20
    top: 75,  // 3x from original 25
  },
  windLines: {
    position: 'absolute',
    right: -90,  // 3x from original -30
    top: 60,  // 3x from original 20
  },
  windLine: {
    height: 6,  // Thicker for visibility
    backgroundColor: '#10b981',
    borderRadius: 3,
    opacity: 0.8,
    marginVertical: 6,  // More spacing
  },
  windLine1: { width: 75 },  // 3x from original 25
  windLine2: { width: 60, opacity: 0.6 },  // 3x from original 20
  windLine3: { width: 45, opacity: 0.4 },  // 3x from original 15
  // Right Panel (updated for more compact layout)
  rightPanel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopLeftRadius: width > 768 ? 0 : 30,
    borderBottomLeftRadius: width > 768 ? 0 : 30,
    borderLeftWidth: width > 768 ? 1 : 0,
    borderTopWidth: width > 768 ? 0 : 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 50,
    paddingTop: 20
  },
  formScroll: {
    padding: width > 768 ? 30 : 25, // Reduced padding for more compact layout
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 20, // Reduced from 30
  },
  formTitle: {
    fontSize: 28, // Reduced from 32
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  formSubtitle: {
    fontSize: 14, // Reduced from 16
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Image Section
  imageSection: {
    alignItems: 'center',
    marginBottom: 20, // Reduced from 30
  },
  imagePicker: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerError: {
    borderColor: '#ef4444',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
  },
  imagePickerText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Form Fields
  formFields: {
    marginBottom: 20, // Reduced from 30
  },
  inputGroup: {
    marginBottom: 15, // Reduced from 20
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    height: 50,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  cityInputText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 5,
  },

  // Register Button
  registerButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 15, // Reduced from 20
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 14, // Reduced from 16
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16, // Reduced from 18
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14, // Reduced from 16
    marginLeft: 10,
  },

  // Login Link
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14, // Reduced from 16
  },
  loginLink: {
    color: '#10b981',
    fontSize: 14, // Reduced from 16
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },

  // Mobile Styles
  mobileScroll: {
    flex: 1,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 40,
  },
  mobileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 20,
  },
  mobileForm: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cityList: {
    padding: 10,
  },
  cityItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cityText: {
    color: '#ffffff',
    fontSize: 16,
  },

  // Success Modal
  successModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 30,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  successModalText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 25,
  },
  successModalButton: {
    backgroundColor: '#10b981',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    width: '100%',
  },
  successModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RegisterScreen;