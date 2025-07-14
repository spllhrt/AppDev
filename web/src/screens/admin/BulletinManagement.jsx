import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, RefreshControl, Modal, StyleSheet, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { createBulletin, getAllBulletins, deleteBulletin, updateBulletin } from '../../api/bulletin';

const { width, height } = Dimensions.get('window');

const AdminBulletinManagement = () => {
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [formData, setFormData] = useState({ title: '', category: '', message: '' });
  const [editingBulletin, setEditingBulletin] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBulletins();
    setRefreshing(false);
  }, []);

  // New function for header refresh button
  const handleHeaderRefresh = useCallback(async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    await onRefresh();
  }, [onRefresh, refreshing]);

  const pickImages = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    } else {
      // For mobile, you can implement expo-image-picker logic here
      Alert.alert('Info', 'Image picker for mobile needs to be implemented');
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImages(prev => [...prev, {
          uri: e.target.result,
          file: file,
          type: file.type,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
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
        if (Platform.OS === 'web' && image.file) {
          formDataToSend.append('photos', image.file);
        } else {
          formDataToSend.append('photos', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: image.name || `image_${index}.jpg`,
          });
        }
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
        if (Platform.OS === 'web' && image.file) {
          formDataToSend.append('photos', image.file);
        } else {
          formDataToSend.append('photos', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: image.name || `image_${index}.jpg`,
          });
        }
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
            <TouchableOpacity style={styles.editButton} onPress={() => handleEditBulletin(item)}>
              <Ionicons name="create-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteBulletin(item._id, item.title)}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.bulletinMessage}>{item.message || 'No message'}</Text>
        {item.photos?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
            {item.photos.map((photo, index) => (
              <TouchableOpacity key={index} onPress={() => setPreviewImage(photo.url)}>
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
      <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { 
            isUpdate ? setUpdateModalVisible(false) : setCreateModalVisible(false); 
            resetForm(); 
          }}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{isUpdate ? 'Update Bulletin' : 'Create New Bulletin'}</Text>
          <TouchableOpacity 
            onPress={isUpdate ? handleUpdateBulletin : handleCreateBulletin} 
            disabled={isUpdate ? updating : creating}
            style={[styles.saveButton, (isUpdate ? updating : creating) && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveButtonText}>
              {isUpdate ? (updating ? 'Updating...' : 'Update') : (creating ? 'Creating...' : 'Create')}
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput 
              style={styles.input} 
              value={formData.title} 
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))} 
              placeholder="Enter bulletin title" 
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {categories.map((category) => (
                  <TouchableOpacity 
                    key={category} 
                    style={[styles.categoryChip, formData.category === category && styles.categoryChipSelected]} 
                    onPress={() => setFormData(prev => ({ ...prev, category }))}
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
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Photos (Optional)</Text>
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImages}>
              <Ionicons name="camera" size={24} color="#3B82F6" />
              <Text style={styles.addPhotoText}>Add Photos</Text>
            </TouchableOpacity>
            
            {/* Hidden file input for web */}
            {Platform.OS === 'web' && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            )}
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
                      >
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
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
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.refreshButton, refreshing && styles.refreshButtonDisabled]} 
            onPress={handleHeaderRefresh}
            disabled={refreshing}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={refreshing ? "#9CA3AF" : "#3B82F6"} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={() => setCreateModalVisible(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.content} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {bulletins.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No bulletins found</Text>
          </View>
        ) : (
          bulletins.map((item) => <View key={item._id}>{renderBulletinItem(item)}</View>)
        )}
      </ScrollView>
      
      {renderFormModal(false)}
      {renderFormModal(true)}
      
      {/* Image Preview Modal */}
      <Modal visible={previewImage !== null} transparent={true} animationType="fade">
        <View style={styles.previewContainer}>
          <TouchableOpacity 
            style={styles.previewCloseButton} 
            onPress={() => setPreviewImage(null)}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  refreshButton: { 
    backgroundColor: '#F0F9FF', 
    borderRadius: 8, 
    padding: 10, 
    borderWidth: 1, 
    borderColor: '#BAE6FD' 
  },
  refreshButtonDisabled: { 
    backgroundColor: '#F3F4F6', 
    borderColor: '#D1D5DB' 
  },
  createButton: { backgroundColor: '#3B82F6', borderRadius: 10, padding: 10 },
  content: { flex: 1, padding: 16 },
  bulletinCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  bulletinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  bulletinInfo: { flex: 1, marginRight: 10 },
  bulletinTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, alignSelf: 'flex-start' },
  categoryText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 6 },
  editButton: { padding: 8, backgroundColor: '#EFF6FF', borderRadius: 8 },
  deleteButton: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  bulletinMessage: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
  photosContainer: { marginBottom: 12 },
  bulletinPhoto: { width: 70, height: 70, borderRadius: 10, marginRight: 10 },
  bulletinFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  createdBy: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  createdAt: { fontSize: 11, color: '#94A3B8' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748B' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#64748B', marginTop: 12 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  saveButton: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  saveButtonDisabled: { backgroundColor: '#94A3B8' },
  modalContent: { flex: 1, padding: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#F9FAFB' },
  messageInput: { height: 100, textAlignVertical: 'top' },
  categoryContainer: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' },
  categoryChipSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  categoryChipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  categoryChipTextSelected: { color: '#fff' },
  addPhotoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 2, borderColor: '#3B82F6', borderStyle: 'dashed', borderRadius: 10, gap: 8, backgroundColor: '#F0F9FF' },
  addPhotoText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  selectedImagesContainer: { flexDirection: 'row', gap: 8 },
  selectedImageContainer: { position: 'relative' },
  selectedImage: { width: 70, height: 70, borderRadius: 10 },
  removeImageButton: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10, padding: 2 },
  previewContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
  previewCloseButton: { position: 'absolute', top: 60, right: 20, zIndex: 1000, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 20, padding: 8 },
  previewImage: { width: width, height: height * 0.8 },
});

export default AdminBulletinManagement;