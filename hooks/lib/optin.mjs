// @ts-check
import { existsSync } from "node:fs";
import { join } from "node:path";

export const OPT_IN_FILE = ".no-ai-trailers";
export const OPT_IN_ENV = "OSS_NO_AI_TRAILERS";

/**
 * The commit guard runs when OSS_NO_AI_TRAILERS=1, or when the repo root holds .no-ai-trailers.
 * OSS_NO_AI_TRAILERS=0 switches it off even if the file exists.
 * @param {string} repoRoot
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ enabled: boolean, reason: string }}
 */
export function guardStatus(repoRoot, env) {
  const flag = env[OPT_IN_ENV];
  if (flag === "0") return { enabled: false, reason: `${OPT_IN_ENV}=0` };
  if (flag === "1") return { enabled: true, reason: `${OPT_IN_ENV}=1` };
  if (existsSync(join(repoRoot, OPT_IN_FILE))) {
    return { enabled: true, reason: `${OPT_IN_FILE} in ${repoRoot}` };
  }
  return { enabled: false, reason: "not opted in" };
}
