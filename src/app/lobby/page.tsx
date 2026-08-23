"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
} from "firebase/auth";
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  getFirebaseAuth,
  getFirestoreDb,
  isFirebaseReady,
} from "@/lib/firebase/client";
import {
  canManageJoinTeam,
  canStartPlacement,
  filterJoinRequestsForCaptain,
  isAlphaCaptain,
  isAnyTeamCaptain,
  lobbyPatchForApproval,
} from "@/lib/lobbies/captains";
import {
  DEFAULT_MAX_MEMBERS,
  type LobbyDocument,
  type LobbyJoinRequest,
  type LobbyTeamId,
} from "@/lib/lobbies/types";
import {
  findLobbyByInviteCode,
  generateUniqueInviteCodes,
  normalizeInviteCode,
} from "@/lib/lobbies/utils";
import { startLobbyGame } from "@/lib/games/startLobbyGame";
import {
  ActiveLobbyPanel,
} from "./components/ActiveLobbyPanel";
import { JoinAndCreateColumn } from "./components/JoinAndCreateColumn";
import { ProfileFormCard } from "./components/ProfileFormCard";
import type {
  AuthState,
  JoinRequestWithPath,
  LobbySnapshot,
  ProfileDocument,
} from "./types";

const artifactsCollection =
  process.env.NEXT_PUBLIC_FIREBASE_ARTIFACTS_COLLECTION ?? "artifacts";
const namespace =
  process.env.NEXT_PUBLIC_APP_NAMESPACE ?? "dev-squadron-prototype";
const defaultStatusMessage = "Awaiting fleet orders.";

