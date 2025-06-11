const mongoose = require('mongoose');
const config = require('./env');

const connectDatabase = async () => {
  try {
    const connection = await mongoose.connect(config.mongodbUri);

    console.log(`MongoDB connected: ${connection.connection.host}`);
    
    mongoose.connection.on('error', (error) => {
      console.error('Database connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Database disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('Database connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('Error closing database connection:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase; 