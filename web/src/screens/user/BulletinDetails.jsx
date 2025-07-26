import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, 
  TextInput, Image, Alert, Platform, StatusBar, RefreshControl,
  KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Modal,
  Dimensions, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { getBulletinById, toggleReaction, addComment } from '../../api/bulletin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BulletinDetail = ({ route, navigation }) => {
  const { bulletin: initialBulletin } = route.params;
  const { user } = useSelector(state => state.auth);
  const insets = useSafeAreaInsets();
  
  const [bulletin, setBulletin] = useState(initialBulletin);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [commentModalVisible, setCommentModalVisible] = useState(false);

  const getUserReaction = (reactions) => reactions?.find(r => r.user._id === user._id)?.type || null;
  const getReactionCount = (reactions, type) => reactions?.filter(r => r.type === type).length || 0;

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Environmental Alert': '🌍', 'Weather Update': '🌤️', 'Public Safety': '🚨',
      'Emergency': '🚨', 'Event Notice': '📅', 'Service Disruption': '⚠️',
      'Health Advisory': '🏥', 'Traffic Alert': '🚦', 'Community Announcement': '📢',
      'General': '📢'
    };
    return icons[category] || '📢';
  };

  const fetchBulletinDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBulletinById(initialBulletin._id); // Use initialBulletin._id here
      setBulletin(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch bulletin details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [initialBulletin._id]);

  useEffect(() => {
    fetchBulletinDetails();
  }, [fetchBulletinDetails]);

  const handleReaction = async (type) => {
    try {
      await toggleReaction(bulletin._id, type);
      await fetchBulletinDetails();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update reaction');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    
    try {
      setIsSubmittingComment(true);
      await addComment(bulletin._id, commentText.trim());
      setCommentText('');
      setCommentModalVisible(false);
      await fetchBulletinDetails();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBulletinDetails();
  };

  const openImageViewer = (index) => {
    setSelectedImageIndex(index);
    setImageViewerVisible(true);
  };

  const renderPhotoLayout = (photos) => {
    if (!photos || photos.length === 0) return null;

    switch (photos.length) {
      case 1:
        return (
          <TouchableOpacity onPress={() => openImageViewer(0)}>
            <Image source={{ uri: photos[0].url }} style={styles.singlePhoto} />
          </TouchableOpacity>
        );
      case 2:
        return (
          <View style={styles.photoRow}>
            {photos.map((photo, index) => (
              <TouchableOpacity key={index} onPress={() => openImageViewer(index)} style={styles.halfPhotoContainer}>
                <Image source={{ uri: photo.url }} style={styles.halfPhoto} />
              </TouchableOpacity>
            ))}
          </View>
        );
      case 3:
        return (
          <View>
            <TouchableOpacity onPress={() => openImageViewer(0)}>
              <Image source={{ uri: photos[0].url }} style={styles.mainPhoto} />
            </TouchableOpacity>
            <View style={styles.photoRow}>
              {photos.slice(1, 3).map((photo, index) => (
                <TouchableOpacity key={index + 1} onPress={() => openImageViewer(index + 1)} style={styles.halfPhotoContainer}>
                  <Image source={{ uri: photo.url }} style={styles.halfPhoto} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      default:
        return (
          <View>
            <View style={styles.photoRow}>
              {photos.slice(0, 2).map((photo, index) => (
                <TouchableOpacity key={index} onPress={() => openImageViewer(index)} style={styles.halfPhotoContainer}>
                  <Image source={{ uri: photo.url }} style={styles.halfPhoto} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.photoRow}>
              <TouchableOpacity onPress={() => openImageViewer(2)} style={styles.halfPhotoContainer}>
                <Image source={{ uri: photos[2].url }} style={styles.halfPhoto} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openImageViewer(3)} style={styles.halfPhotoContainer}>
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
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

const renderImageViewer = () => (
  <Modal visible={imageViewerVisible} transparent animationType="fade">
    <View style={styles.imageViewerContainer}>
      <TouchableOpacity 
        style={[styles.closeButton, { top: insets.top + 10 }]} 
        onPress={() => setImageViewerVisible(false)}
      >
        <Ionicons name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <View style={styles.imageListContainer}>
        <FlatList
          data={bulletin.photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={selectedImageIndex}
          contentContainerStyle={styles.flatListContent}
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index
          })}
          renderItem={({ item }) => (
            <View style={styles.imageItem}>
              <Image 
                source={{ uri: item.url }} 
                style={styles.fullscreenImage} 
                resizeMode="contain"
              />
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setSelectedImageIndex(newIndex);
          }}
        />
      </View>
      
      <View style={[styles.imageCounter, { bottom: insets.bottom + 20 }]}>
        <Text style={styles.imageCounterText}>
          {selectedImageIndex + 1} / {bulletin.photos?.length}
        </Text>
      </View>
    </View>
  </Modal>
);
  const renderCommentModal = () => (
    <Modal
      visible={commentModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setCommentModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setCommentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Comment</Text>
                  <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.commentInputContainer}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Write your comment..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                    autoFocus
                  />
                </View>
                
                <View style={styles.modalFooter}>
                  <Text style={styles.characterCount}>
                    {commentText.length}/500
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!commentText.trim() || isSubmittingComment) && styles.submitButtonDisabled
                    ]}
                    onPress={handleAddComment}
                    disabled={!commentText.trim() || isSubmittingComment}
                  >
                    <Text style={[
                      styles.submitButtonText,
                      (!commentText.trim() || isSubmittingComment) && styles.submitButtonTextDisabled
                    ]}>
                      {isSubmittingComment ? 'Posting...' : 'Post'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderComment = ({ item: comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>
          {comment.user.name?.charAt(0).toUpperCase() || 'U'}
        </Text>
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentAuthor}>{comment.user.name}</Text>
          <Text style={styles.commentText}>{comment.text}</Text>
        </View>
        <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
      </View>
    </View>
  );

  const upvoteCount = getReactionCount(bulletin.reactions, 'upvote');
  const downvoteCount = getReactionCount(bulletin.reactions, 'downvote');
  const totalReactions = upvoteCount + downvoteCount;
  const userReaction = getUserReaction(bulletin.reactions);
  const commentsCount = bulletin.comments?.length || 0;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('BulletinScreen')}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Bulletin Details</Text>
                <Text style={styles.headerSubtitle}>{bulletin.category}</Text>
              </View>
              <TouchableOpacity style={styles.shareButton}>
                <Ionicons name="share-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Main Container */}
            <View style={styles.mainContainer}>
              {/* Left Sidebar - Bulletin Info */}
              <View style={styles.sidebar}>
                <View style={styles.bulletinInfoCard}>
                  <View style={styles.bulletinHeader}>
                    <View style={styles.bulletinIcon}>
                      <Text style={styles.bulletinIconText}>
                        {getCategoryIcon(bulletin.category)}
                      </Text>
                    </View>
                    <View style={styles.bulletinInfo}>
                      <Text style={styles.bulletinTitle}>{bulletin.title}</Text>
                      <View style={styles.bulletinMeta}>
                        <Text style={styles.bulletinTime}>{formatTimeAgo(bulletin.createdAt)}</Text>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{bulletin.category}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.bulletinMessage}>{bulletin.message}</Text>

                  {/* Reactions Summary */}
                  <View style={styles.reactionsSummary}>
                    <View style={styles.reactionsSummaryLeft}>
                      {totalReactions > 0 && (
                        <View style={styles.reactionIcons}>
                          {upvoteCount > 0 && (
                            <View style={styles.reactionIcon}>
                              <Ionicons name="thumbs-up" size={12} color="#10B981" />
                            </View>
                          )}
                          {downvoteCount > 0 && (
                            <View style={styles.reactionIcon}>
                              <Ionicons name="thumbs-down" size={12} color="#EF4444" />
                            </View>
                          )}
                        </View>
                      )}
                      <Text style={styles.reactionCount}>{totalReactions} reactions</Text>
                    </View>
                    <Text style={styles.commentCount}>
                      {commentsCount} comment{commentsCount !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionButton, userReaction === 'upvote' && styles.activeUpvote]}
                      onPress={() => handleReaction('upvote')}
                    >
                      <Ionicons 
                        name="thumbs-up-outline" 
                        size={16} 
                        color={userReaction === 'upvote' ? '#10B981' : 'rgba(255,255,255,0.6)'} 
                      />
                      <Text style={[styles.actionButtonText, userReaction === 'upvote' && { color: '#10B981' }]}>
                        {upvoteCount} upvote
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionButton, userReaction === 'downvote' && styles.activeDownvote]}
                      onPress={() => handleReaction('downvote')}
                    >
                      <Ionicons 
                        name="thumbs-down-outline" 
                        size={16} 
                        color={userReaction === 'downvote' ? '#EF4444' : 'rgba(255,255,255,0.6)'} 
                      />
                      <Text style={[styles.actionButtonText, userReaction === 'downvote' && { color: '#EF4444' }]}>
                        {downvoteCount} downvote
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => setCommentModalVisible(true)}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.actionButtonText}>Comment</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Main Content - Photos and Comments */}
              <View style={styles.content}>
                <ScrollView 
                  style={styles.scrollView}
                  contentContainerStyle={[styles.scrollViewContent, { paddingBottom: insets.bottom + 20 }]}
                  refreshControl={
                    <RefreshControl 
                      refreshing={refreshing} 
                      onRefresh={handleRefresh} 
                      tintColor="#00E676" 
                    />
                  }
                  showsVerticalScrollIndicator={false}
                >
                  {/* Photos Section */}
                  {bulletin.photos && bulletin.photos.length > 0 && (
                    <View style={styles.photosSection}>
                      <Text style={styles.sectionTitle}>Photos ({bulletin.photos.length})</Text>
                      <View style={styles.photoContainer}>
                        {renderPhotoLayout(bulletin.photos)}
                      </View>
                    </View>
                  )}

                  {/* Comments Section */}
                  <View style={styles.commentsSection}>
                    <Text style={styles.sectionTitle}>Comments ({commentsCount})</Text>
                    {commentsCount > 0 ? (
                      <FlatList
                        data={bulletin.comments}
                        renderItem={renderComment}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        scrollEnabled={false}
                        ItemSeparatorComponent={() => <View style={styles.commentSeparator} />}
                      />
                    ) : (
                      <View style={styles.noCommentsContainer}>
                        <Ionicons name="chatbubble-outline" size={48} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.noCommentsText}>No comments yet</Text>
                        <Text style={styles.noCommentsSubtext}>Be the first to comment!</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
        
        {renderImageViewer()}
        {renderCommentModal()}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },

  // Header (similar to BulletinFeed)
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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Main Layout (similar to BulletinFeed)
  mainContainer: { flex: 1, flexDirection: 'row', paddingHorizontal: 70, paddingVertical: 16, gap: 20 },
  sidebar: { width: 280 },
  content: { flex: 1 },

  // Bulletin Info Card
  bulletinInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.15)',
  },
  bulletinHeader: { flexDirection: 'row', marginBottom: 12 },
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
  bulletinMeta: { flexDirection: 'column', gap: 4 },
  bulletinAuthor: { fontSize: 12, color: '#00E676', fontWeight: '600' },
  bulletinTime: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  categoryBadge: {
    backgroundColor: 'rgba(0,230,118,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: { fontSize: 10, color: '#00E676', fontWeight: '600' },
  bulletinMessage: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20, marginBottom: 16 },

  // Reactions Summary
  reactionsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  reactionsSummaryLeft: { flexDirection: 'row', alignItems: 'center' },
  reactionIcons: { flexDirection: 'row', marginRight: 6 },
  reactionIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  reactionCount: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  commentCount: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  // Action Buttons
  actionButtons: { flexDirection: 'column', gap: 8 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  activeUpvote: { backgroundColor: 'rgba(16,185,129,0.15)' },
  activeDownvote: { backgroundColor: 'rgba(239,68,68,0.15)' },
  actionButtonText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  // Main Content
  scrollView: { flex: 1 },
  scrollViewContent: { flexGrow: 1 },

  // Sections
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  
  // Photos Section
  photosSection: { marginBottom: 24 },
  photoContainer: { borderRadius: 8, overflow: 'hidden' },
  singlePhoto: { width: '100%', height: 400, resizeMode: 'cover' },
  mainPhoto: { width: '100%', height: 300, resizeMode: 'cover', marginBottom: 2 },
  photoRow: { flexDirection: 'row', gap: 2 },
  halfPhotoContainer: { flex: 1 },
  halfPhoto: { width: '100%', height: 280, resizeMode: 'cover' },
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

  // Comments Section
  commentsSection: {},
  commentItem: { flexDirection: 'row', alignItems: 'flex-start' },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commentAvatarText: { fontSize: 12, fontWeight: '600', color: '#0A0A0A' },
  commentContent: { flex: 1 },
  commentBubble: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, marginBottom: 2 },
  commentAuthor: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  commentText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },
  commentTime: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 10 },
  commentSeparator: { height: 12 },
  noCommentsContainer: { alignItems: 'center', paddingVertical: 40 },
  noCommentsText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginTop: 12, marginBottom: 2 },
  noCommentsSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  // Image Viewer
imageViewerContainer: { 
  flex: 1, 
  backgroundColor: 'rgba(0,0,0,0.95)',
},
closeButton: {
  position: 'absolute',
  right: 20,
  zIndex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  borderRadius: 20,
  padding: 10,
},
imageContentContainer: {
  flex: 1,
  justifyContent: 'center',
  paddingHorizontal: 20, // Add some padding on sides
},
imageItem: {
  width: SCREEN_WIDTH - 40, // Account for padding
  justifyContent: 'center',
  alignItems: 'center',
},
fullscreenImage: {
  width: '100%',
  height: undefined,
  aspectRatio: 2,
  maxHeight: '80%', // Reduced from 80% to make smaller
},
imageCounter: {
  position: 'absolute',
  alignSelf: 'center',
  backgroundColor: 'rgba(0,0,0,0.5)',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
},
imageCounterText: { 
  color: '#FFFFFF', 
  fontSize: 14, 
  fontWeight: '500' 
},
  // Comment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    minHeight: 200,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 120,
    minHeight: 44,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  characterCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  submitButton: {
    backgroundColor: '#00E676',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  submitButtonText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
});

export default BulletinDetail;