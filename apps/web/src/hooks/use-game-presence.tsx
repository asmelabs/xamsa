import {
	channels,
	type GamePresenceData,
	GamePresenceDataSchema,
} from "@xamsa/ably/channels";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { getAblyClient } from "@/lib/ably";
import type { GameData } from "@/lib/game-types";

/**
 * Three-state presence for a player or the host:
 * - "online"  — present in the channel and tab visible (green dot)
 * - "away"    — present in the channel but tab hidden (orange dot)
 * - "offline" — not in the channel at all (no dot / muted)
 */
export type PresenceState = "online" | "away" | "offline";

type PresenceMember = {
	clientId: string;
	data: GamePresenceData;
};

type PresenceContextValue = {
	/** Three-state presence for the host. */
	hostPresence: PresenceState;
	/** Three-state presence for a given player id. */
	getPlayerPresence: (playerId: string) => PresenceState;
};

const PresenceContext = createContext<PresenceContextValue | null>(null);

function memberToState(member: PresenceMember | null): PresenceState {
	if (!member) return "offline";
	return member.data.visible ? "online" : "away";
}

/**
 * Mounted around the live-game UI. Joins the Ably presence set for the
 * `game:<code>` channel with typed data, listens for visibility changes,
 * and exposes a snapshot via {@link useGamePresence}.
 *
 * `useGameChannel` (in `use-game-channel.ts`) intentionally no longer
 * calls `presence.enter()` so this hook can own the typed payload. The
 * host-disconnect detection still works because it compares `clientId`
 * (= session user id) to `game.hostId`, which is data-independent.
 */
