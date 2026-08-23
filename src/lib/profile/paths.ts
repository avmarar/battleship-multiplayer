export const ARTIFACTS_COLLECTION =
  process.env.NEXT_PUBLIC_FIREBASE_ARTIFACTS_COLLECTION ?? "artifacts";
export const APP_NAMESPACE =
  process.env.NEXT_PUBLIC_APP_NAMESPACE ?? "dev-squadron-prototype";

export function profileDocPath(uid: string) {
  return `${ARTIFACTS_COLLECTION}/${APP_NAMESPACE}/users/${uid}/data/profile`;
}

export function profileDocSegments(uid: string) {
  return [
    ARTIFACTS_COLLECTION,
    APP_NAMESPACE,
    "users",
    uid,
    "data",
    "profile",
  ] as const;
}
