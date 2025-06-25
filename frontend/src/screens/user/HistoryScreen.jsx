import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HistoryScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>History Screen Placeholder</Text>
      <Text style={styles.subText}>This is where the history content will appear</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00E676',
    marginBottom: 16,
  },
  subText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default HistoryScreen;