# 🧪 Automated Testing for Ruby Auto Parts Inventory System

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
```bash
# Run all tests
npm test

# Run tests with UI (interactive)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Debug tests
npm run test:debug
```

## 📋 Test Coverage

### Navigation Tests (`navigation.spec.js`)
- ✅ Consistent navigation buttons on all pages
- ✅ Correct button order and count
- ✅ Navigation between pages works

### Inventory Tests (`inventory.spec.js`)
- ✅ Inventory list page loads correctly
- ✅ Product addition form works
- ✅ Search functionality works

### Billing Tests (`billing.spec.js`)
- ✅ Billing page loads correctly
- ✅ Customer information form works
- ✅ Product addition via barcode works

### Audit Tests (`audit.spec.js`)
- ✅ Audit page loads correctly
- ✅ Barcode scanning works
- ✅ Clear results functionality works

## 🎯 What These Tests Do

These tests **replicate human manual testing** by:

1. **Opening each page** automatically
2. **Filling out forms** with test data
3. **Clicking buttons** and links
4. **Verifying** that elements appear and work correctly
5. **Checking** for error messages and success states
6. **Testing** navigation between pages

## 🔧 Customizing Tests

### Adding New Tests
1. Create a new `.spec.js` file in the `tests/` folder
2. Use Playwright's API to interact with your app
3. Run `npm test` to execute

### Example Test Structure
```javascript
const { test, expect } = require('@playwright/test');

test('your test name', async ({ page }) => {
  await page.goto('/your-page.html');
  await page.click('button');
  await expect(page.locator('element')).toBeVisible();
});
```

## 📊 Test Reports

After running tests, you'll get:
- **HTML Report** - Detailed test results with screenshots
- **Console Output** - Real-time test progress
- **Screenshots** - On test failures
- **Videos** - On test failures (if enabled)

## 🐛 Debugging Failed Tests

1. Run `npm run test:debug` to step through tests
2. Check the HTML report for detailed failure information
3. Look at screenshots and videos of failed tests
4. Use `page.pause()` in your test code to debug interactively

## 🚀 Continuous Integration

These tests can be integrated into:
- **GitHub Actions**
- **GitLab CI**
- **Jenkins**
- **Azure DevOps**

Just add the test commands to your CI pipeline!
