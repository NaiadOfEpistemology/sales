const { test, expect } = require('@playwright/test');

test.describe('Navigation Tests', () => {
  test('should have consistent navigation buttons on all pages', async ({ page }) => {
    const pages = [
      'inventory.html',
      'inventory-list.html', 
      'batch.html',
      'active-inventory.html',
      'onhold-inventory.html',
      'billing.html',
      'activate.html',
      'add-product.html',
      'metrics.html',
      'audit.html'
    ];

    const expectedButtons = [
      '📦 Add Inventory',
      '📋 Inventory List',
      '📋 Batch Management', 
      '✅ Active Stock',
      '⏸️ On-Hold Stock',
      '💰 Billing',
      '🔄 Activate',
      '🔍 Audit',
      '➕ Add Product',
      '📊 Metrics'
    ];

    for (const pageName of pages) {
      await page.goto(`/${pageName}`);
      
      // Check if all expected buttons are present
      for (const buttonText of expectedButtons) {
        await expect(page.locator(`a:has-text("${buttonText}")`)).toBeVisible();
      }
      
      // Verify button count
      const buttonCount = await page.locator('a[href$=".html"]').count();
      expect(buttonCount).toBe(10);
    }
  });

  test('should navigate between pages correctly', async ({ page }) => {
    await page.goto('/inventory.html');
    
    // Test navigation to inventory list
    await page.click('a:has-text("📋 Inventory List")');
    await expect(page).toHaveURL(/inventory-list\.html/);
    
    // Test navigation to active inventory
    await page.click('a:has-text("✅ Active Stock")');
    await expect(page).toHaveURL(/active-inventory\.html/);
    
    // Test navigation to billing
    await page.click('a:has-text("💰 Billing")');
    await expect(page).toHaveURL(/billing\.html/);
  });
});
