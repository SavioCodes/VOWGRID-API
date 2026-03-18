import { expect, test } from '@playwright/test';

test('existing users can accept invites into another workspace and switch between memberships', async ({
  browser,
  page,
}) => {
  const uniqueId = Date.now().toString();
  const firstWorkspaceName = `Primary Workspace ${uniqueId}`;
  const secondWorkspaceName = `Secondary Workspace ${uniqueId}`;
  const primaryEmail = `owner-primary-${uniqueId}@vowgrid.local`;
  const secondaryEmail = `owner-secondary-${uniqueId}@vowgrid.local`;

  await page.goto('/signup');
  await page.getByLabel('Workspace name').fill(firstWorkspaceName);
  await page.getByLabel('Your name').fill('Primary Owner');
  await page.getByLabel('Work email').fill(primaryEmail);
  await page.getByLabel('Password').fill('primary_password_123');
  await page.getByRole('button', { name: /create workspace/i }).click();
  await expect(page).toHaveURL(/\/app$/);

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();

  await secondPage.goto('/signup');
  await secondPage.getByLabel('Workspace name').fill(secondWorkspaceName);
  await secondPage.getByLabel('Your name').fill('Secondary Owner');
  await secondPage.getByLabel('Work email').fill(secondaryEmail);
  await secondPage.getByLabel('Password').fill('secondary_password_123');
  await secondPage.getByRole('button', { name: /create workspace/i }).click();
  await expect(secondPage).toHaveURL(/\/app$/);

  await secondPage.goto('/app/settings');
  await expect(secondPage.getByRole('heading', { name: /workspace invitations/i })).toBeVisible();

  await secondPage.getByPlaceholder('invitee@company.com').fill(primaryEmail);
  await secondPage.locator('select[name="role"]').nth(1).selectOption('admin');
  await secondPage.getByRole('button', { name: /send invite/i }).click();

  await expect(secondPage.getByText(/workspace invite created successfully/i)).toBeVisible();
  const inviteUrl = await secondPage.getByTestId('invite-url').textContent();
  expect(inviteUrl).toContain('/accept-invite?token=');

  await page.goto(inviteUrl!.trim());
  await page.getByRole('button', { name: /accept invite/i }).click();
  await expect(page).toHaveURL(/\/app$/);

  await expect(page.getByText(new RegExp(firstWorkspaceName))).toBeVisible();

  const firstWorkspaceButton = page.getByRole('button', { name: new RegExp(firstWorkspaceName) });
  const secondWorkspaceButton = page.getByRole('button', {
    name: new RegExp(secondWorkspaceName),
  });

  await expect(secondWorkspaceButton).toBeDisabled();

  await firstWorkspaceButton.click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(firstWorkspaceButton).toBeDisabled();

  await secondContext.close();
});
