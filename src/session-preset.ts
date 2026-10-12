/** Read the persisted preset with the target registry's native projection. */
import { agentPresetProjectionDefinition } from '@deepseek-ai/dsh-agent-preset-registry'
import type { SessionHeader, SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionHandle } from '@deepseek-ai/dsh-session-persistence'

type Inspection = { meta: SessionHeader; events: readonly SessionEvent[] }

/** Older persistence exposed inspect; the target exposes read-only handles. */
export interface PresetSessionReader {
  inspect?: (id: string) => Promise<Inspection>
  open?: (id: string, access: 'read') => Promise<SessionHandle>
}

/** Full-log preset reconstruction, including post-creation selection changes. */
export async function readSessionPreset(reader: PresetSessionReader, id: string): Promise<string | undefined> {
  let inspected: Inspection
  if (reader.inspect !== undefined) {
    inspected = await reader.inspect(id)
  } else {
    if (reader.open === undefined) throw new Error('Session persistence has no supported read interface')
    const handle = await reader.open(id, 'read')
    try {
      inspected = { meta: handle.header, events: (await handle.read()).events }
    } finally {
      await handle.close()
    }
  }
  let preset = agentPresetProjectionDefinition.init(inspected.meta)
  for (const event of inspected.events) preset = agentPresetProjectionDefinition.apply(preset, event)
  return preset ?? undefined
}
