import { expect, test } from '@playwright/test';

test('public site renders and signup leads into the protected app', async ({ page }) => {
  const uniqueId = Date.now().toString();

  await page.goto('/');
  await expect(
    page.getByText('Every AI action needs context, permission, and proof.'),
  ).toBeVisible();

  await page.getByRole('link', { name: /start 14-day trial/i }).click();
  await expect(page).toHaveURL(/\/signup$/);

  await page.getByLabel('Workspace name').fill(`E2E Workspace ${uniqueId}`);
  await page.getByLabel('Your name').fill('E2E Owner');
  await page.getByLabel('Work email').fill(`e2e-${uniqueId}@vowgrid.local`);
  await page.getByLabel('Password').fill('e2e_password_123');
  await page.getByRole('button', { name: /create workspace/i }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: /trust workflow queue/i })).toBeVisible();

  await page.goto('/app/settings');
  await expect(page.getByRole('heading', { name: /workspace members/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /workspace api keys/i })).toBeVisible();
});
