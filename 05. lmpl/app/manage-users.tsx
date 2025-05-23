import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Animated, PanResponder, Dimensions, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { User, getUsers, createUser, updateUser, deleteUser } from '../lib/api';
import { API_CONFIG } from '../config';
import Alert from './components/Alert';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

// Add this type before the RoleCard component
type RoleIconContainerStyle = {
  adminIconContainer: ViewStyle;
  lecturerIconContainer: ViewStyle;
  studentIconContainer: ViewStyle;
};

// Role card component
interface RoleCardProps {
  role: string;
  count: number;
  onPress: () => void;
  iconName: keyof typeof Ionicons.glyphMap;
}

const RoleCard: React.FC<RoleCardProps> = ({ role, count, onPress, iconName }) => (
  <TouchableOpacity 
    style={styles.roleCard} 
    onPress={onPress}
    activeOpacity={0.9}
  >
    <LinearGradient
      colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
      style={styles.cardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconContainer, styles[`${role}IconContainer` as keyof RoleIconContainerStyle]]}>
          <Ionicons name={iconName} size={32} color="#3E92CC" />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{role.charAt(0).toUpperCase() + role.slice(1)}s</Text>
          <Text style={styles.cardSubtitle}>{count} {count === 1 ? 'user' : 'users'}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Ionicons name="person-add" size={20} color="#3E92CC" />
            <Text style={styles.statText}>Add New</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="create" size={20} color="#3E92CC" />
            <Text style={styles.statText}>Edit</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trash" size={20} color="#3E92CC" />
            <Text style={styles.statText}>Remove</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardAction}>View Details</Text>
        <Ionicons name="chevron-forward" size={24} color="#3E92CC" />
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

// User list modal component
interface UserListModalProps {
  visible: boolean;
  onClose: () => void;
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  role: string;
}

