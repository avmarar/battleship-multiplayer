import { expect, test } from "@playwright/test";
import {
  placeStandardFleet,
  resetEmulators,
  seedPlacementGame,
} from "./helpers";

test.describe("QA-3.1 Quick Play placement lock", () => {
  test.beforeEach(async ({ request }) => {
    await resetEmulators(request);
  });

  test("two clients place fleets and lock into the waiting screen", async ({
    browser,
    request,
  }) => {
    const alphaContext = await browser.newContext();
    const betaContext = await browser.newContext();
    const alpha = await alphaContext.newPage();
    const beta = await betaContext.newPage();

    try {
      await Promise.all([
        alpha.goto("/placement"),
        beta.goto("/placement"),
      ]);
      await expect(alpha.getByTestId("auth-uid")).toBeVisible({ timeout: 20_000 });
      await expect(beta.getByTestId("auth-uid")).toBeVisible({ timeout: 20_000 });

      const alphaUid = (await alpha.getByTestId("auth-uid").innerText()).trim();
      const betaUid = (await beta.getByTestId("auth-uid").innerText()).trim();
      expect(alphaUid).not.toEqual(betaUid);

      await seedPlacementGame(request, "e2e-placement", alphaUid, betaUid);

      await Promise.all([
        alpha.goto("/placement?gameId=e2e-placement"),
        beta.goto("/placement?gameId=e2e-placement"),
      ]);

      await expect(alpha.getByText(/TEAM (ALPHA|BETA)/i)).toBeVisible({ timeout: 20_000 });
      await expect(beta.getByText(/TEAM (ALPHA|BETA)/i)).toBeVisible({ timeout: 20_000 });

      const alphaTeam = await alpha.getByText(/TEAM (ALPHA|BETA)/i).innerText();
      const betaTeam = await beta.getByText(/TEAM (ALPHA|BETA)/i).innerText();
      expect(alphaTeam).not.toEqual(betaTeam);

      await placeStandardFleet(alpha);
      await placeStandardFleet(beta);

      await alpha.getByTestId("lock-placement").click();
      await expect(alpha.getByTestId("lock-placement")).toContainText(
        /Placement Locked/i
      );
      await expect(beta.getByText(/LOCKED & ARMED|Opponent Ready/i)).toBeVisible({
        timeout: 10_000,
      });

      await beta.getByTestId("lock-placement").click();

      await expect(alpha).toHaveURL(/\/game\?gameId=e2e-placement/, {
        timeout: 15_000,
      });
      await expect(beta).toHaveURL(/\/game\?gameId=e2e-placement/, {
        timeout: 15_000,
      });
      await expect(alpha.getByTestId("battle-workspace")).toBeVisible();
      await expect(beta.getByTestId("battle-workspace")).toBeVisible();
    } finally {
      await alphaContext.close();
      await betaContext.close();
    }
  });
});
