import { expect, test } from '@playwright/test';

test('forgot password flow shows a real recovery acknowledgement', async ({ page }) => {
  const uniqueId = Date.now().toString();

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(`reset-${uniqueId}@vowgrid.local`);
  await page.getByRole('button', { name: /send reset link/i }).click();

  await expect(page.getByText(/if the account exists, a reset link has been sent/i)).toBeVisible();
});
