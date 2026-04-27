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
		// `@resvg/resvg-js` ships native `.node` bindings; tell Nitro to trace
		// (copy) it into the server output rather than bundling so the loader
		// can `require` the platform-specific binary at runtime.
		nitro({
			traceDeps: ["@resvg/resvg-js", /^@resvg\/resvg-js-/],
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
	// Keep the resvg native binding out of the Vite dep-optimizer and SSR bundle
	// so Vite/esbuild never tries to parse the `.node` file.
	optimizeDeps: {
		exclude: ["@resvg/resvg-js"],
	},
	ssr: {
		external: ["@resvg/resvg-js"],
	},
});
