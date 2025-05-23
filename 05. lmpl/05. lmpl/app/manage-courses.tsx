import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Image, ImageBackground, FlatList, Dimensions, Animated, PanResponder } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { User, getUsers, createCourse, Course, getCourses, deleteCourse, updateCourse } from '../lib/api';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

interface ScheduleEntry {
  days: string[];
  startTime: string;
  endTime: string;
}

export default function ManageCourses() {
  const [fontsLoaded, fontError] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    description: '',
    lecturerId: '',
    schedules: [] as ScheduleEntry[],
  });
  const [showLecturerModal, setShowLecturerModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState<ScheduleEntry>({
    days: [],
    startTime: '',
    endTime: '',
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourseId, setNewCourseId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drawerHeight] = useState(new Animated.Value(0));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const screenHeight = Dimensions.get('window').height;
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreCourses, setHasMoreCourses] = useState(true);
  const ITEMS_PER_PAGE = 20;

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

  useEffect(() => {
    fetchLecturers();
    fetchCourses();
  }, []);

  const fetchLecturers = async () => {
    try {
      setIsLoading(true);
      const users = await getUsers();
      const lecturerUsers = users.filter(user => user.role === 'lecturer');
      setLecturers(lecturerUsers);
    } catch (error) {
      console.error('Error fetching lecturers:', error);
      setError('Failed to fetch lecturers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async (pageNumber = 1, shouldAppend = false) => {
    try {
      if (pageNumber === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const coursesData = await getCourses();
      
      if (shouldAppend) {
        // Filter out any potential duplicates before appending
        setCourses(prevCourses => {
          const existingIds = new Set(prevCourses.map(course => course._id));
          const newCourses = coursesData.filter((course: Course) => !existingIds.has(course._id));
          return [...prevCourses, ...newCourses];
        });
      } else {
        // For fresh loads, just set the data directly
        setCourses(coursesData);
      }

      // Check if we have more courses to load
      setHasMoreCourses(coursesData.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to fetch courses. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

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
        courseCode: '',
        courseName: '',
        description: '',
        lecturerId: '',
        schedules: [],
      });
      setSelectedCourse(null);
    });
  };

  const handleAddCourse = () => {
    setError(null);
    setFormData({
      courseCode: '',
      courseName: '',
      description: '',
      lecturerId: '',
      schedules: [],
    });
    openDrawer();
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      courseCode: course.courseCode,
      courseName: course.courseName,
      description: course.description,
      lecturerId: course.lecturerId?._id || '',
      schedules: course.schedules,
    });
    openDrawer();
  };

  const handleDeletePress = (course: Course) => {
    setCourseToDelete(course);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;

    try {
      setIsDeleting(true);
      await deleteCourse(courseToDelete._id);
      setSuccessMessage('Course deleted successfully!');
      await fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete course');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setCourseToDelete(null);
    }
  };

  const handleSubmit = async () => {
    if (selectedCourse) {
      setShowEditConfirm(true);
    } else {
      await saveCourse();
    }
  };

  const handleConfirmEdit = async () => {
    setShowEditConfirm(false);
    await saveCourse();
  };

  const saveCourse = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Validate required fields
      if (!formData.courseCode || !formData.courseName || !formData.lecturerId || formData.schedules.length === 0) {
        setError('Course code, name, lecturer, and at least one schedule are required');
        return;
      }

      let updatedCourse;
      if (selectedCourse) {
        // Update existing course
        const lecturer = lecturers.find(l => l._id === formData.lecturerId);
        updatedCourse = await updateCourse(selectedCourse._id, {
          ...formData,
          lecturerId: lecturer ? { _id: lecturer._id, firstName: lecturer.firstName, lastName: lecturer.lastName } : undefined
        });
        setSuccessMessage('Course updated successfully!');
      } else {
        // Create new course
        updatedCourse = await createCourse(formData);
        setSuccessMessage('Course added successfully!');
      }

      // Refresh the course list
      await fetchCourses();

      // Set new course ID for highlighting
      setNewCourseId(updatedCourse._id);

      // Reset form and close modal
      setShowModal(false);
      setSelectedCourse(null);
      setFormData({
        courseCode: '',
        courseName: '',
        description: '',
        lecturerId: '',
        schedules: [],
      });

      // Scroll to the course after a short delay
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error saving course:', error);
      setError(error instanceof Error ? error.message : 'Failed to save course');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimeInput = (text: string) => {
    // Remove any non-numeric characters
    const numbers = text.replace(/[^0-9]/g, '');
    
    // Format as HH:MM
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}:${numbers.slice(2)}`;
    }
    return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
  };

  const validateTime = (time: string) => {
    if (!time) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) return false;
    if (hours < 0 || hours > 23) return false;
    if (minutes < 0 || minutes > 59) return false;
    
    return true;
  };

  const handleAddSchedule = () => {
    if (newSchedule.days.length === 0) {
      setError('Please select at least one day');
      return;
    }

    if (!validateTime(newSchedule.startTime) || !validateTime(newSchedule.endTime)) {
      setError('Please enter valid start and end times');
      return;
    }

    // Validate that end time is after start time
    const [startHours, startMinutes] = newSchedule.startTime.split(':').map(Number);
    const [endHours, endMinutes] = newSchedule.endTime.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    if (endTotalMinutes <= startTotalMinutes) {
      setError('End time must be after start time');
      return;
    }

    setFormData({
      ...formData,
      schedules: [...formData.schedules, newSchedule],
    });
    setNewSchedule({
      days: [],
      startTime: '',
      endTime: '',
    });
    setShowScheduleModal(false);
    setError(null);
  };

  const handleRemoveSchedule = (index: number) => {
    const updatedSchedules = [...formData.schedules];
    updatedSchedules.splice(index, 1);
    setFormData({
      ...formData,
      schedules: updatedSchedules,
    });
  };

  const handleAssignStudents = (course: Course) => {
    // Store the current page before navigation
    const currentPage = page;
    
    // Navigate to assign students
    router.push(`/assign-students?courseId=${course._id}`);
    
    // When returning, we'll refresh the list through the focus effect
  };

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Clear highlight after 2 seconds
  useEffect(() => {
    if (newCourseId) {
      const timer = setTimeout(() => {
        setNewCourseId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newCourseId]);

  const generateUniqueKey = (prefix: string, id: string, index?: number) => {
    return `${prefix}-${id}${index !== undefined ? `-${index}` : ''}`;
  };

  const renderCourseCard = ({ item: course, index }: { item: Course; index: number }) => (
    <View 
      key={generateUniqueKey('course', course._id, index)}
      style={[
        styles.courseCard,
        newCourseId === course._id && styles.highlightedCard
      ]}
    >
      <LinearGradient
        colors={['#3E92CC', '#2C6B9C']}
        style={styles.cardHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.cardHeaderContent}>
          <View style={styles.courseInfo}>
            <Text style={styles.courseCode}>{course.courseCode}</Text>
            <Text style={styles.courseTitle} numberOfLines={1}>{course.courseName}</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => handleEditCourse(course)}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => handleAssignStudents(course)}
            >
              <Ionicons name="people-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => handleDeletePress(course)}
              disabled={isDeleting}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.cardBody}>
        <View style={styles.instructorSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={18} color="#3E92CC" />
            <Text style={styles.sectionTitle}>Instructor</Text>
          </View>
          <Text style={styles.instructorText}>
            {course.lecturerId ? `${course.lecturerId.firstName} ${course.lecturerId.lastName}` : 'Not assigned'}
          </Text>
        </View>

        <View style={styles.enrolledStudentsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={18} color="#3E92CC" />
            <Text style={styles.sectionTitle}>Enrolled Students</Text>
          </View>
          <View style={styles.enrolledStudentsContent}>
            <Text style={styles.enrolledStudentsText}>
              {course.enrolledStudents || 0} students enrolled
            </Text>
            <TouchableOpacity 
              style={styles.viewStudentsButton}
              onPress={() => handleAssignStudents(course)}
            >
              <Text style={styles.viewStudentsText}>View Students</Text>
              <Ionicons name="chevron-forward" size={16} color="#3E92CC" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.scheduleSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color="#3E92CC" />
            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>
          <View style={styles.scheduleGrid}>
            {course.schedules.map((schedule, scheduleIndex) => (
              <View 
                key={generateUniqueKey('schedule', course._id, scheduleIndex)} 
                style={styles.scheduleItem}
              >
                <Text style={styles.scheduleDays}>{schedule.days.join(', ')}</Text>
                <Text style={styles.scheduleTime}>{schedule.startTime} - {schedule.endTime}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyState}>
      <Ionicons name="book-outline" size={48} color="#ccc" />
      <Text style={styles.emptyStateText}>No courses found</Text>
    </View>
  );

  const renderListHeader = () => (
    <>
      <TouchableOpacity style={styles.addButton} onPress={handleAddCourse}>
        <LinearGradient
          colors={['#3E92CC', '#2C6B9C']}
          style={styles.addButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Course</Text>
        </LinearGradient>
      </TouchableOpacity>

      {successMessage && (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}
    </>
  );

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
        <View style={styles.drawerTitleContainer}>
          <Ionicons 
            name={selectedCourse ? "create" : "add-circle"} 
            size={24} 
            color="#3E92CC" 
          />
        <Text style={styles.drawerTitle}>
          {selectedCourse ? 'Edit Course' : 'Add New Course'}
        </Text>
        </View>
        <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#3E92CC" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.drawerContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
        <View style={styles.formSection}>
            <View style={styles.formSectionHeader}>
              <LinearGradient
                colors={['#3E92CC', '#2C6B9C']}
                style={styles.sectionIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="book" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.formSectionTitle}>Course Details</Text>
          </View>

            <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Course Code</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={formData.courseCode}
                onChangeText={(text) => setFormData({ ...formData, courseCode: text })}
                    placeholder="e.g., CS101"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Course Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={formData.courseName}
                onChangeText={(text) => setFormData({ ...formData, courseName: text })}
                    placeholder="e.g., Introduction to Programming"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter course description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
                </View>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#3E92CC', '#2C6B9C']}
                style={styles.sectionIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="person" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Instructor</Text>
          </View>

          <TouchableOpacity
              style={styles.lecturerSelector}
            onPress={() => setShowLecturerModal(true)}
          >
              <View style={styles.lecturerSelectorContent}>
                <View style={styles.lecturerInfo}>
                  <Ionicons name="person-circle" size={24} color="#3E92CC" />
                  <Text style={styles.lecturerSelectorText}>
                {formData.lecturerId
                      ? lecturers.find(l => l._id === formData.lecturerId)?.firstName + ' ' + 
                        lecturers.find(l => l._id === formData.lecturerId)?.lastName
                      : 'Select instructor'}
              </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#3E92CC" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#3E92CC', '#2C6B9C']}
                style={styles.sectionIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="calendar" size={24} color="#fff" />
              </LinearGradient>
            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>

            <View style={styles.scheduleList}>
            {formData.schedules.map((schedule, index) => (
                <View key={index} style={styles.formScheduleItem}>
                  <View style={styles.formScheduleDays}>
                    {schedule.days.map((day, i) => (
                      <View key={i} style={styles.dayTag}>
                        <Text style={styles.formScheduleDays}>{day}</Text>
                </View>
                    ))}
                  </View>
                  <Text style={styles.formScheduleTime}>
                    {schedule.startTime} - {schedule.endTime}
                  </Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addScheduleButton}
              onPress={() => setShowScheduleModal(true)}
            >
                <LinearGradient
                  colors={['#3E92CC', '#2C6B9C']}
                  style={styles.addScheduleGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                  <Text style={styles.addScheduleText}>Add Schedule</Text>
                </LinearGradient>
            </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.drawerActions}>
          <TouchableOpacity
            style={[styles.modalButton, styles.formCancelButton]}
            onPress={closeDrawer}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Course</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // Add Lecturer Selection Modal
  const renderLecturerModal = () => (
    <Modal
      visible={showLecturerModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLecturerModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Lecturer</Text>
            <TouchableOpacity onPress={() => setShowLecturerModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalList}>
            {lecturers.map((lecturer) => (
              <TouchableOpacity
                key={generateUniqueKey('lecturer', lecturer._id)}
                style={[
                  styles.modalItem,
                  formData.lecturerId === lecturer._id && styles.selectedItem
                ]}
                onPress={() => {
                  setFormData({ ...formData, lecturerId: lecturer._id });
                  setShowLecturerModal(false);
                }}
              >
                <View style={styles.lecturerInfo}>
                  <Ionicons name="person-circle" size={24} color="#1a73e8" />
                  <View style={styles.lecturerDetails}>
                    <Text style={styles.lecturerName}>
                      {lecturer.firstName} {lecturer.lastName}
                    </Text>
                    <Text style={styles.lecturerEmail}>{lecturer.email}</Text>
                  </View>
                </View>
                {formData.lecturerId === lecturer._id && (
                  <Ionicons name="checkmark-circle" size={24} color="#1a73e8" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Add Schedule Modal
  const renderScheduleModal = () => (
    <Modal
      visible={showScheduleModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowScheduleModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Schedule</Text>
            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.scheduleForm}>
            <Text style={styles.inputLabel}>Days</Text>
            <View style={styles.daysContainer}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <TouchableOpacity
                  key={generateUniqueKey('day', day)}
                  style={[
                    styles.dayButton,
                    newSchedule.days.includes(day) && styles.selectedDay
                  ]}
                  onPress={() => {
                    const updatedDays = newSchedule.days.includes(day)
                      ? newSchedule.days.filter(d => d !== day)
                      : [...newSchedule.days, day];
                    setNewSchedule({ ...newSchedule, days: updatedDays });
                  }}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      newSchedule.days.includes(day) && styles.selectedDayText
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.timeContainer}>
              <View style={styles.timeInput}>
                <Text style={styles.inputLabel}>Start Time</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="time-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newSchedule.startTime}
                    onChangeText={(text) => {
                      const formattedTime = formatTimeInput(text);
                      setNewSchedule({ ...newSchedule, startTime: formattedTime });
                    }}
                    placeholder="HH:MM"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                {newSchedule.startTime && !validateTime(newSchedule.startTime) && (
                  <Text style={styles.errorText}>Invalid time format</Text>
                )}
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.inputLabel}>End Time</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="time-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newSchedule.endTime}
                    onChangeText={(text) => {
                      const formattedTime = formatTimeInput(text);
                      setNewSchedule({ ...newSchedule, endTime: formattedTime });
                    }}
                    placeholder="HH:MM"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                {newSchedule.endTime && !validateTime(newSchedule.endTime) && (
                  <Text style={styles.errorText}>Invalid time format</Text>
                )}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.formCancelButton]}
                onPress={() => setShowScheduleModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (!validateTime(newSchedule.startTime) || !validateTime(newSchedule.endTime)) && styles.disabledButton
                ]}
                onPress={handleAddSchedule}
                disabled={!validateTime(newSchedule.startTime) || !validateTime(newSchedule.endTime)}
              >
                <Text style={styles.saveButtonText}>Add Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Add this function to handle refresh
  const handleRefresh = async () => {
    setPage(1);
    setHasMoreCourses(true);
    await fetchCourses(1, false);
  };

  // Add this function to handle load more
  const handleLoadMore = async () => {
    if (!isLoadingMore && hasMoreCourses) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchCourses(nextPage, true);
    }
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>PresQR</Text>
            </View>
          </View>
          {/* Add or adjust action buttons if needed */}
        </View>
        <Text style={styles.screenTitle}>Manage Courses</Text>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#3E92CC" style={styles.loader} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#D32F2F" style={styles.errorIcon} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={courses}
            renderItem={renderCourseCard}
            keyExtractor={(item, index) => generateUniqueKey('course', item._id, index)}
            contentContainerStyle={styles.courseList}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={renderEmptyList}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => ({
              length: 220,
              offset: 220 * index,
              index,
            })}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshing={isLoading && page === 1}
            onRefresh={handleRefresh}
            ListFooterComponent={() => (
              isLoadingMore ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#3E92CC" />
                  <Text style={styles.loadingMoreText}>Loading more courses...</Text>
                </View>
              ) : null
            )}
          />
        )}
      </View>

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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <View style={styles.confirmHeader}>
              <Ionicons name="warning" size={48} color="#dc3545" />
              <Text style={styles.confirmTitle}>Delete Course</Text>
            </View>
            
            <Text style={styles.confirmText}>
              Are you sure you want to delete{'\n'}
              <Text style={styles.confirmHighlight}>
                {courseToDelete?.courseName} ({courseToDelete?.courseCode})
              </Text>?
              {'\n'}This action cannot be undone.
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setCourseToDelete(null);
                }}
                disabled={isDeleting}
              >
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Confirmation Modal */}
      <Modal
        visible={showEditConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <View style={styles.confirmHeader}>
              <Ionicons name="warning" size={48} color="#1a73e8" />
              <Text style={styles.confirmTitle}>Confirm Edit</Text>
            </View>
            
            <Text style={styles.confirmText}>
              Are you sure you want to update{'\n'}
              <Text style={styles.confirmHighlight}>
                {selectedCourse?.courseName} ({selectedCourse?.courseCode})
              </Text>?
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => {
                  setShowEditConfirm(false);
                }}
                disabled={isSaving}
              >
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.saveConfirmButton]}
                onPress={handleConfirmEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveConfirmText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {renderLecturerModal()}
      {renderScheduleModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
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
  backButton: {
    marginRight: 16,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
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
  courseCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#3E92CC',
    shadowOffset: {
      width: 0,
      height: 4,
  },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
  },
  cardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseInfo: {
    flex: 1,
    marginRight: 12,
  },
  courseCode: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: 16,
  },
  instructorSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(62, 146, 204, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3E92CC',
    marginLeft: 8,
  },
  instructorText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginLeft: 26,
  },
  enrolledStudentsSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(62, 146, 204, 0.1)',
  },
  enrolledStudentsContent: {
    marginLeft: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enrolledStudentsText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  viewStudentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewStudentsText: {
    fontSize: 13,
    color: '#3E92CC',
    fontWeight: '600',
    marginRight: 4,
  },
  scheduleSection: {
    gap: 12,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 26,
  },
  scheduleItem: {
    backgroundColor: 'rgba(62, 146, 204, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(62, 146, 204, 0.1)',
    minWidth: '48%',
  },
  scheduleDays: {
    fontSize: 13,
    color: '#3E92CC',
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  highlightedCard: {
    borderWidth: 2,
    borderColor: '#3E92CC',
    transform: [{ scale: 1.02 }],
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  successText: {
    color: '#2e7d32',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingMoreText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  drawerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3E92CC',
    marginLeft: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    padding: 4,
  },
  drawerContent: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3E92CC',
  },
  inputGroup: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  lecturerSelector: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  lecturerSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  lecturerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lecturerSelectorText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  scheduleList: {
    gap: 12,
  },
  formScheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  formScheduleDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formScheduleTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dayTag: {
    backgroundColor: '#4A00E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedDay: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  dayButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#fff',
  },
  addScheduleButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  addScheduleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  addScheduleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  drawerActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  formCancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#4A00E0',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a73e8',
    flex: 1,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedItem: {
    backgroundColor: '#f0f7ff',
  },
  lecturerDetails: {
    flex: 1,
  },
  lecturerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  lecturerEmail: {
    fontSize: 14,
    color: '#666',
  },
  scheduleForm: {
    padding: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  timeInput: {
    flex: 1,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  courseList: {
    paddingBottom: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  confirmModal: {
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A00E0',
    marginTop: 12,
  },
  confirmText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmHighlight: {
    fontWeight: 'bold',
    color: '#4A00E0',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelConfirmButton: {
    backgroundColor: '#f8f9fa',
  },
  deleteConfirmButton: {
    backgroundColor: '#dc3545',
  },
  saveConfirmButton: {
    backgroundColor: '#4A00E0',
  },
  cancelConfirmText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 