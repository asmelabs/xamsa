import "./load-app-env";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [
		tsconfigPaths(),
		tailwindcss(),
		tanstackStart(),
		nitro({
			traceDeps: ["@resvg/resvg-js", /^@resvg\/resvg-js-/, "satori"],
			// also tell Nitro/Rollup these are external at bundle time
			rollupConfig: {
				external: [/^@resvg\/resvg-js/, /\.node$/, "satori"],
			},
		}),
		viteReact(),
	] as PluginOption[],
	server: {
		port: 3001,
	},
	build: {
		sourcemap: true,
		commonjsOptions: {
			requireReturnsDefault: "auto",
		},
		rollupOptions: {
			external: [/^@resvg\/resvg-js/, /\.node$/],
		},
	},
	optimizeDeps: {
		exclude: [
			"@resvg/resvg-js",
			"@resvg/resvg-js-linux-x64-gnu",
			"@resvg/resvg-js-linux-x64-musl",
			"@resvg/resvg-js-darwin-x64",
			"@resvg/resvg-js-darwin-arm64",
			"satori",
		],
	},
	ssr: {
		external: [
			"@resvg/resvg-js",
			"@resvg/resvg-js-linux-x64-gnu",
			"@resvg/resvg-js-linux-x64-musl",
			"@resvg/resvg-js-darwin-x64",
			"@resvg/resvg-js-darwin-arm64",
			"@resvg/resvg-js-win32-x64-msvc",
			"satori",
		],
		noExternal: [],
	},
});
