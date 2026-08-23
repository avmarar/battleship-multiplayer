"use client";

import { useEffect, useState } from "react";
import { doc, type Firestore, onSnapshot } from "firebase/firestore";
import { PRESENCE_COLLECTION, type PresenceDocument } from "./types";

export function usePresenceDoc(
  db: Firestore | null,
  uid: string | null | undefined
) {
  const [presence, setPresence] = useState<{
    uid: string;
    data: PresenceDocument | null;
  } | null>(null);

  useEffect(() => {
    if (!db || !uid) {
      return;
    }
    return onSnapshot(doc(db, PRESENCE_COLLECTION, uid), (snapshot) => {
      setPresence({
        uid,
        data: snapshot.exists()
          ? (snapshot.data() as PresenceDocument)
          : null,
      });
    });
  }, [db, uid]);

  if (!uid || presence?.uid !== uid) {
    return null;
  }
  return presence.data;
}
