import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, RefreshControl, Modal, StyleSheet, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { createBulletin, getAllBulletins, deleteBulletin, updateBulletin, getBulletinById } from '../../api/bulletin';

const { width, height } = Dimensions.get('window');

const AdminBulletinManagement = () => {
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [formData, setFormData] = useState({ title: '', category: '', message: '' });
  const [editingBulletin, setEditingBulletin] = useState(null);
  const [viewingBulletin, setViewingBulletin] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [loadingBulletin, setLoadingBulletin] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const categories = ['Environmental Alert', 'Weather Update', 'Public Safety', 'Emergency', 'Event Notice', 'Service Disruption', 'Health Advisory', 'Traffic Alert', 'Community Announcement', 'General'];

  useFocusEffect(useCallback(() => { fetchBulletins(); }, []));

  const fetchBulletins = async () => {
    try {
      setLoading(true);
      const data = await getAllBulletins();
      setBulletins(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch bulletins');
      setBulletins([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBulletinDetails = async (bulletinId) => {
    try {
      setLoadingBulletin(true);
      const data = await getBulletinById(bulletinId);
      setViewingBulletin(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch bulletin details');
    } finally {
      setLoadingBulletin(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBulletins();
    setRefreshing(false);
  }, []);

  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      setSelectedImages(prev => [...prev, ...result.assets]);
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({ title: '', category: '', message: '' });
    setSelectedImages([]);
    setEditingBulletin(null);
  };

  const handleCreateBulletin = async () => {
    if (!formData.title.trim() || !formData.category || !formData.message.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    try {
      setCreating(true);
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('message', formData.message);
      selectedImages.forEach((image, index) => {
        formDataToSend.append('photos', {
          uri: image.uri,
          type: image.mimeType || 'image/jpeg',
          name: `image_${index}.jpg`,
        });
      });
      await createBulletin(formDataToSend);
      Alert.alert('Success', 'Bulletin created successfully!');
      setCreateModalVisible(false);
      resetForm();
      fetchBulletins();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create bulletin');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateBulletin = async () => {
    if (!formData.title.trim() || !formData.category || !formData.message.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    try {
      setUpdating(true);
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('message', formData.message);
      selectedImages.forEach((image, index) => {
        formDataToSend.append('photos', {
          uri: image.uri,
          type: image.mimeType || 'image/jpeg',
          name: `image_${index}.jpg`,
        });
      });
      await updateBulletin(editingBulletin._id, formDataToSend);
      Alert.alert('Success', 'Bulletin updated successfully!');
      setUpdateModalVisible(false);
      resetForm();
      fetchBulletins();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update bulletin');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewBulletin = async (bulletin) => {
    setViewingBulletin(bulletin);
    setViewModalVisible(true);
    await fetchBulletinDetails(bulletin._id);
  };

  const handleEditBulletin = (bulletin) => {
    setEditingBulletin(bulletin);
    setFormData({ title: bulletin.title || '', category: bulletin.category || '', message: bulletin.message || '' });
    setSelectedImages([]);
    setUpdateModalVisible(true);
  };

  const handleDeleteBulletin = (bulletinId, title) => {
    Alert.alert('Delete Bulletin', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteBulletin(bulletinId);
          Alert.alert('Success', 'Bulletin deleted successfully');
          fetchBulletins();
        } catch (error) {
          Alert.alert('Error', error.message || 'Failed to delete bulletin');
        }
      }}
    ]);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'General': '#6366F1', 'Environmental Alert': '#059669', 'Weather Update': '#0EA5E9', 'Public Safety': '#F59E0B',
      'Emergency': '#DC2626', 'Event Notice': '#8B5CF6', 'Service Disruption': '#EF4444', 'Health Advisory': '#06B6D4',
      'Traffic Alert': '#F97316', 'Community Announcement': '#10B981'
    };
    return colors[category] || '#6366F1';
  };

  const renderComment = (comment, index) => (
    <View key={comment._id || index} style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.commentUserInfo}>
          <View style={styles.commentAvatar}>
            <Text style={styles.commentAvatarText}>
              {comment.user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.commentMeta}>
            <Text style={styles.commentUserName}>{comment.user?.name || 'Unknown User'}</Text>
            <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.commentText}>{comment.content}</Text>
    </View>
  );

  const renderViewModal = () => (
    <Modal 
      visible={viewModalVisible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setViewModalVisible(false);
        setViewingBulletin(null);
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            onPress={() => { 
              setViewModalVisible(false);
              setViewingBulletin(null);
            }}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>View Bulletin</Text>
          <View style={styles.viewHeaderActions}>
            <TouchableOpacity 
              onPress={() => {
                setViewModalVisible(false);
                handleEditBulletin(viewingBulletin);
              }}
              style={styles.editActionButton}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView 
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.viewModalContentContainer}
        >
          {loadingBulletin ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading bulletin details...</Text>
            </View>
          ) : viewingBulletin ? (
            <>
              {/* Bulletin Content */}
              <View style={styles.viewBulletinCard}>
                <View style={styles.viewBulletinHeader}>
                  <Text style={styles.viewBulletinTitle}>{viewingBulletin.title}</Text>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(viewingBulletin.category) }]}>
                    <Text style={styles.categoryText}>{viewingBulletin.category}</Text>
                  </View>
                </View>
                
                <Text style={styles.viewBulletinMessage}>{viewingBulletin.message}</Text>
                
                {viewingBulletin.photos?.length > 0 && (
                  <View style={styles.viewPhotosContainer}>
                    <Text style={styles.viewSectionTitle}>Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.viewPhotosRow}>
                        {viewingBulletin.photos.map((photo, index) => (
                          <TouchableOpacity 
                            key={index} 
                            onPress={() => setPreviewImage(photo.url)} 
                            activeOpacity={0.8}
                          >
                            <Image source={{ uri: photo.url }} style={styles.viewBulletinPhoto} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
                
                <View style={styles.viewBulletinFooter}>
                  <Text style={styles.viewCreatedBy}>Created by: {viewingBulletin.createdBy?.name || 'Unknown'}</Text>
                  <Text style={styles.viewCreatedAt}>{formatDate(viewingBulletin.createdAt)}</Text>
                </View>
                
                <View style={styles.viewStatsContainer}>
                  <View style={styles.statItem}>
                    <Ionicons name="thumbs-up-outline" size={18} color="#10B981" />
                    <Text style={styles.viewStatText}>
                      {viewingBulletin.reactions?.filter(r => r.type === 'upvote').length || 0} Upvotes
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="thumbs-down-outline" size={18} color="#EF4444" />
                    <Text style={styles.viewStatText}>
                      {viewingBulletin.reactions?.filter(r => r.type === 'downvote').length || 0} Downvotes
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="chatbubble-outline" size={18} color="#6B7280" />
                    <Text style={styles.viewStatText}>
                      {viewingBulletin.comments?.length || 0} Comments
                    </Text>
                  </View>
                </View>
              </View>

              {/* Comments Section */}
              <View style={styles.commentsSection}>
                <View style={styles.commentsSectionHeader}>
                  <Text style={styles.commentsSectionTitle}>
                    Comments ({viewingBulletin.comments?.length || 0})
                  </Text>
                  <Ionicons name="chatbubbles-outline" size={20} color="#6B7280" />
                </View>
                
                {viewingBulletin.comments?.length > 0 ? (
                  <View style={styles.commentsList}>
                    {viewingBulletin.comments.map((comment, index) => renderComment(comment, index))}
                  </View>
                ) : (
                  <View style={styles.noCommentsContainer}>
                    <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.noCommentsText}>No comments yet</Text>
                    <Text style={styles.noCommentsSubtext}>Be the first to start a conversation</Text>
                  </View>
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderBulletinItem = (item) => {
    if (!item?._id) return null;
    return (
      <View style={styles.bulletinCard}>
        <View style={styles.bulletinHeader}>
          <View style={styles.bulletinInfo}>
            <Text style={styles.bulletinTitle}>{item.title || 'Untitled'}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
              <Text style={styles.categoryText}>{item.category || 'General'}</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.viewButton} onPress={() => handleViewBulletin(item)} activeOpacity={0.7}>
              <Ionicons name="eye-outline" size={20} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.editButton} onPress={() => handleEditBulletin(item)} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteBulletin(item._id, item.title)} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.bulletinMessage}>{item.message || 'No message'}</Text>
        {item.photos?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
            {item.photos.map((photo, index) => (
              <TouchableOpacity key={index} onPress={() => setPreviewImage(photo.url)} activeOpacity={0.8}>
                <Image source={{ uri: photo.url }} style={styles.bulletinPhoto} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={styles.bulletinFooter}>
          <Text style={styles.createdBy}>By: {item.createdBy?.name || 'Unknown'}</Text>
          <Text style={styles.createdAt}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="thumbs-up-outline" size={16} color="#10B981" />
            <Text style={styles.statText}>{item.reactions?.filter(r => r.type === 'upvote').length || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="thumbs-down-outline" size={16} color="#EF4444" />
            <Text style={styles.statText}>{item.reactions?.filter(r => r.type === 'downvote').length || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
            <Text style={styles.statText}>{item.comments?.length || 0}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFormModal = (isUpdate = false) => (
    <Modal 
      visible={isUpdate ? updateModalVisible : createModalVisible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={() => {
        isUpdate ? setUpdateModalVisible(false) : setCreateModalVisible(false);
        resetForm();
      }}
    >
      <KeyboardAvoidingView 
        style={styles.modalContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            onPress={() => { 
              isUpdate ? setUpdateModalVisible(false) : setCreateModalVisible(false); 
              resetForm(); 
            }}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{isUpdate ? 'Update Bulletin' : 'Create New Bulletin'}</Text>
          <TouchableOpacity 
            onPress={isUpdate ? handleUpdateBulletin : handleCreateBulletin} 
            disabled={isUpdate ? updating : creating}
            style={[styles.saveButtonContainer, (isUpdate ? updating : creating) && styles.saveButtonDisabled]}
            activeOpacity={0.7}
          >
            <Text style={[styles.saveButton, (isUpdate ? updating : creating) && styles.saveButtonTextDisabled]}>
              {isUpdate ? (updating ? 'Updating...' : 'Update') : (creating ? 'Creating...' : 'Create')}
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.modalContentContainer}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput 
              style={styles.input} 
              value={formData.title} 
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))} 
              placeholder="Enter bulletin title" 
              maxLength={100}
              multiline={false}
              returnKeyType="next"
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScrollView}>
              <View style={styles.categoryContainer}>
                {categories.map((category) => (
                  <TouchableOpacity 
                    key={category} 
                    style={[styles.categoryChip, formData.category === category && styles.categoryChipSelected]} 
                    onPress={() => setFormData(prev => ({ ...prev, category }))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.categoryChipText, formData.category === category && styles.categoryChipTextSelected]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message *</Text>
            <TextInput 
              style={[styles.input, styles.messageInput]} 
              value={formData.message} 
              onChangeText={(text) => setFormData(prev => ({ ...prev, message: text }))} 
              placeholder="Enter bulletin message" 
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="default"
              blurOnSubmit={false}
            />
          </View>

          {isUpdate && editingBulletin?.photos?.length > 0 && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.currentPhotosContainer}>
                  {editingBulletin.photos.map((photo, index) => (
                    <Image key={index} source={{ uri: photo.url }} style={styles.currentPhoto} />
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.photoNote}>Note: Adding new photos will replace existing ones</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{isUpdate ? 'New Photos (Optional)' : 'Photos (Optional)'}</Text>
            <TouchableOpacity 
              style={styles.addPhotoButton} 
              onPress={pickImages}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={24} color="#3B82F6" />
              <Text style={styles.addPhotoText}>Add Photos</Text>
            </TouchableOpacity>
          </View>

          {selectedImages.length > 0 && (
            <View style={styles.inputGroup}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.selectedImagesContainer}>
                  {selectedImages.map((image, index) => (
                    <View key={index} style={styles.selectedImageContainer}>
                      <Image source={{ uri: image.uri }} style={styles.selectedImage} />
                      <TouchableOpacity 
                        style={styles.removeImageButton} 
                        onPress={() => removeImage(index)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderImagePreview = () => (
    <Modal visible={previewImage !== null} transparent={true} animationType="fade">
      <View style={styles.previewContainer}>
        <TouchableOpacity 
          style={styles.previewCloseButton} 
          onPress={() => setPreviewImage(null)}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>
        {previewImage && (
          <Image 
            source={{ uri: previewImage }} 
            style={styles.previewImage} 
            resizeMode="contain" 
          />
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading bulletins...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bulletin Management</Text>
        <TouchableOpacity 
          style={styles.createButton} 
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.content} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {bulletins.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No bulletins found</Text>
            <Text style={styles.emptySubtext}>Create your first bulletin to get started</Text>
          </View>
        ) : (
          bulletins.map((item) => <View key={item._id}>{renderBulletinItem(item)}</View>)
        )}
      </ScrollView>
      
      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderViewModal()}
      {renderImagePreview()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1E293B' 
  },
  createButton: { 
    backgroundColor: '#3B82F6', 
    borderRadius: 10, 
    padding: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  content: { 
    flex: 1, 
    padding: 16 
  },
  bulletinCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 6, 
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  bulletinHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12 
  },
  bulletinInfo: { 
    flex: 1, 
    marginRight: 10 
  },
  bulletinTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#1E293B', 
    marginBottom: 8,
    lineHeight: 22
  },
  categoryBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 16, 
    alignSelf: 'flex-start' 
  },
  categoryText: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: '600' 
  },
  actionButtons: { 
    flexDirection: 'row', 
    gap: 6 
  },
  viewButton: { 
    padding: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  editButton: { 
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  deleteButton: { 
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  bulletinMessage: { 
    fontSize: 14, 
    color: '#475569', 
    lineHeight: 20, 
    marginBottom: 12 
  },
  photosContainer: { 
    marginBottom: 12 
  },
  bulletinPhoto: { 
    width: 70, 
    height: 70, 
    borderRadius: 10, 
    marginRight: 10 
  },
  bulletinFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  createdBy: { 
    fontSize: 13, 
    color: '#64748B', 
    fontWeight: '600' 
  },
  createdAt: { 
    fontSize: 11, 
    color: '#94A3B8' 
  },
  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#E2E8F0' 
  },
  statItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  statText: { 
    fontSize: 13, 
    color: '#64748B', 
    fontWeight: '600' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: '#64748B' 
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 60 
  },
  emptyText: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#64748B', 
    marginTop: 12 
  },
  emptySubtext: { 
    fontSize: 13, 
    color: '#94A3B8', 
    marginTop: 6 
  },
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  closeButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9'
  },
  modalTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#1E293B' 
  },
  viewHeaderActions: {
    flexDirection: 'row',
    gap: 8
  },
  editActionButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  saveButtonContainer: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  saveButton: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  saveButtonDisabled: { 
    backgroundColor: '#94A3B8' 
  },
  saveButtonTextDisabled: { 
    color: '#fff' 
  },
  modalContent: { 
    flex: 1 
  },
  modalContentContainer: {
    padding: 16,
    paddingBottom: 32
  },
  viewModalContentContainer: {
    padding: 16,
    paddingBottom: 32
  },
  inputGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#374151', 
    marginBottom: 8 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    borderRadius: 10, 
    padding: 12, 
    fontSize: 14, 
    backgroundColor: '#F9FAFB',
    color: '#374151'
  },
  messageInput: { 
    height: 100, 
    textAlignVertical: 'top' 
  },
  categoryScrollView: {
    maxHeight: 50
  },
  categoryContainer: { 
    flexDirection: 'row', 
    gap: 8,
    paddingVertical: 6
  },
  categoryChip: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#F3F4F6', 
    borderWidth: 1, 
    borderColor: '#D1D5DB' 
  },
  categoryChipSelected: { 
    backgroundColor: '#3B82F6', 
    borderColor: '#3B82F6' 
  },
  categoryChipText: { 
    fontSize: 12, 
    color: '#6B7280', 
    fontWeight: '500' 
  },
  categoryChipTextSelected: { 
    color: '#fff' 
  },
  currentPhotosContainer: { 
    flexDirection: 'row', 
    gap: 8 
  },
  currentPhoto: { 
    width: 50, 
    height: 50, 
    borderRadius: 10 
  },
  photoNote: { 
    fontSize: 11, 
    color: '#6B7280', 
    fontStyle: 'italic', 
    marginTop: 8 
  },
  addPhotoButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    borderWidth: 2, 
    borderColor: '#3B82F6', 
    borderStyle: 'dashed', 
    borderRadius: 10, 
    gap: 8,
    backgroundColor: '#F0F9FF'
  },
  addPhotoText: { 
    color: '#3B82F6', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  selectedImagesContainer: { 
    flexDirection: 'row', 
    gap: 8 
  },
  selectedImageContainer: { 
    position: 'relative' 
  },
  selectedImage: { 
    width: 70, 
    height: 70, 
    borderRadius: 10 
  },
  removeImageButton: { 
    position: 'absolute', 
    top: -6, 
    right: -6, 
    backgroundColor: '#fff', 
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  previewContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.95)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  previewCloseButton: { 
    position: 'absolute', 
    top: 60, 
    right: 20, 
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8
  },
  previewImage: { 
    width: width, 
    height: height * 0.8 
  },
  // View Modal Specific Styles
  viewBulletinCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  viewBulletinHeader: {
    marginBottom: 16
  },
  viewBulletinTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    lineHeight: 26
  },
  viewBulletinMessage: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 20
  },
  viewPhotosContainer: {
    marginBottom: 20
  },
  viewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12
  },
  viewPhotosRow: {
    flexDirection: 'row',
    gap: 12
  },
  viewBulletinPhoto: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6'
  },
  viewBulletinFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginBottom: 16
  },
  viewCreatedBy: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600'
  },
  viewCreatedAt: {
    fontSize: 12,
    color: '#94A3B8'
  },
  viewStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  viewStatText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600'
  },
  // Comments Section Styles
  commentsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  commentsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  commentsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B'
  },
  commentsList: {
    gap: 16
  },
  commentItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  commentHeader: {
    marginBottom: 8
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  commentMeta: {
    flex: 1
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  commentDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },
  commentText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20
  },
  noCommentsContainer: {
    alignItems: 'center',
    paddingVertical: 40
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12
  },
});

export default AdminBulletinManagement;