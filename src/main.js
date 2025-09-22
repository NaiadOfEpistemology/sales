import './style.css'
import JsBarcode from 'jsbarcode'
import { 
  generateUniqueBarcode, 
  createBatch, 
  findProduct, 
  createProduct, 
  addInventory, 
  loadInventory as loadInventoryFromDB,
  deleteProduct as deleteProductFromDB,
  getProductBarcodes,
  getBarcodeInfo,
  supabase 
} from './database.js'

let currentBarcode=null

function getCurrentBatchInfo(){
  const currentBatch = sessionStorage.getItem('currentBatch');
  return currentBatch ? JSON.parse(currentBatch) : null;
}

window.filterInventory=function(){
  const searchInput = document.getElementById('searchInput')
  const inventoryTable = document.getElementById('inventoryTable')
  
  if (!searchInput || !inventoryTable) {
    return // Elements don't exist on this page
  }
  
  const query = searchInput.value.toLowerCase()
  const rows = inventoryTable.querySelectorAll('tbody tr')
  rows.forEach(row=>{
    const text=row.textContent.toLowerCase()
    row.style.display=text.includes(query)?'':'none'
  })
}

document.getElementById('productForm').addEventListener('submit', async e=>{
  e.preventDefault()
  const form=e.target
  const name=form.name.value.trim()
  const variant=form.variant.value.trim()
  const classOfProduct=form.class_of_product.value.trim()
  const brand=form.brand.value.trim()
  const quantity=parseInt(form.quantity.value)
  const price=parseFloat(form.price.value)
  const expiryDate=form.expiry.value||null
  const shelf=form.shelf.value.trim()

  if(!name||!variant||!classOfProduct||!brand||isNaN(quantity)||isNaN(price)||!shelf){
    alert("Please fill in all required fields correctly.")
    return
  }

  // Check if batch exists
  const batchInfo = getCurrentBatchInfo();
  if (!batchInfo) {
    const createBatch = confirm("No active batch found. Would you like to create a new batch first?");
    if (createBatch) {
      window.location.href = 'batch.html';
      return;
    } else {
      alert("Please create a batch first to add inventory items.");
      return;
    }
  }

  try {
    // Create batch in database if not exists
    let batchData;
    if (batchInfo.id) {
      batchData = batchInfo;
    } else {
      batchData = await createBatch(batchInfo.vendorName, batchInfo.invoiceNumber);
      // Update session storage with database ID
      batchInfo.id = batchData.id;
      sessionStorage.setItem('currentBatch', JSON.stringify(batchInfo));
    }
    
    const productDetails = {
      part_name: name,
      variant: variant,
      class: classOfProduct,
      brand: brand,
      price: price,
          shelf_code: shelf,
      min_stock: 20,
          expiry_date: expiryDate
        };
        
    // Find existing product
    const existingProduct = await findProduct(productDetails);
    
    let product, barcode;
    if (existingProduct && existingProduct.price === price) {
      // Product exists with same price, use existing barcode
      product = existingProduct;
      barcode = existingProduct.barcode;
    } else {
      // Create new product with unique barcode
      barcode = await generateUniqueBarcode();
      product = await createProduct(productDetails, barcode);
    }
    
    // Add inventory entry
    await addInventory(product.id, batchData.id, quantity, expiryDate);
    
    renderBarcode(barcode);
    alert(`"${name}" added/updated in inventory.`);
    form.reset();
    loadInventory();
  } catch (err) {
    console.error("Insert error:", err);
    alert("Something went wrong while adding the product: " + err.message);
  }
})

