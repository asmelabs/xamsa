import { env } from "@xamsa/env/server";

type Env = NonNullable<typeof env.NODE_ENV>;
type DomainType = "server" | "clients";

export const DOMAINS = {
	development: {
		server: ["http://localhost:3000"],
		clients: ["http://localhost:3000", "http://localhost:3001"],
	},
	test: {
		server: ["http://localhost:3000"],
		clients: ["http://localhost:3000", "http://localhost:3001"],
	},
	production: {
		server: ["https://api.xamsa.site"],
		clients: ["https://www.xamsa.site", "https://xamsa.site"],
	},
} satisfies Record<
	NonNullable<typeof env.NODE_ENV>,
	Record<DomainType, string[]>
>;

export function getDomainsByEnv(inputEnv: Env) {
	return DOMAINS[inputEnv];
}

export function getDomainsByEnvAndType(inputEnv: Env, type: DomainType) {
	return getDomainsByEnv(inputEnv)[type];
}

export function getDomainsByType(type: DomainType) {
	return getDomainsByEnv(env.NODE_ENV || "development")[type];
}

export function getDomains(inputEnv?: Env) {
	return (type: DomainType) =>
		getDomainsByEnvAndType(inputEnv || env.NODE_ENV || "development", type);
}

// helpers
export function getAuthTrustedOrigins() {
	return getDomains()("clients");
}
