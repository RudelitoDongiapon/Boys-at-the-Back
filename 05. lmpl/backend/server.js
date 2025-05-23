require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const LoginLog = require('./models/LoginLog');
const nodemailer = require('nodemailer');
const Course = require('./models/Course');
const Attendance = require('./models/Attendance');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Store active WebSocket connections
const activeConnections = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const courseId = req.url.split('/').pop();
  console.log(`WebSocket connection established for course: ${courseId}`);
  
  // Store the connection
  activeConnections.set(courseId, ws);

  ws.on('close', () => {
    console.log(`WebSocket connection closed for course: ${courseId}`);
    activeConnections.delete(courseId);
  });
});

// Function to broadcast attendance updates
const broadcastAttendanceUpdate = (courseId) => {
  const ws = activeConnections.get(courseId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'new_scan' }));
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Create login log entry
    const loginLog = new LoginLog({
      userId: user._id,
      username: user.username,
      role: user.role
    });
    await loginLog.save();

    // Return user data without password
    const userData = user.toObject();
    delete userData.password;
    res.json(userData);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Password reset endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mock login log endpoint
app.post('/api/logs/mock', async (req, res) => {
  try {
    const { userId, username, role } = req.body;

    // Create mock login log entry
    const loginLog = new LoginLog({
      userId: new mongoose.Types.ObjectId(userId),
      username,
      role
    });
    await loginLog.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error creating mock login log:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = user.toObject();
    delete userData.password;
    res.json(userData);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new user
app.post('/api/users', async (req, res) => {
  try {
    const { idNumber, firstName, lastName, email, username, password, role } = req.body;

    // Validate required fields
    if (!idNumber || !firstName || !lastName || !email || !username || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username ? 
          'Username already exists' : 'Email already exists' 
      });
    }

    // Create new user
    const user = new User({
      idNumber,
      firstName,
      lastName,
      email,
      username,
      password,
      role
    });

    await user.save();

    // Return user data without password
    const userData = user.toObject();
    delete userData.password;
    res.status(201).json(userData);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { idNumber, firstName, lastName, email, username, password, role } = req.body;
    
    // Validate required fields
    if (!idNumber || !firstName || !lastName || !email || !username || !role) {
      return res.status(400).json({ message: 'All fields except password are required' });
    }

    // Check if username or email already exists for other users
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: req.params.id } },
        { $or: [{ username }, { email }] }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username ? 
          'Username already exists' : 'Email already exists' 
      });
    }

    // Prepare update data
    const updateData = {
      idNumber,
      firstName,
      lastName,
      email,
      username,
      role
    };

    // Only update password if provided
    if (password) {
      updateData.password = password;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = user.toObject();
    delete userData.password;
    res.json(userData);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is trying to delete themselves
    if (user._id.toString() === req.user?._id?.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get login logs (admin only)
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await LoginLog.find()
      .sort({ loginTime: -1 })
      .populate('userId', 'firstName lastName email');
    res.json(logs);
  } catch (error) {
    console.error('Error fetching login logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send credentials email
app.post('/api/auth/send-credentials', async (req, res) => {
  try {
    const { email, username, password, role, firstName } = req.body;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Account Credentials',
      html: `
        <h1>Welcome to PresQR!</h1>
        <p>Dear ${firstName},</p>
        <p>Your account has been created successfully. Here are your login credentials:</p>
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p><strong>Role:</strong> ${role}</p>
        <p>Please login and change your password for security reasons.</p>
        <p>Best regards,<br>PresQR Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Credentials email sent successfully' });
  } catch (error) {
    console.error('Send credentials error:', error);
    res.status(500).json({ message: 'Failed to send credentials email' });
  }
});

// Create new course
app.post('/api/courses', async (req, res) => {
  try {
    const { courseCode, courseName, description, lecturerId, schedules } = req.body;

    // Validate required fields
    if (!courseCode || !courseName || !description || !lecturerId || !schedules || schedules.length === 0) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if course code already exists
    const existingCourse = await Course.findOne({ courseCode });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course code already exists' });
    }

    // Check if lecturer exists
    const lecturer = await User.findById(lecturerId);
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(400).json({ message: 'Invalid lecturer' });
    }

    // Create new course
    const course = new Course({
      courseCode,
      courseName,
      description,
      lecturerId,
      schedules
    });

    await course.save();

    // Populate lecturer details
    await course.populate('lecturerId', 'firstName lastName');

    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find().populate('lecturerId', 'firstName lastName');
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update course
app.put('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate required fields
    if (!updateData.courseCode || !updateData.courseName || !updateData.description || !updateData.lecturerId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if the course exists
    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // If students array is provided, validate that all student IDs exist
    if (updateData.students && updateData.students.length > 0) {
      const studentIds = updateData.students;
      const validStudents = await User.find({
        _id: { $in: studentIds },
        role: 'student'
      });

      if (validStudents.length !== studentIds.length) {
        return res.status(400).json({ message: 'One or more invalid student IDs provided' });
      }
    }

    // Update the course with the new data
    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      { 
        $set: {
          courseCode: updateData.courseCode,
          courseName: updateData.courseName,
          description: updateData.description,
          lecturerId: updateData.lecturerId,
          schedules: updateData.schedules || [],
          students: updateData.students || [],
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    res.json(updatedCourse);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Failed to update course', error: error.message });
  }
});

// Delete course
app.delete('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Generate QR code for attendance
app.post('/api/attendance/generate-qr', async (req, res) => {
  try {
    const { courseId, lecturerId } = req.body;

    // Validate course and lecturer
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.lecturerId.toString() !== lecturerId) {
      return res.status(403).json({ message: 'Unauthorized to generate QR for this course' });
    }

    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Convert to PH time (UTC+8)
    const expiryTime = new Date(phTime.getTime() + (60 * 60 * 1000)); // 1 hour from now

    const qrData = JSON.stringify({
      courseId: course._id,
      courseCode: course.courseCode,
      courseName: course.courseName,
      generatedAt: phTime.toISOString(),
      expiresAt: expiryTime.toISOString()
    });

    // Create attendance record
    const attendance = new Attendance({
      courseId: course._id,
      lecturerId: lecturerId,
      qrCodeData: qrData,
      generatedAt: phTime,
      expiresAt: expiryTime
    });

    await attendance.save();

    res.json({
      qrData,
      generatedAt: phTime,
      expiresAt: expiryTime
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record attendance from QR scan
app.post('/api/attendance/scan', async (req, res) => {
  try {
    const { qrData, studentId } = req.body;
    const qrInfo = JSON.parse(qrData);

    // Validate QR code expiration
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Current PH time
    if (new Date(qrInfo.expiresAt) <= phTime) {
      return res.status(400).json({ message: 'QR code has expired' });
    }

    // Find the attendance record
    const attendance = await Attendance.findOne({
      courseId: qrInfo.courseId,
      generatedAt: new Date(qrInfo.generatedAt)
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Check if student has already scanned
    const hasScanned = attendance.scannedBy.some(
      scan => scan.studentId.toString() === studentId
    );

    if (hasScanned) {
      return res.status(400).json({ message: 'You have already scanned this QR code' });
    }

    // Add student to scannedBy array
    attendance.scannedBy.push({
      studentId: studentId,
      scannedAt: phTime
    });

    await attendance.save();

    // Broadcast attendance update
    broadcastAttendanceUpdate(qrInfo.courseId);

    res.json({ message: 'Attendance recorded successfully' });
  } catch (error) {
    console.error('Scan QR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance records for a course
app.get('/api/attendance/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const attendanceRecords = await Attendance.find({ courseId })
      .populate('scannedBy.studentId', 'firstName lastName idNumber')
      .sort({ generatedAt: -1 });

    res.json(attendanceRecords);
  } catch (error) {
    console.error('Get attendance records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the most recent login log for this user that doesn't have a logout time
    const loginLog = await LoginLog.findOne({
      userId,
      logoutTime: null
    }).sort({ loginTime: -1 });

    if (loginLog) {
      // Update the logout time
      loginLog.logoutTime = new Date();
      await loginLog.save();
      res.json({ message: 'Logout recorded successfully' });
    } else {
      res.status(404).json({ message: 'No active login session found' });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Create HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Upgrade HTTP server to WebSocket server
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  
  if (pathname.startsWith('/attendance/')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
}); 