import {
	type AvatarImageMimeType,
	getUserAvatarPublicId,
	PROFILE_AVATAR_MAX_BYTES,
	uploadProfileImage,
} from "@xamsa/upload";

/** Minimal Prisma surface for Google OAuth hooks without importing generated client type. */
export type GoogleOAuthHooksPrisma = {
	user: {
		findUnique(opts: {
			where: { username: string };
			select: { id: true };
		}): Promise<{ id: string } | null>;
		update(opts: {
			where: { id: string };
			data: { image: string };
		}): Promise<unknown>;
	};
};

const USERNAME_RE = /^[a-z][a-z0-9]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;

export function needsAutoUsername(username: unknown): boolean {
	if (typeof username !== "string") return true;
	const t = username.trim();
	if (t.length < USERNAME_MIN || t.length > USERNAME_MAX) return true;
	return !USERNAME_RE.test(t);
}

/** Strip accents and leave only a–z / 0–9 for slug building. */
function stripForSlug(s: string): string {
	return s
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

/** Satisfies `@xamsa` user `name` min length when Google omits parts of the name. */
export function ensureDisplayName(name: unknown, email: unknown): string {
	const em = typeof email === "string" ? email.trim().toLowerCase() : "";
	let n = typeof name === "string" ? name.trim() : "";

	if (n.length > 100) n = n.slice(0, 100);

	if (n.length >= USERNAME_MIN) return n;

	const local =
		em
			.split("@")[0]
			?.replace(/[^a-zA-Z0-9\s'-]/g, " ")
			.trim() ?? "";
	n = `${n} ${local}`.trim();
	if (n.length < USERNAME_MIN) n = "Xamsa player";
	return n.slice(0, 100);
}

/** Build OAuth username slug from profile name + email local part (before uniqueness pass). */
function oauthUsernameSlugSeed(displayName: string, email: string): string {
	let core = stripForSlug(displayName.replace(/\s+/g, ""));
	if (core.length < USERNAME_MIN) {
		core = stripForSlug(email.split("@")[0] ?? "user") || "user";
	}
	if (!/^[a-z]/.test(core)) core = `u${core}`;
	core = core.replace(/^[0-9]+/, "");
	if (!/^[a-z]/.test(core)) core = `u${core}`;
	core = stripForSlug(core);
	if (!/^[a-z]/.test(core)) core = "user";
	while (core.length < USERNAME_MIN) core += "xo";
	return core.slice(0, USERNAME_MAX);
}

export async function allocateUniqueOAuthUsername(
	prisma: GoogleOAuthHooksPrisma,
	displayName: string,
	email: string,
): Promise<string> {
	const seedCore = oauthUsernameSlugSeed(
		displayName.trim(),
		email.toLowerCase(),
	);

	for (let i = 0; i < 10_000; i++) {
		const suffix = i === 0 ? "" : String(i);
		const maxStem = USERNAME_MAX - suffix.length;
		if (maxStem < USERNAME_MIN) continue;

		const stem = seedCore.slice(0, maxStem);
		const cand = stem + suffix;
		if (
			cand.length < USERNAME_MIN ||
			cand.length > USERNAME_MAX ||
			!USERNAME_RE.test(cand)
		) {
			continue;
		}

		const taken = await prisma.user.findUnique({
			where: { username: cand },
			select: { id: true },
		});
		if (!taken) return cand;
	}

	throw new Error("Could not allocate a unique username for OAuth sign-up");
}

function mimeToAvatarMimeType(
	header: string | null,
	buffer: Buffer,
): AvatarImageMimeType | null {
	const mime = header?.split(";")[0]?.trim().toLowerCase();
	if (mime === "image/jpeg" || mime === "image/jpg") return "image/jpeg";
	if (mime === "image/png") return "image/png";
	if (mime === "image/webp") return "image/webp";

	if (buffer.byteLength >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
		return "image/jpeg";
	}
	if (
		buffer.byteLength >= 8 &&
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47
	) {
		return "image/png";
	}
	if (
		buffer.byteLength >= 12 &&
		buffer.subarray(0, 4).equals(Buffer.from("RIFF")) &&
		buffer.subarray(8, 12).equals(Buffer.from("WEBP"))
	) {
		return "image/webp";
	}
	return null;
}

/** If `imageUrl` is a Google-hosted avatar, copy it into Cloudinary and persist the secure URL. */
export async function mirrorGoogleAvatarIfNeeded(params: {
	prisma: GoogleOAuthHooksPrisma;
	userId: string;
	username: string;
	imageUrl: string | null | undefined;
}): Promise<void> {
	const raw = params.imageUrl?.trim();
	if (!raw) return;

	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return;
	}

	const host = url.hostname.toLowerCase();
	if (!host.includes("googleusercontent.com") && !host.includes("ggpht.com")) {
		return;
	}

	try {
		const res = await fetch(url, {
			redirect: "follow",
			signal: AbortSignal.timeout(20_000),
		});

		const lenHeader = res.headers.get("content-length");
		const lenParsed = lenHeader ? Number.parseInt(lenHeader, 10) : Number.NaN;
		if (
			Number.isFinite(lenParsed) &&
			lenParsed > PROFILE_AVATAR_MAX_BYTES &&
			lenParsed >= 1024 // avoid rejecting unknown tiny bodies wrongly
		) {
			return;
		}

		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.byteLength > PROFILE_AVATAR_MAX_BYTES || buf.byteLength === 0) {
			return;
		}

		const mime = mimeToAvatarMimeType(res.headers.get("content-type"), buf);
		if (!mime) return;

		const publicId = getUserAvatarPublicId(params.username);
		const { secureUrl } = await uploadProfileImage({
			buffer: buf,
			mimeType: mime,
			publicId,
		});

		await params.prisma.user.update({
			where: { id: params.userId },
			data: { image: secureUrl },
		});
	} catch (e) {
		console.error("[oauth-google] mirrorGoogleAvatarIfNeeded:", e);
	}
}
