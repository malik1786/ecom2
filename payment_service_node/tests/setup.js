const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// WHY: Prevent timeout on slower connections when MongoDB binary is downloading
jest.setTimeout(60000);

beforeAll(async () => {
    // Start In-Memory MongoDB Server with extended instance startup timeout for Windows
    try {
        mongoServer = await MongoMemoryServer.create({
            instance: {
                // Ignore the 10000ms default timeout, give Windows 60s to boot the mongod binary
                args: ['--quiet'] 
            }
        });
    } catch (err) {
        console.warn("MongoMemoryServer failed on first try. Retrying...");
        mongoServer = await MongoMemoryServer.create();
    }
    const uri = mongoServer.getUri();
    
    // Set environment variables for tests
    process.env.MONGO_URI = uri;
    process.env.RAZORPAY_WEBHOOK_SECRET = "test_secret_123";
    process.env.RAZORPAY_KEY_SECRET = "test_secret_123";
    process.env.JWT_SECRET = "test_jwt_secret";
    process.env.PORT = 4000;
    
    // Disconnect if already connected from app initialization
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    
    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
});

beforeEach(async () => {
    // Clear the database before each test to ensure isolation
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

afterAll(async () => {
    // Clean up connections
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});
