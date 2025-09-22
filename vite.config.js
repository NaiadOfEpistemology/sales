import { defineConfig } from 'vite'

// Validate required environment variables
const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`)
  console.warn('   Using fallback values from supabase.config.js')
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'login.html',
        inventory: 'inventory.html',
        'active-inventory': 'active-inventory.html',
        'onhold-inventory': 'onhold-inventory.html',
        billing: 'billing.html',
        metrics: './metrics.html',
        activate: 'activate.html',
        batch: 'batch.html',
        'add-product': 'add-product.html',
        'inventory-list': 'inventory-list.html',
        audit: 'audit.html'
      }
    }
  }
})