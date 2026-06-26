// src/modules/token/token.logo.ts
// Handles token logo uploads and storage.

import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

const LOGO_DIR = path.resolve('assets/logos');

export async function saveTokenLogo(chatId: string, fileBuffer: Buffer, ext: string): Promise<string | null> {
  try {
    await fs.mkdir(LOGO_DIR, { recursive: true });
    const filename = `${chatId}${ext}`;
    const filepath = path.join(LOGO_DIR, filename);
    await fs.writeFile(filepath, fileBuffer);

    await prisma.token.update({
      where: { chatId },
      data: { logoUrl: filepath },
    });

    return filepath;
  } catch (err) {
    logger.error('[token.logo] saveTokenLogo failed', { chatId, err });
    return null;
  }
}

export async function getTokenLogoPath(chatId: string): Promise<string | null> {
  try {
    const token = await prisma.token.findUnique({ where: { chatId }, select: { logoUrl: true } });
    return token?.logoUrl ?? null;
  } catch {
    return null;
  }
}
