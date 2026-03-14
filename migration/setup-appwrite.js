const { Client, Databases, ID, Permission, Role } = require('node-appwrite');
// ... (rest of the setup remain similar, focusing on the fix)
        // 5. Set Permissions
        console.log('🔒 Setting permissions...');
        try {
            await databases.updateCollection(
                databaseId, 
                collectionId, 
                'tasks', 
                [
                    Permission.read(Role.any()),
                    Permission.create(Role.any()),
                    Permission.update(Role.any()),
                    Permission.delete(Role.any()),
                ]
            );
            console.log('   ✅ Permissions set to Public (CRUD for any)');
        } catch (e) {
            console.warn('   ⚠️ Could not set permissions via script: ' + e.message);
            console.warn('   Please set permissions manually in Appwrite Console: Collection -> Settings -> Permissions -> Add Role (Any) -> Check all boxes.');
        }

if (!projectId || !apiKey) {
    console.error('❌ APPWRITE_PROJECT_ID and APPWRITE_API_KEY environment variables are required.');
    process.exit(1);
}

setup();
