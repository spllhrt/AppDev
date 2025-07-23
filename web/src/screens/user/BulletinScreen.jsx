import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, Image, Alert, Platform, StatusBar, RefreshControl, FlatList, Animated } from 'react-native';
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [filterAnimation] = useState(new Animated.Value(1));

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
    
    if (dateFrom || dateTo) {
      filtered = filtered.filter(b => {
        const bulletinDate = new Date(b.createdAt).toISOString().split('T')[0];
        const fromMatch = !dateFrom || bulletinDate >= dateFrom;
        const toMatch = !dateTo || bulletinDate <= dateTo;
        return fromMatch && toMatch;
      });
    }
    
    setFilteredBulletins(filtered);
  }, [searchQuery, selectedCategory, dateFrom, dateTo, bulletins]);

  const toggleFilters = () => {
    const toValue = filtersVisible ? 0 : 1;
    setFiltersVisible(!filtersVisible);
    Animated.timing(filterAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const clearFilters = () => {
    setSelectedCategory('All');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

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

  const renderPhotoLayout = (photos) => {
    if (!photos || photos.length === 0) return null;

    switch (photos.length) {
      case 1:
        return <Image source={{ uri: photos[0].url }} style={styles.singlePhoto} />;
      case 2:
        return (
          <View style={styles.photoRow}>
            {photos.slice(0, 2).map((photo, i) => (
              <Image key={i} source={{ uri: photo.url }} style={styles.halfPhoto} />
            ))}
          </View>
        );
      case 3:
        return (
          <View>
            <Image source={{ uri: photos[0].url }} style={styles.mainPhoto} />
            <View style={styles.photoRow}>
              {photos.slice(1, 3).map((photo, i) => (
                <Image key={i} source={{ uri: photo.url }} style={styles.halfPhoto} />
              ))}
            </View>
          </View>
        );
      default:
        return (
          <View>
            <View style={styles.photoRow}>
              {photos.slice(0, 2).map((photo, i) => (
                <Image key={i} source={{ uri: photo.url }} style={styles.halfPhoto} />
              ))}
            </View>
            <View style={styles.photoRow}>
              <Image source={{ uri: photos[2].url }} style={styles.halfPhoto} />
              <View style={styles.morePhotosContainer}>
                <Image source={{ uri: photos[3].url }} style={[styles.halfPhoto, styles.blurredPhoto]} blurRadius={2} />
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
    <TouchableOpacity style={styles.bulletinCard} onPress={() => navigation.navigate('BulletinDetail', { bulletin: item })}>
      <View style={styles.bulletinHeader}>
        <View style={styles.bulletinIcon}>
          <Text style={styles.bulletinIconText}>{getCategoryIcon(item.category)}</Text>
        </View>
        <View style={styles.bulletinInfo}>
          <Text style={styles.bulletinTitle}>{item.title}</Text>
          <View style={styles.bulletinMeta}>
            <Text style={styles.bulletinAuthor}>{item.createdBy.name}</Text>
            <Text style={styles.bulletinTime}>{formatTimeAgo(item.createdAt)}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <Text style={styles.bulletinMessage}>{truncateText(item.message, 150)}</Text>
      
      {item.photos && item.photos.length > 0 && (
        <View style={styles.photoContainer}>
          {renderPhotoLayout(item.photos)}
        </View>
      )}
      
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
          
          <TouchableOpacity style={styles.commentButton}>
            <Ionicons name="chatbubble-outline" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.commentText}>{item.comments.length}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>AirNet AI Bulletin</Text>
              <Text style={styles.headerSubtitle}>{filteredBulletins.length} bulletins</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Main Content */}
          <View style={styles.mainContainer}>
            {/* Left Sidebar */}
            <View style={styles.sidebar}>
              {/* Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="rgba(255,255,255,0.6)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search bulletins..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filter Toggle */}
              <View style={styles.filterHeader}>
                <TouchableOpacity style={styles.filterToggle} onPress={toggleFilters}>
                  <Ionicons name="filter" size={16} color="#00E676" />
                  <Text style={styles.filterToggleText}>Filters</Text>
                  <Ionicons 
                    name={filtersVisible ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="rgba(255,255,255,0.6)" 
                  />
                </TouchableOpacity>
                
                {(selectedCategory !== 'All' || dateFrom || dateTo) && (
                  <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Collapsible Filters */}
              <Animated.View style={[styles.filterContainer, { maxHeight: filterAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 400] }) }]}>
                {/* Date Filters */}
                <View style={styles.dateSection}>
                  <Text style={styles.sectionTitle}>Date Range</Text>
                  <View style={styles.dateInputs}>
                    <View style={styles.dateInputContainer}>
                      <Text style={styles.dateLabel}>From</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={dateFrom}
                        onChangeText={setDateFrom}
                      />
                    </View>
                    <View style={styles.dateInputContainer}>
                      <Text style={styles.dateLabel}>To</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={dateTo}
                        onChangeText={setDateTo}
                      />
                    </View>
                  </View>
                </View>

                {/* Categories */}
                <View style={styles.categorySection}>
                  <Text style={styles.sectionTitle}>Categories</Text>
                  <View style={styles.categoryGrid}>
                    {categories.map(category => (
                      <TouchableOpacity
                        key={category}
                        style={[styles.categoryChip, selectedCategory === category && styles.activeCategoryChip]}
                        onPress={() => setSelectedCategory(category)}
                      >
                        <Text style={[styles.categoryText, selectedCategory === category && styles.activeCategoryText]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </Animated.View>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
              <FlatList
                data={filteredBulletins}
                renderItem={renderBulletin}
                keyExtractor={(item) => item._id}
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
                    <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyText}>No bulletins found</Text>
                    <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
                  </View>
                }
              />
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
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerPlaceholder: { width: 36 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Main Layout
  mainContainer: { flex: 1, flexDirection: 'row', paddingHorizontal: 70, paddingVertical: 16, gap: 20 },
  sidebar: { width: 280 },
  content: { flex: 1 },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)',
    gap: 8,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },

  // Filter Header
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterToggleText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  clearButton: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.15)' },
  clearButtonText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },

  // Filter Container
  filterContainer: { overflow: 'hidden' },
  
  // Date Section
  dateSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  dateInputs: { gap: 8 },
  dateInputContainer: {},
  dateLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  dateInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)',
  },

  // Category Section
  categorySection: {},
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeCategoryChip: { backgroundColor: '#00E676', borderColor: '#00E676' },
  categoryText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  activeCategoryText: { color: '#0A0A0A', fontWeight: '600' },

  // Bulletin List
  listContent: { paddingVertical: 0 },
  separator: { height: 12 },
  
  // Bulletin Card
  bulletinCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.15)',
  },
  bulletinHeader: { flexDirection: 'row', marginBottom: 10 },
  bulletinIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bulletinIconText: { fontSize: 16 },
  bulletinInfo: { flex: 1 },
  bulletinTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4, lineHeight: 20 },
  bulletinMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletinAuthor: { fontSize: 12, color: '#00E676', fontWeight: '600' },
  bulletinTime: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  categoryBadge: {
    backgroundColor: 'rgba(0,230,118,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: { fontSize: 10, color: '#00E676', fontWeight: '600' },
  bulletinMessage: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20, marginBottom: 12 },
  
  // Photos
  photoContainer: { marginBottom: 12, borderRadius: 8, overflow: 'hidden'},
  singlePhoto: { width: '100%', height: 300, resizeMode: 'cover' }, // Increased from 200 to 300
  mainPhoto: { width: '100%', height: 220, resizeMode: 'cover', marginBottom: 2 }, // Increased from 160 to 240
  photoRow: { flexDirection: 'row', gap: 2 },
  halfPhoto: { flex: 1, height: 220, resizeMode: 'cover' }, // Increased from 120 to 180
  morePhotosContainer: { flex: 1, position: 'relative' },
  blurredPhoto: { position: 'relative' },
  morePhotosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Footer
  bulletinFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  bulletinReactions: { flexDirection: 'row', gap: 16 },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeUpvote: { backgroundColor: 'rgba(16,185,129,0.15)' },
  activeDownvote: { backgroundColor: 'rgba(239,68,68,0.15)' },
  reactionText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  commentButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  commentText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  rightActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },

  // Empty State
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
});

export default BulletinFeed;