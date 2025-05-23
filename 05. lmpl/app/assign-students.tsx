import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Animated, Dimensions, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { User, Course, getUsers, updateCourse, getCourses } from '../lib/api';
import { LinearGradient } from 'expo-linear-gradient';

const ITEMS_PER_PAGE = 50;
const WINDOW_HEIGHT = Dimensions.get('window').height;

export default function AssignStudents() {
  const params = useLocalSearchParams();
  const courseId = params.courseId as string;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('enrolled');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Memoize filtered students to prevent unnecessary recalculations
  const filteredStudents = useMemo(() => {
    return students.filter(student => 
      (student.lastName.toLowerCase() + ', ' + student.firstName.toLowerCase())
        .includes(searchQuery.toLowerCase()) ||
      student.idNumber.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [students, searchQuery]);

  // Memoize displayed students based on active tab
  const displayedStudents = useMemo(() => {
    return filteredStudents.filter(student => 
      activeTab === 'enrolled' 
        ? selectedStudents.includes(student._id)
        : !selectedStudents.includes(student._id)
    );
  }, [filteredStudents, selectedStudents, activeTab]);

  // Memoize paginated students
  const paginatedStudents = useMemo(() => {
    return displayedStudents.slice(0, page * ITEMS_PER_PAGE);
  }, [displayedStudents, page]);

  useEffect(() => {
    fetchStudents();
    fetchCourse();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchStudents = async () => {
    try {
      const users = await getUsers();
      const studentUsers = users.filter(user => user.role === 'student');
      setStudents(studentUsers);
      setHasMore(studentUsers.length > ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students. Please try again.');
    }
  };

  const fetchCourse = async () => {
    try {
      const courses = await getCourses();
      const course = courses.find((c: Course) => c._id === courseId);
      if (course) {
        setCurrentCourse(course);
        setSelectedStudents(course.students || []);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      setError('Failed to fetch course details.');
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
      setHasMore(displayedStudents.length > page * ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, displayedStudents.length, page]);

  const handleSaveAssignments = async () => {
    if (!currentCourse) return;

    try {
      setIsLoading(true);
      await updateCourse(currentCourse._id, {
        ...currentCourse,
        students: selectedStudents
      });
      setSuccessMessage('Students assigned successfully!');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error assigning students:', error);
      setError(error instanceof Error ? error.message : 'Failed to assign students');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStudentItem = useCallback(({ item: student }: { item: User }) => (
    <View
      key={student._id}
      style={[
        styles.studentItem,
        activeTab === 'enrolled' && styles.selectedStudent
      ]}
    >
      <View style={styles.studentInfo}>
        <View style={styles.studentHeader}>
          <View style={styles.studentIdContainer}>
            <Ionicons name="id-card-outline" size={16} color="#4A00E0" />
          <Text style={styles.studentId}>{student.idNumber}</Text>
          </View>
          {activeTab === 'enrolled' && (
            <View style={styles.enrolledBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.enrolledText}>Enrolled</Text>
            </View>
          )}
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.studentName}>
          {student.lastName}, {student.firstName}
        </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.actionButton,
          activeTab === 'enrolled' ? styles.removeButton : styles.addButton
        ]}
        onPress={() => {
          if (activeTab === 'enrolled') {
            setSelectedStudents(prev => prev.filter(id => id !== student._id));
          } else {
            setSelectedStudents(prev => [...prev, student._id]);
          }
        }}
      >
        <LinearGradient
          colors={activeTab === 'enrolled' ? ['#dc3545', '#ff4d4d'] : ['#4A00E0', '#8E2DE2']}
          style={styles.actionButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
      >
        <Ionicons 
          name={activeTab === 'enrolled' ? 'remove' : 'add'} 
          size={24} 
          color="#fff" 
        />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  ), [activeTab, selectedStudents]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'enrolled' ? 'people' : 'person-add'} 
        size={48} 
        color="#ccc" 
      />
      <Text style={styles.emptyStateText}>
        {activeTab === 'enrolled' 
          ? 'No students enrolled in this course yet'
          : 'No available students found'}
      </Text>
    </View>
  ), [activeTab]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#1a73e8" />
      </View>
    );
  }, [isLoadingMore]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // Approximate height of each item
    offset: 80 * index,
    index,
  }), []);

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
          <Text style={styles.screenTitle}>Assign Students</Text>
        </View>
      </View>

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {currentCourse && (
          <View style={styles.courseInfoCard}>
            <View style={styles.courseIconContainer}>
              <Ionicons name="book" size={32} color="#4A00E0" />
            </View>
            <View style={styles.courseDetails}>
            <Text style={styles.courseCode}>{currentCourse.courseCode}</Text>
              <Text style={styles.courseTitle}>{currentCourse.courseName}</Text>
          </View>
          </View>
        )}

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={24} color="#4A00E0" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={24} color="#4A00E0" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'enrolled' && styles.activeTab]}
            onPress={() => setActiveTab('enrolled')}
          >
            <Ionicons 
              name="people" 
              size={24} 
              color={activeTab === 'enrolled' ? '#fff' : '#4A00E0'} 
            />
            <Text style={[styles.tabLabel, activeTab === 'enrolled' && styles.activeTabLabel]}>
              Enrolled
            </Text>
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{displayedStudents.length}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && styles.activeTab]}
            onPress={() => setActiveTab('available')}
          >
            <Ionicons 
              name="person-add" 
              size={24} 
              color={activeTab === 'available' ? '#fff' : '#4A00E0'} 
            />
            <Text style={[styles.tabLabel, activeTab === 'available' && styles.activeTabLabel]}>
              Available
            </Text>
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{displayedStudents.length}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <FlatList
          data={paginatedStudents}
          renderItem={renderStudentItem}
          keyExtractor={item => item._id}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          style={styles.studentList}
          contentContainerStyle={styles.studentListContent}
        />
      </Animated.View>
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
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  courseInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#4A00E0',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  courseIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(74, 0, 224, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  courseDetails: {
    flex: 1,
  },
  courseCode: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  searchSection: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#4A00E0',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#4A00E0',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#4A00E0',
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A00E0',
    marginLeft: 8,
  },
  activeTabLabel: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A00E0',
  },
  studentList: {
    flex: 1,
  },
  studentListContent: {
    paddingBottom: 20,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#4A00E0',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  selectedStudent: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A00E0',
  },
  studentInfo: {
    flex: 1,
    marginRight: 12,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 0, 224, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  studentId: {
    fontSize: 14,
    color: '#4A00E0',
    fontWeight: '600',
    marginLeft: 4,
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A00E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  enrolledText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  nameContainer: {
    backgroundColor: 'rgba(74, 0, 224, 0.05)',
    padding: 12,
    borderRadius: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 0.3,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  removeButton: {
    shadowColor: '#dc3545',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButton: {
    shadowColor: '#4A00E0',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
}); 