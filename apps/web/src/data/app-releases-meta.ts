/**
 * CalVer + product name only — safe to import from any route without pulling release JSX / router.
 * Values mirror `appReleasesManifest` in `@xamsa/utils/app-releases`.
 */
import { appReleasesManifest } from "@xamsa/utils/app-releases";

export const productName = appReleasesManifest.productName;

export const current = appReleasesManifest.current;
