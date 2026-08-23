"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  ensureAnonymousSignIn,
  getFirebaseAuth,
  getFirestoreDb,
  isFirebaseReady,
} from "@/lib/firebase/client";
import { startMatchGame } from "@/lib/games/startMatchGame";
import { upsertLeaderboardNickname } from "@/lib/leaderboard/upsertNickname";
import { handoverMatchCaptain, electLongestTenured } from "@/lib/matches/handover";
import { canHandoverCaptain } from "@/lib/presence/stale";
import { usePresence } from "@/lib/presence/usePresence";
import { usePresenceDoc } from "@/lib/presence/usePresenceDoc";
import { createMatch } from "@/lib/matches/createMatch";
import {
  approveCrewJoin,
  findMatchByMatchCode,
  findTeamByCrewInvite,
  joinAsBetaCaptain,
  rejectCrewJoin,
  submitCrewJoinRequest,
} from "@/lib/matches/join";
import { normalizeMatchCode } from "@/lib/matches/codes";
import { bothCaptainsSeated, canStartMatch } from "@/lib/matches/ready";
import {
  MATCH_JOIN_REQUESTS_COLLECTION,
  MATCH_TEAMS_COLLECTION,
  MATCHES_COLLECTION,
  type MatchDocument,
  type MatchJoinRequest,
  type MatchMode,
  type MatchTeamDocument,
  type MatchTeamId,
} from "@/lib/matches/types";
import { ActiveLobbyPanel } from "./components/ActiveLobbyPanel";
import { JoinAndCreateColumn } from "./components/JoinAndCreateColumn";
import { ProfileFormCard } from "./components/ProfileFormCard";
import type {
  AuthState,
  JoinRequestWithPath,
  MatchSnapshot,
  MatchTeamSnapshot,
  ProfileDocument,
} from "./types";

const artifactsCollection =
  process.env.NEXT_PUBLIC_FIREBASE_ARTIFACTS_COLLECTION ?? "artifacts";
const namespace =
  process.env.NEXT_PUBLIC_APP_NAMESPACE ?? "dev-squadron-prototype";
const defaultStatusMessage = "Awaiting fleet orders.";
const PENDING_JOIN_PATH_KEY = "battleship.pendingJoinPath";

function parseMode(value: string | null): MatchMode {
  return value === "MULTIPLAYER" ? "MULTIPLAYER" : "1v1";
}

function readPendingJoinPath(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(PENDING_JOIN_PATH_KEY);
  } catch {
    return null;
  }
}

