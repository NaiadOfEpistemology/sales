import './style.css'
import JsBarcode from 'jsbarcode'
import { supabase, getProductBarcodes, getActiveProductBarcodes } from './database.js'

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

async function loadInventory(){
  try {
    const { data, error } = await supabase.from('active_inventory').select('*');
    if (error) {
      console.error("Error loading inventory:", error);
      return;
    }

    const tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';

    data.forEach(product => {
      const totalPrice = (product.total_active * product.price).toFixed(2);
      const formattedDate = product.created_at
        ? new Date(product.created_at).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : '-';
      const minStock = product.min_stock || 20;
      const quantityColor = product.total_active < minStock ? 'red' : 'black';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.part_name}</td>
        <td>${product.variant}</td>
        <td>${product.class || '-'}</td>
        <td>${product.brand}</td>
        <td style="color:${quantityColor}">${product.total_active}</td>
        <td>${product.price}</td>
        <td>${totalPrice}</td>
        <td>${product.shelf_code || '-'}</td>
        <td>${formattedDate}</td>
        <td>
          <button onclick="showProductBarcodes('${product.id}')">View Barcodes</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading inventory:", error);
    alert("Failed to load inventory: " + error.message);
  }
}



// Show only active barcodes for a product (active inventory view)
window.showProductBarcodes = async function(productId) {
  try {
    const barcodes = await getActiveProductBarcodes(productId);
    
    if (barcodes.length === 0) {
      alert('No active barcodes found for this product.');
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
    
    // Show in a modal
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
      <h3>Active Product Barcodes</h3>
      <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${barcodeList}</pre>
      <div style="text-align: center; margin-top: 15px;">
        <button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Error fetching barcodes:', error);
    alert('Failed to load barcodes: ' + error.message);
  }
}

// Load inventory on page load
loadInventory()
