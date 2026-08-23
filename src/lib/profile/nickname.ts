export function guestNickname(uid: string) {
  return `Guest-${uid.slice(0, 4).toUpperCase()}`;
}
