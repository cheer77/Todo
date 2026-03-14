const { Client, Databases, ID } = require('node-appwrite');

// You need to set these or pass them as env vars
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

// Existing IDs if partially failed
let databaseId = process.env.DATABASE_ID || '69b5cad80007ef0f92e3';
let collectionId = process.env.COLLECTION_ID || '69b5cad80033ccbc3df1';

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

const databases = new Databases(client);

async function setup() {
    try {
        console.log('🚀 Resuming Appwrite Setup...');

        // 1. Create Database (if not provided)
        if (!databaseId) {
            const db = await databases.create(ID.unique(), 'Todo');
            databaseId = db.$id;
            console.log(`✅ Database created: ${databaseId}`);
        } else {
            console.log(`ℹ️ Using existing Database: ${databaseId}`);
        }

        // 2. Create Collection (if not provided)
        if (!collectionId) {
            const collection = await databases.createCollection(databaseId, ID.unique(), 'tasks');
            collectionId = collection.$id;
            console.log(`✅ Collection created: ${collectionId}`);
        } else {
            console.log(`ℹ️ Using existing Collection: ${collectionId}`);
        }

        // 3. Create Attributes
        console.log('🛠️ Creating attributes...');
        const createAttr = async (func, ...args) => {
            try {
                await func(...args);
                console.log(`   ✅ Attribute ${args[2]} created`);
            } catch (e) {
                if (e.code === 409) console.log(`   ℹ️ Attribute ${args[2]} already exists`);
                else throw e;
            }
        };

        await createAttr(databases.createStringAttribute.bind(databases), databaseId, collectionId, 'text', 5000, true);
        // Appwrite Rule: If required=true, default must be null. 
        // If we want a default value, required MUST be false.
        await createAttr(databases.createBooleanAttribute.bind(databases), databaseId, collectionId, 'completed', false, false);
        await createAttr(databases.createIntegerAttribute.bind(databases), databaseId, collectionId, 'order', false, 0);
        await createAttr(databases.createBooleanAttribute.bind(databases), databaseId, collectionId, 'isEdited', false, false);
        await createAttr(databases.createBooleanAttribute.bind(databases), databaseId, collectionId, 'isDeleted', false, false);
        await createAttr(databases.createDatetimeAttribute.bind(databases), databaseId, collectionId, 'deletedAt', false);
        await createAttr(databases.createDatetimeAttribute.bind(databases), databaseId, collectionId, 'completedAt', false);
        await createAttr(databases.createDatetimeAttribute.bind(databases), databaseId, collectionId, 'createdAt', true);

        console.log('⏳ Waiting for attributes to be available...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 4. Create Indexes
        console.log('🗂️ Creating indexes...');
        const createIdx = async (name, type, attrs) => {
            try {
                await databases.createIndex(databaseId, collectionId, name, type, attrs);
                console.log(`   ✅ Index ${name} created`);
            } catch (e) {
                if (e.code === 409) console.log(`   ℹ️ Index ${name} already exists`);
                else console.warn(`   ⚠️ Could not create index ${name}: ${e.message}`);
            }
        };

        await createIdx('idx_isDeleted', 'key', ['isDeleted']);
        await createIdx('idx_order', 'key', ['order']);

        // 5. Set Permissions
        console.log('🔒 Setting permissions...');
        try {
            await databases.updateCollection(databaseId, collectionId, 'tasks', ['role:any'], false);
            console.log('   ✅ Permissions set to Public');
        } catch (e) {
            console.warn('   ⚠️ Could not set permissions via script. Please check manually in Appwrite Console.');
        }

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
