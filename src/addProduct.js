import { supabase } from './database.js'

let allProducts = []

// Form submission handler
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const formData = {
    part_name: document.getElementById('partName').value.trim(),
    variant: document.getElementById('variant').value.trim(),
    class: document.getElementById('class').value,
    brand: document.getElementById('brand').value.trim(),
    price: parseFloat(document.getElementById('price').value),
    shelf_code: document.getElementById('shelfCode').value.trim()
  }
  
  try {
    // Check if product already exists
    const { data: existingProducts, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('part_name', formData.part_name)
      .eq('variant', formData.variant)
      .eq('brand', formData.brand)
    
    if (checkError) {
      console.error('Error checking existing product:', checkError)
      // Continue with insertion if check fails
    } else if (existingProducts && existingProducts.length > 0) {
      showError('Product with this name, variant, and brand already exists!')
      return
    }
    
    
    // Insert new product
    const { data, error } = await supabase
      .from('products')
      .insert([formData])
      .select()
      .single()
    
    if (error) throw error
    
    showSuccess(`Product "${formData.part_name}" added successfully!`)
    clearForm()
    loadExistingProducts() // Refresh the list
    
  } catch (error) {
    console.error('Error adding product:', error)
    showError('Failed to add product. Please try again.')
  }
})

// Load existing products
async function loadExistingProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, part_name, variant, class, brand, price, shelf_code, created_at')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error loading products:', error)
      showError('Failed to load existing products.')
      return
    }
    
    allProducts = data || []
    displayProducts(allProducts)
    
  } catch (error) {
    console.error('Error loading products:', error)
    showError('Failed to load existing products.')
  }
}

// Display products in the list
function displayProducts(products) {
  const container = document.getElementById('existingProducts')
  
  if (products.length === 0) {
    container.innerHTML = '<div style="padding: 1rem; text-align: center; color: #6c757d;">No products found</div>'
    return
  }
  
  container.innerHTML = products.map(product => `
    <div class="product-item" onclick="selectProduct('${product.id}')">
      <div class="product-name">${product.part_name} ${product.variant ? `(${product.variant})` : ''}</div>
      <div class="product-details">
        ${product.class} • ${product.brand} • ₹${product.price.toFixed(2)} ${product.shelf_code ? `• ${product.shelf_code}` : ''}
      </div>
    </div>
  `).join('')
}

// Search existing products
function searchExistingProducts() {
  const query = document.getElementById('searchProducts').value.toLowerCase()
  
  if (!query) {
    displayProducts(allProducts)
    return
  }
  
  const filtered = allProducts.filter(product => 
    product.part_name.toLowerCase().includes(query) ||
    product.variant.toLowerCase().includes(query) ||
    product.brand.toLowerCase().includes(query) ||
    product.class.toLowerCase().includes(query)
  )
  
  displayProducts(filtered)
}

// Select product to auto-fill form
function selectProduct(productId) {
  const product = allProducts.find(p => p.id === productId)
  if (!product) return
  
  // Auto-fill form with selected product data
  document.getElementById('partName').value = product.part_name
  document.getElementById('variant').value = product.variant || ''
  document.getElementById('class').value = product.class
  document.getElementById('brand').value = product.brand
  document.getElementById('price').value = product.price
  document.getElementById('shelfCode').value = product.shelf_code || ''
  
  // Scroll to form
  document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' })
  
  // Focus on part name for editing
  document.getElementById('partName').focus()
  document.getElementById('partName').select()
}

// Clear form
function clearForm() {
  document.getElementById('productForm').reset()
  hideMessages()
}

// Show success message
function showSuccess(message) {
  const successDiv = document.getElementById('successMessage')
  successDiv.textContent = message
  successDiv.style.display = 'block'
  hideMessages(3000) // Auto-hide after 3 seconds
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById('errorMessage')
  errorDiv.textContent = message
  errorDiv.style.display = 'block'
  hideMessages(5000) // Auto-hide after 5 seconds
}

// Hide messages
function hideMessages(delay = 0) {
  setTimeout(() => {
    document.getElementById('successMessage').style.display = 'none'
    document.getElementById('errorMessage').style.display = 'none'
  }, delay)
}

// Make functions globally available
window.selectProduct = selectProduct
window.searchExistingProducts = searchExistingProducts
window.loadExistingProducts = loadExistingProducts

// Load existing products when module loads
document.addEventListener('DOMContentLoaded', () => {
  loadExistingProducts()
})
