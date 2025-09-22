import { supabase } from './database.js'

let allInventory = []

// Load inventory data
async function loadInventory() {
  console.log('loadInventory called')
  
  // Check if element exists
  const container = document.getElementById('inventoryTable')
  console.log('inventoryTable element:', container)
  
  if (!container) {
    console.error('inventoryTable element not found, retrying in 100ms')
    setTimeout(loadInventory, 100)
    return
  }
  
  try {
    const { data, error } = await supabase
      .from('batch_details')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    allInventory = data || []
    displayInventory(allInventory)
    
  } catch (error) {
    console.error('Error loading inventory:', error)
    const container = document.getElementById('inventoryTable')
    if (container) {
      container.innerHTML = '<div class="no-data">Error loading inventory. Please try again.</div>'
    } else {
      console.error('inventoryTable element not found for error display')
    }
  }
}

// Display inventory in table
function displayInventory(inventory) {
  const container = document.getElementById('inventoryTable')
  
  if (!container) {
    console.error('inventoryTable element not found')
    return
  }
  
  if (inventory.length === 0) {
    container.innerHTML = '<div class="no-data">No inventory items found</div>'
    return
  }
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>Barcode</th>
          <th>Batch ID</th>
          <th>Vendor</th>
          <th>Batch Date</th>
          <th>Date Added</th>
          <th>Name</th>
          <th>Variant</th>
          <th>Class</th>
          <th>Brand</th>
          <th>Price</th>
          <th>On-Hold Qty</th>
          <th>Active Qty</th>
          <th>Total Qty</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${inventory.map(item => `
          <tr>
            <td><code style="font-size: 0.8rem;">${item.barcode}</code></td>
            <td><code style="font-size: 0.8rem;">${item.batch_id}</code></td>
            <td style="font-size: 0.8rem;">${item.vendor_name || '-'}</td>
            <td style="font-size: 0.8rem;">${item.batch_date ? new Date(item.batch_date).toLocaleDateString() : '-'}</td>
            <td style="font-size: 0.8rem;">${new Date(item.created_at).toLocaleDateString()}</td>
            <td><strong style="font-size: 0.85rem;">${item.part_name}</strong></td>
            <td style="font-size: 0.8rem;">${item.variant || '-'}</td>
            <td><span style="background: #e9ecef; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.75rem;">${item.class}</span></td>
            <td style="font-size: 0.8rem;">${item.brand}</td>
            <td style="font-size: 0.8rem;">₹${item.price.toFixed(2)}</td>
            <td><span style="color: #f39c12; font-size: 0.8rem;">${item.quantity_on_hold}</span></td>
            <td><span style="color: #27ae60; font-size: 0.8rem;">${item.quantity_active}</span></td>
            <td><strong style="font-size: 0.8rem;">${item.quantity_on_hold + item.quantity_active}</strong></td>
            <td>
              <button class="btn btn-info" onclick="viewBarcode('${item.barcode}')">View</button>
              <button class="btn btn-danger" onclick="deleteInventoryItem('${item.barcode}')">Del</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
  
  container.innerHTML = tableHTML
}

// Filter inventory based on search input
function filterInventory() {
  const query = document.getElementById('searchInput').value.toLowerCase()
  
  if (!query) {
    displayInventory(allInventory)
    return
  }
  
  const filtered = allInventory.filter(item => 
    item.part_name.toLowerCase().includes(query) ||
    (item.variant && item.variant.toLowerCase().includes(query)) ||
    item.brand.toLowerCase().includes(query) ||
    item.barcode.toLowerCase().includes(query) ||
    item.batch_id.toLowerCase().includes(query) ||
    (item.vendor_name && item.vendor_name.toLowerCase().includes(query))
  )
  
  displayInventory(filtered)
}

// View barcode details
async function viewBarcode(barcode) {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        barcode,
        quantity_on_hold,
        quantity_active,
        expiry_date,
        products!inner(
          part_name,
          variant,
          brand,
          class,
          price,
          shelf_code
        ),
        batches!inner(
          batch_id,
          batch_date,
          vendor_name,
          vendor_invoice
        )
      `)
      .eq('barcode', barcode)
      .single()
    
    if (error) throw error
    
    const product = data.products
    const batch = data.batches
    
    // Create modal
    const modal = document.createElement('div')
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `
    
    modal.innerHTML = `
      <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="margin: 0; color: #2c3e50;">Barcode Details</h3>
          <button id="closeBarcodeModalBtn" style="background: #e74c3c; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer;">✕</button>
        </div>
        
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <svg id="modalBarcode"></svg>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <p><strong>Barcode:</strong> <code>${barcode}</code></p>
          <p><strong>Product:</strong> ${product.part_name} ${product.variant ? `(${product.variant})` : ''}</p>
          <p><strong>Brand:</strong> ${product.brand}</p>
          <p><strong>Class:</strong> ${product.class}</p>
          <p><strong>Price:</strong> ₹${product.price.toFixed(2)}</p>
          <p><strong>Batch ID:</strong> ${batch.batch_id}</p>
          <p><strong>Batch Date:</strong> ${batch.batch_date ? new Date(batch.batch_date).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Vendor:</strong> ${batch.vendor_name || 'N/A'}</p>
          <p><strong>On-Hold Qty:</strong> ${data.quantity_on_hold}</p>
          <p><strong>Active Qty:</strong> ${data.quantity_active}</p>
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button class="btn btn-primary" onclick="downloadBarcode('${barcode}')">Download</button>
          <button class="btn btn-info" onclick="printModalBarcode('${barcode}', '${product.part_name}', '${product.brand}', '${product.price}', '${batch.batch_date}')">Print</button>
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // Generate barcode
    JsBarcode('#modalBarcode', barcode, {
      format: 'CODE128',
      width: 2,
      height: 40,
      displayValue: true,
      fontSize: 10,
      textMargin: 2
    })
    
    // Close modal
    document.getElementById('closeBarcodeModalBtn').addEventListener('click', () => {
      modal.remove()
    })
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
    
  } catch (error) {
    console.error('Error fetching barcode details:', error)
    alert('Error fetching barcode details')
  }
}

// Download barcode
function downloadBarcode(barcode) {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, barcode, {
    format: 'CODE128',
    width: 2,
    height: 40,
    displayValue: true,
    fontSize: 10,
    textMargin: 2
  })
  
  const link = document.createElement('a')
  link.download = `barcode_${barcode}.png`
  link.href = canvas.toDataURL()
  link.click()
}

