import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, SafeAreaView, StatusBar, Platform, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { createHealthRiskAssessment, getLatestAssessment, getHealthProfile } from '../../api/health';
import { getUserProfile } from '../../api/auth';

const HealthRiskAssessmentScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [currentAQI, setCurrentAQI] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ title: '', message: '', type: 'info' });
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const user = useSelector(state => state.auth.user);

  const showAlertModal = (title, message, type = 'info') => {
    setModalMessage({ title, message, type });
    setShowMessageModal(true);
  };

  const getCityCoordinates = async (cityName) => {
    try {
      console.log('[Location] Getting coordinates for city:', cityName);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName.trim())}&limit=1`, 
        { headers: { 'User-Agent': 'HealthRiskApp/1.0' } });
      const data = await response.json();
      if (data.length > 0) {
        const coords = { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
        console.log('[Location] Found coordinates:', coords);
        return coords;
      }
      throw new Error(`Location "${cityName}" not found`);
    } catch (error) {
      console.error('[Location] Error getting coordinates:', error);
      throw new Error(`Unable to find coordinates for "${cityName}"`);
    }
  };

  const getCityFromCoordinates = async (latitude, longitude) => {
    try {
      console.log('[Location] Getting city name from coordinates:', {latitude, longitude});
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`, 
        { headers: { 'User-Agent': 'HealthRiskApp/1.0' } });
      const data = await response.json();
      const city = data?.address?.city || data?.address?.town || data?.display_name?.split(',')[0] || 'Unknown Location';
      console.log('[Location] Found city:', city);
      return city;
    } catch (error) {
      console.error('[Location] Error getting city name:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const getGPSLocation = async () => {
    try {
      console.log('[Location] Requesting GPS location...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied');
      
      const location = await Location.getCurrentPositionAsync({});
      const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      console.log('[Location] GPS location obtained:', coords);
      return coords;
    } catch (error) {
      console.error('[Location] Error getting GPS location:', error);
      throw error;
    }
  };

  const fetchAQIData = async (coordinates) => {
    try {
      console.log('[AQI] Fetching AQI data for coordinates:', coordinates);
      const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current=us_aqi,pm10,pm2_5&timezone=auto`);
      const data = await response.json();
      if (data.current) {
        const aqiData = { 
          aqi: data.current.us_aqi, 
          pm25: data.current.pm2_5, 
          pm10: data.current.pm10, 
          timestamp: data.current.time 
        };
        console.log('[AQI] AQI data received:', aqiData);
        return aqiData;
      }
      throw new Error('No air quality data available');
    } catch (error) {
      console.error('[AQI] Error fetching AQI data:', error);
      throw error;
    }
  };

  const performAssessment = async (useGPS = false) => {
    try {
      console.log('[Assessment] Starting assessment...');
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
      
      console.log('[Assessment] Creating health risk assessment...');
      const result = await createHealthRiskAssessment({ 
        aqi: aqiData.aqi, 
        pm25: aqiData.pm25, 
        pm10: aqiData.pm10, 
        location: locationName 
      });
      
      if (result?.assessment) {
        console.log('[Assessment] Assessment created successfully:', result.assessment);
        setAssessment(result.assessment);
        showAlertModal(
          'Assessment Complete',
          'Your health risk assessment has been successfully saved.',
          'success'
        );
      } else if (result?.success) {
        console.log('[Assessment] Assessment created successfully (legacy format):', result);
        setAssessment(result);
        showAlertModal(
          'Assessment Complete',
          'Your health risk assessment has been successfully saved.',
          'success'
        );
      } else {
        throw new Error('Invalid response from assessment API');
      }
    } catch (error) {
      console.error('[Assessment] Error during assessment:', error);
      let errorMessage = 'Unable to complete assessment';
      
      if (error.message) errorMessage = error.message;
      else if (error.status === 401) errorMessage = 'Authentication failed. Please log in again.';
      else if (error.status === 400) errorMessage = 'Invalid assessment data. Please check your profile.';
      else if (error.status >= 500) errorMessage = 'Server error. Please try again later.';
      else if (!navigator.onLine) errorMessage = 'No internet connection. Please check your network.';
      
      showAlertModal('Assessment Failed', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLatestAssessment = async (showAlert = false) => {
    try {
      console.log('[Assessment] Loading latest assessment...');
      const result = await getLatestAssessment();
      
      if (result?.assessment) {
        console.log('[Assessment] Found existing assessment:', result.assessment);
        setAssessment(result.assessment);
        return result.assessment;
      } else if (result?.success === false) {
        console.log('[Assessment] No previous assessment found');
        setAssessment(null);
        if (showAlert) {
          showAlertModal('No Assessment', 'No previous assessment found. Create a new one to get started.', 'info');
        }
        return null;
      }
      
      return null;
    } catch (error) {
      console.error('[Assessment] Error loading assessment:', error);
      if (error.status !== 404 && showAlert) {
        showAlertModal(
          'Error',
          error.status >= 500 
            ? 'Server error loading assessment' 
            : 'Failed to load assessment',
          'error'
        );
      }
      return null;
    }
  };

  const handleRefresh = async () => {
    try {
      console.log('[Refresh] Starting data refresh...');
      setRefreshing(true);
      
      const [profileData, healthData, assessmentData] = await Promise.all([
        getUserProfile().catch(e => {
          console.warn('[Refresh] Failed to fetch user profile:', e.message);
          return null;
        }),
        getHealthProfile().catch(e => {
          console.warn('[Refresh] Failed to fetch health profile:', e.message);
          return null;
        }),
        loadLatestAssessment(true).catch(e => {
          console.warn('[Refresh] Failed to fetch assessment:', e.message);
          return null;
        })
      ]);

      if (profileData) {
        console.log('[Refresh] User profile updated');
        setUserProfile(profileData);
      }

      if (healthData) {
        console.log('[Refresh] Health profile updated');
        setHealthProfile(healthData);
      }

      if (assessmentData && user?.city) {
        try {
          console.log('[Refresh] Fetching updated AQI data...');
          const coordinates = await getCityCoordinates(user.city);
          const aqiData = await fetchAQIData(coordinates);
          setCurrentAQI(aqiData);
          console.log('[Refresh] AQI data updated');
        } catch (error) {
          console.warn('[Refresh] Failed to update AQI:', error.message);
        }
      }

      console.log('[Refresh] Data refresh complete');
      showAlertModal('Refresh Complete', 'Your data has been successfully updated.', 'success');
    } catch (error) {
      console.error('[Refresh] Error during refresh:', error);
      showAlertModal('Refresh Error', 'Failed to refresh data. Please try again.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    const initializeData = async () => {
      try {
        console.log('[Initial] Loading initial data...');
        setLoading(true);
        
        const [profileData, healthData] = await Promise.all([
          getUserProfile(),
          getHealthProfile()
        ]);
        
        setUserProfile(profileData);
        setHealthProfile(healthData);
        
        await loadLatestAssessment();
        
        console.log('[Initial] Data loading complete');
      } catch (error) {
        console.error('[Initial] Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      initializeData();
    }
  }, [user?.id]);

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
      showAlertModal('Export Failed', 'Please complete an assessment first before exporting.', 'error');
      return;
    }

    try {
      setExportingPDF(true);
      console.log('[PDF] Starting PDF generation...');
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showAlertModal('Permission Required', 'Permission to access media library is required to save the PDF.', 'error');
        return;
      }

      const htmlContent = generatePDFHTML();
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `health_assessment_${timestamp}.pdf`;
      
      const downloadDir = `${FileSystem.documentDirectory}Download/`;
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }
      
      const finalUri = `${downloadDir}${filename}`;
      await FileSystem.copyAsync({ from: uri, to: finalUri });

      const asset = await MediaLibrary.createAssetAsync(finalUri);
      
      if (Platform.OS === 'android') {
        const album = await MediaLibrary.getAlbumAsync('Download');
        if (album == null) {
          await MediaLibrary.createAlbumAsync('Download', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      }

      console.log('[PDF] PDF generated successfully');
      showAlertModal(
        'Export Successful', 
        `PDF report has been saved to your device's Downloads folder as "${filename}"`,
        'success'
      );
    } catch (error) {
      console.error('[PDF] Export error:', error);
      showAlertModal('Export Failed', 'There was an error generating the PDF report. Please try again.', 'error');
    } finally {
      setExportingPDF(false);
    }
  };

  const getRiskColor = (level) => ({ low: '#00E676', moderate: '#FF9800', high: '#E91E63', very_high: '#9C27B0' }[level] || '#757575');
  
  const RiskFactorBar = ({ label, score, maxScore, color }) => (
    <View style={styles.riskFactorItem}>
      <View style={styles.riskFactorHeader}>
        <Text style={styles.riskFactorLabel}>{label}</Text>
        <Text style={styles.riskFactorScore}>{score}/{maxScore}</Text>
      </View>
      <View style={styles.riskFactorBar}>
        <View style={[styles.riskFactorFill, { width: `${(score/maxScore)*100}%`, backgroundColor: color }]} />
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
            <Text key={label} style={[styles.riskLabel, { color: progress >= (i+1)*25 ? color : '#666' }]}>{label}</Text>
          ))}
        </View>
      </View>
    );
  };

  const startAssessment = () => {
    setShowAssessmentModal(true);
  };

  const performAssessmentWithLocation = (useGPS = false) => {
    setShowAssessmentModal(false);
    
    const profileCheck = checkProfileCompleteness();
    if (!profileCheck.complete) {
      showAlertModal(
        'Profile Incomplete',
        `Please complete your health profile first. Missing: ${profileCheck.missing.join(', ')}`,
        'error',
        [
          { text: 'Cancel', onPress: () => {} },
          { text: 'Complete Profile', onPress: () => navigation.navigate('Profile') }
        ]
      );
      return;
    }
    
    performAssessment(useGPS);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
      <View style={styles.webLayout}>
        
        {/* Header */}
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
              onPress={handleRefresh} 
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#00E676" />
              ) : (
                <Ionicons name="refresh-outline" size={20} color="#00E676" />
              )}
              <Text style={styles.buttonLabel}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('History')}>
              <Ionicons name="time-outline" size={20} color="#00E676" />
              <Text style={styles.buttonLabel}>History</Text>
            </TouchableOpacity>
            {assessment && (
              <TouchableOpacity style={styles.pdfButton} onPress={exportToPDF} disabled={exportingPDF}>
                {exportingPDF ? (
                  <ActivityIndicator size="small" color="#00E676" />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={20} color="#00E676" />
                    <Text style={styles.buttonLabel}>Export PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Main Content Grid */}
        <View style={styles.mainContent}>
          
          {/* Left Column - Status & Controls */}
          <View style={styles.leftColumn}>
            <View style={styles.statusBanner}>
              <View style={styles.statusIndicator}>
                <Ionicons name="pulse" size={18} color="#00E676" />
                <Text style={styles.statusText}>Real-time Environmental Monitoring</Text>
              </View>
              {assessment && (
                <Text style={styles.lastUpdate}>
                  Last updated: {new Date(assessment.assessedAt).toLocaleDateString()}
                </Text>
              )}
            </View>

            {/* Assessment Controls */}
            <View style={styles.controlsCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="settings-outline" size={20} color="#00E676" />
                <Text style={styles.cardTitle}>Assessment Controls</Text>
              </View>
              
              <TouchableOpacity style={styles.assessButton} onPress={startAssessment} disabled={loading}>
                <LinearGradient colors={['#00E676', '#00C765']} style={styles.assessButtonGradient}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.assessButtonText}>
                        {assessment ? 'New Assessment' : 'Start Assessment'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Column - Assessment Results */}
          <View style={styles.rightColumn}>
            <ScrollView 
              style={styles.scrollContent} 
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#00E676']}
                  tintColor="#00E676"
                />
              }
            >
              
              {assessment ? (
                <>
                  {/* Risk Score Card */}
                  <View style={styles.riskScoreCard}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#00E676" />
                      <Text style={styles.cardTitle}>Risk Assessment Score</Text>
                    </View>
                    
                    <View style={[styles.riskDisplayArea, { 
                      backgroundColor: getRiskColor(assessment.riskLevel) + '15', 
                      borderColor: getRiskColor(assessment.riskLevel) + '30' 
                    }]}>
                      <View style={styles.riskScoreContainer}>
                        <Text style={[styles.riskScore, { color: getRiskColor(assessment.riskLevel) }]}>
                          {assessment.riskScore}
                        </Text>
                        <Text style={styles.riskScoreMax}>/100</Text>
                      </View>
                      <Text style={[styles.riskLevel, { color: getRiskColor(assessment.riskLevel) }]}>
                        {assessment.riskLevel.replace('_', ' ').toUpperCase()} RISK
                      </Text>
                      <RiskIndicator level={assessment.riskLevel} />
                    </View>
                  </View>

                  {/* Two Column Layout for Details */}
                  <View style={styles.detailsGrid}>
                    
                    {/* Risk Factors Breakdown */}
                    {assessment.breakdown && (
                      <View style={styles.detailCard}>
                        <View style={styles.cardHeader}>
                          <Ionicons name="analytics-outline" size={20} color="#00E676" />
                          <Text style={styles.cardTitle}>Risk Factors</Text>
                        </View>
                        <View style={styles.riskFactorsContainer}>
                          <RiskFactorBar 
                            label="Environmental" 
                            score={assessment.breakdown.environmental || 0} 
                            maxScore={40} 
                            color="#FF6B35" 
                          />
                          <RiskFactorBar 
                            label="Age Factor" 
                            score={assessment.breakdown.ageRiskScore || 0} 
                            maxScore={20} 
                            color="#9C27B0" 
                          />
                          <RiskFactorBar 
                            label="Health Conditions" 
                            score={assessment.breakdown.healthConditions || 0} 
                            maxScore={25} 
                            color="#E91E63" 
                          />
                          <RiskFactorBar 
                            label="Lifestyle" 
                            score={assessment.breakdown.lifestyle || 0} 
                            maxScore={15} 
                            color="#FF9800" 
                          />
                        </View>
                      </View>
                    )}

                    {/* Clinical Summary */}
                    <View style={styles.detailCard}>
                      <View style={styles.cardHeader}>
                        <Ionicons name="document-text-outline" size={20} color="#00E676" />
                        <Text style={styles.cardTitle}>Clinical Summary</Text>
                      </View>
                      <View style={styles.clinicalSummary}>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Assessment Date:</Text>
                          <Text style={styles.summaryValue}>
                            {new Date(assessment.assessedAt).toLocaleDateString('en-US', { 
                              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                            })}
                          </Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Risk Category:</Text>
                          <Text style={[styles.summaryValue, { color: getRiskColor(assessment.riskLevel) }]}>
                            {assessment.riskLevel.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Location:</Text>
                          <Text style={styles.summaryValue}>{assessment.location || 'Not specified'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Recommendations - Full Width */}
                  {assessment.recommendations && (
                    <View style={styles.recommendationsCard}>
                      <View style={styles.cardHeader}>
                        <Ionicons name="medical-outline" size={20} color="#00E676" />
                        <Text style={styles.cardTitle}>Health Recommendations</Text>
                      </View>
                      <View style={styles.recommendationsGrid}>
                        {assessment.recommendations.map((rec, index) => (
                          <View key={index} style={styles.recommendationCard}>
                            <View style={styles.recommendationIcon}>
                              <Ionicons 
                                name={["shield-outline", "heart-outline", "fitness-outline"][index] || "checkmark-outline"} 
                                size={16} 
                                color="#00E676" 
                              />
                            </View>
                            <Text style={styles.recommendationText}>{rec}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyStateCard}>
                  <LinearGradient colors={['rgba(0,230,118,0.1)', 'rgba(0,230,118,0.05)']} style={styles.emptyGradient}>
                    <Ionicons name="analytics-outline" size={64} color="rgba(0,230,118,0.6)" />
                    <Text style={styles.emptyTitle}>No Assessment Available</Text>
                    <Text style={styles.emptyText}>
                      Get your personalized health risk assessment based on real-time environmental data
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Message Modal */}
        <Modal visible={showMessageModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons 
                  name={modalMessage.type === 'error' ? 'warning-outline' : 
                        modalMessage.type === 'success' ? 'checkmark-circle-outline' : 'information-circle-outline'} 
                  size={24} 
                  color={modalMessage.type === 'error' ? '#E91E63' : 
                         modalMessage.type === 'success' ? '#00E676' : '#00B0FF'} 
                />
                <Text style={styles.modalTitle}>{modalMessage.title}</Text>
              </View>
              <Text style={styles.modalMessage}>{modalMessage.message}</Text>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  modalMessage.type === 'error' ? styles.modalButtonError : 
                  modalMessage.type === 'success' ? styles.modalButtonSuccess : styles.modalButtonInfo
                ]} 
                onPress={() => setShowMessageModal(false)}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Assessment Location Modal */}
        <Modal visible={showAssessmentModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="location-outline" size={24} color="#00E676" />
                <Text style={styles.modalTitle}>Choose Location</Text>
              </View>
              <Text style={styles.modalMessage}>Select location source for your assessment:</Text>
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => performAssessmentWithLocation(true)}
                >
                  <Ionicons name="navigate-outline" size={16} color="#00E676" />
                  <Text style={styles.modalButtonSecondaryText}>Current GPS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, !user?.city && styles.modalButtonDisabled]}
                  onPress={() => performAssessmentWithLocation(false)}
                  disabled={!user?.city}
                >
                  <Ionicons name="business-outline" size={16} color={user?.city ? "#FFFFFF" : "#666"} />
                  <Text style={[styles.modalButtonText, !user?.city && styles.modalButtonDisabledText]}>
                    {user?.city ? `Saved City (${user.city})` : 'No Saved City'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAssessmentModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A0A0A',
    minHeight: '100vh'
  },
  gradient: {
    flex: 1,
  },
  webLayout: {
    flex: 1,
    maxWidth: '100%',
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,230,118,0.1)',
    marginBottom: 20
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderColor: 'rgba(0,230,118,0.3)', 
    borderWidth: 1 
  },
  headerRightButtons: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20, 
    backgroundColor: 'rgba(0,230,118,0.1)', 
    borderColor: 'rgba(0,230,118,0.3)', 
    borderWidth: 1
  },
  historyButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20, 
    backgroundColor: 'rgba(0,230,118,0.1)', 
    borderColor: 'rgba(0,230,118,0.3)', 
    borderWidth: 1 
  },
  pdfButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20, 
    backgroundColor: 'rgba(0,230,118,0.1)', 
    borderColor: 'rgba(0,230,118,0.3)', 
    borderWidth: 1 
  },
  buttonLabel: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '600'
  },
  headerCenter: { 
    flex: 1, 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#FFFFFF' 
  },
  headerSubtitle: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.6)', 
    marginTop: 4 
  },
  
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 24,
    minHeight: 0
  },
  
  leftColumn: {
    width: 350,
    flexShrink: 0
  },
  
  rightColumn: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 20
  },
  
  statusBanner: { 
    backgroundColor: 'rgba(0,230,118,0.1)', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 20, 
    borderColor: 'rgba(0,230,118,0.3)', 
    borderWidth: 1 
  },
  statusIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  statusText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#00E676', 
    marginLeft: 10 
  },
  lastUpdate: { 
    fontSize: 13, 
    color: 'rgba(255,255,255,0.7)' 
  },
  
  controlsCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 20, 
    padding: 24, 
    borderColor: 'rgba(0,230,118,0.2)', 
    borderWidth: 1
  },
  
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    marginLeft: 10 
  },
  
  assessButton: { 
    borderRadius: 16, 
    overflow: 'hidden',
    marginBottom: 20
  },
  assessButtonGradient: { 
    padding: 18, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center' 
  },
  assessButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '700', 
    marginLeft: 10 
  },
  
  quickStats: {
    gap: 16
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500'
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  
  scrollContent: {
    flex: 1
  },
  
  riskScoreCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 20, 
    padding: 24, 
    marginBottom: 24, 
    borderColor: 'rgba(0,230,118,0.2)', 
    borderWidth: 1
  },
  
  riskDisplayArea: {
    alignItems: 'center', 
    padding: 32, 
    borderRadius: 16, 
    borderWidth: 1
  },
  riskScoreContainer: { 
    flexDirection: 'row', 
    alignItems: 'baseline' 
  },
  riskScore: { 
    fontSize: 64, 
    fontWeight: '900' 
  },
  riskScoreMax: { 
    fontSize: 32, 
    color: 'rgba(255,255,255,0.5)', 
    marginLeft: 8 
  },
  riskLevel: { 
    fontSize: 14, 
    fontWeight: '700', 
    marginTop: 12, 
    letterSpacing: 2 
  },
  
  detailsGrid: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24
  },
  
  detailCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 20, 
    padding: 24, 
    borderColor: 'rgba(0,230,118,0.2)', 
    borderWidth: 1
  },
  
  riskFactorsContainer: { 
    gap: 16 
  },
  riskFactorItem: { 
    marginBottom: 4 
  },
  riskFactorHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  riskFactorLabel: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.8)', 
    fontWeight: '600' 
  },
  riskFactorScore: { 
    fontSize: 13, 
    color: '#00E676', 
    fontWeight: '700' 
  },
  riskFactorBar: { 
    height: 8, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 4 
  },
  riskFactorFill: { 
    height: '100%', 
    borderRadius: 4 
  },
  
  clinicalSummary: { 
    gap: 16 
  },
  summaryRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  summaryLabel: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.7)' 
  },
  summaryValue: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#FFFFFF' 
  },
  
  recommendationsCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 20, 
    padding: 24, 
    borderColor: 'rgba(0,230,118,0.2)', 
    borderWidth: 1
  },
  
  recommendationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  
  recommendationCard: { 
    backgroundColor: 'rgba(0,230,118,0.08)', 
    borderRadius: 16, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    borderColor: 'rgba(0,230,118,0.2)', 
    borderWidth: 1,
    flex: 1,
    minWidth: 280
  },
  recommendationIcon: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: 'rgba(0,230,118,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  recommendationText: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.9)', 
    lineHeight: 20, 
    flex: 1 
  },
  
  emptyStateCard: {
    borderRadius: 20, 
    overflow: 'hidden', 
    borderColor: 'rgba(0,230,118,0.2)', 
    borderWidth: 1
  },
  emptyGradient: { 
    padding: 60, 
    alignItems: 'center' 
  },
  emptyTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    marginTop: 20, 
    marginBottom: 12 
  },
  emptyText: { 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.7)', 
    textAlign: 'center', 
    lineHeight: 24,
    maxWidth: 400
  },
  
  riskIndicator: { 
    marginTop: 20, 
    width: '100%' 
  },
  progressBar: { 
    height: 6, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 3, 
    marginBottom: 12 
  },
  progressFill: { 
    height: '100%', 
    borderRadius: 3 
  },
  riskLabels: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  riskLabel: { 
    fontSize: 11, 
    fontWeight: '600' 
  },
  
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    backgroundColor: '#1A1A2E', 
    borderRadius: 20, 
    padding: 32, 
    width: '90%', 
    maxWidth: 450, 
    alignItems: 'center', 
    borderColor: 'rgba(0,230,118,0.3)', 
    borderWidth: 1 
  },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    marginLeft: 12 
  },
  modalMessage: { 
    fontSize: 16, 
    color: 'rgba(255, 255, 255, 0.8)', 
    textAlign: 'center', 
    marginBottom: 24, 
    lineHeight: 22 
  },
  modalButton: { 
    backgroundColor: '#00E676', 
    paddingHorizontal: 32, 
    paddingVertical: 16, 
    borderRadius: 24,
    minWidth: 120,
    alignItems: 'center'
  },
  modalButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  modalButtonContainer: { 
    width: '100%', 
    gap: 16, 
    marginBottom: 20 
  },
  modalButtonSecondary: { 
    backgroundColor: 'rgba(0,230,118,0.1)', 
    borderColor: 'rgba(0,230,118,0.3)', 
    borderWidth: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10 
  },
  modalButtonSecondaryText: { 
    color: '#00E676', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  modalButtonCancel: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderColor: 'rgba(255,255,255,0.2)', 
    borderWidth: 1 
  },
  modalButtonCancelText: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  modalButtonDisabled: { 
    backgroundColor: 'rgba(102,102,102,0.3)', 
    borderColor: 'rgba(102,102,102,0.2)', 
    borderWidth: 1 
  },
  modalButtonDisabledText: { 
    color: '#666' 
  },
  modalButtonSuccess: {
    backgroundColor: '#00E676'
  },
  modalButtonError: {
    backgroundColor: '#E91E63'
  },
  modalButtonInfo: {
    backgroundColor: '#00B0FF'
  }
});

export default HealthRiskAssessmentScreen;