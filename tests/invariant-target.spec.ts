import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { apply, install } from '../src/invariant.ts'
import { stateFilePath } from '../src/state.ts'

describe('owned-state validation without the removed target invariant service', () => {
  let home: string
  let previousHome: string | undefined
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'ankh-invariant-target-'))
    previousHome = process.env.DSH_HOME
    process.env.DSH_HOME = home
  })
  afterEach(() => {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  })

  it('rejects malformed owned state on the real target Cordis context', () => {
    const stateDir = join(home, 'state')
    mkdirSync(stateDir)
    writeFileSync(stateFilePath(stateDir), '{broken JSON')
    expect(() => apply(new Context())).toThrow('malformed')
  })

  it('returns a disposer when no owned state file exists', async () => {
    const dispose = await apply(new Context())
    expect(typeof dispose).toBe('function')
    expect(() => dispose()).not.toThrow()
  })

  it('retains registration on a legacy host that still provides the registry', async () => {
    const dispose = vi.fn()
    const register = vi.fn(() => dispose)
    const ctx = new Context()
    ctx.provide('invariants', { register })
    await expect(apply(ctx)).resolves.toBe(dispose)
    expect(register).toHaveBeenCalledWith('@khorsheed/dsh-ankh-guard', install)
  })
})
