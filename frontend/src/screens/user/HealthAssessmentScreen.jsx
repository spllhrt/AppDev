import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, SafeAreaView, StatusBar, Platform, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { createHealthRiskAssessment, getLatestAssessment } from '../../api/health';
import { getUserProfile } from '../../api/auth';
import { getHealthProfile } from '../../api/health';

const HealthRiskAssessmentScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [currentAQI, setCurrentAQI] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const user = useSelector(state => state.auth.user);

  const getCityCoordinates = async (cityName) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName.trim())}&limit=1`,
        { headers: { 'User-Agent': 'HealthRiskApp/1.0' } });
      const data = await response.json();
      if (data.length > 0) return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
      throw new Error(`Location "${cityName}" not found`);
    } catch (error) {
      throw new Error(`Unable to find coordinates for "${cityName}"`);
    }
  };

  const getCityFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
        { headers: { 'User-Agent': 'HealthRiskApp/1.0' } });
      const data = await response.json();
      return data?.address?.city || data?.address?.town || data?.display_name?.split(',')[0] || 'Unknown Location';
    } catch (error) {
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const getGPSLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Location permission denied');
    const location = await Location.getCurrentPositionAsync({});
    return { latitude: location.coords.latitude, longitude: location.coords.longitude };
  };

  const fetchAQIData = async (coordinates) => {
    const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current=us_aqi,pm10,pm2_5&timezone=auto`);
    const data = await response.json();
    if (data.current) return { aqi: data.current.us_aqi, pm25: data.current.pm2_5, pm10: data.current.pm10, timestamp: data.current.time };
    throw new Error('No air quality data available');
  };

  const performAssessment = async (useGPS = false) => {
    try {
      setLoading(true);
      let coordinates, locationName;

      if (useGPS) {
        coordinates = await getGPSLocation();
        locationName = await getCityFromCoordinates(coordinates.latitude, coordinates.longitude);
      } else {
        if (!user?.city) throw new Error('No saved city found');
        coordinates = await getCityCoordinates(user.city);
        locationName = user.city;
      }

      const aqiData = await fetchAQIData(coordinates);
      setCurrentAQI(aqiData);

      const result = await createHealthRiskAssessment({
        aqi: aqiData.aqi,
        pm25: aqiData.pm25,
        pm10: aqiData.pm10,
        location: locationName
      });

      if (result && result.assessment) {
        setAssessment(result.assessment);
        Alert.alert(
          'Assessment Complete',
          'Your health risk assessment has been successfully saved.',
          [{ text: 'OK', style: 'default' }]
        );
      } else if (result && result.success) {
        setAssessment(result);
        Alert.alert(
          'Assessment Complete',
          'Your health risk assessment has been successfully saved.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        throw new Error('Invalid response from assessment API');
      }

    } catch (error) {
      console.error('Assessment error:', error);
      let errorMessage = 'Unable to complete assessment';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.status === 400) {
        errorMessage = 'Invalid assessment data. Please check your profile.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network.';
      }

      Alert.alert('Assessment Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadLatestAssessment = async (showErrorAlert = false) => {
    try {
      const result = await getLatestAssessment();

      if (result && result.success && result.assessment) {
        setAssessment(result.assessment);
        return true;
      } else if (result && result.assessment) {
        setAssessment(result.assessment);
        return true;
      }

      // If we reach here, there's no assessment but no error either
      setAssessment(null);
      return false;

    } catch (error) {
      console.warn('Failed to load latest assessment:', error);

      // Handle different error scenarios
      if (error.status === 404) {
        // No assessments found - this is normal for new users
        setAssessment(null);
        return false;
      } else if (error.status === 401) {
        // Authentication error
        if (showErrorAlert) {
          Alert.alert(
            'Authentication Error',
            'Please log in again to access your assessments.',
            [{ text: 'OK', style: 'default' }]
          );
        }
        return false;
      } else if (error.status >= 500) {
        // Server error
        if (showErrorAlert) {
          Alert.alert(
            'Connection Issue',
            'Unable to load previous assessments due to server issues. You can still create a new assessment.',
            [{ text: 'OK', style: 'default' }]
          );
        }
        return false;
      } else if (!navigator.onLine) {
        // Network error
        if (showErrorAlert) {
          Alert.alert(
            'No Internet',
            'Unable to load previous assessments. Please check your connection.',
            [{ text: 'OK', style: 'default' }]
          );
        }
        return false;
      } else {
        // Unknown error
        if (showErrorAlert) {
          Alert.alert(
            'Error',
            'Unable to load previous assessments. You can still create a new assessment.',
            [{ text: 'OK', style: 'default' }]
          );
        }
        return false;
      }
    }
  };

  // Improved refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('[HealthRiskAssessment] Refreshing data...');

      console.log('[HealthRiskAssessment] Fetching updated profiles...');
      const [profileData, healthData] = await Promise.all([
        getUserProfile().then(data => {
          console.log('[HealthRiskAssessment] User profile refreshed');
          return data;
        }),
        getHealthProfile().then(data => {
          console.log('[HealthRiskAssessment] Health profile refreshed');
          return data;
        })
      ]);

      setUserProfile(profileData);
      setHealthProfile(healthData);

      console.log('[HealthRiskAssessment] Loading latest assessment...');
      const hasAssessment = await loadLatestAssessment(true);

      if (hasAssessment && user?.city) {
        try {
          console.log('[HealthRiskAssessment] Refreshing AQI data for city:', user.city);
          const coordinates = await getCityCoordinates(user.city);
          const aqiData = await fetchAQIData(coordinates);
          setCurrentAQI(aqiData);
          console.log('[HealthRiskAssessment] AQI data refreshed:', {
            aqi: aqiData.aqi,
            pm25: aqiData.pm25
          });
        } catch (error) {
          console.warn('[HealthRiskAssessment] Failed to refresh AQI data:', error.message);
        }
      }

      console.log('[HealthRiskAssessment] Refresh completed', {
        hasAssessment: !!assessment,
        profilesUpdated: !!profileData && !!healthData
      });

    } catch (error) {
      console.error('[HealthRiskAssessment] Refresh error:', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const generatePDFHTML = () => {
    const riskColor = getRiskColor(assessment.riskLevel);
    const assessmentDate = new Date(assessment.assessedAt).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Health Risk Assessment Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid ${riskColor}; padding-bottom: 20px; }
          .title { font-size: 28px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
          .subtitle { font-size: 16px; color: #7f8c8d; }
          .risk-section { background: linear-gradient(135deg, ${riskColor}15, ${riskColor}05); padding: 30px; border-radius: 12px; margin: 30px 0; border-left: 5px solid ${riskColor}; }
          .risk-score { font-size: 48px; font-weight: bold; color: ${riskColor}; text-align: center; margin-bottom: 10px; }
          .risk-level { font-size: 18px; font-weight: bold; color: ${riskColor}; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
          .section { margin: 30px 0; page-break-inside: avoid; }
          .section-title { font-size: 20px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; }
          .breakdown-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #ecf0f1; }
          .breakdown-label { font-weight: 600; color: #34495e; }
          .breakdown-score { font-weight: bold; color: ${riskColor}; }
          .recommendation { margin: 12px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #00d4aa; border-radius: 6px; }
          .recommendation-text { margin: 0; color: #2c3e50; }
          .clinical-info { background: #f1f2f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .info-label { font-weight: 600; color: #2c3e50; }
          .info-value { color: #34495e; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Health Risk Assessment Report</div>
          <div class="subtitle">Environmental Health Analysis</div>
          <div style="margin-top: 15px; color: #7f8c8d; font-size: 14px;">Generated on ${assessmentDate}</div>
        </div>

        <div class="risk-section">
          <div class="risk-score">${assessment.riskScore}/100</div>
          <div class="risk-level">${assessment.riskLevel.replace('_', ' ')} Risk</div>
        </div>

        ${assessment.breakdown ? `
        <div class="section">
          <div class="section-title">Risk Factors Breakdown</div>
          <div class="breakdown-item">
            <span class="breakdown-label">Environmental Factors</span>
            <span class="breakdown-score">${assessment.breakdown.environmental || 0}/40</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Age Factor</span>
            <span class="breakdown-score">${assessment.breakdown.ageRiskScore || 0}/20</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Health Conditions</span>
            <span class="breakdown-score">${assessment.breakdown.healthConditions || 0}/25</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Lifestyle Factors</span>
            <span class="breakdown-score">${assessment.breakdown.lifestyle || 0}/15</span>
          </div>
        </div>
        ` : ''}

        ${assessment.recommendations ? `
        <div class="section">
          <div class="section-title">Health Recommendations</div>
          ${assessment.recommendations.map(rec => `
            <div class="recommendation">
              <p class="recommendation-text">${rec}</p>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div class="clinical-info">
          <div class="section-title">Clinical Summary</div>
          <div class="info-row">
            <span class="info-label">Assessment Date:</span>
            <span class="info-value">${assessmentDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Location:</span>
            <span class="info-value">${assessment.location || 'Not specified'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Risk Category:</span>
            <span class="info-value" style="color: ${riskColor}; font-weight: bold;">${assessment.riskLevel.replace('_', ' ').toUpperCase()}</span>
          </div>
        </div>

        <div class="footer">
          <p>This report is generated for informational purposes only and should not replace professional medical advice.</p>
        </div>
      </body>
      </html>
    `;
  };

  const exportToPDF = async () => {
    if (!assessment) {
      Alert.alert('No Assessment', 'Please complete an assessment first before exporting.');
      return;
    }

    try {
      setExportingPDF(true);

      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required to save the PDF.');
        return;
      }

      // Generate PDF
      const htmlContent = generatePDFHTML();
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `health_assessment_${timestamp}.pdf`;

      // Copy to downloads directory
      const downloadDir = `${FileSystem.documentDirectory}Download/`;

      // Ensure Download directory exists
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }

      const finalUri = `${downloadDir}${filename}`;
      await FileSystem.copyAsync({ from: uri, to: finalUri });

      // Save to media library (Downloads folder on Android, Photos on iOS)
      const asset = await MediaLibrary.createAssetAsync(finalUri);

      // On Android, move to Downloads album
      if (Platform.OS === 'android') {
        const album = await MediaLibrary.getAlbumAsync('Download');
        if (album == null) {
          await MediaLibrary.createAlbumAsync('Download', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      }

      Alert.alert(
        'Export Successful',
        `PDF report has been saved to your device's Downloads folder as "${filename}"`,
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'There was an error generating the PDF report. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      if (user?.id && !hasLoadedInitial) {
        try {
          console.log('[HealthRiskAssessment] Initializing data...');

          console.log('[HealthRiskAssessment] Fetching user profile...');
          const profileData = await getUserProfile();
          console.log('[HealthRiskAssessment] User profile fetched:', {
            hasData: !!profileData,
            age: profileData?.age,
            city: profileData?.city
          });
          setUserProfile(profileData);

          console.log('[HealthRiskAssessment] Fetching health profile...');
          const healthData = await getHealthProfile();
          console.log('[HealthRiskAssessment] Health profile fetched:', {
            hasData: !!healthData,
            isComplete: healthData?.isComplete,
            missingFields: healthData?.missingFields?.join(', ') || 'none'
          });
          setHealthProfile(healthData);

          console.log('[HealthRiskAssessment] Loading latest assessment...');
          await loadLatestAssessment(false);
          console.log('[HealthRiskAssessment] Initial data loaded successfully');
        } catch (error) {
          console.error('[HealthRiskAssessment] Initial data load error:', error.message);
        } finally {
          setHasLoadedInitial(true);
        }
      }
    };

    initializeData();
  }, [user?.id, hasLoadedInitial]);

  const getRiskColor = (level) => ({ low: '#00E676', moderate: '#FF9800', high: '#E91E63', very_high: '#9C27B0' }[level] || '#757575');

  const checkProfileCompleteness = () => {
    if (healthProfile?.isComplete) {
      console.log('[Profile] API reports profile is complete');
      return { complete: true, missing: [] };
    }

    console.log('[Profile] API reports profile is incomplete', {
      missingFields: healthProfile?.requiredFields || [],
      healthProfile: healthProfile
    });

    return {
      complete: false,
      missing: healthProfile?.requiredFields || []
    };
  };


  const RiskFactorBar = ({ label, score, maxScore, color }) => (
    <View style={styles.riskFactorItem}>
      <View style={styles.riskFactorHeader}>
        <Text style={styles.riskFactorLabel}>{label}</Text>
        <Text style={styles.riskFactorScore}>{score}/{maxScore}</Text>
      </View>
      <View style={styles.riskFactorBar}>
        <View style={[styles.riskFactorFill, { width: `${(score / maxScore) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );

  const RiskIndicator = ({ level }) => {
    const progress = level === 'low' ? 25 : level === 'moderate' ? 50 : level === 'high' ? 75 : 100;
    const color = getRiskColor(level);
    return (
      <View style={styles.riskIndicator}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: color }]} />
        </View>
        <View style={styles.riskLabels}>
          {['Low', 'Moderate', 'High', 'Critical'].map((label, i) => (
            <Text key={label} style={[styles.riskLabel, { color: progress >= (i + 1) * 25 ? color : '#666' }]}>{label}</Text>
          ))}
        </View>
      </View>
    );
  };

  const startAssessment = () => {
    const profileCheck = checkProfileCompleteness();
    if (!profileCheck.complete) {
      Alert.alert(
        'Profile Incomplete',
        `Please complete your health profile first. Missing: ${profileCheck.missing.join(', ')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete Profile', onPress: () => navigation.navigate('Profile') }
        ]
      );
      return;
    }

    Alert.alert(
      'Choose Location',
      'Select location source for your assessment:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Current GPS', onPress: () => performAssessment(true) },
        {
          text: user?.city ? `Saved City (${user.city})` : 'Saved City (Not Set)',
          onPress: () => performAssessment(false),
          style: user?.city ? 'default' : 'destructive'
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>

          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Health Risk Assessment</Text>
              <Text style={styles.headerSubtitle}>Environmental Health Analysis</Text>
            </View>
            <View style={styles.headerRightButtons}>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={onRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#00E676" />
                ) : (
                  <Ionicons name="refresh-outline" size={20} color="#00E676" />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('History')}>
                <Ionicons name="time-outline" size={20} color="#00E676" />
              </TouchableOpacity>
              {assessment && (
                <TouchableOpacity style={styles.pdfButton} onPress={exportToPDF} disabled={exportingPDF}>
                  {exportingPDF ? (
                    <ActivityIndicator size="small" color="#00E676" />
                  ) : (
                    <Ionicons name="document-text-outline" size={20} color="#00E676" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#00E676']}
                tintColor="#00E676"
                title="Refreshing..."
                titleColor="rgba(255,255,255,0.7)"
              />
            }
          >

            <View style={styles.statusBanner}>
              <View style={styles.statusIndicator}>
                <Ionicons name="pulse" size={18} color="#00E676" />
                <Text style={styles.statusText}>Real-time Environmental Monitoring</Text>
              </View>
              {assessment && <Text style={styles.lastUpdate}>Last updated: {new Date(assessment.assessedAt).toLocaleDateString()}</Text>}
            </View>

            {assessment ? (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#00E676" />
                      <View>
                        <Text style={styles.cardTitle}>Risk Assessment Score</Text>
                        <Text style={styles.cardSubtitle}>Based on current conditions</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.riskCard, { backgroundColor: getRiskColor(assessment.riskLevel) + '15', borderColor: getRiskColor(assessment.riskLevel) + '30' }]}>
                    <View style={styles.riskScoreContainer}>
                      <Text style={[styles.riskScore, { color: getRiskColor(assessment.riskLevel) }]}>{assessment.riskScore}</Text>
                      <Text style={styles.riskScoreMax}>/100</Text>
                    </View>
                    <Text style={[styles.riskLevel, { color: getRiskColor(assessment.riskLevel) }]}>
                      {assessment.riskLevel.replace('_', ' ').toUpperCase()} RISK
                    </Text>
                    <RiskIndicator level={assessment.riskLevel} />
                  </View>
                </View>

                {assessment.breakdown && (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="analytics-outline" size={20} color="#00E676" />
                      <View>
                        <Text style={styles.cardTitle}>Risk Factors Breakdown</Text>
                        <Text style={styles.cardSubtitle}>Contributing factors to your score</Text>
                      </View>
                    </View>
                    <View style={styles.riskFactorsContainer}>
                      <RiskFactorBar label="Environmental" score={assessment.breakdown.environmental || 0} maxScore={40} color="#FF6B35" />
                      <RiskFactorBar label="Age Factor" score={assessment.breakdown.ageRiskScore || 0} maxScore={20} color="#9C27B0" />
                      <RiskFactorBar label="Health Conditions" score={assessment.breakdown.healthConditions || 0} maxScore={25} color="#E91E63" />
                      <RiskFactorBar label="Lifestyle" score={assessment.breakdown.lifestyle || 0} maxScore={15} color="#FF9800" />
                    </View>
                  </View>
                )}

                {assessment.recommendations && (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="medical-outline" size={20} color="#00E676" />
                      <View>
                        <Text style={styles.cardTitle}>Health Recommendations</Text>
                        <Text style={styles.cardSubtitle}>Personalized guidance</Text>
                      </View>
                    </View>
                    <View style={styles.recommendationsContainer}>
                      {assessment.recommendations.map((rec, index) => (
                        <View key={index} style={styles.recommendationCard}>
                          <View style={styles.recommendationIcon}>
                            <Ionicons name={["shield-outline", "heart-outline", "fitness-outline"][index] || "checkmark-outline"} size={16} color="#00E676" />
                          </View>
                          <Text style={styles.recommendationText}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="document-text-outline" size={20} color="#00E676" />
                    <Text style={styles.cardTitle}>Clinical Summary</Text>
                  </View>
                  <View style={styles.clinicalSummary}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Assessment Date:</Text>
                      <Text style={styles.summaryValue}>{new Date(assessment.assessedAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Risk Category:</Text>
                      <Text style={[styles.summaryValue, { color: getRiskColor(assessment.riskLevel) }]}>{assessment.riskLevel.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Location:</Text>
                      <Text style={styles.summaryValue}>{assessment.location || 'Not specified'}</Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyCard}>
                <LinearGradient colors={['rgba(0,230,118,0.1)', 'rgba(0,230,118,0.05)']} style={styles.emptyGradient}>
                  <Ionicons name="analytics-outline" size={48} color="rgba(0,230,118,0.6)" />
                  <Text style={styles.emptyTitle}>No Assessment Available</Text>
                  <Text style={styles.emptyText}>Get your personalized health risk assessment based on real-time environmental data</Text>
                </LinearGradient>
              </View>
            )}

            <TouchableOpacity style={styles.assessButton} onPress={startAssessment} disabled={loading}>
              <LinearGradient colors={['#00E676', '#00C765']} style={styles.assessButtonGradient}>
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                  <>
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.assessButtonText}>{assessment ? 'New Assessment' : 'Start Assessment'}</Text>
                  </>
                )}
              </LinearGradient>
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
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20, paddingBottom: 20 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  headerRightButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,230,118,0.2)', justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  historyButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,230,118,0.2)', justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  pdfButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,230,118,0.2)', justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 100 },
  statusBanner: { backgroundColor: 'rgba(0,230,118,0.1)', borderRadius: 12, padding: 16, marginBottom: 20, borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusText: { fontSize: 14, fontWeight: '600', color: '#00E676', marginLeft: 8 },
  lastUpdate: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 18, marginBottom: 20, borderColor: 'rgba(0,230,118,0.2)', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginLeft: 8 },
  cardSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginLeft: 8, marginTop: 2 },
  riskCard: { alignItems: 'center', padding: 24, borderRadius: 12, marginBottom: 16, borderWidth: 1 },
  riskScoreContainer: { flexDirection: 'row', alignItems: 'baseline' },
  riskScore: { fontSize: 48, fontWeight: '900' },
  riskScoreMax: { fontSize: 24, color: 'rgba(255,255,255,0.5)', marginLeft: 4 },
  riskLevel: { fontSize: 12, fontWeight: '700', marginTop: 8, letterSpacing: 1 },
  riskIndicator: { marginTop: 16, width: '100%' },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 2 },
  riskLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  riskLabel: { fontSize: 10, fontWeight: '600' },
  riskFactorsContainer: { gap: 12 },
  riskFactorItem: { marginBottom: 8 },
  riskFactorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  riskFactorLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  riskFactorScore: { fontSize: 12, color: '#00E676', fontWeight: '700' },
  riskFactorBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 },
  riskFactorFill: { height: '100%', borderRadius: 3 },
  recommendationsContainer: { gap: 12 },
  recommendationCard: { backgroundColor: 'rgba(0,230,118,0.05)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', borderColor: 'rgba(0,230,118,0.1)', borderWidth: 1 },
  recommendationIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,230,118,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recommendationText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18, flex: 1 },
  clinicalSummary: { gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  emptyCard: { borderRadius: 16, marginBottom: 20, overflow: 'hidden', borderColor: 'rgba(0,230,118,0.2)', borderWidth: 1 },
  emptyGradient: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  assessButton: { borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  assessButtonGradient: { padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  assessButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginLeft: 8 },
});

export default HealthRiskAssessmentScreen;