export function GamePresenceProvider({
	game,
	children,
}: {
	game: GameData;
	children: ReactNode;
}) {
	const code = game.code;
	const isHost = game.isHost;
	const myPlayerId = game.myPlayer?.id ?? null;
	const hostId = game.hostId;

	const [byHostClient, setByHostClient] = useState<PresenceMember | null>(null);
	const [byPlayerId, setByPlayerId] = useState<Map<string, PresenceMember>>(
		() => new Map(),
	);

	// Stable refs so the effect doesn't re-run on identity flips that don't
	// matter (e.g. score updates re-render game but identity is unchanged).
	const isHostRef = useRef(isHost);
	const myPlayerIdRef = useRef(myPlayerId);
	const hostIdRef = useRef(hostId);
	useEffect(() => {
		isHostRef.current = isHost;
		myPlayerIdRef.current = myPlayerId;
		hostIdRef.current = hostId;
	}, [isHost, myPlayerId, hostId]);

	const acceptMember = useCallback(
		(clientId: string | undefined, raw: unknown) => {
			if (!clientId) return;
			const parsed = GamePresenceDataSchema.safeParse(raw);
			if (!parsed.success) return;
			const data = parsed.data;
			const member: PresenceMember = { clientId, data };

			if (data.kind === "host") {
				setByHostClient((prev) =>
					prev?.clientId === clientId &&
					prev.data.kind === "host" &&
					prev.data.visible === data.visible
						? prev
						: member,
				);
				return;
			}

			setByPlayerId((prev) => {
				const existing = prev.get(data.playerId);
				if (
					existing &&
					existing.clientId === clientId &&
					existing.data.kind === "player" &&
					existing.data.visible === data.visible
				) {
					return prev;
				}
				const next = new Map(prev);
				next.set(data.playerId, member);
				return next;
			});
		},
		[],
	);

	const dropMember = useCallback((clientId: string | undefined) => {
		if (!clientId) return;
		setByHostClient((prev) =>
			prev && prev.clientId === clientId ? null : prev,
		);
		setByPlayerId((prev) => {
			let touched = false;
			const next = new Map<string, PresenceMember>();
			for (const [pid, m] of prev) {
				if (m.clientId === clientId) {
					touched = true;
					continue;
				}
				next.set(pid, m);
			}
			return touched ? next : prev;
		});
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const client = getAblyClient();
		const channel = client.channels.get(channels.game(code));

		const buildPayload = (): GamePresenceData => {
			const visible =
				typeof document === "undefined"
					? true
					: document.visibilityState === "visible";
			if (isHostRef.current) {
				return { kind: "host", visible };
			}
			const pid = myPlayerIdRef.current;
			if (pid) {
				return { kind: "player", playerId: pid, visible };
			}
			// Spectator with no player row + not host: don't enter presence.
			return { kind: "host", visible };
		};

		const shouldEnter = () =>
			isHostRef.current === true || myPlayerIdRef.current != null;

		const onMember = (msg: { clientId?: string; data?: unknown }) => {
			acceptMember(msg.clientId, msg.data);
		};
		const onLeave = (msg: { clientId?: string }) => {
			dropMember(msg.clientId);
		};

		channel.presence.subscribe("enter", onMember);
		channel.presence.subscribe("update", onMember);
		channel.presence.subscribe("leave", onLeave);

		// Seed with everyone already present when this client subscribes.
		channel.presence
			.get()
			.then((members) => {
				for (const m of members) {
					acceptMember(m.clientId ?? undefined, m.data);
				}
			})
			.catch(() => {
				// best-effort seed; live events keep the map fresh
			});

		// Enter ourselves (if applicable) with the current visibility.
		const enterIfNeeded = async () => {
			if (!shouldEnter()) return;
			try {
				await channel.presence.enter(buildPayload());
			} catch {
				// presence is best-effort
			}
		};
		void enterIfNeeded();

		const onVisibilityChange = () => {
			if (!shouldEnter()) return;
			channel.presence.update(buildPayload()).catch(() => {
				// updates are best-effort; entering is what publishes a join
			});
		};
		document.addEventListener("visibilitychange", onVisibilityChange);

		// Re-enter on reconnect so the presence set rehydrates after blips.
		const onConnected = () => {
			void enterIfNeeded();
		};
		client.connection.on("connected", onConnected);

		return () => {
			channel.presence.unsubscribe("enter", onMember);
			channel.presence.unsubscribe("update", onMember);
			channel.presence.unsubscribe("leave", onLeave);
			document.removeEventListener("visibilitychange", onVisibilityChange);
			client.connection.off("connected", onConnected);
			channel.presence.leave().catch(() => {
				// leaving is best-effort
			});
		};
	}, [code, acceptMember, dropMember]);

	const hostPresence: PresenceState = useMemo(() => {
		// Prefer the host-typed entry. Fall back to matching by clientId/hostId
		// in case the host's payload didn't validate (e.g. older client).
		if (byHostClient && byHostClient.clientId === hostId) {
			return memberToState(byHostClient);
		}
		// Sweep the player map too — defensively check if hostId shows up there
		// (shouldn't, since hosts publish kind="host", but be liberal).
		for (const m of byPlayerId.values()) {
			if (m.clientId === hostId) return memberToState(m);
		}
		return "offline";
	}, [byHostClient, byPlayerId, hostId]);

	const getPlayerPresence = useCallback(
		(playerId: string): PresenceState => {
			const m = byPlayerId.get(playerId);
			return memberToState(m ?? null);
		},
		[byPlayerId],
	);

	const value = useMemo<PresenceContextValue>(
		() => ({ hostPresence, getPlayerPresence }),
		[hostPresence, getPlayerPresence],
	);

	return (
		<PresenceContext.Provider value={value}>
			{children}
		</PresenceContext.Provider>
	);
}

/**
 * Returns the live presence map for the surrounding `<GamePresenceProvider>`.
 * If no provider is mounted, returns a default that reports everyone as
 * "offline" so consumers don't have to guard for unmounted contexts.
 */
export function useGamePresence(): PresenceContextValue {
	const ctx = useContext(PresenceContext);
	if (ctx) return ctx;
	return {
		hostPresence: "offline",
		getPlayerPresence: () => "offline",
	};
}
