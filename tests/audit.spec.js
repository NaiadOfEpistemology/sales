const { test, expect } = require('@playwright/test');

test.describe('Audit System Tests', () => {
  test('should load audit page', async ({ page }) => {
    await page.goto('/audit.html');
    
    // Check if page loads without errors
    await expect(page.locator('h1')).toContainText('Inventory Audit');
    
    // Check if scan input is present
    await expect(page.locator('input[placeholder*="barcode"]')).toBeVisible();
    
    // Check if scan button is present
    await expect(page.locator('button:has-text("Scan")')).toBeVisible();
  });

  test('should scan barcode for audit', async ({ page }) => {
    await page.goto('/audit.html');
    
    // Enter barcode
    await page.fill('input[placeholder*="barcode"]', 'TEST123');
    
    // Click scan button
    await page.click('button:has-text("Scan")');
    
    // Check if result appears
    await expect(page.locator('.audit-results')).toBeVisible();
  });

  test('should clear audit results', async ({ page }) => {
    await page.goto('/audit.html');
    
    // Add some results first
    await page.fill('input[placeholder*="barcode"]', 'TEST123');
    await page.click('button:has-text("Scan")');
    
    // Clear results
    await page.click('button:has-text("Clear All")');
    
    // Check if results are cleared
    await expect(page.locator('.audit-results')).toBeEmpty();
  });
});
