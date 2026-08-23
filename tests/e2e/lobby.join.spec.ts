import { expect, test } from "@playwright/test";
import { resetEmulators, waitForAnonymousAuth } from "./helpers";

test.describe("QA-1.2 match create and join", () => {
  test.beforeEach(async ({ request }) => {
    await resetEmulators(request);
  });

  test("1v1: host create → beta joins match code → dual ready → start", async ({
    browser,
  }) => {
    const hostContext = await browser.newContext();
    const peerContext = await browser.newContext();
    const host = await hostContext.newPage();
    const peer = await peerContext.newPage();

    try {
      await host.goto("/lobby?mode=1v1");
      await waitForAnonymousAuth(host);
      await host.getByTestId("mode-1v1").click();
      await host.getByTestId("create-lobby").click();
      await expect(host.getByTestId("match-code")).toHaveText(/^[A-Z0-9]{6}$/);
      await expect(host.getByTestId("match-mode")).toHaveText("1v1");
      await expect(host.getByTestId("captain-status")).toHaveText(
        "Awaiting Beta captain"
      );
      await expect(host.getByTestId("crew-invite-code")).toHaveCount(0);

      const matchCode = (await host.getByTestId("match-code").innerText()).trim();

      await peer.goto("/lobby?mode=1v1");
      await waitForAnonymousAuth(peer);
      await peer.getByTestId("join-code-input").fill(matchCode);
      await peer.getByTestId("join-lobby").click();

      await expect(host.getByTestId("captain-status")).toHaveText(
        "Alpha + Beta captains",
        { timeout: 15_000 }
      );
      await expect(peer.getByTestId("match-code")).toHaveText(matchCode);
      await expect(peer.getByText("Captain · BETA · You")).toBeVisible();

      await expect(host.getByTestId("start-placement")).toBeDisabled();
      await host.getByTestId("toggle-ready").click();
      await peer.getByTestId("toggle-ready").click();
      await expect(host.getByTestId("ready-count")).toHaveText("Ready 2/2");
      await expect(host.getByTestId("start-placement")).toBeEnabled();
      await host.getByTestId("start-placement").click();
      await expect(host).toHaveURL(/\/placement\?gameId=/);
      await expect(peer).toHaveURL(/\/placement\?gameId=/, { timeout: 15_000 });
      const hostGameId = new URL(host.url()).searchParams.get("gameId");
      const peerGameId = new URL(peer.url()).searchParams.get("gameId");
      expect(hostGameId).toBeTruthy();
      expect(peerGameId).toBe(hostGameId);
    } finally {
      await hostContext.close();
      await peerContext.close();
    }
  });
});
