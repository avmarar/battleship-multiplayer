import type { AccountType } from "@/lib/profile/accountType";

export function isRegisteredAccountType(
  accountType: AccountType | string | undefined
) {
  return accountType === "registered";
}

export function matchIsRanked(
  members: Array<{ accountType?: AccountType | string } | undefined>
) {
  return (
    members.length > 0 &&
    members.every((member) => isRegisteredAccountType(member?.accountType))
  );
}
