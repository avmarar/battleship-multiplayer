import { expect, type APIRequestContext, type Page } from "@playwright/test";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "battleship-multiplayer-demo";

const FLEET_ORIGINS = [
  ["CARRIER", "A1"],
  ["BATTLESHIP", "A2"],
  ["CRUISER", "A3"],
  ["SUBMARINE", "A4"],
  ["DESTROYER", "A5"],
] as const;

export async function resetEmulators(request: APIRequestContext) {
  const firestore = await request.delete(
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  );
  const auth = await request.delete(
    `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_ID}/accounts`
  );

  if (!firestore.ok()) {
    throw new Error(`Failed to reset Firestore emulator: ${firestore.status()}`);
  }
  if (!auth.ok()) {
    throw new Error(`Failed to reset Auth emulator: ${auth.status()}`);
  }
}

export async function waitForAnonymousAuth(page: Page) {
  await expect(page.getByTestId("auth-uid")).toBeVisible({ timeout: 20_000 });
}

export async function saveNickname(page: Page, nickname: string) {
  await waitForAnonymousAuth(page);
  const nicknameField = page.getByTestId("profile-nickname");
  await nicknameField.scrollIntoViewIfNeeded();
  await nicknameField.fill("");
  await nicknameField.pressSequentially(nickname, { delay: 20 });
  await expect(nicknameField).toHaveValue(nickname);
  await expect(page.getByTestId("profile-save")).toBeEnabled();
  await page.getByTestId("profile-save").click();
  await expect(page.getByTestId("profile-saved")).toBeVisible({
    timeout: 10_000,
  });
}

function stringValue(value: string) {
  return { stringValue: value };
}

function boolValue(value: boolean) {
  return { booleanValue: value };
}

function timestampValue(date = new Date()) {
  return { timestampValue: date.toISOString() };
}

export async function seedPlacementGame(
  request: APIRequestContext,
  gameId: string,
  alphaUid: string,
  betaUid: string
) {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "battleship-multiplayer-demo";
  const documents = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents`;
  const headers = {
    Authorization: "Bearer owner",
    "Content-Type": "application/json",
  };

  const teamSummary = (uid: string) => ({
    mapValue: {
      fields: {
        captainId: stringValue(uid),
        memberIds: {
          arrayValue: { values: [stringValue(uid)] },
        },
      },
    },
  });

  const gameResponse = await request.post(`${documents}/games?documentId=${gameId}`, {
    headers,
    data: {
      fields: {
        status: stringValue("PLACEMENT"),
        memberIds: {
          arrayValue: { values: [stringValue(alphaUid), stringValue(betaUid)] },
        },
        teams: {
          mapValue: {
            fields: {
              ALPHA: teamSummary(alphaUid),
              BETA: teamSummary(betaUid),
            },
          },
        },
        placement: {
          mapValue: {
            fields: {
              ALPHA: {
                mapValue: { fields: { isLocked: boolValue(false) } },
              },
              BETA: {
                mapValue: { fields: { isLocked: boolValue(false) } },
              },
            },
          },
        },
        createdAt: timestampValue(),
      },
    },
  });
  if (!gameResponse.ok()) {
    throw new Error(`Failed to seed game: ${gameResponse.status()} ${await gameResponse.text()}`);
  }

  for (const [teamId, uid] of [
    ["ALPHA", alphaUid],
    ["BETA", betaUid],
  ] as const) {
    const teamResponse = await request.post(
      `${documents}/games/${gameId}/teams?documentId=${teamId}`,
      {
        headers,
        data: {
          fields: {
            teamId: stringValue(teamId),
            memberIds: {
              arrayValue: { values: [stringValue(uid)] },
            },
            ships: { arrayValue: { values: [] } },
            isLocked: boolValue(false),
            shotsFired: { arrayValue: { values: [] } },
          },
        },
      }
    );
    if (!teamResponse.ok()) {
      throw new Error(
        `Failed to seed team ${teamId}: ${teamResponse.status()} ${await teamResponse.text()}`
      );
    }
  }
}

export async function placeStandardFleet(page: Page) {
  for (const [ship, cell] of FLEET_ORIGINS) {
    await page.getByTestId(`ship-tray-${ship}`).click();
    await page.getByRole("button", { name: `Cell ${cell}`, exact: true }).click();
  }

  await expect(page.getByTestId("fleet-count")).toHaveText("5/5 placed");
}
