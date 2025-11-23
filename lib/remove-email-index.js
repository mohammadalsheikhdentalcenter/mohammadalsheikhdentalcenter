//@ts-nocheck
const mongoose = require("mongoose");
require("dotenv").config();

async function removeEmailIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    
    const db = mongoose.connection.db;
    
    // Method 1: Try listIndexes (newer MongoDB driver)
    try {
      const indexes = await db.collection('patients').listIndexes().toArray();
      console.log("Current indexes:", indexes);
      
      // Drop the email index if it exists
      for (const index of indexes) {
        if (index.name === 'email_1') {
          await db.collection('patients').dropIndex('email_1');
          console.log("✅ Successfully dropped email_1 index");
        }
      }
    } catch (err) {
      console.log("Using getIndexes method...");
      
      // Method 2: Try getIndexes (older MongoDB driver)
      const indexes = await db.collection('patients').getIndexes();
      console.log("Current indexes:", indexes);
      
      // Drop the email index if it exists
      if (indexes.email_1) {
        await db.collection('patients').dropIndex('email_1');
        console.log("✅ Successfully dropped email_1 index");
      }
    }
    
    // Final verification
    const finalIndexes = await db.collection('patients').listIndexes().toArray();
    console.log("Final indexes:", finalIndexes);
    
    await mongoose.disconnect();
    console.log("✅ Migration completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    
    // Try alternative approach using mongoose directly
    try {
      console.log("Trying alternative approach...");
      const Patient = mongoose.model('Patient');
      const schema = Patient.schema;
      
      // Remove any email indexes from schema
      delete schema._indexes;
      console.log("✅ Removed schema indexes");
    } catch (altError) {
      console.error("Alternative approach also failed:", altError);
    }
    
    process.exit(1);
  }
}

removeEmailIndex();