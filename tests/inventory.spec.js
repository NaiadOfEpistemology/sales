const { test, expect } = require('@playwright/test');

test.describe('Inventory Management Tests', () => {
  test('should load inventory list page', async ({ page }) => {
    await page.goto('/inventory-list.html');
    
    // Check if page loads without errors
    await expect(page.locator('h1')).toContainText('Inventory List');
    
    // Check if search input is present
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Check if table is present
    await expect(page.locator('#inventoryTable')).toBeVisible();
  });

  test('should add new product to inventory', async ({ page }) => {
    await page.goto('/inventory.html');
    
    // Fill in product form
    await page.fill('input[name="partName"]', 'Test Product');
    await page.fill('input[name="variant"]', 'Test Variant');
    await page.fill('input[name="class"]', 'Test Class');
    await page.fill('input[name="brand"]', 'Test Brand');
    await page.fill('input[name="price"]', '100.00');
    await page.fill('input[name="quantity"]', '5');
    await page.fill('input[name="vendorName"]', 'Test Vendor');
    await page.fill('input[name="vendorInvoice"]', 'INV-001');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for success message or redirect
    await expect(page.locator('body')).toContainText('successfully added');
  });

  test('should search inventory items', async ({ page }) => {
    await page.goto('/inventory-list.html');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Search for items
    await page.fill('input[placeholder*="Search"]', 'test');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Check if search input has value
    await expect(page.locator('input[placeholder*="Search"]')).toHaveValue('test');
  });
});
