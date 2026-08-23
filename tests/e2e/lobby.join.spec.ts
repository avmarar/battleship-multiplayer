import { expect, test } from "@playwright/test";
import { resetEmulators, waitForAnonymousAuth } from "./helpers";

test.describe("QA-1.2 lobby create and join", () => {
  test.beforeEach(async ({ request }) => {
    await resetEmulators(request);
  });

  test("auth → create lobby → Beta captain → dual ready → start", async ({
    browser,
  }) => {
    const captainContext = await browser.newContext();
    const crewContext = await browser.newContext();
    const captain = await captainContext.newPage();
    const crew = await crewContext.newPage();

    try {
      await captain.goto("/lobby");
      await waitForAnonymousAuth(captain);
      await captain.getByTestId("create-lobby").click();
      await expect(captain.getByTestId("invite-code")).toHaveText(/^[A-Z0-9]{6}$/);
      await expect(captain.getByTestId("invite-code-beta")).toHaveText(
        /^[A-Z0-9]{6}$/
      );
      await expect(captain.getByTestId("lobby-member-count")).toHaveText(
        "Members 1/8"
      );
      await expect(captain.getByTestId("captain-status")).toHaveText(
        "Awaiting Beta captain"
      );

      const inviteCode = (await captain.getByTestId("invite-code").innerText()).trim();
      const betaCode = (
        await captain.getByTestId("invite-code-beta").innerText()
      ).trim();
      expect(inviteCode).not.toBe(betaCode);

      await crew.goto("/lobby");
      await waitForAnonymousAuth(crew);
      await crew.getByTestId("join-code-input").fill(betaCode);
      await crew.getByTestId("join-lobby").click();
      await expect(crew.getByTestId("join-request-status")).toHaveText("PENDING");

      await captain.reload();
      await waitForAnonymousAuth(captain);
      await expect(captain.getByRole("button", { name: "Approve" })).toBeVisible({
        timeout: 15_000,
      });
      await captain.getByRole("button", { name: "Approve" }).click();

      await expect(captain.getByTestId("lobby-member-count")).toHaveText(
        "Members 2/8"
      );
      await expect(crew.getByTestId("lobby-member-count")).toHaveText(
        "Members 2/8"
      );
      await expect(crew.getByTestId("join-request-status")).toHaveText("APPROVED");
      await expect(captain.getByTestId("captain-status")).toHaveText(
        "Alpha + Beta captains"
      );
      await expect(crew.getByText("Captain · BETA · You")).toBeVisible();

      await expect(captain.getByTestId("start-placement")).toBeDisabled();
      await captain.getByTestId("toggle-ready").click();
      await crew.getByTestId("toggle-ready").click();
      await expect(captain.getByTestId("ready-count")).toHaveText("Ready 2/2");
      await expect(captain.getByTestId("start-placement")).toBeEnabled();
      await captain.getByTestId("start-placement").click();
      await expect(captain).toHaveURL(/\/placement\?gameId=/);
      await expect(crew).toHaveURL(/\/placement\?gameId=/, { timeout: 15_000 });
      const captainGameId = new URL(captain.url()).searchParams.get("gameId");
      const crewGameId = new URL(crew.url()).searchParams.get("gameId");
      expect(captainGameId).toBeTruthy();
      expect(crewGameId).toBe(captainGameId);
    } finally {
      await captainContext.close();
      await crewContext.close();
    }
  });
});
