const { test, expect } = require('@playwright/test');

test.describe('Billing System Tests', () => {
  test('should load billing page', async ({ page }) => {
    await page.goto('/billing.html');
    
    // Check if page loads without errors
    await expect(page.locator('h1')).toContainText('Billing');
    
    // Check if customer section is present
    await expect(page.locator('h3:has-text("Customer Information")')).toBeVisible();
    
    // Check if product search is present
    await expect(page.locator('input[placeholder*="barcode"]')).toBeVisible();
  });

  test('should add customer information', async ({ page }) => {
    await page.goto('/billing.html');
    
    // Fill customer form
    await page.fill('input[name="customerName"]', 'Test Customer');
    await page.fill('input[name="customerPhone"]', '1234567890');
    await page.fill('input[name="customerEmail"]', 'test@example.com');
    
    // Submit customer form
    await page.click('button[type="submit"]');
    
    // Check if customer info is displayed
    await expect(page.locator('.customer-display')).toContainText('Test Customer');
  });

  test('should add product to cart via barcode', async ({ page }) => {
    await page.goto('/billing.html');
    
    // Add customer first
    await page.fill('input[name="customerName"]', 'Test Customer');
    await page.click('button[type="submit"]');
    
    // Add product via barcode
    await page.fill('input[placeholder*="barcode"]', 'TEST123');
    await page.press('input[placeholder*="barcode"]', 'Enter');
    
    // Check if product appears in cart
    await expect(page.locator('#cartItems')).toBeVisible();
  });
});
