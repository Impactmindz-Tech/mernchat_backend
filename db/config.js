// backend/config/db.js
const mongoose =  require("mongoose")

const connectDB = async () => {
    const mongoURI = 'mongodb://localhost:27017/mernchat'; // replace with your MongoDB URI

    try {
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1); // Exit process with failure
    }

    // mongoose.connection.on('connected', () => {
    //     console.log('Mongoose connected to MongoDB');
    // });

    // mongoose.connection.on('error', (err) => {
    //     console.error('Mongoose connection error:', err);
    // });

    // mongoose.connection.on('disconnected', () => {
    //     console.log('Mongoose disconnected from MongoDB');
    // });
};

module.exports = { connectDB };