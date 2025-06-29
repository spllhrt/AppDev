import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { registerUser } from '../api/auth';

const metroManilaCities = [
  'Caloocan',
  'Las Piñas',
  'Makati',
  'Malabon',
  'Mandaluyong',
  'Manila',
  'Marikina',
  'Muntinlupa',
  'Navotas',
  'Parañaque',
  'Pasay',
  'Pasig',
  'Quezon City',
  'San Juan',
  'Taguig',
  'Valenzuela',
];

const RegisterScreen = ({ navigation }) => {
  const { width, height } = Dimensions.get('window');
  const isSmallDevice = height < 700;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    city: '',
    profileImage: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Memoized function to prevent re-renders
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);

  const handleCitySelect = useCallback((city) => {
    setFormData(prev => ({
      ...prev,
      city
    }));
    setShowCityDropdown(false);
    if (errors.city) {
      setErrors(prev => ({
        ...prev,
        city: ''
      }));
    }
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
        setFormData(prev => ({
          ...prev,
          profileImage: result.assets[0]
        }));
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 30) {
      newErrors.name = 'Name cannot exceed 30 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.profileImage) {
      newErrors.profileImage = 'Profile image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleRegister = useCallback(async () => {
    if (loading) return; // Prevent double submission
    
    if (!validateForm()) return;

    setLoading(true);
    console.log('Starting registration process');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('email', formData.email.trim());
      formDataToSend.append('password', formData.password);
      formDataToSend.append('city', formData.city.trim());

      // Avatar is required based on the backend controller
      if (formData.profileImage) {
        formDataToSend.append('avatar', {
          uri: formData.profileImage.uri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        });
      }

      console.log('Sending registration request');
      const response = await registerUser(formDataToSend);
      console.log('Registration response received:', response);

      Alert.alert(
        'Registration Successful!',
        'Your account has been created successfully.',
        [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Failed',
        error.message || error.response?.data?.message || 'An error occurred during registration'
      );
    } finally {
      console.log('Registration process completed, setting loading to false');
      setLoading(false);
    }
  }, [formData, loading, validateForm, navigation]);

  // Memoized toggle functions
  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword(prev => !prev);
  }, []);

  const navigateToLogin = useCallback(() => {
    if (loading) return;
    navigation.navigate('Login');
  }, [navigation, loading]);

  const goBack = useCallback(() => {
    if (loading) return;
    navigation.goBack();
  }, [navigation, loading]);

  const toggleCityDropdown = useCallback(() => {
    setShowCityDropdown(prev => !prev);
  }, []);

  const renderCityItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.cityItem}
      onPress={() => handleCitySelect(item)}
    >
      <Text style={styles.cityText}>{item}</Text>
    </TouchableOpacity>
  ), []);

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      {/* Set StatusBar style */}
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true} 
      />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={[styles.header, isSmallDevice && styles.headerSmall]}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={goBack}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title}>Sign Up</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Form Container */}
            <View style={[styles.formContainer, isSmallDevice && styles.formContainerSmall]}>
              <View style={[styles.welcomeSection, isSmallDevice && styles.welcomeSectionSmall]}>
                <Text style={styles.welcomeText}>Create Account</Text>
                <Text style={styles.subtitleText}>
                  Join us and start your journey
                </Text>
              </View>

              {/* Profile Image Picker */}
              <View style={styles.imagePickerContainer}>
                <TouchableOpacity 
                  style={[
                    styles.imagePicker, 
                    errors.profileImage && styles.imagePickerError
                  ]} 
                  onPress={pickImage}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {formData.profileImage ? (
                    <View style={styles.imagePreview}>
                      <Text style={styles.imagePreviewText}>✓</Text>
                    </View>
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="camera-outline" size={30} color="#4CAF50" />
                      <Text style={styles.imagePickerText}>Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {errors.profileImage ? <Text style={styles.errorText}>{errors.profileImage}</Text> : null}
              </View>

              {/* Name Input */}
              <View style={[styles.inputContainer, isSmallDevice && styles.inputContainerSmall]}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                  <Ionicons name="person-outline" size={20} color="#4CAF50" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={formData.name}
                    onChangeText={(text) => handleInputChange('name', text)}
                    autoCapitalize="words"
                    maxLength={30}
                    returnKeyType="next"
                    editable={!loading}
                  />
                </View>
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>

              {/* Email Input */}
              <View style={[styles.inputContainer, isSmallDevice && styles.inputContainerSmall]}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                  <Ionicons name="mail-outline" size={20} color="#4CAF50" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    editable={!loading}
                  />
                </View>
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              {/* City Input */}
              <View style={[styles.inputContainer, isSmallDevice && styles.inputContainerSmall]}>
                <Text style={styles.inputLabel}>City</Text>
                <TouchableOpacity
                  style={[styles.inputWrapper, errors.city && styles.inputError]}
                  onPress={toggleCityDropdown}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="location-outline" size={20} color="#4CAF50" style={styles.inputIcon} />
                  <Text style={[styles.cityInputText, !formData.city && { color: 'rgba(255, 255, 255, 0.6)' }]}>
                    {formData.city || 'Select your city'}
                  </Text>
                  <Ionicons 
                    name={showCityDropdown ? "chevron-up-outline" : "chevron-down-outline"} 
                    size={20} 
                    color="#4CAF50" 
                    style={styles.cityDropdownIcon}
                  />
                </TouchableOpacity>
                {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
              </View>

              {/* City Dropdown Modal */}
              <Modal
                visible={showCityDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={toggleCityDropdown}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={toggleCityDropdown}
                >
                  <View style={styles.modalContent}>
                    <FlatList
                      data={metroManilaCities}
                      renderItem={renderCityItem}
                      keyExtractor={(item) => item}
                      style={styles.cityList}
                      keyboardShouldPersistTaps="always"
                    />
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* Password Input */}
              <View style={[styles.inputContainer, isSmallDevice && styles.inputContainerSmall]}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#4CAF50" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Create password"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={formData.password}
                    onChangeText={(text) => handleInputChange('password', text)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={toggleShowPassword}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#4CAF50"
                    />
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              </View>

              {/* Confirm Password Input */}
              <View style={[styles.inputContainer, isSmallDevice && styles.inputContainerSmall]}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#4CAF50" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm password"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleInputChange('confirmPassword', text)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    editable={!loading}
                    onSubmitEditing={handleRegister}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={toggleShowConfirmPassword}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#4CAF50"
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
              </View>

              {/* Register Button */}
              <TouchableOpacity
                style={[styles.registerButton, loading && styles.registerButtonDisabled, isSmallDevice && styles.registerButtonSmall]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={loading ? ['#ccc', '#ccc'] : ['#4CAF50', '#45a049']}
                  style={styles.buttonGradient}
                >
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
                <Text style={[styles.loginText, loading && styles.disabledText]}>
                  Already have an account? 
                </Text>
                <TouchableOpacity 
                  onPress={navigateToLogin} 
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.loginLink, loading && styles.disabledText]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' ? 20 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerSmall: {
    paddingTop: 10,
    paddingBottom: 20,
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
  },
  placeholder: {
    width: 40,
  },
  formContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: Platform.OS === 'android' ? 20 : 0,
  },
  formContainerSmall: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
    marginBottom: Platform.OS === 'android' ? 15 : 0,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeSectionSmall: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 25,
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
    borderColor: '#ff6b6b',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
  },
  imagePickerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputContainerSmall: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    height: 50,
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
  },
  cityInputText: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
  },
  cityDropdownIcon: {
    marginLeft: 10,
  },
  eyeIcon: {
    padding: 5,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 5,
  },
  registerButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 30,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonSmall: {
    marginTop: 5,
    marginBottom: 20,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  loginLink: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  disabledText: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
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
});

export default RegisterScreen;
























