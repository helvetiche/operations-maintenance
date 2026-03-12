#!/usr/bin/env node

/**
 * Migration script to update existing TaskCompletion records with schedule details
 * This prevents "Unknown Task" from appearing when schedules are deleted
 * 
 * Run with: node scripts/migrate-completions.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up your service account)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Or use service account key:
    // credential: admin.credential.cert(require('./path-to-service-account-key.json')),
  });
}

const db = admin.firestore();

async function migrateCompletions() {
  console.log('Starting migration of task completions...');
  
  try {
    // Get all schedules first to create a lookup map
    console.log('Fetching schedules...');
    const schedulesSnapshot = await db.collection('schedules').get();
    const scheduleMap = new Map();
    
    schedulesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      scheduleMap.set(doc.id, {
        title: data.title || 'Unknown Task',
        description: data.description || '',
        personAssigned: data.personAssigned || 'Unknown',
        personEmail: data.personEmail || 'unknown@example.com'
      });
    });
    
    console.log(`Found ${scheduleMap.size} schedules`);
    
    // Get all completions that don't have the new fields
    console.log('Fetching completions to migrate...');
    const completionsSnapshot = await db.collection('completions')
      .where('scheduleTitle', '==', null)
      .get();
    
    if (completionsSnapshot.empty) {
      console.log('No completions need migration. Checking for completions without scheduleTitle field...');
      
      // Check for completions that don't have the field at all
      const allCompletionsSnapshot = await db.collection('completions').limit(10).get();
      const needsMigration = allCompletionsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return !data.hasOwnProperty('scheduleTitle');
      });
      
      if (needsMigration.length === 0) {
        console.log('All completions already have schedule details. Migration complete!');
        return;
      }
      
      console.log(`Found ${needsMigration.length} completions that need migration (in first 10 checked)`);
      
      // Get all completions for migration
      const allSnapshot = await db.collection('completions').get();
      await migrateCompletionsBatch(allSnapshot.docs, scheduleMap);
    } else {
      console.log(`Found ${completionsSnapshot.docs.length} completions to migrate`);
      await migrateCompletionsBatch(completionsSnapshot.docs, scheduleMap);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function migrateCompletionsBatch(docs, scheduleMap) {
  const batch = db.batch();
  let updateCount = 0;
  let skipCount = 0;
  
  docs.forEach(doc => {
    const data = doc.data();
    
    // Skip if already has the new fields
    if (data.scheduleTitle) {
      skipCount++;
      return;
    }
    
    const scheduleDetails = scheduleMap.get(data.scheduleId);
    
    if (scheduleDetails) {
      batch.update(doc.ref, {
        scheduleTitle: scheduleDetails.title,
        scheduleDescription: scheduleDetails.description,
        personAssigned: scheduleDetails.personAssigned,
        personEmail: scheduleDetails.personEmail
      });
      updateCount++;
    } else {
      // Schedule not found, use fallback values
      batch.update(doc.ref, {
        scheduleTitle: 'Unknown Task (Deleted Schedule)',
        scheduleDescription: '',
        personAssigned: data.completedByName || 'Unknown',
        personEmail: data.completedBy || 'unknown@example.com'
      });
      updateCount++;
      console.log(`Warning: Schedule ${data.scheduleId} not found for completion ${doc.id}`);
    }
  });
  
  if (updateCount > 0) {
    console.log(`Updating ${updateCount} completions...`);
    await batch.commit();
    console.log(`Successfully updated ${updateCount} completions`);
  }
  
  if (skipCount > 0) {
    console.log(`Skipped ${skipCount} completions (already migrated)`);
  }
  
  console.log('Migration completed successfully!');
}

// Run the migration
migrateCompletions()
  .then(() => {
    console.log('Migration finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  });