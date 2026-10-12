import { describe, expect, it, vi } from 'vitest'
import type { SessionHeader, SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionHandle } from '@deepseek-ai/dsh-session-persistence'
import { readSessionPreset } from '../src/session-preset.ts'

const header = { agentPreset: 'created-with' } as SessionHeader
const selected = (preset: string): SessionEvent => ({
  type: 'agent-preset/selected', data: { agentPreset: preset },
}) as SessionEvent

describe('target session-persistence preset reconstruction', () => {
  it('opens read-only, reads the full log, honors the last selection, and closes', async () => {
    const events = Array.from({ length: 1501 }, (_, i) => selected(`selected-${i}`))
    const read = vi.fn(async () => ({ events, eventState: 'owned' }))
    const close = vi.fn(async () => {})
    const open = vi.fn(async () => ({ header, read, close }) as unknown as SessionHandle)
    await expect(readSessionPreset({ open }, 'session-a')).resolves.toBe('selected-1500')
    expect(open).toHaveBeenCalledWith('session-a', 'read')
    expect(read).toHaveBeenCalledWith()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('closes even when the native log read fails, and does not fake a header-only result', async () => {
    const close = vi.fn(async () => {})
    const open = async () => ({ header,
      read: async () => { throw new Error('corrupt stored log') }, close,
    }) as unknown as SessionHandle
    await expect(readSessionPreset({ open }, 'session-a')).rejects.toThrow('corrupt stored log')
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('retains the legacy inspect interface and the same last-selection semantics', async () => {
    const inspect = vi.fn(async () => ({ meta: header, events: [selected('latest')] }))
    await expect(readSessionPreset({ inspect }, 'session-a')).resolves.toBe('latest')
    expect(inspect).toHaveBeenCalledWith('session-a')
  })

  it('uses the creation preset only when there is no later selection', async () => {
    await expect(readSessionPreset({ inspect: async () => ({ meta: header, events: [] }) }, 's'))
      .resolves.toBe('created-with')
    await expect(readSessionPreset({ inspect: async () => ({ meta: {} as SessionHeader, events: [] }) }, 's'))
      .resolves.toBeUndefined()
  })

  it('refuses an unsupported persistence interface', async () => {
    await expect(readSessionPreset({}, 's')).rejects.toThrow('no supported read interface')
  })
})
