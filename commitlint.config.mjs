/** @type {import("@commitlint/types").UserConfig} */
export default {
	extends: ["@commitlint/config-conventional"],
	ignores: [
		(commit) => commit.includes("[bot]"),
		(commit) => commit.includes("dependabot"),
		(commit) => commit.startsWith("Merge"),
		(commit) => commit.startsWith("Version Packages"),
		(commit) => commit.startsWith("chore(release)"),
	],
	rules: {
		"scope-empty": [0],

		"scope-enum": [
			2,
			"always",
			[
				"web",
				"api",
				"auth",
				"ably",
				"config",
				"db",
				"env",
				"mail",
				"schemas",
				"ui",
				"utils",
				"deps",
				"ci",
				"root",
				"release",
			],
		],

		"type-enum": [
			2,
			"always",
			[
				"feat",
				"fix",
				"refactor",
				"chore",
				"docs",
				"style",
				"test",
				"perf",
				"ci",
				"build",
				"revert",
				"merge",
				"release",
				"wip",
			],
		],
	},
};
