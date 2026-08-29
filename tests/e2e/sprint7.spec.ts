import { expect, test } from "@playwright/test";
import { resetEmulators, waitForAnonymousAuth } from "./helpers";

test.describe("Sprint 7 launch hardening", () => {
  test.beforeEach(async ({ request }) => {
    await resetEmulators(request);
  });

  test("AUTH-2: email register keeps the same UID after reload", async ({
    page,
  }) => {
    await page.goto("/lobby");
    await waitForAnonymousAuth(page);
    const uid = (await page.getByTestId("auth-uid").innerText()).trim();
    const email = `captain-${Date.now()}@example.com`;

    await page.getByTestId("account-menu").click();
    await expect(page.getByTestId("account-panel")).toBeVisible();
    await page.getByTestId("account-email").fill(email);
    await page.getByTestId("account-password").fill("secret1");
    await page.getByTestId("account-register").click();
    await expect(page.getByTestId("app-toast")).toContainText(/account saved/i, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("account-menu")).toContainText(email, {
      timeout: 15_000,
    });

    await page.reload();
    await waitForAnonymousAuth(page);
    await expect(page.getByTestId("auth-uid")).toHaveText(uid);
    await expect(page.getByTestId("account-menu")).toContainText(email);
  });

  test("UX-1: hub leads with Quick Play and Invite, not a dev link", async ({
    page,
  }) => {
    await page.goto("/");
    const quickPlay = page.getByTestId("hub-quick-play");
    await expect(quickPlay).toBeVisible();
    await expect(quickPlay).toContainText("Quick Play");
    await expect(quickPlay).not.toHaveText(/dev/i);
    await expect(page.getByTestId("start-1v1")).toBeVisible();
    await expect(page.getByTestId("start-multiplayer")).toBeVisible();
  });

  test("UX-ERR: disband uses an in-app confirm instead of window.confirm", async ({
    page,
  }) => {
    await page.goto("/lobby?mode=1v1");
    await waitForAnonymousAuth(page);
    await page.getByTestId("create-lobby").click();
    await expect(page.getByTestId("match-code")).toBeVisible();

    let nativeConfirm = false;
    page.on("dialog", (dialog) => {
      nativeConfirm = true;
      void dialog.dismiss();
    });

    await page.getByTestId("disband-match").click();
    expect(nativeConfirm).toBeFalsy();
    const dialog = page.locator("[data-testid='confirm-dialog'], [data-testid='confirm-modal']");
    await expect(dialog).toBeVisible();
    const cancelBtn = page.locator("[data-testid='confirm-cancel'], [data-testid='confirm-modal-cancel']");
    await cancelBtn.click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId("match-code")).toBeVisible();
  });
});
