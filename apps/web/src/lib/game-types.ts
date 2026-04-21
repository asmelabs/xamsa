import type { FindOneGameOutputType } from "@xamsa/schemas/modules/game";

export type GameData = FindOneGameOutputType;
export type GamePlayer = FindOneGameOutputType["players"][number];
export type GameClick = FindOneGameOutputType["clicks"][number];
export type GameHostClick = NonNullable<
	GameData["hostData"]
>["clickDetails"][number];
