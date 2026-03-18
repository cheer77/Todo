const { Client, Databases, Query } = require('node-appwrite');

module.exports = async function (context) {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT_INTERNAL || 'https://cloud.appwrite.io/v1')
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const databaseId = process.env.DATABASE_ID;
    const collectionId = process.env.COLLECTION_ID;

    const cutoff = new Date(Date.now() - 4 * 60 * 1000).toISOString(); // 4 minutes for testing

    try {
        const response = await databases.listDocuments(databaseId, collectionId, [
            Query.equal('isDeleted', true),
            Query.lessThan('deletedAt', cutoff)
        ]);

        const deletePromises = response.documents.map(doc => 
            databases.deleteDocument(databaseId, collectionId, doc.$id)
        );

        await Promise.all(deletePromises);
        context.log(`Purged ${deletePromises.length} documents.`);
        return context.res.json({ message: `Purged ${deletePromises.length} documents.` });
    } catch (e) {
        context.error(e.message);
        return context.res.json({ error: e.message }, 500);
    }
};
