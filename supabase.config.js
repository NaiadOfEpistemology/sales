// Supabase Configuration for Ruby Auto Parts
// This file contains the database configuration and connection settings

export const supabaseConfig = {
  // Supabase project credentials from environment variables with fallbacks
  url: import.meta.env.VITE_SUPABASE_URL || 'https://aknhtapidbkwksvjsqsu.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbmh0YXBpZGJrd2tzdmpzcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTMxMzgsImV4cCI6MjA3Mzg4OTEzOH0.l3oaU9sO1HfTpLKI8xkl0gikIofmYdmW3sYKJHq3zVE',
  
  // Database table names (new structure)
  tables: {
    products: 'products',
    batches: 'batches', 
    inventory: 'inventory',
    sales: 'sales',
    bills: 'bills',
    suppliers: 'suppliers'
  },
  
  // Views for optimized queries
  views: {
    inventorySummary: 'inventory_summary',
    activeInventory: 'active_inventory',
    onholdInventory: 'onhold_inventory',
    batchDetails: 'batch_details'
  },
  
  // Functions
  functions: {
    activateInventory: 'activate_inventory',
    sellInventory: 'sell_inventory',
    getNextBarcodeSequence: 'get_next_barcode_sequence'
  }
};

// Get Supabase configuration from environment variables with fallbacks
export const getSupabaseConfig = () => {
  return {
    url: import.meta.env.VITE_SUPABASE_URL || supabaseConfig.url,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseConfig.anonKey
  };
};