function writePendingJoinPath(path: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (path) {
      window.localStorage.setItem(PENDING_JOIN_PATH_KEY, path);
    } else {
      window.localStorage.removeItem(PENDING_JOIN_PATH_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

export function LobbyPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firebaseAvailable = isFirebaseReady();
  const firebaseAuth = firebaseAvailable ? getFirebaseAuth() : null;
  const firestoreDb = firebaseAvailable ? getFirestoreDb() : null;
  const [authState, setAuthState] = useState<AuthState>(
    !firebaseAvailable
      ? {
          status: "error",
          message:
            "Firebase environment variables are missing. Populate .env.local.",
        }
      : !firebaseAuth
        ? { status: "error", message: "Firebase Auth failed to initialize." }
        : { status: "checking" }
  );
  const [profile, setProfile] = useState<ProfileDocument | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [statusInput, setStatusInput] = useState(defaultStatusMessage);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const hydrateFormRef = useRef(false);
  const [mode, setMode] = useState<MatchMode>(() =>
    parseMode(searchParams.get("mode"))
  );
  const [createMatchState, setCreateMatchState] = useState<
    "idle" | "creating"
  >("idle");
  const [createMatchError, setCreateMatchError] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<MatchSnapshot | null>(null);
  const [alphaTeam, setAlphaTeam] = useState<MatchTeamSnapshot | null>(null);
  const [betaTeam, setBetaTeam] = useState<MatchTeamSnapshot | null>(null);
  const [lobbyActionMessage, setLobbyActionMessage] = useState<string | null>(
    null
  );
  const [lobbyActionError, setLobbyActionError] = useState<string | null>(null);
  const [pendingJoinPath, setPendingJoinPath] = useState<string | null>(null);
  const [pendingJoinRequest, setPendingJoinRequest] =
    useState<JoinRequestWithPath | null>(null);
  const [captainJoinRequests, setCaptainJoinRequests] = useState<
    JoinRequestWithPath[]
  >([]);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinFlowState, setJoinFlowState] = useState<"idle" | "submitting">(
    "idle"
  );
  const [joinFlowError, setJoinFlowError] = useState<string | null>(null);
  const [joinFlowMessage, setJoinFlowMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(parseMode(searchParams.get("mode")));
  }, [searchParams]);

  useEffect(() => {
    if (!firebaseAuth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        if (user) {
          setAuthState({ status: "connected", uid: user.uid });
        } else {
          setAuthState({ status: "checking" });
        }
      },
      (error) => {
        setAuthState({ status: "error", message: error.message });
      }
    );

    if (!firebaseAuth.currentUser) {
      ensureAnonymousSignIn(firebaseAuth).catch((error) =>
        setAuthState({
          status: "error",
          message:
            error instanceof Error ? error.message : "Anonymous sign-in failed.",
        })
      );
    }

    return () => unsubscribe();
  }, [firebaseAuth]);

  const connectedUid = authState.status === "connected" ? authState.uid : null;
  const shouldSubscribeToProfile = firebaseAvailable && !!connectedUid;
  const [nowMs, setNowMs] = useState(() => Date.now());

  usePresence({
    db: firestoreDb,
    uid: connectedUid,
    matchId: activeMatch?.id ?? null,
    gameId: activeMatch?.gameId ?? null,
  });

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 5000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!shouldSubscribeToProfile || !connectedUid || !firestoreDb) {
      return;
    }

    const profileDocRef = doc(
      firestoreDb,
      artifactsCollection,
      namespace,
      "users",
      connectedUid,
      "data",
      "profile"
    );

    const unsubscribe = onSnapshot(
      profileDocRef,
      (snapshot) => {
        setProfileError(null);
        if (snapshot.exists()) {
          const data = snapshot.data() as ProfileDocument;
          setProfile(data);
          if (!hydrateFormRef.current) {
            setNicknameInput(data.nickname ?? "");
            setStatusInput(data.statusMessage ?? defaultStatusMessage);
            hydrateFormRef.current = true;
          }
        } else {
          setProfile(null);
          if (!hydrateFormRef.current) {
            setNicknameInput("");
            setStatusInput(defaultStatusMessage);
          }
        }
      },
      (error) => setProfileError(error.message)
    );

    return () => unsubscribe();
  }, [shouldSubscribeToProfile, connectedUid, firestoreDb]);

  useEffect(() => {
    if (!shouldSubscribeToProfile) {
      hydrateFormRef.current = false;
    }
  }, [shouldSubscribeToProfile]);

  useEffect(() => {
    if (!firestoreDb || !connectedUid) {
      setActiveMatch(null);
      return;
    }

    const membershipQuery = query(
      collection(firestoreDb, MATCHES_COLLECTION),
      where("memberIds", "array-contains", connectedUid),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      membershipQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setActiveMatch(null);
          return;
        }

        const docSnapshot = snapshot.docs[0];
        const data = docSnapshot.data() as MatchDocument;
        setActiveMatch((previous) => {
          const next: MatchSnapshot = { ...data, id: docSnapshot.id };
          if (
            previous &&
            previous.id === next.id &&
            previous.status === next.status &&
            previous.mode === next.mode &&
            previous.matchCode === next.matchCode &&
            previous.captainIdAlpha === next.captainIdAlpha &&
            previous.captainIdBeta === next.captainIdBeta &&
            previous.gameId === next.gameId &&
            previous.memberIds.join(",") === next.memberIds.join(",")
          ) {
            return previous;
          }
          return next;
        });
      },
      (error) => setLobbyActionError(error.message)
    );

    return () => unsubscribe();
  }, [firestoreDb, connectedUid]);

  useEffect(() => {
    if (!firestoreDb || !activeMatch?.id) {
      setAlphaTeam(null);
      setBetaTeam(null);
      return;
    }

    const teamsRef = collection(
      firestoreDb,
      MATCHES_COLLECTION,
      activeMatch.id,
      MATCH_TEAMS_COLLECTION
    );

    const unsubscribe = onSnapshot(
      teamsRef,
      (snapshot) => {
        let nextAlpha: MatchTeamSnapshot | null = null;
        let nextBeta: MatchTeamSnapshot | null = null;
        snapshot.docs.forEach((docSnapshot) => {
          const data = {
            ...(docSnapshot.data() as MatchTeamDocument),
            id: docSnapshot.id as MatchTeamId,
          };
          if (docSnapshot.id === "ALPHA") {
            nextAlpha = data;
          }
          if (docSnapshot.id === "BETA") {
            nextBeta = data;
          }
        });
        setAlphaTeam(nextAlpha);
        setBetaTeam(nextBeta);
      },
      (error) => setLobbyActionError(error.message)
    );

    return () => unsubscribe();
  }, [firestoreDb, activeMatch?.id]);

  useEffect(() => {
    setPendingJoinPath(readPendingJoinPath());
  }, []);

  useEffect(() => {
    if (!firestoreDb || !connectedUid || !pendingJoinPath) {
      if (!pendingJoinPath) {
        setPendingJoinRequest(null);
      }
      return;
    }

    const requestRef = doc(firestoreDb, pendingJoinPath);
    const unsubscribe = onSnapshot(
      requestRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setPendingJoinRequest(null);
          writePendingJoinPath(null);
          setPendingJoinPath(null);
          return;
        }

        const data = snapshot.data() as MatchJoinRequest;
        if (data.userId && data.userId !== connectedUid) {
          setPendingJoinRequest(null);
          return;
        }

        setPendingJoinRequest({
          ...data,
          id: snapshot.id,
          path: snapshot.ref.path,
        });
      },
      (error) => setJoinFlowError(error.message)
    );

    return () => unsubscribe();
  }, [firestoreDb, connectedUid, pendingJoinPath]);

  const isAlphaCaptain =
    !!activeMatch && activeMatch.captainIdAlpha === connectedUid;
  const isBetaCaptain =
    !!activeMatch && activeMatch.captainIdBeta === connectedUid;
  const myTeamId: MatchTeamId | null = isAlphaCaptain
    ? "ALPHA"
    : isBetaCaptain
      ? "BETA"
      : alphaTeam?.memberIds.includes(connectedUid ?? "")
        ? "ALPHA"
        : betaTeam?.memberIds.includes(connectedUid ?? "")
          ? "BETA"
          : null;
  const isTeamCaptain = isAlphaCaptain || isBetaCaptain;
  const myTeamDoc =
    myTeamId === "ALPHA" ? alphaTeam : myTeamId === "BETA" ? betaTeam : null;
  const teamCaptainId =
    myTeamId === "ALPHA"
      ? activeMatch?.captainIdAlpha
      : myTeamId === "BETA"
        ? activeMatch?.captainIdBeta
        : undefined;
  const captainPresence = usePresenceDoc(
    firestoreDb,
    teamCaptainId && teamCaptainId !== connectedUid ? teamCaptainId : null
  );
  const canTakeCommand = Boolean(
    activeMatch &&
      myTeamId &&
      connectedUid &&
      teamCaptainId &&
      teamCaptainId !== connectedUid &&
      myTeamDoc &&
      canHandoverCaptain(captainPresence, nowMs) &&
      electLongestTenured(myTeamDoc.members, teamCaptainId) === connectedUid
  );

  useEffect(() => {
    if (
      !firestoreDb ||
      !activeMatch?.id ||
      !isTeamCaptain ||
      !myTeamId ||
      activeMatch.mode !== "MULTIPLAYER"
    ) {
      setCaptainJoinRequests([]);
      return;
    }

    const requestsRef = collection(
      firestoreDb,
      MATCHES_COLLECTION,
      activeMatch.id,
      MATCH_TEAMS_COLLECTION,
      myTeamId,
      MATCH_JOIN_REQUESTS_COLLECTION
    );

    const unsubscribe = onSnapshot(
      requestsRef,
      (snapshot) => {
        const requests = snapshot.docs
          .map((docSnapshot) => ({
            ...(docSnapshot.data() as MatchJoinRequest),
            id: docSnapshot.id,
          }))
          .sort((a, b) => {
            const aTime =
              a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
            const bTime =
              b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
            return aTime - bTime;
          });
        setCaptainJoinRequests(requests);
      },
      (error) => {
        console.warn("captain joinRequests listener", error.message);
        setCaptainJoinRequests([]);
      }
    );

    return () => unsubscribe();
  }, [
    firestoreDb,
    activeMatch?.id,
    activeMatch?.mode,
    connectedUid,
    isTeamCaptain,
    myTeamId,
  ]);

  useEffect(() => {
    if (!activeMatch?.gameId) {
      return;
    }
    router.push(`/placement?gameId=${activeMatch.gameId}`);
  }, [activeMatch?.gameId, router]);

  const visibleProfile = shouldSubscribeToProfile ? profile : null;
  const derivedProfileError =
    !firestoreDb && shouldSubscribeToProfile
      ? "Firestore is unavailable. Check configuration."
      : profileError;
  const canCreateMatch =
    !!firestoreDb &&
    authState.status === "connected" &&
    !activeMatch &&
    pendingJoinRequest?.status !== "PENDING";
  const canJoinMatch =
    authState.status === "connected" &&
    !activeMatch &&
    pendingJoinRequest?.status !== "PENDING";
  const canSubmitProfile =
    firebaseAvailable && authState.status === "connected";

  const nicknameForActions =
    visibleProfile?.nickname || nicknameInput.trim() || "Fleet Member";

  const handleCreateMatch = async () => {
    const uid = connectedUid;
    if (!firestoreDb || !uid) {
      setCreateMatchError("Connect to Firebase before creating a match.");
      return;
    }

    if (activeMatch) {
      setCreateMatchError("Leave your current match before creating a new one.");
      return;
    }

    setCreateMatchState("creating");
    setCreateMatchError(null);
    setLobbyActionMessage(null);
    setLobbyActionError(null);

    try {
      const { matchCode } = await createMatch(firestoreDb, {
        uid,
        nickname: nicknameForActions,
        mode,
      });
      setLobbyActionMessage(
        mode === "1v1"
          ? `1v1 match created. Share code ${matchCode} with your opponent.`
          : `Multiplayer match created. Share code ${matchCode} with the opposing captain.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create match. Try again.";
      setCreateMatchError(message);
    } finally {
      setCreateMatchState("idle");
    }
  };

  const handleJoinMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const uid = connectedUid;
    if (!firestoreDb || !uid) {
      setJoinFlowError("Connect to Firebase before joining.");
      return;
    }

    if (activeMatch) {
      setJoinFlowError("You are already in a match.");
      return;
    }

    if (pendingJoinRequest && pendingJoinRequest.status === "PENDING") {
      setJoinFlowError("You already have a pending join request.");
      return;
    }

    const cleanedCode = normalizeMatchCode(joinCodeInput);
    if (cleanedCode.length !== 6) {
      setJoinFlowError("Enter a valid 6-character code.");
      return;
    }

    setJoinFlowState("submitting");
    setJoinFlowError(null);
    setJoinFlowMessage(null);

    try {
      const asMatch = await findMatchByMatchCode(firestoreDb, cleanedCode);
      if (asMatch) {
        await joinAsBetaCaptain(firestoreDb, {
          code: cleanedCode,
          uid,
          nickname: nicknameForActions,
        });
        setJoinFlowMessage("Joined as Beta captain.");
        return;
      }

      const asCrew = await findTeamByCrewInvite(firestoreDb, cleanedCode);
      if (!asCrew) {
        throw new Error("Code not found. Check the match or crew invite.");
      }

      await submitCrewJoinRequest(firestoreDb, {
        code: cleanedCode,
        uid,
        nickname: nicknameForActions,
      });
      const path = `${MATCHES_COLLECTION}/${asCrew.matchId}/${MATCH_TEAMS_COLLECTION}/${asCrew.teamId}/${MATCH_JOIN_REQUESTS_COLLECTION}/${uid}`;
      writePendingJoinPath(path);
      setPendingJoinPath(path);
      setJoinFlowMessage(
        "Crew join request sent. Your team captain will approve shortly."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to join.";
      setJoinFlowError(message);
    } finally {
      setJoinFlowState("idle");
    }
  };

  const handleCancelJoinRequest = async () => {
    if (!firestoreDb || !pendingJoinRequest?.path) {
      return;
    }

    try {
      await deleteDoc(doc(firestoreDb, pendingJoinRequest.path));
      setPendingJoinRequest(null);
      writePendingJoinPath(null);
      setPendingJoinPath(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to cancel join request.";
      setJoinFlowError(message);
    }
  };

  const handleToggleReady = async () => {
    if (!firestoreDb || !activeMatch || !connectedUid || !myTeamId) {
      return;
    }

    const team = myTeamId === "ALPHA" ? alphaTeam : betaTeam;
    const currentMember = team?.members?.[connectedUid];
    if (!currentMember || activeMatch.status !== "LOBBY") {
      return;
    }

    setLobbyActionError(null);
    try {
      await updateDoc(
        doc(
          firestoreDb,
          MATCHES_COLLECTION,
          activeMatch.id,
          MATCH_TEAMS_COLLECTION,
          myTeamId
        ),
        {
          [`members.${connectedUid}.isReady`]: !currentMember.isReady,
        }
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update ready state.";
      setLobbyActionError(message);
    }
  };

  const handleStartPlacement = async () => {
    if (
      !firestoreDb ||
      !activeMatch ||
      !isAlphaCaptain ||
      !alphaTeam ||
      !betaTeam
    ) {
      return;
    }

    if (!canStartMatch(activeMatch, alphaTeam, betaTeam)) {
      setLobbyActionError(
        bothCaptainsSeated(activeMatch)
          ? "Both teams must be fully ready before starting placement."
          : "Wait for the Beta captain to join before starting."
      );
      return;
    }

    setLobbyActionError(null);
    try {
      const { gameId } = await startMatchGame(
        firestoreDb,
        activeMatch.id,
        activeMatch,
        alphaTeam,
        betaTeam
      );
      setLobbyActionMessage("Match created. Opening placement…");
      router.push(`/placement?gameId=${gameId}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start placement.";
      setLobbyActionError(message);
    }
  };

  const handleToggleTeamLock = async () => {
    if (!firestoreDb || !activeMatch || !isTeamCaptain || !myTeamId) {
      return;
    }

    const team = myTeamId === "ALPHA" ? alphaTeam : betaTeam;
    if (!team) {
      return;
    }

    try {
      await updateDoc(
        doc(
          firestoreDb,
          MATCHES_COLLECTION,
          activeMatch.id,
          MATCH_TEAMS_COLLECTION,
          myTeamId
        ),
        { isLocked: !team.isLocked }
      );
      setLobbyActionError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update team lock.";
      setLobbyActionError(message);
    }
  };

  const handleApproveJoinRequest = async (request: JoinRequestWithPath) => {
    if (!firestoreDb || !activeMatch || !connectedUid || !myTeamId) {
      return;
    }

    const team = myTeamId === "ALPHA" ? alphaTeam : betaTeam;
    if (!team) {
      return;
    }

    setLobbyActionError(null);
    try {
      await approveCrewJoin(firestoreDb, {
        matchId: activeMatch.id,
        teamId: myTeamId,
        request,
        decisionBy: connectedUid,
        match: activeMatch,
        team,
      });
      setLobbyActionMessage(`${request.nickname} approved.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to approve join request.";
      setLobbyActionError(message);
    }
  };

  const handleTakeCommand = async () => {
    if (!firestoreDb || !activeMatch || !connectedUid || !myTeamId) {
      return;
    }
    try {
      await handoverMatchCaptain(
        firestoreDb,
        activeMatch.id,
        myTeamId,
        connectedUid
      );
      setLobbyActionMessage("You are now the team captain.");
      setLobbyActionError(null);
    } catch (error) {
      setLobbyActionError(
        error instanceof Error ? error.message : "Unable to take command."
      );
    }
  };

  const handleRejectJoinRequest = async (request: JoinRequestWithPath) => {
    if (!firestoreDb || !activeMatch || !connectedUid || !myTeamId) {
      return;
    }

    try {
      await rejectCrewJoin(firestoreDb, {
        matchId: activeMatch.id,
        teamId: myTeamId,
        userId: request.userId,
        decisionBy: connectedUid,
      });
      setLobbyActionMessage(`${request.nickname} rejected.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to reject join request.";
      setLobbyActionError(message);
    }
  };

  const handleDisbandMatch = async () => {
    if (!firestoreDb || !activeMatch || !isAlphaCaptain) {
      return;
    }

    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Disband this match? This action cannot be undone.");

    if (!confirmed) {
      return;
    }

    try {
      await Promise.all([
        deleteDoc(
          doc(
            firestoreDb,
            MATCHES_COLLECTION,
            activeMatch.id,
            MATCH_TEAMS_COLLECTION,
            "ALPHA"
          )
        ),
        deleteDoc(
          doc(
            firestoreDb,
            MATCHES_COLLECTION,
            activeMatch.id,
            MATCH_TEAMS_COLLECTION,
            "BETA"
          )
        ),
      ]);
      await deleteDoc(doc(firestoreDb, MATCHES_COLLECTION, activeMatch.id));
      setLobbyActionMessage("Match disbanded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to disband the match.";
      setLobbyActionError(message);
    }
  };

  const handleCopyMatchCode = async () => {
    if (!activeMatch?.matchCode) {
      return;
    }
    try {
      await navigator.clipboard?.writeText(activeMatch.matchCode);
      setLobbyActionMessage("Match code copied.");
      setLobbyActionError(null);
    } catch {
      setLobbyActionError("Unable to copy match code.");
    }
  };

  const handleCopyCrewInvite = async () => {
    const team = myTeamId === "ALPHA" ? alphaTeam : betaTeam;
    if (!team?.inviteCode) {
      return;
    }
    try {
      await navigator.clipboard?.writeText(team.inviteCode);
      setLobbyActionMessage("Crew invite copied.");
      setLobbyActionError(null);
    } catch {
      setLobbyActionError("Unable to copy crew invite.");
    }
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firebaseAvailable || !connectedUid) {
      return;
    }

    const db = getFirestoreDb();
    if (!db) {
      setSaveState("error");
      setProfileError("Firestore is unavailable. Check configuration.");
      return;
    }

    const trimmedNickname = nicknameInput.trim();
    const trimmedStatus = statusInput.trim();

    if (!trimmedNickname) {
      setProfileError("Nickname is required.");
      return;
    }

    setSaveState("saving");
    setProfileError(null);

    try {
      const profileDocRef = doc(
        db,
        artifactsCollection,
        namespace,
        "users",
        connectedUid,
        "data",
        "profile"
      );

      await setDoc(
        profileDocRef,
        {
          nickname: trimmedNickname,
          statusMessage: trimmedStatus || defaultStatusMessage,
          environment: process.env.NODE_ENV,
          lastClientUpdate: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const authInstance = getFirebaseAuth();
      if (authInstance?.currentUser) {
        await updateProfile(authInstance.currentUser, {
          displayName: trimmedNickname,
        }).catch(() => undefined);
      }

      await upsertLeaderboardNickname(db, connectedUid, trimmedNickname).catch(
        () => undefined
      );

      setSaveState("success");
      setLastSavedAt(new Date());
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (error) {
      setSaveState("error");
      const message =
        error instanceof Error ? error.message : "Failed to save profile.";
      setProfileError(message);
    }
  };

  const handleModeChange = (next: MatchMode) => {
    setMode(next);
    router.replace(`/lobby?mode=${next}`);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-10">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Lobby</h1>
          <p className="text-sm text-white/80">
            Host shares a match code. The peer joins as Beta captain with no
            approval. In multiplayer, each captain recruits crew with their own
            invite.
          </p>
        </header>
        <section className="grid gap-6 lg:grid-cols-2">
          <ActiveLobbyPanel
            activeMatch={activeMatch}
            alphaTeam={alphaTeam}
            betaTeam={betaTeam}
            connectedUid={connectedUid}
            myTeamId={myTeamId}
            isAlphaCaptain={isAlphaCaptain}
            isTeamCaptain={isTeamCaptain}
            captainJoinRequests={captainJoinRequests}
            lobbyActionMessage={lobbyActionMessage}
            lobbyActionError={lobbyActionError}
            onCopyMatchCode={handleCopyMatchCode}
            onCopyCrewInvite={handleCopyCrewInvite}
            onApproveJoinRequest={handleApproveJoinRequest}
            onRejectJoinRequest={handleRejectJoinRequest}
            onToggleReady={handleToggleReady}
            onStartPlacement={handleStartPlacement}
            onToggleTeamLock={handleToggleTeamLock}
            onDisbandMatch={handleDisbandMatch}
            canTakeCommand={canTakeCommand}
            onTakeCommand={handleTakeCommand}
          />

          <JoinAndCreateColumn
            mode={mode}
            onModeChange={handleModeChange}
            createMatchState={createMatchState}
            createMatchError={createMatchError}
            canCreateMatch={canCreateMatch}
            onCreateMatch={handleCreateMatch}
            joinCodeInput={joinCodeInput}
            onJoinCodeChange={setJoinCodeInput}
            joinFlowState={joinFlowState}
            joinFlowMessage={joinFlowMessage}
            joinFlowError={joinFlowError}
            canJoinMatch={canJoinMatch}
            onJoinMatch={handleJoinMatch}
            pendingJoinRequest={pendingJoinRequest}
            onCancelJoinRequest={handleCancelJoinRequest}
          />
        </section>

        <ProfileFormCard
          uid={connectedUid}
          nickname={nicknameInput}
          statusMessage={statusInput}
          onNicknameChange={setNicknameInput}
          onStatusChange={setStatusInput}
          onSubmit={handleProfileSave}
          canSubmit={canSubmitProfile}
          saveState={saveState}
          lastSavedAt={lastSavedAt}
          errorMessage={derivedProfileError}
        />
      </main>
    </div>
  );
}
