import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  ActivityIndicator, RefreshControl, Modal, TextInput, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllUsers, updateUser } from '../../api/auth';
import { getClusterStats } from '../../api/cluster';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';

const UsersScreen = () => {
  const [users, setUsers] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('clusters');
  const [exporting, setExporting] = useState(false);

  const roles = ['user', 'admin'];
  const statuses = ['active', 'deactivated'];
  const USERS_PER_PAGE = 10;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, clustersResponse] = await Promise.all([getAllUsers(), getClusterStats()]);
      if (usersResponse.success) setUsers(usersResponse.users);
      if (clustersResponse.success) setClusters(clustersResponse.data);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getFilteredUsers = () => {
    let filtered = users.filter(user =>
      (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       user.email?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedCluster === 'all' || user.clusters?.includes(selectedCluster))
    );
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    return { users: filtered.slice(startIndex, startIndex + USERS_PER_PAGE), total: filtered.length };
  };

  const generatePDFHTML = useCallback(() => {
    const currentDate = new Date().toLocaleDateString();
    const roleStats = {}, statusStats = {}, clusterStats = {};
    
    users.forEach(user => {
      const role = user.role || 'user';
      const status = user.status || 'active';
      roleStats[role] = (roleStats[role] || 0) + 1;
      statusStats[status] = (statusStats[status] || 0) + 1;
      if (user.clusters) {
        user.clusters.forEach(cluster => {
          clusterStats[cluster] = (clusterStats[cluster] || 0) + 1;
        });
      }
    });

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Users Report</title><style>
      body { font-family: Arial, sans-serif; margin: 20px; color: #333; line-height: 1.4; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #DC2626; padding-bottom: 15px; }
      .header h1 { color: #DC2626; margin: 0; font-size: 28px; }
      .header p { margin: 5px 0; color: #666; font-size: 14px; }
      .summary { display: flex; justify-content: space-between; margin-bottom: 30px; }
      .summary-card { background: #f8f9fa; border-radius: 8px; padding: 15px; border-left: 4px solid #DC2626; flex: 1; margin: 0 10px; }
      .summary-card h3 { margin: 0 0 10px 0; color: #DC2626; font-size: 16px; }
      .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
      .stats-section h3 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px; }
      .stats-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #eee; font-size: 13px; }
      .badge { padding: 3px 8px; border-radius: 12px; color: white; font-size: 10px; font-weight: bold; }
      .admin-badge { background: #DC2626; } .user-badge { background: #3B82F6; }
      .active-badge { background: #10B981; } .deactivated-badge { background: #6B7280; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      th { background: #DC2626; color: white; padding: 12px 8px; text-align: left; font-weight: 600; }
      td { padding: 10px 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) { background: #f8f9fa; } tr:hover { background: #e3f2fd; }
      .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
    </style></head><body>
      <div class="header">
        <h1>Health Risk Management - Users Report</h1>
        <p>Generated on: ${currentDate}</p>
        <p>Total Users: ${users.length}</p>
        ${searchQuery || selectedCluster !== 'all' ? 
          `<p>Filters: ${[searchQuery && `Search: "${searchQuery}"`, selectedCluster !== 'all' && `Cluster: ${selectedCluster}`].filter(Boolean).join(', ')}</p>` : ''}
      </div>
      <div class="summary">
        <div class="summary-card"><h3>Total Users</h3><div style="font-size: 24px; font-weight: bold; color: #DC2626;">${users.length}</div></div>
        <div class="summary-card"><h3>Active Users</h3><div style="font-size: 24px; font-weight: bold; color: #10B981;">${statusStats.active || 0}</div></div>
        <div class="summary-card"><h3>Total Clusters</h3><div style="font-size: 24px; font-weight: bold; color: #3B82F6;">${Object.keys(clusterStats).length}</div></div>
      </div>
      <div class="stats-grid">
        <div class="stats-section">
          <h3>User Roles</h3>
          ${Object.entries(roleStats).sort(([,a], [,b]) => b - a).map(([role, count]) => 
            `<div class="stats-item"><span><span class="badge ${role}-badge">${role.toUpperCase()}</span></span><span><strong>${count}</strong> (${((count/users.length)*100).toFixed(1)}%)</span></div>`
          ).join('')}
        </div>
        <div class="stats-section">
          <h3>User Status</h3>
          ${Object.entries(statusStats).sort(([,a], [,b]) => b - a).map(([status, count]) => 
            `<div class="stats-item"><span><span class="badge ${status}-badge">${status.toUpperCase()}</span></span><span><strong>${count}</strong> (${((count/users.length)*100).toFixed(1)}%)</span></div>`
          ).join('')}
        </div>
        <div class="stats-section">
          <h3>Top Clusters</h3>
          ${Object.entries(clusterStats).sort(([,a], [,b]) => b - a).slice(0, 5).map(([cluster, count]) => 
            `<div class="stats-item"><span>${cluster}</span><span><strong>${count}</strong> users</span></div>`
          ).join('')}
        </div>
      </div>
      <div style="overflow-x: auto; margin-top: 20px;">
        <h3>User Details</h3>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Age</th><th>City</th><th>Role</th><th>Status</th><th>Clusters</th></tr></thead>
          <tbody>
            ${users.map(user => 
              `<tr>
                <td>${user.name || 'N/A'}</td><td>${user.email || 'N/A'}</td><td>${user.age || 'N/A'}</td><td>${user.city || 'N/A'}</td>
                <td><span class="badge ${(user.role || 'user')}-badge">${(user.role || 'user').toUpperCase()}</span></td>
                <td><span class="badge ${(user.status || 'active')}-badge">${(user.status || 'active').toUpperCase()}</span></td>
                <td>${user.clusters?.join(', ') || 'None'}</td>
              </tr>`
            ).join('')}
          </tbody>
        </table>
      </div>
      <div class="footer">
        <p>This report was automatically generated by the Health Risk Management System</p>
        <p>Report contains ${users.length} user records</p>
      </div>
    </body></html>`;
  }, [users, searchQuery, selectedCluster]);

  const exportToPDF = useCallback(async () => {
    try {
      setExporting(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required to save the PDF.');
        return;
      }

      const htmlContent = generatePDFHTML();
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false, width: 612, height: 792 });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `users-report-${timestamp}.pdf`;
      const downloadDir = `${FileSystem.documentDirectory}Download/`;
      
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      
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

      Alert.alert('Export Successful', `Users report saved as "${filename}"`, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Export Failed', 'Error generating PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [generatePDFHTML]);

  const ClusterCard = ({ cluster }) => (
    <TouchableOpacity
      style={[styles.clusterCard, selectedCluster === cluster.cluster && styles.selectedClusterCard]}
      onPress={() => { setSelectedCluster(cluster.cluster); setViewMode('users'); setCurrentPage(1); }}
    >
      <View style={styles.clusterHeader}>
        <Text style={styles.clusterName}>{cluster.cluster}</Text>
        <View style={styles.clusterBadge}>
          <Text style={styles.clusterCount}>{cluster.count}</Text>
        </View>
      </View>
      <Text style={styles.clusterPercent}>{((cluster.count / users.length) * 100).toFixed(1)}% of users</Text>
    </TouchableOpacity>
  );

  const UserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.age && <Text style={styles.userDetail}>Age: {item.age}</Text>}
        {item.city && <Text style={styles.userDetail}>City: {item.city}</Text>}
        {item.clusters && <Text style={styles.userClusters}>Clusters: {item.clusters.join(', ')}</Text>}
      </View>
      <View style={styles.userActions}>
        <View style={[styles.roleChip, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.roleText}>{(item.role || 'user').toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
          <Ionicons name="pencil" size={16} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const openEditModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.role || 'user');
    setNewStatus(user.status || 'active');
    setModalVisible(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      setUpdating(true);
      const response = await updateUser(selectedUser._id, { role: newRole, status: newStatus });
      if (response.success) {
        setUsers(prevUsers => prevUsers.map(user => user._id === selectedUser._id ? { ...user, role: newRole, status: newStatus } : user));
        Alert.alert('Success', 'User updated successfully');
        setModalVisible(false);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const getRoleColor = (role) => role?.toLowerCase() === 'admin' ? '#DC2626' : '#3B82F6';

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#DC2626" /></View>;

  const { users: paginatedUsers, total } = getFilteredUsers();
  const totalPages = Math.ceil(total / USERS_PER_PAGE);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health Risk Management</Text>
        <Text style={styles.userCount}>{total} users</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.viewToggle, viewMode === 'clusters' && styles.activeToggle]} onPress={() => setViewMode('clusters')}>
            <Text style={[styles.toggleText, viewMode === 'clusters' && styles.activeToggleText]}>Clusters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.viewToggle, viewMode === 'users' && styles.activeToggle]} onPress={() => setViewMode('users')}>
            <Text style={[styles.toggleText, viewMode === 'users' && styles.activeToggleText]}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportButton, exporting && styles.disabledButton]} onPress={exportToPDF} disabled={exporting}>
            {exporting ? <ActivityIndicator size={16} color="#FFFFFF" /> : <Ionicons name="document-outline" size={16} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        {viewMode === 'users' && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Search users..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#94A3B8" />
            {searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {viewMode === 'clusters' ? (
        <ScrollView style={styles.clustersView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.clustersGrid}>
            {clusters.map(cluster => <ClusterCard key={cluster.cluster} cluster={cluster} />)}
          </View>
        </ScrollView>
      ) : (
        <>
          <FlatList
            data={paginatedUsers}
            keyExtractor={item => item._id}
            renderItem={({ item }) => <UserItem item={item} />}
            style={styles.usersList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No users found</Text></View>}
          />

          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity style={[styles.pageButton, currentPage === 1 && styles.disabledButton]} onPress={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                <Ionicons name="chevron-back" size={16} color="#64748B" />
              </TouchableOpacity>
              <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
              <TouchableOpacity style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]} onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {selectedUser && (
              <>
                <View style={styles.modalUserInfo}>
                  <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                  <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                </View>

                <View style={styles.selectorSection}>
                  <Text style={styles.selectorLabel}>Role</Text>
                  <View style={styles.optionsContainer}>
                    {roles.map(role => (
                      <TouchableOpacity key={role} style={[styles.optionButton, newRole === role && styles.selectedOption]} onPress={() => setNewRole(role)}>
                        <Text style={[styles.optionText, newRole === role && styles.selectedOptionText]}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.selectorSection}>
                  <Text style={styles.selectorLabel}>Status</Text>
                  <View style={styles.optionsContainer}>
                    {statuses.map(status => (
                      <TouchableOpacity key={status} style={[styles.optionButton, newStatus === status && styles.selectedOption]} onPress={() => setNewStatus(status)}>
                        <Text style={[styles.optionText, newStatus === status && styles.selectedOptionText]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveButton, updating && styles.disabledButton]} onPress={handleUpdateUser} disabled={updating}>
                    {updating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#FFFFFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  viewToggle: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9' },
  activeToggle: { backgroundColor: '#DC2626' },
  toggleText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  activeToggleText: { color: '#FFFFFF' },
  exportButton: { marginLeft: 'auto', backgroundColor: '#10B981', padding: 8, borderRadius: 8 },
  disabledButton: { opacity: 0.5 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, height: 40 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B' },
  clustersView: { flex: 1 },
  clustersGrid: { padding: 16, gap: 12 },
  clusterCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  selectedClusterCard: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  clusterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clusterName: { fontSize: 16, fontWeight: '600', color: '#1E293B', flex: 1 },
  clusterBadge: { backgroundColor: '#DC2626', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  clusterCount: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  clusterPercent: { fontSize: 12, color: '#64748B', marginTop: 4 },
  userCount: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  usersList: { flex: 1, padding: 16 },
  userCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8, flexDirection: 'row' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  userEmail: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  userDetail: { fontSize: 11, color: '#94A3B8' },
  userClusters: { fontSize: 11, color: '#059669', marginTop: 2 },
  userActions: { alignItems: 'flex-end', gap: 8 },
  roleChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  editButton: { padding: 6, backgroundColor: '#F1F5F9', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', gap: 16 },
  pageButton: { padding: 8, borderRadius: 6, backgroundColor: '#F1F5F9' },
  pageInfo: { fontSize: 14, color: '#64748B' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#64748B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 14, width: '90%', maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalUserInfo: { padding: 20, backgroundColor: '#F8FAFC', margin: 20, borderRadius: 8 },
  modalUserName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  modalUserEmail: { fontSize: 13, color: '#64748B' },
  selectorSection: { paddingHorizontal: 20, marginBottom: 20 },
  selectorLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  optionsContainer: { flexDirection: 'row', gap: 8 },
  optionButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, alignItems: 'center', backgroundColor: '#FFFFFF' },
  selectedOption: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  optionText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  selectedOptionText: { color: '#DC2626' },
  modalActions: { flexDirection: 'row', gap: 10, padding: 20 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: '#F1F5F9' },
  cancelButtonText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#DC2626', alignItems: 'center' },
  saveButtonText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
});

export default UsersScreen;