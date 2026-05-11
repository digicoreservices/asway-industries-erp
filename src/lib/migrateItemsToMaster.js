
import { supabase } from '@/lib/customSupabaseClient';
import { INITIAL_ITEM_MAP } from '@/lib/productConstants';

/**
 * Migration function to populate items_master table with all items from INITIAL_ITEM_MAP
 * This function is idempotent - safe to run multiple times without duplicating data
 */
export async function migrateItemsToItemsMaster() {
  console.log('\n🚀 ========== STARTING ITEMS MASTER MIGRATION ==========\n');
  
  const migrationResults = {
    totalProcessed: 0,
    successfulInserts: 0,
    skipped: 0,
    errors: [],
    categoryMapping: {},
    itemsByCategory: {}
  };

  try {
    // Step 1: Fetch all categories from the database
    console.log('📂 Step 1: Fetching categories from database...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name');

    if (categoriesError) {
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
    }

    if (!categories || categories.length === 0) {
      throw new Error('No categories found in database. Please create categories first.');
    }

    // Create category name to ID mapping
    categories.forEach(category => {
      migrationResults.categoryMapping[category.name] = category.id;
      migrationResults.itemsByCategory[category.name] = 0;
    });

    console.log(`✅ Found ${categories.length} categories:`, categories.map(c => c.name).join(', '));

    // Step 2: Fetch existing items from items_master to avoid duplicates
    console.log('\n📋 Step 2: Fetching existing items from items_master...');
    const { data: existingItems, error: existingItemsError } = await supabase
      .from('items_master')
      .select('name, category_id');

    if (existingItemsError) {
      console.warn('Warning: Could not fetch existing items:', existingItemsError.message);
    }

    // Create a Set of existing item identifiers (name + category_id combination)
    const existingItemsSet = new Set();
    if (existingItems) {
      existingItems.forEach(item => {
        existingItemsSet.add(`${item.name}|||${item.category_id}`);
      });
      console.log(`✅ Found ${existingItems.length} existing items in items_master`);
    }

    // Step 3: Prepare items for insertion from INITIAL_ITEM_MAP
    console.log('\n📦 Step 3: Processing items from INITIAL_ITEM_MAP...');
    const itemsToInsert = [];

    Object.entries(INITIAL_ITEM_MAP).forEach(([categoryName, items]) => {
      const categoryId = migrationResults.categoryMapping[categoryName];
      
      if (!categoryId) {
        console.warn(`⚠️ Warning: Category "${categoryName}" not found in database. Skipping ${items.length} items.`);
        migrationResults.errors.push({
          category: categoryName,
          error: 'Category not found in database',
          itemsCount: items.length
        });
        return;
      }

      items.forEach(itemName => {
        migrationResults.totalProcessed++;
        
        const itemIdentifier = `${itemName}|||${categoryId}`;
        
        // Check if item already exists
        if (existingItemsSet.has(itemIdentifier)) {
          migrationResults.skipped++;
          return;
        }

        // Add to insertion batch
        itemsToInsert.push({
          name: itemName.trim(),
          category_id: categoryId,
          description: null,
          created_at: new Date().toISOString()
        });
        
        migrationResults.itemsByCategory[categoryName]++;
      });
    });

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Total items processed: ${migrationResults.totalProcessed}`);
    console.log(`   Items to insert: ${itemsToInsert.length}`);
    console.log(`   Items skipped (already exist): ${migrationResults.skipped}`);

    // Step 4: Check product_list table for additional items
    console.log('\n🔍 Step 4: Checking product_list table for additional items...');
    const { data: productListItems, error: productListError } = await supabase
      .from('product_list')
      .select('product_name, type');

    if (productListError) {
      console.warn('Warning: Could not fetch product_list:', productListError.message);
    } else if (productListItems && productListItems.length > 0) {
      console.log(`✅ Found ${productListItems.length} items in product_list table`);
      
      let productListAdded = 0;
      productListItems.forEach(product => {
        const categoryId = migrationResults.categoryMapping[product.type];
        
        if (!categoryId) {
          console.warn(`⚠️ Product "${product.product_name}" has unknown category "${product.type}"`);
          return;
        }

        const itemIdentifier = `${product.product_name}|||${categoryId}`;
        
        // Check if already exists or already added
        if (existingItemsSet.has(itemIdentifier) || 
            itemsToInsert.some(i => i.name === product.product_name && i.category_id === categoryId)) {
          return;
        }

        itemsToInsert.push({
          name: product.product_name.trim(),
          category_id: categoryId,
          description: null,
          created_at: new Date().toISOString()
        });
        
        productListAdded++;
      });
      
      console.log(`   Added ${productListAdded} additional items from product_list`);
    }

    // Step 5: Insert items in batches (Supabase limit: ~1000 rows per batch)
    if (itemsToInsert.length === 0) {
      console.log('\n✅ No new items to insert. All items already exist in items_master.');
      migrationResults.successfulInserts = 0;
      return migrationResults;
    }

    console.log(`\n💾 Step 5: Inserting ${itemsToInsert.length} items into items_master...`);
    
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < itemsToInsert.length; i += batchSize) {
      batches.push(itemsToInsert.slice(i, i + batchSize));
    }

    console.log(`   Processing in ${batches.length} batch(es)...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`   Inserting batch ${i + 1}/${batches.length} (${batch.length} items)...`);
      
      const { data, error } = await supabase
        .from('items_master')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Error inserting batch ${i + 1}:`, error);
        migrationResults.errors.push({
          batch: i + 1,
          error: error.message,
          itemsCount: batch.length
        });
      } else {
        migrationResults.successfulInserts += data.length;
        console.log(`   ✅ Batch ${i + 1} inserted successfully (${data.length} items)`);
      }
    }

    // Step 6: Verification
    console.log('\n🔍 Step 6: Verifying migration...');
    const { count, error: countError } = await supabase
      .from('items_master')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`✅ Total items in items_master table: ${count}`);
    }

    console.log('\n📊 FINAL MIGRATION RESULTS:');
    console.log('   ================================');
    console.log(`   Total items processed: ${migrationResults.totalProcessed}`);
    console.log(`   Successfully inserted: ${migrationResults.successfulInserts}`);
    console.log(`   Skipped (already exist): ${migrationResults.skipped}`);
    console.log(`   Errors: ${migrationResults.errors.length}`);
    console.log('\n   Items by Category:');
    Object.entries(migrationResults.itemsByCategory).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`      ${category}: ${count} items`);
      }
    });

    if (migrationResults.errors.length > 0) {
      console.log('\n   ⚠️ Errors encountered:');
      migrationResults.errors.forEach(err => {
        console.log(`      - ${err.category || `Batch ${err.batch}`}: ${err.error} (${err.itemsCount} items affected)`);
      });
    }

    console.log('\n✅ ========== MIGRATION COMPLETED ==========\n');

    return migrationResults;

  } catch (error) {
    console.error('\n❌ ========== MIGRATION FAILED ==========');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    migrationResults.errors.push({
      error: error.message,
      fatal: true
    });
    
    throw error;
  }
}

/**
 * Verify items_master data integrity
 * Returns statistics about the current state of items_master table
 */
export async function verifyItemsMasterIntegrity() {
  console.log('\n🔍 Verifying items_master data integrity...\n');
  
  try {
    // Count total items
    const { count: totalItems, error: countError } = await supabase
      .from('items_master')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Count items by category
    const { data: itemsByCategory, error: categoryError } = await supabase
      .from('items_master')
      .select('category_id, categories(name)')
      .order('category_id');

    if (categoryError) throw categoryError;

    // Group items by category
    const categoryStats = {};
    itemsByCategory.forEach(item => {
      const categoryName = item.categories?.name || 'Unknown';
      categoryStats[categoryName] = (categoryStats[categoryName] || 0) + 1;
    });

    // Check for items without valid category references
    const { data: orphanedItems, error: orphanError } = await supabase
      .from('items_master')
      .select('id, name, category_id')
      .is('category_id', null);

    if (orphanError) throw orphanError;

    console.log('✅ Integrity Check Results:');
    console.log(`   Total items: ${totalItems}`);
    console.log(`   Items by category:`);
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`      ${category}: ${count}`);
    });
    console.log(`   Orphaned items (no category): ${orphanedItems?.length || 0}`);

    return {
      totalItems,
      categoryStats,
      orphanedItems: orphanedItems || []
    };

  } catch (error) {
    console.error('❌ Integrity check failed:', error);
    throw error;
  }
}
