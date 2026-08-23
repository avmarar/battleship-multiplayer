import { expect, test } from "@playwright/test";
import { resetEmulators, saveNickname, waitForAnonymousAuth } from "./helpers";

test.describe("QA-1 / AUTH-1.3 / DP-2.3 smoke", () => {
  test.beforeEach(async ({ request }) => {
    await resetEmulators(request);
  });

  test("anonymous sign-in writes a profile and the snapshot updates the UI", async ({
    page,
  }) => {
    await page.goto("/lobby");
    await waitForAnonymousAuth(page);

    const uid = await page.getByTestId("auth-uid").innerText();
    expect(uid.length).toBeGreaterThan(8);

    await saveNickname(page, "Captain Aurora");
    await expect(page.getByTestId("profile-nickname")).toHaveValue(
      "Captain Aurora"
    );

    await page.reload();
    await waitForAnonymousAuth(page);
    await expect(page.getByTestId("profile-nickname")).toHaveValue(
      "Captain Aurora",
      { timeout: 10_000 }
    );
  });
});
