import { createSupabaseServerClient } from '@/lib/supabase/server';

// Require an authenticated user for bot/media routes.
export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// SSRF guard: the proxy/stream must only fetch known media hosts over HTTPS,
// never arbitrary/internal URLs.
const ALLOWED_HOSTS = [
  'googlevideo.com',   // YouTube audio CDN
  'sndcdn.com',        // SoundCloud CDN
  'soundcloud.com',
  'youtube.com',
  'ytimg.com',
  // Invidious / Piped instances used as fallbacks
  'puffyan.us',
  'nerdvpn.de',
  'nadeko.net',
  'no-logs.com',
  'kavin.rocks',
  'tokhmi.xyz',
  'projectsegfau.lt',
];

export function isAllowedMediaUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    // Reject anything that resolves to a bare IP (blocks metadata/internal IPs).
    if (/^[\d.]+$/.test(host) || host.includes(':')) return false;
    return ALLOWED_HOSTS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}
