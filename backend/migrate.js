const { sequelize } = require('./models/Task');

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Change the text column type from VARCHAR(255) to TEXT
    await sequelize.query(`
      ALTER TABLE "Tasks" 
      ALTER COLUMN "text" TYPE TEXT;
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('Column "text" changed from VARCHAR(255) to TEXT');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
