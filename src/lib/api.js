import { supabase } from './supabase';

/**
 * Generate all sections via the Python backend (CrewAI + LlamaIndex).
 * Streams SSE — calls onSectionComplete(sectionType, content) as each section arrives.
 * Returns an object keyed by section type with all results.
 */
export async function generateAllSections(params, onSectionComplete) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const response = await fetch(`${apiUrl}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(err.message || 'Python backend error');
  }

  const content = {};
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'section') {
          content[event.sectionType] = event.content;
          if (onSectionComplete) onSectionComplete(event.sectionType, event.content);
        } else if (event.type === 'error') {
          throw new Error(event.message);
        }
      } catch (e) {
        if (e.message && !e.message.includes('JSON')) throw e;
      }
    }
  }

  if (Object.keys(content).length === 0) {
    throw new Error('No sections were generated. Is the Python backend running on port 8000?');
  }

  return content;
}

/**
 * Upsert all sections for an account into Supabase.
 * Uses upsert so re-generation replaces existing content cleanly.
 */
export async function saveAccountSections(accountId, contentMap) {
  const rows = Object.entries(contentMap).map(([section_type, content]) => ({
    account_id: accountId,
    section_type,
    content,
    generated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('account_sections')
    .upsert(rows, { onConflict: 'account_id,section_type' });

  if (error) throw error;
}
