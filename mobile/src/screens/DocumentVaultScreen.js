import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DocumentIcon, ArrowUpTrayIcon, DocumentTextIcon } from 'react-native-heroicons/outline';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';
import api from '../config/api';

const DocumentVaultScreen = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get('/documents/my-documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
    }, [])
  );

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      const formData = new FormData();
      formData.append('title', file.name);
      formData.append('type', 'Other'); // Could add a modal to select type
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType,
        name: file.name
      });

      const token = await AsyncStorage.getItem('userToken');
      await api.post('/documents', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      Alert.alert('Success', 'Document uploaded successfully');
      fetchDocuments();
    } catch (error) {
      console.error(error);
      Alert.alert('Upload Failed', error.response?.data?.message || 'Something went wrong');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDocument = (url) => {
    // Assuming backend is running on same host, we need the full URL
    // since api baseURL points to /api
    const baseUrl = api.defaults.baseURL.replace('/api', '');
    const fullUrl = `${baseUrl}${url}`;
    Linking.openURL(fullUrl).catch(err => {
      Alert.alert('Error', 'Could not open document');
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleOpenDocument(item.url)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {item.url.endsWith('.pdf') ? (
          <DocumentTextIcon color="#ef4444" size={28} />
        ) : (
          <DocumentIcon color="#3b82f6" size={28} />
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.docMeta}>
          <Text style={styles.docType}>{item.type}</Text>
          <Text style={styles.docDate}>• {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent={true} />
      <LinearGradient
        colors={['#4f46e5', '#3b82f6', '#0ea5e9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBackground}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Document Vault</Text>
          <Text style={styles.headerSubtitle}>Securely store your payslips and ID proofs</Text>
        </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />
        ) : documents.length === 0 ? (
          <View style={styles.emptyState}>
            <DocumentIcon color="#cbd5e1" size={60} />
            <Text style={styles.emptyText}>No documents uploaded yet</Text>
          </View>
        ) : (
          <FlatList
            data={documents}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleUpload}
        disabled={uploading}
        activeOpacity={0.8}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <ArrowUpTrayIcon color="#fff" size={24} />
            <Text style={styles.fabText}>Upload</Text>
          </>
        )}
      </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomColor: 'transparent',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2fe',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docType: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4f46e5',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  docDate: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default DocumentVaultScreen;
