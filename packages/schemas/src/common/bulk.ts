/** Must stay in sync with `BULK_CREATE_TOPICS_MAX` in `@xamsa/utils/ai-limits`. */
export const BULK_TOPICS_MAX = 20;

/** 3sual import / manual “many topics” cap when `importedFromTsualPackageId` is set (see `BulkCreateTopicsInputSchema`). */
export const BULK_TOPICS_MAX_TSUAL_IMPORT = 200;

/** Must stay in sync with `BULK_CREATE_PACKS_MAX` in `@xamsa/utils/ai-limits`. */
export const BULK_PACKS_MAX = 10;
