import { supabase, getBarcodeInfo } from './database.js'

// Audit state management
let auditResults = []
let scannedCounts = new Map() // barcode -> count (for quantity tracking)

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
 * Handle barcode scanning with quantity counting
 */
async function handleScan() {
    const barcode = barcodeInput.value.trim().toUpperCase()
    
    if (!barcode) {
        alert('Please enter a barcode to scan')
        return
    }
    
    // Update scanned count
    const currentCount = scannedCounts.get(barcode) || 0
    scannedCounts.set(barcode, currentCount + 1)
    
    try {
        // Show loading state
        scanBtn.textContent = 'Scanning...'
        scanBtn.disabled = true
        
        // Look up barcode in database
        const barcodeInfo = await getBarcodeInfo(barcode)
        
        if (barcodeInfo && barcodeInfo.length > 0) {
            // Item found in database
            const item = barcodeInfo[0]
            const totalQuantity = item.quantity_active + item.quantity_on_hold
            const scannedCount = scannedCounts.get(barcode)
            
            const auditResult = {
                barcode: barcode,
                found: true,
                timestamp: new Date(),
                scannedCount: scannedCount,
                databaseQuantity: totalQuantity,
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
            
            // Update existing result or add new one
            const existingIndex = auditResults.findIndex(r => r.barcode === barcode)
            if (existingIndex >= 0) {
                auditResults[existingIndex] = auditResult
            } else {
                auditResults.push(auditResult)
            }
            
            // Show appropriate message based on count
            if (scannedCount === 1) {
                showSuccessMessage(`✅ Found: ${item.part_name} (${item.brand})`)
            } else {
                showSuccessMessage(`✅ Scanned: ${scannedCount} units of ${item.part_name}`)
            }
            
        } else {
            // Item not found in database
            const scannedCount = scannedCounts.get(barcode)
            
            const auditResult = {
                barcode: barcode,
                found: false,
                timestamp: new Date(),
                scannedCount: scannedCount,
                databaseQuantity: 0,
                item: null
            }
            
            // Update existing result or add new one
            const existingIndex = auditResults.findIndex(r => r.barcode === barcode)
            if (existingIndex >= 0) {
                auditResults[existingIndex] = auditResult
            } else {
                auditResults.push(auditResult)
            }
            
            showErrorMessage(`❌ Missing: Barcode ${barcode} not found in system (${scannedCount} units scanned)`)
        }
        
        // Update display
        updateAuditResults()
        updateSummary()
        
    } catch (error) {
        console.error('Error scanning barcode:', error)
        showErrorMessage(`Error scanning barcode: ${error.message}`)
        
        // Remove from scanned count on error
        const currentCount = scannedCounts.get(barcode) || 0
        if (currentCount > 1) {
            scannedCounts.set(barcode, currentCount - 1)
        } else {
            scannedCounts.delete(barcode)
        }
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
            
            // Calculate variance
            const variance = result.scannedCount - result.databaseQuantity
            const varianceText = variance === 0 ? 'MATCH' : 
                                variance > 0 ? `+${variance} OVER` : 
                                `${Math.abs(variance)} UNDER`
            const varianceClass = variance === 0 ? 'status-found' : 
                                 variance > 0 ? 'status-info' : 'status-missing'
            
            return `
                <div class="result-item result-found">
                    <div class="item-details">
                        <div class="item-name">${result.item.part_name}</div>
                        <div class="item-meta">
                            ${result.item.variant ? result.item.variant + ' • ' : ''}
                            ${result.item.brand} • ${result.item.class} • 
                            DB: ${result.databaseQuantity} • Scanned: ${result.scannedCount} • 
                            ₹${result.item.price} • Batch: ${result.item.batch_number} • 
                            Scanned: ${timestamp}
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <div class="item-status ${statusClass}">${statusText}</div>
                        <div class="item-status ${varianceClass}">${varianceText}</div>
                    </div>
                </div>
            `
        } else {
            return `
                <div class="result-item result-missing">
                    <div class="item-details">
                        <div class="item-name">Barcode: ${result.barcode}</div>
                        <div class="item-meta">
                            Item not found in system • Scanned: ${result.scannedCount} units • 
                            Last scanned: ${timestamp}
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
        scannedCounts.clear()
        updateAuditResults()
        updateSummary()
        showInfoMessage('All audit results cleared')
    }
}

/**
 * Generate PDF report using browser's print functionality
 */
function generatePDFReport() {
    if (auditResults.length === 0) {
        alert('No audit results to generate report')
        return
    }
    
    // Create report HTML
    const reportHTML = generateReportHTML()
    
    // Open new window for printing
    const printWindow = window.open('', '_blank')
    printWindow.document.write(reportHTML)
    printWindow.document.close()
    
    // Wait for content to load, then print
    printWindow.onload = function() {
        printWindow.print()
    }
}

/**
 * Generate HTML content for the report
 */
function generateReportHTML() {
    const now = new Date()
    const reportDate = now.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
    
    const totalScanned = auditResults.length
    const itemsFound = auditResults.filter(r => r.found).length
    const itemsMissing = auditResults.filter(r => !r.found).length
    const accuracyRate = totalScanned > 0 ? Math.round((itemsFound / totalScanned) * 100) : 0
    
    // Calculate discrepancies
    const discrepancies = auditResults.filter(r => r.found && r.scannedCount !== r.databaseQuantity)
    const overstock = auditResults.filter(r => r.found && r.scannedCount > r.databaseQuantity)
    const understock = auditResults.filter(r => r.found && r.scannedCount < r.databaseQuantity)
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Inventory Audit Report - Ruby Auto Parts</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 10px; }
        .summary-item { text-align: center; padding: 10px; background: white; border-radius: 3px; }
        .summary-number { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .summary-label { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .status-match { color: #28a745; font-weight: bold; }
        .status-over { color: #17a2b8; font-weight: bold; }
        .status-under { color: #dc3545; font-weight: bold; }
        .status-missing { color: #dc3545; font-weight: bold; }
        .discrepancy-section { margin-top: 30px; }
        .discrepancy-item { margin: 5px 0; padding: 5px; background: #fff3cd; border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Ruby Auto Parts</h1>
        <h2>Inventory Audit Report</h2>
        <p>Generated on: ${reportDate}</p>
    </div>
    
    <div class="summary">
        <h3>Audit Summary</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-number">${totalScanned}</div>
                <div class="summary-label">Items Scanned</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">${itemsFound}</div>
                <div class="summary-label">Items Found</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">${itemsMissing}</div>
                <div class="summary-label">Items Missing</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">${accuracyRate}%</div>
                <div class="summary-label">Accuracy Rate</div>
            </div>
        </div>
    </div>
    
    <h3>Detailed Results</h3>
    <table>
        <thead>
            <tr>
                <th>Barcode</th>
                <th>Product Name</th>
                <th>Brand</th>
                <th>DB Qty</th>
                <th>Scanned</th>
                <th>Variance</th>
                <th>Status</th>
                <th>Batch</th>
            </tr>
        </thead>
        <tbody>
            ${auditResults.map(result => {
                if (result.found && result.item) {
                    const variance = result.scannedCount - result.databaseQuantity
                    const varianceText = variance === 0 ? 'MATCH' : 
                                        variance > 0 ? `+${variance}` : 
                                        `${variance}`
                    const varianceClass = variance === 0 ? 'status-match' : 
                                         variance > 0 ? 'status-over' : 'status-under'
                    
                    return `
                        <tr>
                            <td>${result.barcode}</td>
                            <td>${result.item.part_name}</td>
                            <td>${result.item.brand}</td>
                            <td>${result.databaseQuantity}</td>
                            <td>${result.scannedCount}</td>
                            <td class="${varianceClass}">${varianceText}</td>
                            <td>${result.item.quantity_active > 0 ? 'ACTIVE' : 'ON-HOLD'}</td>
                            <td>${result.item.batch_number}</td>
                        </tr>
                    `
                } else {
                    return `
                        <tr>
                            <td>${result.barcode}</td>
                            <td colspan="6" class="status-missing">ITEM NOT FOUND IN SYSTEM</td>
                            <td>${result.scannedCount} units scanned</td>
                        </tr>
                    `
                }
            }).join('')}
        </tbody>
    </table>
    
    ${discrepancies.length > 0 ? `
    <div class="discrepancy-section">
        <h3>Discrepancies Found</h3>
        <p><strong>Total Discrepancies:</strong> ${discrepancies.length}</p>
        <p><strong>Overstock Items:</strong> ${overstock.length}</p>
        <p><strong>Understock Items:</strong> ${understock.length}</p>
        
        ${discrepancies.map(result => {
            const variance = result.scannedCount - result.databaseQuantity
            return `
                <div class="discrepancy-item">
                    <strong>${result.item.part_name}</strong> (${result.barcode}) - 
                    Database: ${result.databaseQuantity}, Scanned: ${result.scannedCount}, 
                    Variance: ${variance > 0 ? '+' : ''}${variance}
                </div>
            `
        }).join('')}
    </div>
    ` : ''}
    
    <div style="margin-top: 30px; font-size: 12px; color: #666;">
        <p>This report was generated automatically by the Ruby Auto Parts Inventory Audit System.</p>
        <p>For questions about this audit, please contact the system administrator.</p>
    </div>
</body>
</html>
    `
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

// Make generatePDFReport globally available
window.generatePDFReport = generatePDFReport