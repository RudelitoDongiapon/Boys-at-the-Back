import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, BackHandler, Animated, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '../config';

SplashScreen.preventAutoHideAsync();

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  attendanceAlerts: boolean;
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
}

interface PreferenceSettings {
  darkMode: boolean;
  language: string;
  timezone: string;
}

interface Settings {
  notifications: NotificationSettings;
  security: SecuritySettings;
  preferences: PreferenceSettings;
}

export default function AdminDashboard() {
  const params = useLocalSearchParams();
  const currentUserId = params.id as string;

  const [fontsLoaded, fontError] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [cardScale] = useState(new Animated.Value(1));
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      attendanceAlerts: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90
    },
    preferences: {
      darkMode: false,
      language: 'en',
      timezone: 'UTC'
    }
  });

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowLogoutConfirm(true);
      return true;
    });

    return () => backHandler.remove();
  }, []);

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      // Call logout endpoint
      await fetch(`${API_CONFIG.baseURL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId
        }),
      });
      
      // Navigate to login page
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login page even if logout API call fails
      router.replace('/');
    }
  };

  const handleManageUsers = () => {
    router.push('/manage-users');
  };

  const handleManageCourses = () => {
    router.push('/manage-courses');
  };

  const handleSettings = () => {
    setShowSettingsModal(true);
  };

  const handlePressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleNotificationToggle = (type: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: !prev.notifications[type]
      }
    }));
  };

  const handleSecurityToggle = (type: keyof SecuritySettings) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [type]: !prev.security[type]
      }
    }));
  };

  const handlePreferenceChange = (type: keyof PreferenceSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [type]: value
      }
    }));
  };

  const handleSaveSettings = () => {
    // Here you would typically save settings to your backend
    Alert.alert('Success', 'Settings saved successfully');
    setShowSettingsModal(false);
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#3E92CC', '#2C6B9C']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>PresQR</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.welcomeText}>Admin Dashboard</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          <Animated.View style={{ transform: [{ scale: cardScale }] }}>
            <TouchableOpacity 
              style={styles.card}
              onPress={handleManageUsers}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconContainer, styles.usersIconContainer]}>
                    <Ionicons name="people" size={32} color="#3E92CC" />
                  </View>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>Manage Users</Text>
                    <Text style={styles.cardSubtitle}>User Management</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardDescription}>Add, edit, and remove users from the system</Text>
                  <View style={styles.cardStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="person-add" size={20} color="#3E92CC" />
                      <Text style={styles.statText}>Add Users</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="create" size={20} color="#3E92CC" />
                      <Text style={styles.statText}>Edit Details</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="trash" size={20} color="#3E92CC" />
                      <Text style={styles.statText}>Remove Users</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardAction}>View Details</Text>
                  <Ionicons name="chevron-forward" size={24} color="#3E92CC" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: cardScale }] }}>
            <TouchableOpacity 
              style={styles.card}
              onPress={handleManageCourses}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconContainer, styles.coursesIconContainer]}>
                    <Ionicons name="book" size={32} color="#3E92CC" />
                  </View>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>Manage Courses</Text>
                    <Text style={styles.cardSubtitle}>Course Management</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardDescription}>Add, edit, and manage course information</Text>
                  <View style={styles.cardStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="add-circle" size={20} color="#3E92CC" />
                      <Text style={styles.statText}>New Course</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="calendar" size={20} color="#3E92CC" />
                      <Text style={styles.statText}>Schedule</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="people" size={20} color="#3E92CC" />
                      <Text style={styles.statText}>Enrollment</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardAction}>View Details</Text>
                  <Ionicons name="chevron-forward" size={24} color="#3E92CC" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: cardScale }] }}>
            <TouchableOpacity 
              style={styles.card}
              onPress={handleSettings}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconContainer, styles.settingsIconContainer]}>
                    <Ionicons name="settings" size={32} color="#3E92CC" />
                  </View>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>Settings</Text>
                    <Text style={styles.cardSubtitle}>System Configuration</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardDescription}>Configure system settings and preferences</Text>
                  <View style={styles.cardStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="notifications" size={20} color="#3E92CC" />
                      <Text style={styles.statText}>Notifications</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="shield" size={20} color="#3E92CC" />
                      <Text style={styles.statText}>Security</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="options" size={20} color="#3E92CC" />
                      <Text style={styles.statText}>Preferences</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardAction}>View Details</Text>
                  <Ionicons name="chevron-forward" size={24} color="#3E92CC" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContent}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>System Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color="#3E92CC" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsContent}>
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Notifications</Text>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Email Notifications</Text>
                  <TouchableOpacity
                    style={[styles.toggleButton, settings.notifications.emailNotifications && styles.toggleButtonActive]}
                    onPress={() => handleNotificationToggle('emailNotifications')}
                  >
                    <Ionicons
                      name={settings.notifications.emailNotifications ? 'checkmark' : 'close'}
                      size={20}
                      color={settings.notifications.emailNotifications ? '#fff' : '#666'}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <TouchableOpacity
                    style={[styles.toggleButton, settings.notifications.pushNotifications && styles.toggleButtonActive]}
                    onPress={() => handleNotificationToggle('pushNotifications')}
                  >
                    <Ionicons
                      name={settings.notifications.pushNotifications ? 'checkmark' : 'close'}
                      size={20}
                      color={settings.notifications.pushNotifications ? '#fff' : '#666'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Security</Text>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
                  <TouchableOpacity
                    style={[styles.toggleButton, settings.security.twoFactorAuth && styles.toggleButtonActive]}
                    onPress={() => handleSecurityToggle('twoFactorAuth')}
                  >
                    <Ionicons
                      name={settings.security.twoFactorAuth ? 'checkmark' : 'close'}
                      size={20}
                      color={settings.security.twoFactorAuth ? '#fff' : '#666'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Preferences</Text>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                  <TouchableOpacity
                    style={[styles.toggleButton, settings.preferences.darkMode && styles.toggleButtonActive]}
                    onPress={() => handlePreferenceChange('darkMode', !settings.preferences.darkMode)}
                  >
                    <Ionicons
                      name={settings.preferences.darkMode ? 'checkmark' : 'close'}
                      size={20}
                      color={settings.preferences.darkMode ? '#fff' : '#666'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.settingsFooter}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveSettings}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={40} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.submitButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backgroundGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 75,
    marginTop: 10,
    lineHeight: 75,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: '#fff',
    fontFamily: 'THEDISPLAYFONT',
  },
  welcomeText: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  cardContainer: {
    gap: 16,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#4A00E0',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(74, 0, 224, 0.1)',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A00E0',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  cardContent: {
    marginBottom: 20,
  },
  cardDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(74, 0, 224, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: '#4A00E0',
    marginTop: 4,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 0, 224, 0.1)',
    paddingTop: 16,
  },
  cardAction: {
    fontSize: 16,
    color: '#4A00E0',
    fontWeight: '600',
  },
  usersIconContainer: {
    backgroundColor: 'rgba(74, 0, 224, 0.1)',
  },
  coursesIconContainer: {
    backgroundColor: 'rgba(74, 0, 224, 0.1)',
  },
  settingsIconContainer: {
    backgroundColor: 'rgba(74, 0, 224, 0.1)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 0, 224, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#4A00E0',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3E92CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3E92CC',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    flex: 1,
    marginRight: 15,
  },
  submitButton: {
    backgroundColor: '#3E92CC',
    flex: 1,
  },
  cancelButtonText: {
    color: '#3E92CC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    marginTop: 40,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A00E0',
  },
  settingsContent: {
    padding: 20,
  },
  settingsSection: {
    marginBottom: 30,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A00E0',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  toggleButtonActive: {
    backgroundColor: '#4A00E0',
    borderColor: '#4A00E0',
  },
  settingsFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  saveButton: {
    backgroundColor: '#4A00E0',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 