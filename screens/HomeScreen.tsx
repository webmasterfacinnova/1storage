// screens/HomeScreen.tsx
// Home screen after successful authentication

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectCurrentUser } from '../store/slices/authSlice';
import { logout } from '../store/slices/authSlice';
import { authService } from '../services/auth.service';

const HomeScreen = () => {
  const user = useSelector(selectCurrentUser);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const handleLogout = async () => {
    try {
      await authService.signOut();
      dispatch(logout());
      navigation.navigate('Login' as never);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>1storage</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.userAvatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || user?.email?.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.welcomeText}>Welcome, {user?.name || user?.email}</Text>
        </View>
        
        <View style={styles.storageCard}>
          <Text style={styles.storageTitle}>Your Unified Storage</Text>
          <View style={styles.storageInfo}>
            <View style={styles.storageItem}>
              <Text style={styles.storageValue}>0 GB</Text>
              <Text style={styles.storageLabel}>Used</Text>
            </View>
            <View style={styles.storageItem}>
              <Text style={styles.storageValue}>0 GB</Text>
              <Text style={styles.storageLabel}>Total</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity style={styles.addProviderButton} onPress={() => {}}>
          <Text style={styles.addProviderText}>+ Add Storage Provider</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4285f4',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  welcomeText: {
    fontSize: 18,
    color: '#333',
  },
  storageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  storageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  storageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storageItem: {
    alignItems: 'center',
  },
  storageValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  storageLabel: {
    fontSize: 14,
    color: '#666',
  },
  addProviderButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 16,
  },
  addProviderText: {
    color: '#4285f4',
    fontSize: 16,
  },
  logoutButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  logoutText: {
    color: '#e53935',
    fontSize: 16,
  },
});

export default HomeScreen;