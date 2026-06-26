// src/modules/moderation/link.guard.ts

const URL_PATTERN = /https?:\/\/[^\s]+|t\.me\/[^\s]+|@\w{5,}/gi;
const SUSPICIOUS_DOMAINS = ['bit.ly', 'tinyurl.com', 'ow.ly', 't.co'];

export function containsLink(text: string): boolean {
  return URL_PATTERN.test(text);
}

export function isSuspiciousLink(text: string): boolean {
  return SUSPICIOUS_DOMAINS.some((domain) => text.toLowerCase().includes(domain));
}

export function containsTelegramInvite(text: string): boolean {
  return /t\.me\/\+/i.test(text) || /t\.me\/joinchat/i.test(text);
}

export function containsExternalGroupLink(text: string, ownUsername: string): boolean {
  const matches = text.match(/t\.me\/([a-zA-Z0-9_]+)/g) ?? [];
  return matches.some((link) => !link.toLowerCase().includes(ownUsername.toLowerCase()));
}

/**
 * Returns true if the message should be blocked based on link guard rules.
 */
export function shouldBlockForLinks(text: string, botUsername: string): boolean {
  if (containsTelegramInvite(text)) return true;
  if (containsExternalGroupLink(text, botUsername)) return true;
  if (isSuspiciousLink(text)) return true;
  return false;
}