// Print barcode
function printModalBarcode(barcode, productName, brand, price, batchDate) {
  const printWindow = window.open('', '_blank', 'width=200,height=150')
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Barcode Print</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <style>
        @media print {
          @page { margin: 0; }
          body { margin: 0; padding: 0; }
        }
        body { font-family: Arial, sans-serif; margin: 0; padding: 10px; text-align: center; }
        .barcode-label { width: 50mm; height: 30mm; overflow: hidden; box-sizing: border-box; padding: 1mm; }
        .barcode-label div { font-size: 1px; }
        .barcode-label .price { margin-top: 2px; font-size: 12px; font-weight: bold; }
        .barcode-label .product { margin-top: 2px; font-size: 12px; }
        .barcode-label .brand { margin-top: 2px; font-size: 10px; }
        .barcode-label .date { margin-top: 2px; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="barcode-label">
        <div>
          <svg id="barcode"></svg>
        </div>
        <div class="price">₹${price}</div>
        <div class="product">${productName}</div>
        <div class="brand">${brand}</div>
        <div class="date">${batchDate ? new Date(batchDate).toLocaleDateString('en-GB').replace(/\//g, '') : ''}</div>
      </div>
      <script>
        JsBarcode('#barcode', '${barcode}', {
          format: 'CODE128',
          width: 1.3,
          height: 25,
          displayValue: true,
          fontSize: 8,
          textMargin: 2
        });
        window.onload = function() {
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        };
      </script>
    </body>
    </html>
  `
  
  printWindow.document.write(printContent)
  printWindow.document.close()
}


// Delete inventory item
async function deleteInventoryItem(barcode) {
  if (!confirm('Are you sure you want to delete this inventory item?')) {
    return
  }
  
  try {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('barcode', barcode)
    
    if (error) throw error
    
    alert('Inventory item deleted successfully')
    loadInventory() // Refresh the list
    
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    alert('Error deleting inventory item')
  }
}

// Make functions globally available
window.viewBarcode = viewBarcode
window.downloadBarcode = downloadBarcode
window.printModalBarcode = printModalBarcode
window.deleteInventoryItem = deleteInventoryItem
window.filterInventory = filterInventory

// Load inventory on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadInventory)
} else {
  // DOM is already loaded
  loadInventory()
}
