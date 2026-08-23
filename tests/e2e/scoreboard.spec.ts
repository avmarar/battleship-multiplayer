import { expect, test } from "@playwright/test";
import { resetEmulators, seedLeaderboardEntry, seedPlacementGame } from "./helpers";

test.describe("QA-4 leaderboard and reconnect", () => {
  test.beforeEach(async ({ request }) => {
    await resetEmulators(request);
  });

  test("shows authenticated standings and sort controls", async ({
    page,
    request,
  }) => {
    await seedLeaderboardEntry(request, "uid-alpha", {
      nickname: "Aurora",
      wins: 4,
      losses: 1,
      lastPlayedAt: new Date("2026-01-01T00:00:00Z"),
    });
    await seedLeaderboardEntry(request, "uid-beta", {
      nickname: "Bravo",
      wins: 2,
      losses: 0,
      lastPlayedAt: new Date("2026-06-01T00:00:00Z"),
    });

    await page.goto("/scoreboard");
    await expect(page.getByTestId("scoreboard-workspace")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("leaderboard-row-uid-alpha")).toBeVisible();
    await expect(page.getByTestId("leaderboard-row-uid-beta")).toBeVisible();

    await page.getByTestId("sort-wins").click();
    const rows = page.locator("tbody tr");
    await expect(rows.nth(0)).toContainText("Aurora");
    await page.getByTestId("sort-winPct").click();
    await expect(rows.nth(0)).toContainText("Bravo");
  });

  test("offers resume when an in-progress game exists", async ({
    page,
    request,
  }) => {
    await page.goto("/placement");
    await expect(page.getByTestId("auth-uid")).toBeVisible({ timeout: 20_000 });
    const uid = (await page.getByTestId("auth-uid").innerText()).trim();
    await seedPlacementGame(request, "e2e-resume", uid, "opponent-uid");

    await page.goto("/");
    await expect(page.getByTestId("resume-match")).toBeVisible({
      timeout: 20_000,
    });
    await page.getByTestId("resume-match-link").click();
    await expect(page).toHaveURL(/\/placement\?gameId=e2e-resume/);
  });
});
