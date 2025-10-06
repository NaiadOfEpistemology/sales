import { supabase, activateInventory } from './database.js';

let currentProduct = null;

// Check for barcode parameter in URL on page load
window.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const barcodeParam = urlParams.get('barcode');
  
  if (barcodeParam) {
    document.getElementById('barcode').value = barcodeParam;
    fetchProductByBarcode(barcodeParam);
  }
});

async function fetchProductByBarcode(barcode) {
  try {
    // Query the inventory table with barcode to get product and batch details
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .select(`
        barcode,
        quantity_on_hold,
        quantity_active,
        expiry_date,
        products!inner(
          id,
          part_name,
          variant,
          brand,
          class,
          price,
          shelf_code,
          min_stock
        ),
        batches!inner(
          id,
          batch_id,
          batch_date,
          vendor_name,
          vendor_invoice
        )
      `)
      .eq('barcode', barcode)
      .gt('quantity_on_hold', 0)
      .single();

    if (inventoryError || !inventoryData) {
      showResult('Product not found with this barcode or no quantity on hold.', 'error');
      return null;
    }

    // Return the data in the expected format
    return {
      id: inventoryData.products.id,
      part_name: inventoryData.products.part_name,
      variant: inventoryData.products.variant,
      brand: inventoryData.products.brand,
      class: inventoryData.products.class,
      price: inventoryData.products.price,
      shelf_code: inventoryData.products.shelf_code,
      min_stock: inventoryData.products.min_stock,
      barcode: inventoryData.barcode,
      total_on_hold: inventoryData.quantity_on_hold,
      batch_id: inventoryData.batches.batch_id,
      batch_date: inventoryData.batches.batch_date,
      vendor_name: inventoryData.batches.vendor_name,
      vendor_invoice: inventoryData.batches.vendor_invoice
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    showResult('Error fetching product details.', 'error');
    return null;
  }
}

function displayProductDetails(product) {
  currentProduct = product;
  
  const productInfo = document.getElementById('productInfo');
  productInfo.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
      <div><strong>Name:</strong> ${product.part_name}</div>
      <div><strong>Variant:</strong> ${product.variant}</div>
      <div><strong>Brand:</strong> ${product.brand}</div>
      <div><strong>Class:</strong> ${product.class || '-'}</div>
      <div><strong>Price:</strong> ₹${product.price}</div>
      <div><strong>Shelf Code:</strong> ${product.shelf_code || '-'}</div>
      <div><strong>On Hold:</strong> ${product.total_on_hold}</div>
      <div><strong>Barcode:</strong> ${product.barcode}</div>
    </div>
  `;

  // Set max quantity for activation
  const activateQuantityInput = document.getElementById('activateQuantity');
  const maxQuantityInfo = document.getElementById('maxQuantityInfo');
  
  activateQuantityInput.max = product.total_on_hold;
  activateQuantityInput.value = 1;
  maxQuantityInfo.textContent = `Maximum available on hold: ${product.total_on_hold}`;

  // Show the product details section
  document.getElementById('productDetails').style.display = 'block';
}

async function activateProductQuantity(quantityToActivate) {
  if (!currentProduct) {
    showResult('No product selected for activation.', 'error');
    return;
  }

  if (quantityToActivate > currentProduct.total_on_hold) {
    showResult('Cannot activate more quantity than available on hold.', 'error');
    return;
  }

  if (quantityToActivate <= 0) {
    showResult('Please enter a valid quantity to activate.', 'error');
    return;
  }

  try {
    // Use the database function to activate inventory
    // We need to get the batch ID for the specific barcode
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .select('batch_id')
      .eq('barcode', currentProduct.barcode)
      .single();

    if (inventoryError || !inventoryData) {
      showResult('Inventory item not found.', 'error');
      return;
    }

    const { data, error } = await supabase.rpc('activate_inventory', {
      p_product_id: currentProduct.id,
      p_quantity: quantityToActivate,
      p_batch_id: inventoryData.batch_id
    });

    if (error) {
      console.error('Activation error:', error);
      showResult('Activation failed. Please try again.', 'error');
      return;
    }

    showResult(`Successfully activated ${quantityToActivate} units of "${currentProduct.part_name}".`, 'success');
    
    // Hide product details and reset form
    // Product details modal is handled elsewhere
    document.getElementById('activateForm').reset();
    currentProduct = null;
    
  } catch (error) {
    console.error('Activation error:', error);
    showResult('An error occurred during activation.', 'error');
  }
}

function showResult(message, type) {
  const resultDiv = document.getElementById('result');
  resultDiv.textContent = message;
  resultDiv.className = `result ${type}`;
  resultDiv.style.display = 'block';
  
  // Hide result after 5 seconds
  setTimeout(() => {
    resultDiv.style.display = 'none';
  }, 5000);
}

function hideProductDetails() {
  // Product details modal is handled elsewhere
  document.getElementById('activateForm').reset();
  currentProduct = null;
}

// Event listeners - wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('activateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submitted'); // Debug log
    const barcode = document.getElementById('barcode').value.trim();
    
    if (!barcode) {
      showResult('Please enter a barcode.', 'error');
      return;
    }

    console.log('Fetching product for barcode:', barcode); // Debug log
    const product = await fetchProductByBarcode(barcode);
    if (product) {
      console.log('Product found:', product); // Debug log
      displayProductDetails(product);
    } else {
      console.log('No product found'); // Debug log
    }
  });

  document.getElementById('activateQuantityForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const quantityToActivate = parseInt(document.getElementById('activateQuantity').value);
    await activateProductQuantity(quantityToActivate);
  });

  document.getElementById('cancelActivation').addEventListener('click', hideProductDetails);
});
