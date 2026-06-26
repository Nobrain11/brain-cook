// src/modules/welcome/welcome.image.ts
// Generates or retrieves a welcome image for new members.

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger';

const WELCOME_DIR = path.resolve('assets/welcome');

/**
 * Returns the path to a custom welcome image for a chat if it exists.
 * Falls back to null (text-only welcome).
 */
export async function getWelcomeImagePath(chatId: string): Promise<string | null> {
  const extensions = ['.jpg', '.jpeg', '.png', '.gif'];

  for (const ext of extensions) {
    const candidate = path.join(WELCOME_DIR, `${chatId}${ext}`);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Not found, try next
    }
  }

  return null;
}

/**
 * Saves an uploaded welcome image for a chat.
 */
export async function saveWelcomeImage(chatId: string, buffer: Buffer, ext: string): Promise<string | null> {
  try {
    await fs.mkdir(WELCOME_DIR, { recursive: true });
    const filename = `${chatId}${ext}`;
    const filepath = path.join(WELCOME_DIR, filename);
    await fs.writeFile(filepath, buffer);
    return filepath;
  } catch (err) {
    logger.error('[welcome.image] saveWelcomeImage failed', { chatId, err });
    return null;
  }
}

export async function deleteWelcomeImage(chatId: string): Promise<void> {
  const extensions = ['.jpg', '.jpeg', '.png', '.gif'];
  for (const ext of extensions) {
    const candidate = path.join(WELCOME_DIR, `${chatId}${ext}`);
    await fs.unlink(candidate).catch(() => null);
  }
}
