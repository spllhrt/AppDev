import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, ScrollView, ActivityIndicator, Dimensions, StatusBar, Modal, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch } from 'react-redux';
import { loginUser } from '../api/auth';
import { setUser } from '../redux/authSlice';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  }, [errors]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const handleDeactivatedAccount = () => {
    Alert.alert(
      'Account Deactivated',
      'Your account has been deactivated. Please contact support for assistance.',
      [
        {
          text: 'Contact Support',
          onPress: () => {
            Linking.openURL('mailto:support@airnetai.com?subject=Account Reactivation Request');
          }
        },
        {
          text: 'OK',
          style: 'cancel'
        }
      ],
      { cancelable: false }
    );
  };

  const handleLogin = useCallback(async () => {
    if (loading || !validateForm()) return;

    setLoading(true);
    try {
      const response = await loginUser(formData);
      
      // Check for deactivated account
      if (response.user?.status === 'deactivated' || response.data?.user?.status === 'deactivated') {
        handleDeactivatedAccount();
        return;
      }

      dispatch(setUser({
        user: response.user || response.data?.user,
        token: response.token || response.data?.token
      }));
      Alert.alert('Success', 'Login successful!');
    } catch (error) {
      const message = error.message || error.response?.data?.message || 'Invalid credentials. Please try again.';
      
      // Check if error is about deactivated account
      if (message.toLowerCase().includes('deactivated')) {
        handleDeactivatedAccount();
      } else {
        showError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [formData, loading, validateForm, dispatch]);

  const ErrorModal = () => (
    <Modal visible={showErrorModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="alert-circle" size={24} color="#ef4444" />
            <Text style={styles.modalTitle}>Login Failed</Text>
          </View>
          <Text style={styles.modalMessage}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowErrorModal(false)}
          >
            <Text style={styles.modalButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderLeftPanel = () => (
    <View style={styles.leftPanel}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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

  const renderForm = () => (
    <View style={styles.rightPanel}>
      <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Welcome Back!</Text>
          <Text style={styles.formSubtitle}>Sign in to continue to your account</Text>
        </View>

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
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#10b981" />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <TouchableOpacity 
          style={styles.forgotPassword}
          onPress={() => Alert.alert('Forgot Password', 'Forgot password functionality will be implemented soon.')}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
          <LinearGradient colors={loading ? ['#ccc', '#ccc'] : ['#10b981', '#059669']} style={styles.buttonGradient}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.loadingText}>Signing In...</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Sign Up</Text>
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
              {renderForm()}
            </>
          ) : (
            <ScrollView style={styles.mobileScroll}>
              <View style={styles.mobileHeader}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.mobileTitle}>Sign In</Text>
              </View>
              <View style={styles.mobileForm}>
                {renderForm()}
              </View>
            </ScrollView>
          )}
        </View>
        <ErrorModal />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  mainContent: { flex: 1, flexDirection: width > 768 ? 'row' : 'column' },

  // Left Panel
  leftPanel: { flex: 1, paddingHorizontal: 40, paddingVertical: 60, justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start' },
  brandSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  brandName: { fontSize: 52, fontWeight: 'bold', color: '#10b981', marginBottom: 10 },
  brandTagline: { fontSize: 20, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', marginBottom: 60 },
  iconContainer: { position: 'relative', width: 360, height: 360 },
  cloudBase: { position: 'relative', width: 240, height: 180, alignSelf: 'center' },
  cloudPart1: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(232, 244, 253, 0.9)', left: 0, top: 0 },
  cloudPart2: { position: 'absolute', width: 180, height: 135, borderRadius: 90, backgroundColor: 'rgba(240, 248, 255, 0.9)', right: 0, top: 15 },
  cloudPart3: { position: 'absolute', width: 135, height: 105, borderRadius: 60, backgroundColor: 'rgba(248, 252, 255, 0.9)', left: 60, top: 75 },
  windLines: { position: 'absolute', right: -90, top: 60 },
  windLine: { height: 6, backgroundColor: '#10b981', borderRadius: 3, opacity: 0.8, marginVertical: 6 },
  windLine1: { width: 75 },
  windLine2: { width: 60, opacity: 0.6 },
  windLine3: { width: 45, opacity: 0.4 },

  // Right Panel
  rightPanel: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderTopLeftRadius: width > 768 ? 0 : 30, borderBottomLeftRadius: width > 768 ? 0 : 30, borderLeftWidth: width > 768 ? 1 : 0, borderTopWidth: width > 768 ? 0 : 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 50 },
  formScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  formHeader: { alignItems: 'center', marginBottom: 30 },
  formTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 5 },
  formSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' },

  // Form Fields
  inputGroup: { marginBottom: 15 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 15, height: 50 },
  inputError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 16, color: '#ffffff' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 5 },

  // Forgot Password
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 30 },
  forgotPasswordText: { color: '#10b981', fontSize: 14, fontWeight: '600' },

  // Login Button
  loginButton: { borderRadius: 25, overflow: 'hidden', marginBottom: 20 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center' },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center' },
  loadingText: { color: '#fff', fontSize: 14, marginLeft: 10 },

  // Register Link
  registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  registerText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 },
  registerLink: { color: '#10b981', fontSize: 14, fontWeight: '600' },

  // Mobile Styles
  mobileScroll: { flex: 1 },
  mobileHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, paddingTop: 40 },
  mobileTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginLeft: 20 },
  mobileForm: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: 20, justifyContent: 'center', paddingHorizontal: 30 },

  // Error Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 20, padding: 30, width: '80%', maxWidth: 400, alignItems: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginLeft: 10 },
  modalMessage: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  modalButton: { backgroundColor: '#10b981', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default LoginScreen;