import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'mobile-small', width: 320, height: 720 },
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`keeps the login form usable at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/login');

    const intro = page.locator('.login-intro');
    const card = page.locator('.login-card');
    const email = page.getByLabel('E-mail');
    const password = page.getByLabel('Senha');
    const submit = page.getByRole('button', { name: 'Entrar no TaskPlan' });

    await expect(intro).toBeVisible();
    await expect(card).toBeVisible();
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(submit).toBeVisible();
    await submit.scrollIntoViewIfNeeded();

    const [introBox, cardBox, emailBox, passwordBox, submitBox, scrollWidth] = await Promise.all([
      intro.boundingBox(),
      card.boundingBox(),
      email.boundingBox(),
      password.boundingBox(),
      submit.boundingBox(),
      page.evaluate(() => document.documentElement.scrollWidth),
    ]);

    expect(introBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(emailBox).not.toBeNull();
    expect(passwordBox).not.toBeNull();
    expect(submitBox).not.toBeNull();
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1);

    for (const control of [emailBox!, passwordBox!, submitBox!]) {
      expect(control.x).toBeGreaterThanOrEqual(0);
      expect(control.x + control.width).toBeLessThanOrEqual(viewport.width + 1);
    }

    if (viewport.width <= 760) {
      expect(cardBox!.y).toBeGreaterThanOrEqual(introBox!.y + introBox!.height - 1);
    } else {
      expect(cardBox!.x).toBeGreaterThanOrEqual(introBox!.x + introBox!.width - 1);
    }
  });
}
