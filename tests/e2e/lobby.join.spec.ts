import { expect, test } from "@playwright/test";
import { resetEmulators, waitForAnonymousAuth } from "./helpers";

test.describe("QA-1.2 lobby create and join", () => {
  test.beforeEach(async ({ request }) => {
    await resetEmulators(request);
  });

  test("auth → create lobby → join request → captain approval", async ({
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
      await expect(captain.getByTestId("lobby-member-count")).toHaveText(
        "Members 1/8"
      );

      const inviteCode = (await captain.getByTestId("invite-code").innerText()).trim();

      await crew.goto("/lobby");
      await waitForAnonymousAuth(crew);
      await crew.getByTestId("join-code-input").fill(inviteCode);
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
    } finally {
      await captainContext.close();
      await crewContext.close();
    }
  });
});
