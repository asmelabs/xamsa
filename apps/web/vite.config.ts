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
			// Nitro re-bundles pre-split SSR chunks; a second Rollup pass can mis-resolve
			// `clsx` named exports. Leave `clsx` external so Node loads the real package.
			traceDeps: ["clsx"],
			rollupConfig: {
				external: ["clsx"],
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
	},
});
