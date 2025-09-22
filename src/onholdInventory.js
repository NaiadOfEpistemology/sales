import './style.css'
import JsBarcode from 'jsbarcode'
import { supabase, deleteProduct as deleteProductFromDB, getBarcodeInfo } from './database.js'

let currentBarcode=null

function generateBarcode(){
  return Math.random().toString(36).substring(2,10).toUpperCase()
}

window.filterInventory=function(){
  const query=document.getElementById('searchInput').value.toLowerCase()
  const rows=document.querySelectorAll('#inventoryTable tbody tr')
  rows.forEach(row=>{
    const text=row.textContent.toLowerCase()
    row.style.display=text.includes(query)?'':'none'
  })
}

function renderBarcode(barcode){
  currentBarcode=barcode
  JsBarcode("#barcode", barcode, {
    format: "CODE128",
    width: 2,
    height: 100,
    displayValue: true
  })
}
window.renderBarcode=renderBarcode

document.getElementById('downloadBarcode').addEventListener('click',()=>{
  if(!currentBarcode) return
  const svg=document.getElementById('barcode')
  const svgData=new XMLSerializer().serializeToString(svg)
  const canvas=document.createElement('canvas')
  const ctx=canvas.getContext('2d')
  const img=new Image()
  img.onload=()=>{
    canvas.width=img.width
    canvas.height=img.height
    ctx.drawImage(img,0,0)
    const link=document.createElement('a')
    link.download=`barcode_${currentBarcode}.png`
    link.href=canvas.toDataURL()
    link.click()
  }
  img.src='data:image/svg+xml;base64,'+btoa(svgData)
})

// Print functionality removed - users can print from the modal system

// Print modal barcode function
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
          <title>Print Barcode</title>
          <style>
            @page { margin: 0; }
            body { margin: 0; padding: 0; }
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

// Activate inventory item function
window.activateInventoryItem = async function(barcode) {
  if (!confirm('Are you sure you want to activate this inventory item?')) return;
  
  try {
    // Redirect to activate page with the barcode
    window.location.href = `activate.html?barcode=${barcode}`;
  } catch (error) {
    console.error("Error activating inventory:", error);
    alert("Failed to activate inventory: " + error.message);
  }
}


// Delete inventory item function
window.deleteInventoryItem = async function(barcode) {
  if (!confirm('Are you sure you want to delete this inventory item?')) return;
  
  try {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('barcode', barcode);
    
    if (error) throw error;
    
    alert('Inventory item deleted successfully!');
    loadInventory(); // Reload the table
  } catch (error) {
    console.error("Error deleting inventory:", error);
    alert("Failed to delete inventory: " + error.message);
  }
}

// View barcode function
window.viewBarcode = async function(barcode) {
  try {
    const barcodeInfo = await getBarcodeInfo(barcode);
    
    if (!barcodeInfo) {
      alert('Barcode details not found.');
      return;
    }
    
    // Show barcode details in a modal
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = 'white';
    modal.style.padding = '20px';
    modal.style.border = '2px solid #333';
    modal.style.borderRadius = '8px';
    modal.style.zIndex = '1000';
    modal.style.maxWidth = '500px';
    modal.style.width = '90%';
    
    modal.innerHTML = `
      <h3>Barcode Details</h3>
      <div style="text-align: center; margin: 20px 0;">
        <svg id="modalBarcode" width="200" height="60"></svg>
      </div>
      <p><strong>Barcode:</strong> ${barcodeInfo.barcode}</p>
      <p><strong>Product:</strong> ${barcodeInfo.part_name}</p>
      <p><strong>Brand:</strong> ${barcodeInfo.brand}</p>
      <p><strong>Price:</strong> ₹${barcodeInfo.price}</p>
      <p><strong>Batch:</strong> ${barcodeInfo.batch_number}</p>
      <p><strong>Vendor:</strong> ${barcodeInfo.vendor_name}</p>
      <p><strong>Batch Date:</strong> ${barcodeInfo.batch_date ? new Date(barcodeInfo.batch_date).toLocaleDateString() : 'N/A'}</p>
      <p><strong>On-Hold Qty:</strong> ${barcodeInfo.quantity_on_hold}</p>
      <p><strong>Active Qty:</strong> ${barcodeInfo.quantity_active}</p>
      <div style="text-align: center; margin-top: 20px;">
        <button onclick="printModalBarcode('${barcode}')" style="padding: 8px 16px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Print</button>
        <button id="closeModalBtn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener for close button
    document.getElementById('closeModalBtn').addEventListener('click', function() {
      modal.remove();
    });
    
    // Add click-outside-to-close functionality
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Generate barcode in modal
    JsBarcode("#modalBarcode", barcode, {
      format: "CODE128",
      lineColor: "#000",
      width: 1.3,
      height: 25,
      displayValue: true,
      fontSize: 10,
      textMargin: 2
    });
    
  } catch (error) {
    console.error("Error viewing barcode:", error);
    alert("Failed to load barcode details: " + error.message);
  }
}

async function loadInventory(){
  try {
    // Load unaggregated on-hold inventory (individual batch items)
    const { data, error } = await supabase
      .from('batch_details')
      .select('*')
      .gt('quantity_on_hold', 0)
      .order('batch_date', { ascending: false })
      .order('part_name', { ascending: true });

    if (error) {
      console.error("Error loading inventory:", error);
      return;
    }

    const tbody = document.querySelector('#inventoryTable tbody');
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
        <td style="color:red">${item.quantity_on_hold}</td>
        <td>${item.quantity_active}</td>
        <td>${item.price}</td>
        <td>${totalPrice}</td>
        <td>${item.barcode}</td>
        <td>${item.batch_number}</td>
        <td>${item.vendor_name}</td>
        <td>${batchDate}</td>
        <td>${formattedDate}</td>
        <td>
          <button onclick="activateInventoryItem('${item.barcode}')">Activate</button>
          <button onclick="deleteInventoryItem('${item.barcode}')">Delete</button>
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

window.deleteProduct = async function(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  
  try {
    await deleteProductFromDB(id);
    alert("Product deleted successfully.");
    loadInventory();
  } catch (error) {
    console.error("Error deleting product:", error);
    alert("Failed to delete product: " + error.message);
  }
}


// Load inventory on page load
loadInventory()
