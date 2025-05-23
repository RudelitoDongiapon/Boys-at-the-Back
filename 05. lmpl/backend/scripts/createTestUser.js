require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createTestUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ username: 'testuser' });
    if (existingUser) {
      console.log('Test user already exists:', existingUser);
      process.exit(0);
    }

    // Create test user
    const testUser = new User({
      idNumber: "TEST001",
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      username: "testuser",
      password: "test123",
      role: "student"
    });

    await testUser.save();
    console.log('Test user created successfully:', testUser);
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
};

createTestUser(); 