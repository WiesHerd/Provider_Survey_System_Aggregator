const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'survey_data.db');
const uploadsDir = path.join(__dirname, 'uploads');

console.log('🗑️  Starting complete database and file cleanup...\n');

// Function to clear the database
const clearDatabase = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('📊 Clearing database tables...');
    
    // Delete all data from tables
    const tables = ['survey_data', 'surveys', 'column_mappings', 'specialty_mappings'];
    
    const clearTable = (tableName) => {
      return new Promise((resolveTable, rejectTable) => {
        db.run(`DELETE FROM ${tableName}`, (err) => {
          if (err) {
            console.error(`❌ Error clearing ${tableName}:`, err.message);
            rejectTable(err);
          } else {
            console.log(`✅ Cleared ${tableName} table`);
            resolveTable();
          }
        });
      });
    };
    
    // Clear all tables
    Promise.all(tables.map(clearTable))
      .then(() => {
        console.log('✅ All database tables cleared successfully');
        db.close();
        resolve();
      })
      .catch((err) => {
        console.error('❌ Error clearing database:', err);
        db.close();
        reject(err);
      });
  });
};

// Function to clear uploaded files
const clearUploads = () => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(uploadsDir)) {
      console.log('📁 Uploads directory does not exist, skipping file cleanup');
      resolve();
      return;
    }
    
    console.log('📁 Clearing uploaded files...');
    
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        console.error('❌ Error reading uploads directory:', err);
        reject(err);
        return;
      }
      
      if (files.length === 0) {
        console.log('📁 No files to delete in uploads directory');
        resolve();
        return;
      }
      
      let deletedCount = 0;
      files.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`❌ Error deleting ${file}:`, err.message);
          } else {
            console.log(`✅ Deleted ${file}`);
            deletedCount++;
          }
          
          if (deletedCount === files.length) {
            console.log(`✅ Deleted ${deletedCount} files from uploads directory`);
            resolve();
          }
        });
      });
    });
  });
};

// Main cleanup function
const performCleanup = async () => {
  try {
    await clearDatabase();
    await clearUploads();
    
    console.log('\n🎉 Complete cleanup finished successfully!');
    console.log('📋 What was cleared:');
    console.log('   - All survey data from database');
    console.log('   - All survey metadata from database');
    console.log('   - All column mappings from database');
    console.log('   - All specialty mappings from database');
    console.log('   - All uploaded files from uploads directory');
    console.log('\n🔄 You can now re-upload your survey files from scratch.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
};

// Run the cleanup
performCleanup();
