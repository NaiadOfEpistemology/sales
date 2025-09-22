import { supabase, getBarcodeInfo } from './database.js'

// Audit state management
let auditResults = []
let scannedBarcodes = new Set() // Prevent duplicate scans

// DOM elements
const barcodeInput = document.getElementById('barcodeInput')
const scanBtn = document.getElementById('scanBtn')
const clearBtn = document.getElementById('clearBtn')
const auditResultsDiv = document.getElementById('auditResults')

// Summary elements
const totalScannedEl = document.getElementById('totalScanned')
const itemsFoundEl = document.getElementById('itemsFound')
const itemsMissingEl = document.getElementById('itemsMissing')
const accuracyRateEl = document.getElementById('accuracyRate')

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Scan button click
    scanBtn.addEventListener('click', handleScan)
    
    // Enter key in input
    barcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleScan()
        }
    })
    
    // Clear all results
    clearBtn.addEventListener('click', clearAllResults)
    
    // Auto-focus input
    barcodeInput.focus()
})

// Logout function to match site functionality
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'login.html'
    }
}

/**
 * Handle barcode scanning
 */
async function handleScan() {
    const barcode = barcodeInput.value.trim().toUpperCase()
    
    if (!barcode) {
        alert('Please enter a barcode to scan')
        return
    }
    
    // Check for duplicate scans
    if (scannedBarcodes.has(barcode)) {
        alert('This barcode has already been scanned')
        barcodeInput.value = ''
        barcodeInput.focus()
        return
    }
    
    // Add to scanned set
    scannedBarcodes.add(barcode)
    
    try {
        // Show loading state
        scanBtn.textContent = 'Scanning...'
        scanBtn.disabled = true
        
        // Look up barcode in database
        const barcodeInfo = await getBarcodeInfo(barcode)
        
        if (barcodeInfo && barcodeInfo.length > 0) {
            // Item found in database
            const item = barcodeInfo[0]
            const auditResult = {
                barcode: barcode,
                found: true,
                timestamp: new Date(),
                item: {
                    part_name: item.part_name,
                    variant: item.variant,
                    brand: item.brand,
                    class: item.class,
                    price: item.price,
                    quantity_active: item.quantity_active,
                    quantity_on_hold: item.quantity_on_hold,
                    batch_number: item.batch_number,
                    vendor_name: item.vendor_name,
                    batch_date: item.batch_date
                }
            }
            
            auditResults.push(auditResult)
            showSuccessMessage(`✅ Found: ${item.part_name} (${item.brand})`)
            
        } else {
            // Item not found in database
            const auditResult = {
                barcode: barcode,
                found: false,
                timestamp: new Date(),
                item: null
            }
            
            auditResults.push(auditResult)
            showErrorMessage(`❌ Missing: Barcode ${barcode} not found in system`)
        }
        
        // Update display
        updateAuditResults()
        updateSummary()
        
    } catch (error) {
        console.error('Error scanning barcode:', error)
        showErrorMessage(`Error scanning barcode: ${error.message}`)
        
        // Remove from scanned set on error
        scannedBarcodes.delete(barcode)
    } finally {
        // Reset button state
        scanBtn.textContent = 'Scan Item'
        scanBtn.disabled = false
        
        // Clear input and focus
        barcodeInput.value = ''
        barcodeInput.focus()
    }
}

/**
 * Update the audit results display
 */
function updateAuditResults() {
    if (auditResults.length === 0) {
        auditResultsDiv.innerHTML = `
            <p style="text-align: center; color: #666; font-style: italic;">
                Start scanning items to see results here...
            </p>
        `
        return
    }
    
    // Sort results by timestamp (newest first)
    const sortedResults = [...auditResults].sort((a, b) => b.timestamp - a.timestamp)
    
    auditResultsDiv.innerHTML = sortedResults.map(result => {
        const timestamp = result.timestamp.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
        
        if (result.found && result.item) {
            const totalQuantity = result.item.quantity_active + result.item.quantity_on_hold
            const statusClass = result.item.quantity_active > 0 ? 'status-found' : 'status-info'
            const statusText = result.item.quantity_active > 0 ? 'ACTIVE' : 'ON-HOLD'
            
            return `
                <div class="result-item result-found">
                    <div class="item-details">
                        <div class="item-name">${result.item.part_name}</div>
                        <div class="item-meta">
                            ${result.item.variant ? result.item.variant + ' • ' : ''}
                            ${result.item.brand} • ${result.item.class} • 
                            Qty: ${totalQuantity} (${result.item.quantity_active} active, ${result.item.quantity_on_hold} on-hold) • 
                            ₹${result.item.price} • Batch: ${result.item.batch_number} • 
                            Scanned: ${timestamp}
                        </div>
                    </div>
                    <div class="item-status ${statusClass}">${statusText}</div>
                </div>
            `
        } else {
            return `
                <div class="result-item result-missing">
                    <div class="item-details">
                        <div class="item-name">Barcode: ${result.barcode}</div>
                        <div class="item-meta">
                            Item not found in system • Scanned: ${timestamp}
                        </div>
                    </div>
                    <div class="item-status status-missing">MISSING</div>
                </div>
            `
        }
    }).join('')
}

/**
 * Update the summary statistics
 */
function updateSummary() {
    const totalScanned = auditResults.length
    const itemsFound = auditResults.filter(r => r.found).length
    const itemsMissing = auditResults.filter(r => !r.found).length
    const accuracyRate = totalScanned > 0 ? Math.round((itemsFound / totalScanned) * 100) : 0
    
    totalScannedEl.textContent = totalScanned
    itemsFoundEl.textContent = itemsFound
    itemsMissingEl.textContent = itemsMissing
    accuracyRateEl.textContent = `${accuracyRate}%`
}

/**
 * Clear all audit results
 */
function clearAllResults() {
    if (auditResults.length === 0) {
        alert('No results to clear')
        return
    }
    
    if (confirm('Are you sure you want to clear all audit results?')) {
        auditResults = []
        scannedBarcodes.clear()
        updateAuditResults()
        updateSummary()
        showInfoMessage('All audit results cleared')
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    showMessage(message, 'success')
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    showMessage(message, 'error')
}

/**
 * Show info message
 */
function showInfoMessage(message) {
    showMessage(message, 'info')
}

/**
 * Show temporary message
 */
function showMessage(message, type) {
    // Create message element
    const messageEl = document.createElement('div')
    messageEl.textContent = message
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        max-width: 400px;
        word-wrap: break-word;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `
    
    // Set background color based on type
    switch (type) {
        case 'success':
            messageEl.style.backgroundColor = '#28a745'
            break
        case 'error':
            messageEl.style.backgroundColor = '#dc3545'
            break
        case 'info':
            messageEl.style.backgroundColor = '#17a2b8'
            break
        default:
            messageEl.style.backgroundColor = '#6c757d'
    }
    
    // Add to page
    document.body.appendChild(messageEl)
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl)
        }
    }, 3000)
}

// Add CSS animation
const style = document.createElement('style')
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`
document.head.appendChild(style)