async function loadInventory(){
  try {
    // Load unaggregated inventory (individual batch items)
    const { data, error } = await supabase
      .from('batch_details')
      .select('*')
      .order('batch_date', { ascending: false })
      .order('part_name', { ascending: true });

    if (error) throw error;
    
    const inventoryTable = document.getElementById('inventoryTable');
    if (!inventoryTable) {
      console.log('inventoryTable not found - this page does not display inventory table');
      return;
    }
    
    const tbody = inventoryTable.querySelector('tbody');
    if (!tbody) {
      console.log('inventoryTable tbody not found');
      return;
    }
    
    tbody.innerHTML = '';

    data.forEach(item => {
      const totalQuantity = item.quantity_on_hold + item.quantity_active;
      const totalPrice = (totalQuantity * item.price).toFixed(2);
      const formattedDate = item.inventory_added_at
        ? new Date(item.inventory_added_at).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : '-';
      const batchDate = item.batch_date
        ? new Date(item.batch_date).toLocaleDateString('en-IN')
        : '-';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.part_name}</td>
        <td>${item.variant || '-'}</td>
        <td>${item.class || '-'}</td>
        <td>${item.brand}</td>
        <td>${totalQuantity}</td>
        <td>${item.quantity_on_hold}</td>
        <td>${item.quantity_active}</td>
        <td>${item.price}</td>
      <td>${totalPrice}</td>
        <td>${item.barcode}</td>
        <td>${item.batch_number}</td>
        <td>${item.vendor_name}</td>
        <td>${batchDate}</td>
      <td>${formattedDate}</td>
      <td>
          <button onclick="deleteInventoryItem('${item.inventory_id}')">Delete</button>
          <button onclick="viewBarcode('${item.barcode}')">View Barcode</button>
      </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading inventory:", error);
    alert("Failed to load inventory: " + error.message);
  }
}

// New functions for individual inventory items
window.deleteInventoryItem = async function(inventoryId) {
  if (!confirm("Are you sure you want to delete this inventory item?")) return;
  
  try {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', inventoryId);
    
    if (error) throw error;
    alert("Inventory item removed.");
    loadInventory();
  } catch (error) {
    console.error("Delete error:", error);
    alert("Failed to delete inventory item: " + error.message);
  }
}


// View barcode for specific batch item (inventory.html)
window.viewBarcode = async function(barcode) {
  try {
    const barcodeInfo = await getBarcodeInfo(barcode);
    
    if (!barcodeInfo) {
      alert('Barcode details not found.');
      return;
    }
    
    // Generate and display the barcode
    renderBarcode(barcode);
    
    // Show barcode details in a modal
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = 'white';
    modal.style.border = '2px solid #333';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.maxWidth = '600px';
    modal.style.zIndex = '10000';
    modal.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    
    modal.innerHTML = `
      <h3>Barcode: ${barcode}</h3>
      <div style="text-align: center; margin: 20px 0;">
        <svg id="modalBarcode" width="300" height="100"></svg>
      </div>
      <div style="text-align: left; font-family: monospace; font-size: 14px;">
        <p><strong>Product:</strong> ${barcodeInfo.part_name} (${barcodeInfo.variant || ''})</p>
        <p><strong>Brand:</strong> ${barcodeInfo.brand}</p>
        <p><strong>Class:</strong> ${barcodeInfo.class || '-'}</p>
        <p><strong>Price:</strong> ₹${barcodeInfo.price}</p>
        <p><strong>Batch:</strong> ${barcodeInfo.batch_number}</p>
        <p><strong>Vendor:</strong> ${barcodeInfo.vendor_name}</p>
        <p><strong>Invoice:</strong> ${barcodeInfo.vendor_invoice}</p>
        <p><strong>On Hold:</strong> ${barcodeInfo.quantity_on_hold}</p>
        <p><strong>Active:</strong> ${barcodeInfo.quantity_active}</p>
        <p><strong>Batch Date:</strong> ${barcodeInfo.batch_date}</p>
        ${barcodeInfo.expiry_date ? `<p><strong>Expiry:</strong> ${barcodeInfo.expiry_date}</p>` : ''}
      </div>
      <div style="text-align: center; margin-top: 15px;">
        <button onclick="downloadModalBarcode('${barcode}')" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Download</button>
        <button onclick="printModalBarcode('${barcode}')" style="padding: 8px 16px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Print</button>
        <button id="closeBarcodeModalBtn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener for close button
    document.getElementById('closeBarcodeModalBtn').addEventListener('click', function() {
      modal.remove();
    });
    
    // Add click-outside-to-close functionality
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Generate barcode in the modal
    JsBarcode("#modalBarcode", barcode, {
      format: "CODE128",
      lineColor: "#000",
      width: 1.4,
      height: 25,
      displayValue: true,
      fontSize: 10,
      textMargin: 1
    });
    
  } catch (error) {
    console.error('Error fetching barcode details:', error);
    alert('Failed to load barcode details: ' + error.message);
  }
}

// Download barcode from modal
window.downloadModalBarcode = function(barcode) {
  const svg = document.getElementById('modalBarcode');
  const serializer = new XMLSerializer();
  const svgBlob = new Blob([serializer.serializeToString(svg)], {type: "image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(svgBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `barcode-${barcode}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

// Print barcode from modal
window.printModalBarcode = async function(barcode) {
  try {
    // Get barcode info to access product and batch details
    const barcodeInfo = await getBarcodeInfo(barcode);
    
    if (!barcodeInfo) {
      alert('Barcode details not found.');
      return;
    }
    
    const svg = document.getElementById('modalBarcode');
    
    // Format batch date as YYMMDD
    const batchDate = barcodeInfo.batch_date 
      ? new Date(barcodeInfo.batch_date).toISOString().slice(2, 10).replace(/-/g, '')
      : 'N/A';
    
    const printContent = `
      <div style="text-align:center;font-family:Arial,sans-serif;font-size:1px;">
        ${svg.outerHTML}
        <div style="margin-top:1px;font-size:12px;">₹${barcodeInfo.price}</div>
        <div style="margin-top:1px;font-size:12px;">${barcodeInfo.part_name}</div>
        <div style="margin-top:1px;font-size:10px;">${barcodeInfo.brand}</div>
        <div style="margin-top:1px;font-size:10px;">${batchDate}</div>
      </div>
    `;

    const printWindow = window.open('', '', 'width=200,height=120');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode - ${barcode}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body style="margin:0;padding:0;">
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    
  } catch (error) {
    console.error('Error printing barcode:', error);
    alert('Failed to print barcode: ' + error.message);
  }
}


// Show all barcodes for a product
window.showProductBarcodes = async function(productId) {
  try {
    const barcodes = await getProductBarcodes(productId);
    
    if (barcodes.length === 0) {
      alert('No barcodes found for this product.');
      return;
    }
    
    let barcodeList = 'Product Barcodes:\n\n';
    barcodes.forEach((item, index) => {
      barcodeList += `${index + 1}. Barcode: ${item.barcode}\n`;
      barcodeList += `   Batch: ${item.batches.batch_id}\n`;
      barcodeList += `   Vendor: ${item.batches.vendor_name}\n`;
      barcodeList += `   Invoice: ${item.batches.vendor_invoice}\n`;
      barcodeList += `   On Hold: ${item.quantity_on_hold}\n`;
      barcodeList += `   Active: ${item.quantity_active}\n`;
      if (item.expiry_date) {
        barcodeList += `   Expiry: ${item.expiry_date}\n`;
      }
      barcodeList += '\n';
    });
    
    // Show in a modal or alert
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = 'white';
    modal.style.border = '2px solid #333';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.maxWidth = '600px';
    modal.style.maxHeight = '80vh';
    modal.style.overflow = 'auto';
    modal.style.zIndex = '10000';
    modal.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    
    modal.innerHTML = `
      <h3>Product Barcodes</h3>
      <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${barcodeList}</pre>
      <div style="text-align: center; margin-top: 15px;">
        <button id="closeProductBarcodesModalBtn" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener for close button
    document.getElementById('closeProductBarcodesModalBtn').addEventListener('click', function() {
      modal.remove();
    });
    
    // Add click-outside-to-close functionality
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
  } catch (error) {
    console.error('Error fetching barcodes:', error);
    alert('Failed to load barcodes: ' + error.message);
  }
}

async function renderBarcode(barcode){
  if(!barcode) return
  JsBarcode("#barcode",barcode,{
    format:"CODE128",
    lineColor:"#000",
    width:2,
    height:40,
    displayValue:true
  })
  currentBarcode=barcode
  document.getElementById("downloadBarcode").style.display="inline-block"
  // Print functionality moved to modal system

  // Product details are now displayed in the modal when viewing barcodes
  // No need to display inline product details anymore
}
window.renderBarcode=renderBarcode

document.getElementById('downloadBarcode').addEventListener('click',()=>{
  if(!currentBarcode) return alert("No barcode to download.")
  const svg=document.getElementById('barcode')
  const serializer=new XMLSerializer()
  const svgBlob=new Blob([serializer.serializeToString(svg)],{type:"image/svg+xml;charset=utf-8"})
  const url=URL.createObjectURL(svgBlob)
  const a=document.createElement('a')
  a.href=url
  a.download=`barcode-${currentBarcode}.svg`
  a.click()
  URL.revokeObjectURL(url)
})

// Print functionality removed - users can print from the modal system;

const nameInput=document.getElementById('name')
const suggestions=document.createElement('ul')
suggestions.id='suggestions'
suggestions.style.position='absolute'
suggestions.style.background='white'
suggestions.style.border='1px solid #ccc'
suggestions.style.borderRadius='4px'
suggestions.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'
suggestions.style.listStyle='none'
suggestions.style.padding='0'
suggestions.style.margin='0'
suggestions.style.width=nameInput.offsetWidth+'px'
suggestions.style.top='100%'
suggestions.style.left='0'
suggestions.style.zIndex='1000'
suggestions.style.maxHeight='200px'
suggestions.style.overflowY='auto'
suggestions.style.display='none'

// Make the parent container relative positioned
nameInput.parentNode.style.position='relative'
nameInput.parentNode.appendChild(suggestions)

nameInput.addEventListener('input',async()=>{
  const query=nameInput.value.trim()
  suggestions.innerHTML=''
  if(query.length<1) {
    suggestions.style.display='none'
    return
  }

  suggestions.style.display='block'

  try {
    // Use a more specific query to get unique products
    const { data, error } = await supabase
      .from('products')
      .select('part_name, variant, class, brand, price, shelf_code')
      .or(`part_name.ilike.%${query}%,variant.ilike.%${query}%`)
      .order('part_name')
      .limit(20); // Get more results to filter from

    if (error) {
      console.error("Suggestion error:", error);
      return;
    }

    // More robust deduplication - group by part_name, variant, and brand
    const uniqueProducts = [];
    const seen = new Set();
    
    data.forEach(product => {
      // Create a more specific key that includes brand to avoid false duplicates
      const key = `${product.part_name.toLowerCase()}|${(product.variant || '').toLowerCase()}|${(product.brand || '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueProducts.push(product);
      }
    });

    // Sort by relevance (exact matches first, then partial matches)
    uniqueProducts.sort((a, b) => {
      const aExact = a.part_name.toLowerCase().startsWith(query.toLowerCase());
      const bExact = b.part_name.toLowerCase().startsWith(query.toLowerCase());
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.part_name.localeCompare(b.part_name);
    });

    // Limit to 5 unique suggestions
    uniqueProducts.slice(0, 5).forEach(product => {
      const li = document.createElement('li');
      li.textContent = `${product.part_name} (${product.variant || ''})`;
      li.style.padding = '8px 12px';
      li.style.cursor = 'pointer';
      li.style.borderBottom = '1px solid #eee';
      li.style.fontSize = '14px';
      
      // Add hover effect
      li.addEventListener('mouseenter', () => {
        li.style.backgroundColor = '#f5f5f5';
      });
      li.addEventListener('mouseleave', () => {
        li.style.backgroundColor = 'white';
      });
      
      li.addEventListener('click', () => {
        nameInput.value = product.part_name;
        document.getElementById('variant').value = product.variant || '';
        document.getElementById('class_of_product').value = product.class?.trim() || '';
        document.getElementById('brand').value = product.brand || '';
        document.getElementById('quantity').value = 1;
        document.getElementById('price').value = product.price || 0;
        document.getElementById('shelf').value = product.shelf_code || '';
        document.getElementById('expiry').value = '';
        suggestions.style.display = 'none';
        suggestions.innerHTML = '';
      });
      suggestions.appendChild(li);
    });
  } catch (error) {
    console.error("Suggestion error:", error);
  }
})

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!nameInput.contains(e.target) && !suggestions.contains(e.target)) {
    suggestions.style.display = 'none';
  }
});

// Only load inventory if the inventory table exists on this page
if (document.getElementById('inventoryTable')) {
loadInventory()
}
