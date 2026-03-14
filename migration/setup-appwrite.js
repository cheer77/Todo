const { Client, Databases, ID } = require('node-appwrite');

// You need to set these or pass them as env vars
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

const databases = new Databases(client);

async function setup() {
    try {
        console.log('🚀 Starting Appwrite Setup...');

        // 1. Create Database
        const db = await databases.create(ID.unique(), 'Todo');
        const databaseId = db.$id;
        console.log(`✅ Database created: ${databaseId}`);

        // 2. Create Collection
        const collection = await databases.createCollection(databaseId, ID.unique(), 'tasks');
        const collectionId = collection.$id;
        console.log(`✅ Collection created: ${collectionId}`);

        // 3. Create Attributes
        console.log('🛠️ Creating attributes...');
        await databases.createStringAttribute(databaseId, collectionId, 'text', 5000, true);
        await databases.createBooleanAttribute(databaseId, collectionId, 'completed', true, false);
        await databases.createIntegerAttribute(databaseId, collectionId, 'order', true, 0);
        await databases.createBooleanAttribute(databaseId, collectionId, 'isEdited', true, false);
        await databases.createBooleanAttribute(databaseId, collectionId, 'isDeleted', true, false);
        await databases.createDatetimeAttribute(databaseId, collectionId, 'deletedAt', false);
        await databases.createDatetimeAttribute(databaseId, collectionId, 'completedAt', false);
        await databases.createDatetimeAttribute(databaseId, collectionId, 'createdAt', true);

        console.log('⏳ Waiting for attributes to be available...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 4. Create Indexes
        console.log('🗂️ Creating indexes...');
        await databases.createIndex(databaseId, collectionId, 'idx_isDeleted', 'key', ['isDeleted']);
        await databases.createIndex(databaseId, collectionId, 'idx_order', 'key', ['order']);

        // 5. Set Permissions (Public Read/Write for demo, adjust as needed)
        await databases.updateCollection(databaseId, collectionId, 'tasks', ['role:any'], false);
        // Note: updateCollection permissions is a bit tricky in SDK, usually done via setPermissions
        // But for simplicity, we tell the user to check in console or use better SDK methods.

        console.log('\n🎉 Setup Complete!');
        console.log('------------------');
        console.log(`DATABASE_ID: ${databaseId}`);
        console.log(`COLLECTION_ID: ${collectionId}`);
        console.log('------------------');
        console.log('Next: Update your frontend .env file with these values.');

    } catch (error) {
        console.error('❌ Setup failed:', error);
    }
}

if (!projectId || !apiKey) {
    console.error('❌ APPWRITE_PROJECT_ID and APPWRITE_API_KEY environment variables are required.');
    process.exit(1);
}

setup();