const UserListDrawer: React.FC<UserListModalProps> = ({ visible, onClose, users, onEdit, onDelete, role }) => {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(50);
  const [drawerHeight] = useState(new Animated.Value(0));
  const screenHeight = Dimensions.get('window').height;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) { // Only allow dragging down
        drawerHeight.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        onClose();
      } else {
        Animated.spring(drawerHeight, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  useEffect(() => {
    if (visible) {
      Animated.spring(drawerHeight, {
        toValue: screenHeight * 0.9,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(drawerHeight, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [visible]);

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    `${user.idNumber} ${user.firstName} ${user.lastName} ${user.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Get current users for pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(userToDelete._id);
      setError(null);
      await onDelete(userToDelete._id);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  return (
    <>
      {visible && (
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={onClose}
          />
          <Animated.View
            style={[
              styles.drawer,
              {
                height: drawerHeight,
              },
            ]}
          >
            <View style={styles.drawerHeader} {...panResponder.panHandlers}>
              <View style={styles.drawerHandle} />
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalIconContainer}>
                  <Ionicons 
                    name={
                      role === 'admin' ? 'shield-checkmark' :
                      role === 'lecturer' ? 'school' : 'people'
                    } 
                    size={24} 
                    color="#3E92CC" 
                  />
                </View>
                <Text style={styles.drawerTitle}>{role.charAt(0).toUpperCase() + role.slice(1)} Users</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#3E92CC" />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerContent}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#3E92CC" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by ID, name, or email..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="rgba(62, 146, 204, 0.5)"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#3E92CC" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.userStats}>
                <Text style={styles.statsText}>
                  Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
                </Text>
              </View>
              
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#D32F2F" style={styles.errorIcon} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <ScrollView style={styles.userList}>
                {currentUsers.map((user, index) => (
                  <View key={`${role}-${user._id || `temp-${index}`}`} style={styles.userCard}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userId}>{user.idNumber}</Text>
                      <Text style={styles.userName}>{user.lastName}, {user.firstName}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => onEdit(user)}
                      >
                        <Ionicons name="pencil" size={20} color="#3E92CC" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton, isDeleting === user._id && styles.disabledButton]}
                        onPress={() => handleDeleteClick(user)}
                        disabled={isDeleting === user._id}
                      >
                        {isDeleting === user._id ? (
                          <ActivityIndicator size="small" color="#3E92CC" />
                        ) : (
                          <Ionicons name="trash" size={20} color="#3E92CC" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? "rgba(62, 146, 204, 0.3)" : "#3E92CC"} />
                </TouchableOpacity>
                <Text style={styles.paginationText}>
                  Page {currentPage} of {totalPages}
                </Text>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                  onPress={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? "rgba(62, 146, 204, 0.3)" : "#3E92CC"} />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleDeleteCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIconContainer}>
              <Ionicons name="warning" size={32} color="#3E92CC" />
            </View>
            <Text style={styles.confirmModalTitle}>Confirm Delete</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete {userToDelete?.firstName} {userToDelete?.lastName}?
            </Text>
            <Text style={styles.confirmModalWarning}>
              This action cannot be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.cancelButton]}
                onPress={handleDeleteCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.deleteButton]}
                onPress={handleDeleteConfirm}
                disabled={isDeleting === userToDelete?._id}
              >
                {isDeleting === userToDelete?._id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default function ManageUsers() {
  const [fontsLoaded] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    idNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    role: 'student',
  });
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'success';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error'
  });
  const [drawerHeight] = useState(new Animated.Value(0));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const screenHeight = Dimensions.get('window').height;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) { // Only allow dragging down
        drawerHeight.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeDrawer();
      } else {
        Animated.spring(drawerHeight, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.spring(drawerHeight, {
      toValue: screenHeight * 0.9,
      useNativeDriver: false,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerHeight, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setIsDrawerOpen(false);
      setFormData({
        idNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        role: 'student',
      });
      setSelectedUser(null);
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setError(null);
    setFormData({
      idNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      role: 'student',
    });
    openDrawer();
  };

  const handleEditUser = async (user: User) => {
    try {
      setIsLoading(true);
      setError(null);
      
      setFormData({
        idNumber: user.idNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        password: '',
        role: user.role,
      });
      
      setSelectedUser(user);
      openDrawer();
    } catch (error) {
      console.error('Error preparing user edit:', error);
      setError(error instanceof Error ? error.message : 'Failed to prepare user edit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteUser(userId);
      setUsers(users.filter(user => user._id !== userId));
      setShowUserListModal(false);
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.idNumber || !formData.firstName || !formData.lastName || 
          !formData.email || !formData.username || !formData.password || !formData.role) {
        setAlert({
          visible: true,
          title: 'Missing Fields',
          message: 'Please fill in all required fields',
          type: 'error'
        });
        return;
      }

      // Check if email already exists
      const existingUser = users.find(user => 
        user.email.toLowerCase() === formData.email.toLowerCase() && 
        user._id !== selectedUser?._id
      );
      if (existingUser) {
        setAlert({
          visible: true,
          title: 'Email Exists',
          message: 'This email address is already registered',
          type: 'error'
        });
        return;
      }

      // Check if username already exists
      const existingUsername = users.find(user => 
        user.username.toLowerCase() === formData.username.toLowerCase() && 
        user._id !== selectedUser?._id
      );
      if (existingUsername) {
        setAlert({
          visible: true,
          title: 'Username Exists',
          message: 'This username is already taken',
          type: 'error'
        });
        return;
      }

      if (selectedUser) {
        // Update existing user
        console.log('Updating user:', selectedUser._id);
        const updatedUser = await updateUser(selectedUser._id, {
          idNumber: formData.idNumber,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username,
          role: formData.role,
        });
        
        console.log('User updated successfully:', updatedUser);
        setUsers(users.map(u => u._id === updatedUser._id ? updatedUser : u));
        setAlert({
          visible: true,
          title: 'Success',
          message: 'User updated successfully',
          type: 'success'
        });
      } else {
        // Create new user
        console.log('Creating new user with data:', formData);
        const newUser = await createUser({
          ...formData,
        });
        console.log('User created successfully:', newUser);
        setUsers([...users, newUser]);

        // Send email with credentials
        try {
          console.log('Sending credentials email to:', formData.email);
          await fetch(`${API_CONFIG.baseURL}/auth/send-credentials`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
              username: formData.username,
              password: formData.password,
              role: formData.role,
              firstName: formData.firstName,
            }),
          });
          console.log('Credentials email sent successfully');
        } catch (emailError) {
          console.error('Error sending credentials email:', emailError);
          // Don't fail the user creation if email fails
        }

        setAlert({
          visible: true,
          title: 'Success',
          message: 'User created successfully',
          type: 'success'
        });
      }

      // Refresh the user list
      console.log('Refreshing user list...');
      await fetchUsers();
      console.log('User list refreshed');

      // Reset form and close modal
      setShowModal(false);
      setSelectedUser(null);
      setFormData({
        idNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        role: 'student',
      });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setAlert({
        visible: true,
        title: 'Error',
        message: error instanceof Error ? error.message : 'An error occurred while saving the user',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleRoleCardPress = (role: string) => {
    setSelectedRole(role);
    setShowUserListModal(true);
  };

  const getUsersByRole = (role: string) => {
    return users.filter(user => user.role === role);
  };

  const renderDrawer = () => (
    <Animated.View
      style={[
        styles.drawer,
        {
          height: drawerHeight,
        },
      ]}
    >
      <View style={styles.drawerHeader} {...panResponder.panHandlers}>
        <View style={styles.drawerHandle} />
        <Text style={styles.drawerTitle}>
          {selectedUser ? 'Edit User' : 'Add New User'}
        </Text>
        <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#3E92CC" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.drawerContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="person-circle-outline" size={24} color="#3E92CC" />
            </View>
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>ID Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={20} color="#3E92CC" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.idNumber}
                onChangeText={(text) => setFormData({ ...formData, idNumber: text })}
                placeholder="Enter ID number"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.nameContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>First Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#3E92CC" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  placeholder="Enter first name"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#3E92CC" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="lock-closed-outline" size={24} color="#3E92CC" />
            </View>
            <Text style={styles.sectionTitle}>Account Information</Text>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#3E92CC" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Enter email"
                keyboardType="email-address"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="at-outline" size={20} color="#3E92CC" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="Enter username"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#3E92CC" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Enter password"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="shield-outline" size={24} color="#3E92CC" />
            </View>
            <Text style={styles.sectionTitle}>Role</Text>
          </View>
          <View style={styles.roleContainer}>
            {['student', 'lecturer', 'admin'].map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleButton,
                  formData.role === role && styles.roleButtonSelected,
                ]}
                onPress={() => setFormData({ ...formData, role })}
              >
                <View style={[
                  styles.roleIconContainer,
                  formData.role === role && styles.roleIconContainerSelected
                ]}>
                  <Ionicons
                    name={
                      role === 'admin' ? 'shield-checkmark' :
                      role === 'lecturer' ? 'school' : 'people'
                    }
                    size={24}
                    color={formData.role === role ? '#fff' : '#3E92CC'}
                  />
                </View>
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.role === role && styles.roleButtonTextSelected,
                  ]}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.drawerButtons}>
          <TouchableOpacity
            style={[styles.drawerButton, styles.cancelButton]}
            onPress={closeDrawer}
          >
            <Ionicons name="close" size={20} color="#666" style={styles.buttonIcon} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.drawerButton, styles.saveButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );

  if (!fontsLoaded) {
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>PresQR</Text>
            </View>
          </View>
          {/* Add or adjust action buttons if needed */}
        </View>
        <Text style={styles.screenTitle}>Manage Users</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
          <LinearGradient
            colors={['#3E92CC', '#2C6B9C']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add User</Text>
          </LinearGradient>
        </TouchableOpacity>

        <ScrollView style={styles.roleCardsContainer}>
          <RoleCard
            role="admin"
            count={getUsersByRole('admin').length}
            onPress={() => handleRoleCardPress('admin')}
            iconName="shield-checkmark"
          />
          <RoleCard
            role="lecturer"
            count={getUsersByRole('lecturer').length}
            onPress={() => handleRoleCardPress('lecturer')}
            iconName="school"
          />
          <RoleCard
            role="student"
            count={getUsersByRole('student').length}
            onPress={() => handleRoleCardPress('student')}
            iconName="people"
          />
        </ScrollView>
      </View>

      <UserListDrawer
        visible={showUserListModal}
        onClose={() => setShowUserListModal(false)}
        users={selectedRole ? getUsersByRole(selectedRole) : []}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        role={selectedRole || ''}
      />

      {isDrawerOpen && (
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={closeDrawer}
          />
          {renderDrawer()}
        </View>
      )}

      {/* Alert Modal */}
      <Alert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
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
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#3E92CC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  welcomeText: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addButton: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#3E92CC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  roleCardsContainer: {
    flex: 1,
    paddingHorizontal: 5,
  },
  roleCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#3E92CC',
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
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3E92CC',
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
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(62, 146, 204, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: '#3E92CC',
    marginTop: 4,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(62, 146, 204, 0.1)',
    paddingTop: 16,
  },
  cardAction: {
    fontSize: 16,
    color: '#3E92CC',
    fontWeight: '600',
  },
  adminIconContainer: {
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
  },
  lecturerIconContainer: {
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
  },
  studentIconContainer: {
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#3E92CC',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(62, 146, 204, 0.1)',
  },
  userInfo: {
    flex: 1,
    marginRight: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3E92CC',
    marginBottom: 4,
  },
  userId: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  roleButtonSelected: {
    backgroundColor: '#3E92CC',
    borderColor: '#3E92CC',
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  roleIconContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  roleButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  roleButtonTextSelected: {
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  saveButton: {
    backgroundColor: '#3E92CC',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    borderRadius: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#3E92CC',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  userListModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3E92CC',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(62, 146, 204, 0.05)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#3E92CC',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: 'rgba(62, 146, 204, 0.05)',
    padding: 12,
    borderRadius: 12,
  },
  statsText: {
    fontSize: 14,
    color: '#3E92CC',
    fontWeight: '500',
  },
  userList: {
    maxHeight: '80%',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(62, 146, 204, 0.1)',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 16,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
    marginHorizontal: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#3E92CC',
    fontWeight: '500',
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#3E92CC',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  confirmModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3E92CC',
    marginBottom: 16,
  },
  confirmModalText: {
    fontSize: 16,
    color: '#3E92CC',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmModalWarning: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmModalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginRight: 10,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#3E92CC',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(62, 146, 204, 0.1)',
  },
  drawerHandle: {
    position: 'absolute',
    top: 8,
    width: 40,
    height: 4,
    backgroundColor: '#3E92CC',
    borderRadius: 2,
    opacity: 0.3,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3E92CC',
  },
  drawerContent: {
    padding: 20,
  },
  formSection: {
    marginBottom: 32,
    backgroundColor: 'rgba(62, 146, 204, 0.02)',
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3E92CC',
  },
  inputIcon: {
    marginRight: 8,
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  drawerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingBottom: 20,
  },
  drawerButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 10,
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
  screenTitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '600',
  },
}); 