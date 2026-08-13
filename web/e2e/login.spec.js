import { test, expect } from '@playwright/test';

test.describe('Login screen (unauthenticated shell)', () => {
  test('boots and shows the login form', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Salon Pro')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('Your password')).toBeVisible();
    await expect(page.getByRole('button', { name: '→ Sign In' })).toBeVisible();
  });

  test('email and password are required before the browser will submit', async ({ page }) => {
    await page.goto('/');

    const emailInput = page.getByPlaceholder('you@example.com');
    const passwordInput = page.getByPlaceholder('Your password');

    await page.getByRole('button', { name: '→ Sign In' }).click();

    // HTML5 required-field validation blocks submission client-side —
    // no network call needed to prove this, and none should happen.
    await expect(emailInput).toHaveJSProperty('validity.valueMissing', true);
    await expect(passwordInput).toHaveJSProperty('validity.valueMissing', true);
  });

  test('password shorter than 8 characters fails the minlength constraint', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder('you@example.com').fill('someone@example.com');
    const passwordInput = page.getByPlaceholder('Your password');
    await passwordInput.fill('short');
    await page.getByRole('button', { name: '→ Sign In' }).click();

    await expect(passwordInput).toHaveJSProperty('validity.tooShort', true);
  });

  test('switching to Register mode reveals the Name field', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByPlaceholder('Your name')).toHaveCount(0);
    await page.getByText('Register').click();
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
    await expect(page.getByRole('button', { name: '→ Create Account' })).toBeVisible();
  });
});
