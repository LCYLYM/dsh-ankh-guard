/**
 * Package-owned invariant companion for `@khorsheed/dsh-ankh-guard`.
 * @module @khorsheed/dsh-ankh-guard/invariant
 */

/* jscpd:ignore-start */
import { existsSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { resolveStateDir } from './defaults.ts'
import { loadState, stateFilePath } from './state.ts'

const PACKAGE_NAME = '@khorsheed/dsh-ankh-guard'

/** Cordis companion plugin name. */
export const name = 'ankh-guard-invariant'
/** The owned-data check also runs without the removed host registry. */
export const inject: readonly string[] = []

/** Package-owned check; the target host no longer ships an invariant registry. */
export type InvariantInstaller = (ctx: Context, fail: (message: string) => void) => void

/**
 * Owned-data check: the package's state file, when present at the default
 * location, must parse as a well-formed guard state. A malformed file would
 * make the gate unreadable — the credential's revision/recordedAt shape is
 * this package's own contract, so corruption fails loud at load instead of at
 * the moment a restart needs the gate.
 * @param _ctx - host context (unused; the check reads only the state file).
 * @param fail - invariant failure reporter.
 */
export const install: InvariantInstaller = (_ctx, fail) => {
  const stateDir = resolveStateDir(undefined)
  const file = stateFilePath(stateDir)
  if (!existsSync(file)) return
  try {
    loadState(stateDir)
  } catch (error) {
    fail(`state file ${file} is malformed: ${String(error)}`)
  }
}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns The installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> => {
  const registry = ctx.get('invariants') as {
    register(name: string, installer: InvariantInstaller): (() => void) | Promise<() => void>
  } | undefined
  if (registry !== undefined) return Promise.resolve(registry.register(PACKAGE_NAME, install))
  // Preserve the owned-data validation when explicitly mounted without the
  // removed host service. Corrupt state still throws instead of passing.
  install(ctx, message => { throw new Error(message) })
  return Promise.resolve(() => {})
}
/* jscpd:ignore-end */
