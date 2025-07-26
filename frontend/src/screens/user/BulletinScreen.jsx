import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Image, Alert, Platform, StatusBar, RefreshControl, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { getAllBulletins, toggleReaction } from '../../api/bulletin';

const BulletinFeed = ({ navigation }) => {
  const { user } = useSelector(state => state.auth);
  const [bulletins, setBulletins] = useState([]);
  const [filteredBulletins, setFilteredBulletins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['All', 'Environmental Alert', 'Weather Update', 'Public Safety', 'Emergency', 'Event Notice', 'Service Disruption', 'Health Advisory', 'Traffic Alert', 'Community Announcement', 'General'];

  const fetchBulletins = useCallback(async () => {
    try {
      const data = await getAllBulletins();
      setBulletins(data);
      setFilteredBulletins(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch bulletins');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBulletins();
  }, [fetchBulletins]);

  useEffect(() => {
    let filtered = bulletins;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b => 
        b.title.toLowerCase().includes(query) || b.message.toLowerCase().includes(query) ||
        b.createdBy.name.toLowerCase().includes(query) || b.category.toLowerCase().includes(query)
      );
    }
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(b => b.category === selectedCategory);
    }
    setFilteredBulletins(filtered);
  }, [searchQuery, selectedCategory, bulletins]);

  const handleReaction = async (bulletinId, type) => {
    try {
      await toggleReaction(bulletinId, type);
      await fetchBulletins();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update reaction');
    }
  };

  const getUserReaction = (reactions) => reactions.find(r => r.user._id === user._id)?.type || null;
  const getReactionCount = (reactions, type) => reactions.filter(r => r.type === type).length;
  const formatTimeAgo = (dateString) => {
    const diffInMinutes = Math.floor((new Date() - new Date(dateString)) / (1000 * 60));
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Environmental Alert': '🌍', 'Weather Update': '🌤️', 'Public Safety': '🚨', 'Emergency': '🚨',
      'Event Notice': '📅', 'Service Disruption': '⚠️', 'Health Advisory': '🏥', 'Traffic Alert': '🚦',
      'Community Announcement': '📢', 'General': '📢'
    };
    return icons[category] || '📢';
  };

  const truncateText = (text, maxLength = 120) => text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
  const navigateToBulletin = (bulletin) => navigation.navigate('BulletinDetail', { bulletin });

  const renderPhotoLayout = (photos) => {
    if (!photos || photos.length === 0) return null;

    switch (photos.length) {
      case 1:
        return (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photos[0].url }} style={styles.singlePhoto} />
          </View>
        );
      case 2:
        return (
          <View style={styles.photoContainer}>
            <View style={styles.photoRow}>
              <Image source={{ uri: photos[0].url }} style={styles.halfPhoto} />
              <Image source={{ uri: photos[1].url }} style={styles.halfPhoto} />
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photos[0].url }} style={styles.mainPhoto} />
            <View style={styles.photoRow}>
              <Image source={{ uri: photos[1].url }} style={styles.halfPhoto} />
              <Image source={{ uri: photos[2].url }} style={styles.halfPhoto} />
            </View>
          </View>
        );
      default:
        return (
          <View style={styles.photoContainer}>
            <View style={styles.photoRow}>
              <Image source={{ uri: photos[0].url }} style={styles.halfPhoto} />
              <Image source={{ uri: photos[1].url }} style={styles.halfPhoto} />
            </View>
            <View style={styles.photoRow}>
              <Image source={{ uri: photos[2].url }} style={styles.halfPhoto} />
              <View style={styles.morePhotosContainer}>
                <Image 
                  source={{ uri: photos[3].url }} 
                  style={[styles.halfPhoto, photos.length > 4 && styles.blurredPhoto]} 
                  blurRadius={photos.length > 4 ? 2 : 0} 
                />
                {photos.length > 4 && (
                  <View style={styles.morePhotosOverlay}>
                    <Text style={styles.morePhotosText}>+{photos.length - 4}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
    }
  };

  const renderBulletin = ({ item }) => (
    <TouchableOpacity style={styles.bulletinCard} onPress={() => navigateToBulletin(item)} activeOpacity={0.9}>
      <View style={styles.bulletinHeader}>
        <View style={styles.bulletinIcon}>
          <Text style={styles.bulletinIconText}>{getCategoryIcon(item.category)}</Text>
        </View>
        <View style={styles.bulletinInfo}>
          <Text style={styles.bulletinTitle}>{item.title}</Text>
          <View style={styles.bulletinMeta}>
            <Text style={styles.bulletinSeparator}>•</Text>
            <Text style={styles.bulletinTime}>{formatTimeAgo(item.createdAt)}</Text>
            <Text style={styles.bulletinSeparator}>•</Text>
            <Text style={styles.bulletinCategory}>{item.category}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.bulletinMessage}>{truncateText(item.message)}</Text>
      {renderPhotoLayout(item.photos)}
      
      <View style={styles.bulletinFooter}>
        <View style={styles.bulletinReactions}>
          <TouchableOpacity 
            style={[styles.reactionButton, getUserReaction(item.reactions) === 'upvote' && styles.activeUpvote]}
            onPress={(e) => { e.stopPropagation(); handleReaction(item._id, 'upvote'); }}
          >
            <Ionicons name="thumbs-up-outline" size={16} color={getUserReaction(item.reactions) === 'upvote' ? '#10B981' : 'rgba(255,255,255,0.6)'} />
            <Text style={[styles.reactionText, getUserReaction(item.reactions) === 'upvote' && { color: '#10B981' }]}>
              {getReactionCount(item.reactions, 'upvote')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.reactionButton, getUserReaction(item.reactions) === 'downvote' && styles.activeDownvote]}
            onPress={(e) => { e.stopPropagation(); handleReaction(item._id, 'downvote'); }}
          >
            <Ionicons name="thumbs-down-outline" size={16} color={getUserReaction(item.reactions) === 'downvote' ? '#EF4444' : 'rgba(255,255,255,0.6)'} />
            <Text style={[styles.reactionText, getUserReaction(item.reactions) === 'downvote' && { color: '#EF4444' }]}>
              {getReactionCount(item.reactions, 'downvote')}
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.commentButton} onPress={() => navigateToBulletin(item)}>
          <Ionicons name="chatbubble-outline" size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.commentText}>{item.comments.length} comments</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.searchAndFilterRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bulletins..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity style={styles.filterToggle} onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="filter" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      {showFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[styles.filterChip, selectedCategory === category && styles.activeFilterChip]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.filterText, selectedCategory === category && styles.activeFilterText]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}> AirNet AI Bulletins</Text>
          </View>
          
          <FlatList
            data={filteredBulletins}
            renderItem={renderBulletin}
            keyExtractor={(item) => item._id}
            ListHeaderComponent={ListHeader}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={() => { setRefreshing(true); fetchBulletins(); }}
                tintColor="#00E676"
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No bulletins found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
              </View>
            }
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  
  headerContainer: { paddingHorizontal: 20, paddingBottom: 15 },
  searchAndFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  filterToggle: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  filterContainer: { marginBottom: 5 },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 },
  activeFilterChip: { backgroundColor: '#00E676' },
  filterText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  activeFilterText: { color: '#0A0A0A', fontWeight: '600' },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  bulletinCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderColor: 'rgba(0,230,118,0.2)', borderWidth: 1 },
  separator: { height: 12 },
  
  bulletinHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  bulletinIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00E676', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bulletinIconText: { fontSize: 16 },
  bulletinInfo: { flex: 1 },
  bulletinTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  bulletinMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  bulletinAuthor: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  bulletinSeparator: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginHorizontal: 6 },
  bulletinTime: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  bulletinCategory: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  moreButton: { padding: 4 },
  
  bulletinMessage: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20, marginBottom: 12 },
  
  photoContainer: { marginBottom: 12, borderRadius: 8, overflow: 'hidden' },
  singlePhoto: { width: '100%', height: 200, resizeMode: 'cover' },
  mainPhoto: { width: '100%', height: 160, resizeMode: 'cover', marginBottom: 2 },
  photoRow: { flexDirection: 'row', gap: 2 },
  halfPhoto: { flex: 1, height: 120, resizeMode: 'cover' },
  morePhotosContainer: { flex: 1, position: 'relative' },
  blurredPhoto: { position: 'relative' },
  morePhotosOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  morePhotosText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  
  bulletinFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  bulletinReactions: { flexDirection: 'row', gap: 16 },
  reactionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeUpvote: { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  activeDownvote: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  reactionText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  commentButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: 'rgba(255,255,255,0.6)' }
});

export default BulletinFeed;