export default function Home() {
  const router = useRouter();
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
  const [createLobbyState, setCreateLobbyState] = useState<"idle" | "creating">(
    "idle"
  );
  const [createLobbyError, setCreateLobbyError] = useState<string | null>(null);
  const [activeLobby, setActiveLobby] = useState<LobbySnapshot | null>(null);
  const [lobbyActionMessage, setLobbyActionMessage] = useState<string | null>(
    null
  );
  const [lobbyActionError, setLobbyActionError] = useState<string | null>(null);
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
      signInAnonymously(firebaseAuth).catch((error) =>
        setAuthState({ status: "error", message: error.message })
      );
    }

    return () => unsubscribe();
  }, [firebaseAuth]);

  const connectedUid = authState.status === "connected" ? authState.uid : null;
  const shouldSubscribeToProfile = firebaseAvailable && !!connectedUid;

  useEffect(() => {
    if (!shouldSubscribeToProfile || !connectedUid) {
      return;
    }

    if (!firestoreDb) {
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
      setActiveLobby(null);
      return;
    }

    const membershipQuery = query(
      collection(firestoreDb, "lobbies"),
      where("memberIds", "array-contains", connectedUid),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      membershipQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setActiveLobby(null);
          return;
        }

        const docSnapshot = snapshot.docs[0];
        setActiveLobby({
          ...(docSnapshot.data() as LobbyDocument),
          id: docSnapshot.id,
        });
      },
      (error) => setLobbyActionError(error.message)
    );

    return () => unsubscribe();
  }, [firestoreDb, connectedUid]);

  useEffect(() => {
    if (!firestoreDb || !connectedUid) {
      setPendingJoinRequest(null);
      return;
    }

    const requestQuery = query(
      collectionGroup(firestoreDb, "joinRequests"),
      where("userId", "==", connectedUid)
    );

    const unsubscribe = onSnapshot(
      requestQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setPendingJoinRequest(null);
          return;
        }

        const requests = snapshot.docs
          .map((docSnapshot) => ({
            ...(docSnapshot.data() as LobbyJoinRequest),
            id: docSnapshot.id,
            path: docSnapshot.ref.path,
          }))
          .sort((a, b) => {
            const aTime =
              a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
            const bTime =
              b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
            return bTime - aTime;
          });

        const pending =
          requests.find((req) => req.status === "PENDING") ?? requests[0];
        setPendingJoinRequest(pending);
      },
      (error) => setJoinFlowError(error.message)
    );

    return () => unsubscribe();
  }, [firestoreDb, connectedUid]);

  const isAlphaLobbyCaptain = !!activeLobby && isAlphaCaptain(activeLobby, connectedUid);
  const isTeamCaptain =
    !!activeLobby && isAnyTeamCaptain(activeLobby, connectedUid);

  useEffect(() => {
    if (!firestoreDb || !activeLobby?.id || !isTeamCaptain) {
      setCaptainJoinRequests([]);
      return;
    }

    const requestsRef = collection(
      firestoreDb,
      "lobbies",
      activeLobby.id,
      "joinRequests"
    );
    const requestsQuery = query(requestsRef);

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const requests = snapshot.docs
          .map((docSnapshot) => ({
            ...(docSnapshot.data() as LobbyJoinRequest),
            id: docSnapshot.id,
          }))
          .sort((a, b) => {
            const aTime =
              a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
            const bTime =
              b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
            return aTime - bTime;
          });
        setCaptainJoinRequests(
          filterJoinRequestsForCaptain(activeLobby, connectedUid, requests)
        );
      },
      (error) => setLobbyActionError(error.message)
    );

    return () => unsubscribe();
  }, [firestoreDb, activeLobby, connectedUid, isTeamCaptain]);

  useEffect(() => {
    if (!activeLobby?.gameId) {
      return;
    }
    router.push(`/placement?gameId=${activeLobby.gameId}`);
  }, [activeLobby?.gameId, router]);

  const visibleProfile = shouldSubscribeToProfile ? profile : null;

  const lobbyMembers = useMemo(() => {
    if (!activeLobby?.members) {
      return [];
    }

    return Object.values(activeLobby.members).sort((a, b) => {
      const aTime = a.joinedAt instanceof Timestamp ? a.joinedAt.toMillis() : 0;
      const bTime = b.joinedAt instanceof Timestamp ? b.joinedAt.toMillis() : 0;
      return aTime - bTime;
    });
  }, [activeLobby]);

  const derivedProfileError =
    !firestoreDb && shouldSubscribeToProfile
      ? "Firestore is unavailable. Check configuration."
      : profileError;
  const canCreateLobby =
    !!firestoreDb &&
    authState.status === "connected" &&
    !activeLobby &&
    pendingJoinRequest?.status !== "PENDING";
  const canJoinLobby =
    authState.status === "connected" &&
    !activeLobby &&
    pendingJoinRequest?.status !== "PENDING";
  const canSubmitProfile =
    firebaseAvailable && authState.status === "connected";

  const handleCreateLobby = async () => {
    const uid = connectedUid;
    if (!firestoreDb || !uid) {
      setCreateLobbyError("Connect to Firebase before creating a lobby.");
      return;
    }

    if (activeLobby) {
      setCreateLobbyError(
        "Leave your current lobby before creating a new one."
      );
      return;
    }

    if (pendingJoinRequest?.status === "PENDING") {
      setCreateLobbyError(
        "Cancel your join request before creating a new lobby."
      );
      return;
    }

    const nickname =
      visibleProfile?.nickname || nicknameInput.trim() || "Fleet Member";

    setCreateLobbyState("creating");
    setCreateLobbyError(null);
    setLobbyActionMessage(null);
    setLobbyActionError(null);

    try {
      const { alpha, beta } = await generateUniqueInviteCodes(firestoreDb);
      await addDoc(collection(firestoreDb, "lobbies"), {
        inviteCode: alpha,
        inviteCodeBeta: beta,
        captainId: uid,
        status: "LOBBY",
        isLocked: false,
        createdAt: serverTimestamp(),
        maxMembers: DEFAULT_MAX_MEMBERS,
        memberIds: [uid],
        members: {
          [uid]: {
            userId: uid,
            nickname,
            role: "CAPTAIN",
            team: "ALPHA",
            isReady: false,
            joinedAt: serverTimestamp(),
          },
        },
      });
      setLobbyActionMessage(
        `Lobby created. Share ALPHA ${alpha} or BETA ${beta}.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create lobby. Try again.";
      setCreateLobbyError(message);
    } finally {
      setCreateLobbyState("idle");
    }
  };

  const handleJoinLobby = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const uid = connectedUid;
    if (!firestoreDb || !uid) {
      setJoinFlowError("Connect to Firebase before joining a lobby.");
      return;
    }

    if (activeLobby) {
      setJoinFlowError("You are already in a lobby.");
      return;
    }

    if (pendingJoinRequest && pendingJoinRequest.status === "PENDING") {
      setJoinFlowError("You already have a pending join request.");
      return;
    }

    const cleanedCode = normalizeInviteCode(joinCodeInput);
    if (cleanedCode.length !== 6) {
      setJoinFlowError("Enter a valid 6-character invite code.");
      return;
    }

    setJoinFlowState("submitting");
    setJoinFlowError(null);
    setJoinFlowMessage(null);

    try {
      const match = await findLobbyByInviteCode(firestoreDb, cleanedCode);
      if (!match) {
        throw new Error("Lobby not found. Check the invite code.");
      }

      const { id: lobbyId, data: lobbyData, team } = match;

      if (lobbyData.memberIds?.includes(uid)) {
        setJoinFlowMessage("You are already a member of this lobby.");
        return;
      }

      if (lobbyData.isLocked) {
        throw new Error("This lobby is locked by the captain.");
      }

      if (
        lobbyData.memberIds &&
        lobbyData.memberIds.length >= lobbyData.maxMembers
      ) {
        throw new Error("This lobby is already full.");
      }

      const joinRequestRef = doc(
        firestoreDb,
        "lobbies",
        lobbyId,
        "joinRequests",
        uid
      );

      await setDoc(joinRequestRef, {
        lobbyId,
        requestedTeam: team,
        createdAt: serverTimestamp(),
        status: "PENDING",
        inviteCode: cleanedCode,
        nickname: visibleProfile?.nickname || nicknameInput.trim() || "Crew",
        userId: uid,
      });

      setJoinFlowMessage(
        "Join request sent. Your team captain will approve or reject shortly."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit join request.";
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
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to cancel join request.";
      setJoinFlowError(message);
    }
  };

  const handleToggleReady = async () => {
    if (!firestoreDb || !activeLobby || !connectedUid) {
      return;
    }

    const currentMember = activeLobby.members?.[connectedUid];
    if (!currentMember || activeLobby.status !== "LOBBY") {
      return;
    }

    setLobbyActionError(null);
    try {
      await updateDoc(doc(firestoreDb, "lobbies", activeLobby.id), {
        [`members.${connectedUid}.isReady`]: !currentMember.isReady,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update ready state.";
      setLobbyActionError(message);
    }
  };

  const handleStartPlacement = async () => {
    if (!firestoreDb || !activeLobby || !isAlphaLobbyCaptain) {
      return;
    }

    if (!canStartPlacement(activeLobby, lobbyMembers)) {
      setLobbyActionError(
        activeLobby.captainIdBeta
          ? "Both captains and all members must be ready before starting placement."
          : "Approve a Beta captain before starting placement."
      );
      return;
    }

    setLobbyActionError(null);
    try {
      const { gameId } = await startLobbyGame(firestoreDb, activeLobby);
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

  const handleToggleLobbyLock = async () => {
    if (!firestoreDb || !activeLobby || !isAlphaLobbyCaptain) {
      return;
    }

    try {
      await updateDoc(doc(firestoreDb, "lobbies", activeLobby.id), {
        isLocked: !activeLobby.isLocked,
      });
      setLobbyActionError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update lobby lock state.";
      setLobbyActionError(message);
    }
  };

  const handleApproveJoinRequest = async (request: JoinRequestWithPath) => {
    if (
      !firestoreDb ||
      !activeLobby ||
      !connectedUid ||
      !canManageJoinTeam(activeLobby, connectedUid, request.requestedTeam)
    ) {
      return;
    }

    setLobbyActionError(null);
    try {
      await runTransaction(firestoreDb, async (transaction) => {
        const lobbyRef = doc(firestoreDb, "lobbies", activeLobby.id);
        const lobbySnapshot = await transaction.get(lobbyRef);
        if (!lobbySnapshot.exists()) {
          throw new Error("Lobby no longer exists.");
        }

        const lobbyData = lobbySnapshot.data() as LobbyDocument;
        if (
          !canManageJoinTeam(lobbyData, connectedUid, request.requestedTeam)
        ) {
          throw new Error("You cannot approve joiners for that team.");
        }

        if (lobbyData.memberIds?.includes(request.userId)) {
          throw new Error("Player is already in the lobby.");
        }

        if (
          lobbyData.memberIds &&
          lobbyData.memberIds.length >= lobbyData.maxMembers
        ) {
          throw new Error("Lobby is full.");
        }

        const joinRequestRef = doc(
          firestoreDb,
          "lobbies",
          activeLobby.id,
          "joinRequests",
          request.userId
        );

        const patch = lobbyPatchForApproval(lobbyData, request);
        const memberKey = `members.${request.userId}`;
        const member = patch[memberKey] as Record<string, unknown>;
        transaction.update(lobbyRef, {
          ...patch,
          [memberKey]: {
            ...member,
            joinedAt: serverTimestamp(),
          },
        });
        transaction.update(joinRequestRef, {
          status: "APPROVED",
          decisionAt: serverTimestamp(),
          decisionBy: connectedUid,
        });
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

  const handleRejectJoinRequest = async (request: JoinRequestWithPath) => {
    if (
      !firestoreDb ||
      !activeLobby ||
      !connectedUid ||
      !canManageJoinTeam(activeLobby, connectedUid, request.requestedTeam)
    ) {
      return;
    }

    try {
      await updateDoc(
        doc(
          firestoreDb,
          "lobbies",
          activeLobby.id,
          "joinRequests",
          request.userId
        ),
        {
          status: "REJECTED",
          decisionAt: serverTimestamp(),
          decisionBy: connectedUid,
        }
      );
      setLobbyActionMessage(`${request.nickname} rejected.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to reject join request.";
      setLobbyActionError(message);
    }
  };

  const handleDisbandLobby = async () => {
    if (!firestoreDb || !activeLobby || !isAlphaLobbyCaptain) {
      return;
    }

    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Disband this lobby? This action cannot be undone.");

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(firestoreDb, "lobbies", activeLobby.id));
      setLobbyActionMessage("Lobby disbanded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to disband the lobby.";
      setLobbyActionError(message);
    }
  };

  const handleCopyInviteCode = async (team: LobbyTeamId) => {
    const code =
      team === "BETA" ? activeLobby?.inviteCodeBeta : activeLobby?.inviteCode;
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard?.writeText(code);
      setLobbyActionMessage(`${team} invite copied to clipboard.`);
      setLobbyActionError(null);
    } catch {
      setLobbyActionError("Unable to copy invite code.");
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

  return (
    <div className="min-h-screen bg-linear-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-10">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Lobby</h1>
          <p className="text-sm text-white/80">
            Captains share an Alpha or Beta invite. The code assigns the joiner
            to that team.
          </p>
        </header>
        <section className="grid gap-6 lg:grid-cols-2">
          <ActiveLobbyPanel
            activeLobby={activeLobby}
            connectedUid={connectedUid}
            lobbyMembers={lobbyMembers}
            isAlphaCaptain={isAlphaLobbyCaptain}
            isTeamCaptain={isTeamCaptain}
            captainJoinRequests={captainJoinRequests}
            lobbyActionMessage={lobbyActionMessage}
            lobbyActionError={lobbyActionError}
            onCopyInviteCode={handleCopyInviteCode}
            onApproveJoinRequest={handleApproveJoinRequest}
            onRejectJoinRequest={handleRejectJoinRequest}
            onToggleReady={handleToggleReady}
            onStartPlacement={handleStartPlacement}
            onToggleLobbyLock={handleToggleLobbyLock}
            onDisbandLobby={handleDisbandLobby}
          />

          <JoinAndCreateColumn
            createLobbyState={createLobbyState}
            createLobbyError={createLobbyError}
            canCreateLobby={canCreateLobby}
            onCreateLobby={handleCreateLobby}
            joinCodeInput={joinCodeInput}
            onJoinCodeChange={setJoinCodeInput}
            joinFlowState={joinFlowState}
            joinFlowMessage={joinFlowMessage}
            joinFlowError={joinFlowError}
            canJoinLobby={canJoinLobby}
            onJoinLobby={handleJoinLobby}
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
