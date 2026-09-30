import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    // Check that the main page heading is present
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    // Check that the site branding is present in the header (no longer an h1)
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    // Check that the welcome message is present using more specific locator
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('should let users filter the catalog by category and publisher', async ({ page }) => {
    const categoryFilter = page.getByTestId('category-filter');
    const publisherFilter = page.getByTestId('publisher-filter');

    await categoryFilter.selectOption({ label: 'Strategy' });
    await expect(page.locator('[data-testid="game-card"]:not([hidden])')).toHaveCount(4);
    await expect(page.getByTestId('results-count')).toContainText('4 games');

    await publisherFilter.selectOption({ label: 'GitHub Games' });
    await expect(page.locator('[data-testid="game-card"]:not([hidden])')).toHaveCount(1);
    await expect(page.getByTestId('results-count')).toContainText('1 game');
    await expect(page.getByRole('link', { name: /Server Siege/i })).toBeVisible();

    await page.getByTestId('clear-filters-button').click();
    await expect(page.locator('[data-testid="game-card"]:not([hidden])')).toHaveCount(21);
  });
});
