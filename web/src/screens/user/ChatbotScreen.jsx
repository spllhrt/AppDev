import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  Dimensions, StatusBar, Platform, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const AmihanChatbot = ({ navigation }) => {
  const [messages, setMessages] = useState([{
    id: 1, type: 'bot',
    content: 'Kamusta, kaibigan! 🌬️ Ako si Amihan, your air quality guardian! Ask me about hangin, weather, or health tips!',
    timestamp: new Date()
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [location, setLocation] = useState({ lat: 14.5995, lon: 120.9842, name: 'Manila' });
  const [conversationContext, setConversationContext] = useState({
    lastTopic: null, userPreferences: {}, hasAsthma: null, exerciseLevel: null, userName: null
  });
  const scrollViewRef = useRef(null);

  const GEMINI_API_KEY = 'AIzaSyA2DYXABEdYm5YBxg0YAp1BvbrIWbmNU3Q';
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const fetchWeatherData = async () => {
    try {
      const airResponse = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lon}&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi&forecast_days=3`);
      const airData = await airResponse.json();
      
      const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=3`);
      const weatherInfo = await weatherResponse.json();

      setWeatherData({
        aqi: Math.round(airData.current?.us_aqi || 0), pm25: Math.round(airData.current?.pm2_5 || 0),
        temperature: Math.round(weatherInfo.current?.temperature_2m || 28), humidity: Math.round(weatherInfo.current?.relative_humidity_2m || 70),
        location: location.name,
        forecast: airData.hourly?.us_aqi?.slice(0, 72).filter((_, i) => i % 24 === 0).map((aqi, i) => ({
          day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : 'Day 3',
          aqi: Math.round(aqi || 0), level: getAQILevel(Math.round(aqi || 0)).label,
          temp: Math.round(weatherInfo.daily?.temperature_2m_max?.[i] || 28)
        })) || []
      });
    } catch (error) {
      console.error('Weather API Error:', error);
      setWeatherData({
        aqi: 85, pm25: 35, temperature: 28, humidity: 75, location: location.name,
        forecast: [
          { day: 'Today', aqi: 85, level: 'Moderate', temp: 28 },
          { day: 'Tomorrow', aqi: 92, level: 'Moderate', temp: 30 },
          { day: 'Day 3', aqi: 78, level: 'Moderate', temp: 27 }
        ]
      });
    }
  };

  useEffect(() => { fetchWeatherData(); }, [location]);
  useEffect(() => { scrollViewRef.current?.scrollToEnd({ animated: true }); }, [messages]);

  const getAQILevel = (aqi) => {
    if (aqi <= 50) return { label: 'Good', color: '#00E676', category: 'good' };
    if (aqi <= 100) return { label: 'Moderate', color: '#FFC107', category: 'moderate' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: '#FF9800', category: 'unhealthy' };
    if (aqi <= 200) return { label: 'Unhealthy', color: '#F44336', category: 'unhealthy' };
    return { label: 'Very Unhealthy', color: '#9C27B0', category: 'veryUnhealthy' };
  };

  const getAmihanSystemPrompt = () => {
    const currentWeather = weatherData ? { aqi: weatherData.aqi, level: getAQILevel(weatherData.aqi).label, temperature: weatherData.temperature, location: weatherData.location, pm25: weatherData.pm25 } : null;
    return `You are Amihan, a friendly and knowledgeable Filipino air quality assistant. You're like a caring friend who's passionate about helping people stay healthy in polluted environments.

🌬️ YOUR PERSONALITY:
- Talk like a friendly Filipino friend, not a robot
- Use natural Taglish (mix English and Tagalog conversationally)
- Be encouraging, supportive, and genuinely caring about health
- Share advice like you're talking to a close friend
- Use casual terms: "kaibigan," "friend," "tara," "kaya mo yan"
- Keep it conversational and relatable
- Sound like someone who really cares about air quality and health

💬 HOW TO TALK:
- Start with warm, friendly greetings
- Mix languages naturally: "Alam mo ba, friend, ganito kasi yan..."
- Use Filipino expressions: "Kaya nga eh...", "Tara na...", "Sabi nga..."
- Keep responses conversational, like chatting with a health-conscious friend
- Share advice like personal recommendations
- Don't sound clinical or too formal
- Be encouraging about healthy choices

🌡️ CURRENT CONDITIONS (use this data):
${currentWeather ? `
- Location: ${currentWeather.location}
- AQI: ${currentWeather.aqi} (${currentWeather.level})
- Temperature: ${currentWeather.temperature}°C
- PM2.5: ${currentWeather.pm25} μg/m³
` : 'Weather data loading...'}

🎯 YOUR EXPERTISE:
- Air quality interpretation and health impacts
- Exercise recommendations based on air quality
- Mask recommendations and when to wear them
- Indoor air quality tips
- Health protection strategies
- Weather-related health advice
- Respiratory health for sensitive groups
- Philippine air quality conditions and seasons

📝 RESPONSE STYLE:
- Give practical, actionable advice
- Relate to Filipino lifestyle and environment
- Consider local conditions (traffic, pollution sources)
- Be encouraging about healthy habits
- Explain things simply but accurately
- Include relevant emojis naturally (not too many)
- Always be supportive and positive

🚨 IMPORTANT GUIDELINES:
- Always base air quality advice on current AQI data
- Be more cautious with sensitive groups (asthma, elderly, children)
- Provide specific, actionable recommendations
- Encourage healthy behaviors
- If AQI is bad, prioritize safety over convenience
- Keep medical advice general - always recommend consulting doctors for specific conditions

EXAMPLES OF YOUR TONE:

Instead of: "Based on meteorological analysis, the air quality index indicates..."
Say: "Friend, tingnan natin yung hangin ngayon - AQI is ${currentWeather?.aqi || 'around moderate'}, so..."

Instead of: "Implement protective measures immediately"
Say: "Tara, mag-ingat tayo ngayon. Better na mag-mask ka if lalabas"

Instead of: "Respiratory health optimization protocols"
Say: "Para sa baga natin, friend, gawin natin 'to..."

Remember: You're a caring friend who happens to be an air quality expert, not a medical textbook. Be conversational, helpful, and genuinely concerned about their wellbeing!`;
  };

  const generateAIResponse = async (userMessage) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '' || GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      return "Ay friend! Hindi pa naka-setup ang AI connection ko. Para sa ngayon, eto yung masasabi ko based sa current AQI:\n\n" + generateBasicResponse(userMessage);
    }

    try {
      const requestBody = {
        contents: [{ parts: [{ text: `${getAmihanSystemPrompt()}\n\nUser message: "${userMessage}"\n\nContext: ${JSON.stringify(conversationContext)}\n\nRespond as Amihan with current air quality data and personalized advice:` }] }],
        generationConfig: { temperature: 0.8, topK: 40, topP: 0.95, maxOutputTokens: 350 }
      };

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
      } else {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Amihan AI Error:', error);
      const fallbacks = [
        "Friend, may connectivity issue tayo ngayon, but based sa current AQI na " + (weatherData?.aqi || '85') + ", " + generateBasicResponse(userMessage),
        "Ay sorry, friend! May glitch sa connection ko. Pero alam mo ba, with today's air quality, " + generateBasicResponse(userMessage),
        "Technical difficulty muna tayo, kaibigan! But let me share what I know about today's hangin - " + generateBasicResponse(userMessage)
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
  };

  const generateBasicResponse = (message) => {
    if (!weatherData) return "Loading weather data pa, friend... Wait lang! 🔄";
    
    const msg = message.toLowerCase();
    const level = getAQILevel(weatherData.aqi);
    
    if (msg.includes('exercise') || msg.includes('workout') || msg.includes('run')) {
      if (weatherData.aqi <= 50) return `Perfect for exercise, friend! AQI is great at ${weatherData.aqi}. Go for that workout! 💪🌱`;
      else if (weatherData.aqi <= 100) return `Okay naman for light exercise. AQI is ${weatherData.aqi}, so maybe indoor workout na lang or light walk with mask? 🚶‍♀️😷`;
      else return `Skip outdoor exercise muna, friend. AQI is ${weatherData.aqi} - too risky. Indoor workout na lang tayo! 🏠💪`;
    }
    
    if (msg.includes('safe') || msg.includes('okay')) {
      if (weatherData.aqi <= 100) return `Generally safe naman today, friend! AQI is ${weatherData.aqi}. Normal activities okay, but watch out for any symptoms. 😊`;
      else return `Not ideal today, kaibigan. AQI is ${weatherData.aqi}. Better stay indoors or wear mask if kailangan lumabas. 😷🏠`;
    }
    
    return `Current AQI sa ${weatherData.location} is ${weatherData.aqi} (${level.label}). ${weatherData.temperature}°C ngayon. Ano specifically gusto mo malaman, friend? 🌬️`;
  };

  const updateContext = (message) => {
    const msg = message.toLowerCase();
    const newContext = { ...conversationContext };
    
    if (msg.includes('asthma') || msg.includes('hika')) newContext.hasAsthma = true;
    if (msg.includes('my name is') || msg.includes('ako si')) {
      const nameMatch = message.match(/(?:my name is|ako si)\s+(\w+)/i);
      if (nameMatch) newContext.userName = nameMatch[1];
    }
    if (msg.includes('exercise') || msg.includes('workout')) newContext.exerciseLevel = 'active';
    
    setConversationContext(newContext);
    return newContext;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { id: Date.now(), type: 'user', content: inputValue, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    const userInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    updateContext(userInput);

    try {
      const aiResponse = await generateAIResponse(userInput);
      const hasChart = aiResponse.toLowerCase().includes('aqi') || aiResponse.toLowerCase().includes('air quality');
      const hasForecast = aiResponse.toLowerCase().includes('forecast') || aiResponse.toLowerCase().includes('tomorrow');
      
      const botMessage = {
        id: Date.now() + 1, type: 'bot', content: aiResponse, timestamp: new Date(),
        hasChart: hasChart, hasForecast: hasForecast
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1, type: 'bot',
        content: "Sorry friend, may technical issue. Pero remember - check mo always yung air quality before lumabas, wear mask if needed, at stay hydrated! 💪🌬️",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const AQIChart = () => {
    if (!weatherData) return null;
    const level = getAQILevel(weatherData.aqi);
    const percentage = Math.min((weatherData.aqi / 200) * 100, 100);
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartLabel}>AQI - {weatherData.location}</Text>
          <View style={[styles.levelBadge, { backgroundColor: level.color }]}>
            <Text style={styles.levelText}>{level.label}</Text>
          </View>
        </View>
        <View style={styles.progressBackground}>
          <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: level.color }]} />
        </View>
        <Text style={styles.aqiNumber}>{weatherData.aqi}</Text>
      </View>
    );
  };

  const ForecastCards = () => {
    if (!weatherData || !weatherData.forecast) return null;
    return (
      <View style={styles.forecastContainer}>
        <Text style={styles.forecastTitle}>3-Day Forecast 📅</Text>
        <View style={styles.forecastRow}>
          {weatherData.forecast.map((item, index) => (
            <View key={index} style={styles.forecastCard}>
              <Text style={styles.forecastDay}>{item.day}</Text>
              <Text style={styles.forecastAqi}>AQI {item.aqi}</Text>
              <Text style={styles.forecastLevel}>{item.level}</Text>
              <Text style={styles.forecastTemp}>{item.temp}°C</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const quickActions = ['Kamusta ang hangin ngayon?', 'Safe ba mag-exercise today?', 'Kailangan ko ba ng mask?', 'Paano mag-protect sa pollution?', 'Show me the forecast'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Amihan 🌬️</Text>
              <Text style={styles.headerSubtitle}>Your Air Quality Friend</Text>
            </View>
            <TouchableOpacity onPress={fetchWeatherData}>
              <Ionicons name="refresh" size={18} color="#00E676" />
            </TouchableOpacity>
          </View>

          {/* Main Content Area */}
          <View style={styles.mainContent}>
            
            {/* Sidebar */}
            <View style={styles.sidebar}>
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>Air Quality</Text>
                <TouchableOpacity onPress={fetchWeatherData}>
                  <Ionicons name="refresh" size={14} color="#00E676" />
                </TouchableOpacity>
              </View>
              
              {weatherData && (
                <View style={styles.weatherWidget}>
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={12} color="#00E676" />
                    <Text style={styles.locationText}>{weatherData.location}</Text>
                  </View>
                  <Text style={styles.aqiValue}>{weatherData.aqi}</Text>
                  <Text style={[styles.aqiLevel, { color: getAQILevel(weatherData.aqi).color }]}>
                    {getAQILevel(weatherData.aqi).label}
                  </Text>
                  <Text style={styles.temperature}>{weatherData.temperature}°C</Text>
                </View>
              )}
              
              <View style={styles.quickActionsVertical}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                {quickActions.map((action, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.quickActionButton} 
                    onPress={() => setInputValue(action)}
                  >
                    <Text style={styles.quickActionText}>{action}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Chat Area */}
            <View style={styles.chatArea}>
              <ScrollView ref={scrollViewRef} style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
                {messages.map((message) => (
                  <View key={message.id} style={[styles.messageWrapper, message.type === 'user' ? styles.userWrapper : styles.botWrapper]}>
                    <View style={[styles.messageBubble, message.type === 'user' ? styles.userBubble : styles.botBubble]}>
                      {message.type === 'bot' && <Text style={styles.avatarText}>🌬️</Text>}
                      <Text style={[styles.messageText, message.type === 'user' ? styles.userText : styles.botText]}>
                        {message.content}
                      </Text>
                      {message.hasChart && <AQIChart />}
                      {message.hasForecast && <ForecastCards />}
                      <Text style={styles.timestamp}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                ))}
                
                {isLoading && (
                  <View style={styles.loadingWrapper}>
                    <View style={styles.loadingBubble}>
                      <Text style={styles.avatarText}>🌬️</Text>
                      <Text style={styles.loadingText}>Checking ang hangin for you...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={inputValue}
                    onChangeText={setInputValue}
                    placeholder="Chat with Amihan about air quality..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.textInput}
                    multiline
                  />
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    style={[styles.sendButton, (!inputValue.trim() || isLoading) && styles.sendButtonDisabled]}
                  >
                    <Ionicons name="send" size={16} color="#0A0A0A" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1, paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20, 
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,230,118,0.1)'
  },
  backButton: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center'
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  
  mainContent: { flex: 1, flexDirection: 'row' },
  
  sidebar: {
    width: width * 0.28, backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRightWidth: 1, borderRightColor: 'rgba(0,230,118,0.1)', padding: 15
  },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sidebarTitle: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  
  weatherWidget: {
    backgroundColor: 'rgba(0,230,118,0.08)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)', marginBottom: 15
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locationText: { fontSize: 10, color: '#00E676', marginLeft: 4 },
  aqiValue: { fontSize: 24, fontWeight: '700', color: '#00E676', textAlign: 'center' },
  aqiLevel: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  temperature: { fontSize: 11, color: '#FFC107', textAlign: 'center', marginTop: 4 },
  
  quickActionsVertical: { flex: 1 },
  quickActionsTitle: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  quickActionButton: {
    backgroundColor: 'rgba(0,230,118,0.1)', borderRadius: 8, padding: 8, marginBottom: 6,
    borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)'
  },
  quickActionText: { fontSize: 9, color: '#FFFFFF', textAlign: 'center' },
  
  chatArea: { flex: 1, flexDirection: 'column' },
  messagesContainer: { flex: 1, paddingHorizontal: 20 },
  messageWrapper: { marginVertical: 3 },
  userWrapper: { alignItems: 'flex-end' },
  botWrapper: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '80%', borderRadius: 12, padding: 12 },
  userBubble: { backgroundColor: 'rgba(0,230,118,0.2)', borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  botBubble: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)' },
  avatarText: { fontSize: 14, marginBottom: 4 },
  messageText: { fontSize: 13, lineHeight: 18 },
  userText: { color: '#FFFFFF' },
  botText: { color: 'rgba(255,255,255,0.9)' },
  timestamp: { fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 6, alignSelf: 'flex-end' },
  
  chartContainer: {
    marginTop: 10, padding: 10, backgroundColor: 'rgba(0,230,118,0.05)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)'
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chartLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  levelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  levelText: { color: '#FFFFFF', fontSize: 9, fontWeight: '600' },
  progressBackground: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: 6 },
  progressBar: { height: '100%', borderRadius: 3 },
  aqiNumber: { fontSize: 20, fontWeight: '700', color: '#00E676', textAlign: 'center' },
  
  forecastContainer: { marginTop: 10 },
  forecastTitle: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between' },
  forecastCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8,
    alignItems: 'center', flex: 1, marginHorizontal: 2, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)'
  },
  forecastDay: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  forecastAqi: { fontSize: 11, fontWeight: '700', color: '#00E676', marginVertical: 2 },
  forecastLevel: { fontSize: 7, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  forecastTemp: { fontSize: 8, color: '#FFC107', marginTop: 2 },
  
  loadingWrapper: { alignItems: 'flex-start', marginVertical: 3 },
  loadingBubble: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)'
  },
  loadingText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginLeft: 6 },
  
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 20, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(0,230,118,0.1)'
  },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end' },
  textInput: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(156,39,176,0.4)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.08)',
    fontSize: 13, maxHeight: 60, marginRight: 8, color: '#FFFFFF'
  },
  sendButton: { backgroundColor: '#9C27B0', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.3)' }
});

export default AmihanChatbot;