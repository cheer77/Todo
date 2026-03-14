const { Client, Databases, Query } = require('node-appwrite');

module.exports = async function (context) {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT_INTERNAL || 'https://cloud.appwrite.io/v1')
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const databaseId = process.env.DATABASE_ID;
    const collectionId = process.env.COLLECTION_ID;

    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour

    try {
        const response = await databases.listDocuments(databaseId, collectionId, [
            Query.equal('completed', true),
            Query.equal('isDeleted', false),
            Query.notEqual('completedAt', null),
            Query.lessThan('completedAt', cutoff)
        ]);

        const trashPromises = response.documents.map(doc => 
            databases.updateDocument(databaseId, collectionId, doc.$id, {
                isDeleted: true,
                deletedAt: new Date().toISOString()
            })
        );

        await Promise.all(trashPromises);
        context.log(`Auto-trashed ${trashPromises.length} completed tasks.`);
        return context.res.json({ message: `Auto-trashed ${trashPromises.length} completed tasks.` });
    } catch (e) {
        context.error(e.message);
        return context.res.json({ error: e.message }, 500);
    }
};
