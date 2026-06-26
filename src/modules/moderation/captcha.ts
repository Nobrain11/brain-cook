// src/modules/moderation/captcha.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { cache } from '../../services/cache.service';
import { logger } from '../../utils/logger';
import { REDIS_PREFIXES } from '../../utils/constants';
import { LIMITS } from '../../config/limits';
import { banUser } from './punish';

function captchaKey(chatId: string, userId: string): string {
  return `${REDIS_PREFIXES.captcha}${chatId}:${userId}`;
}

function generateQuestion(): { question: string; answer: string } {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { question: `${a} + ${b}`, answer: String(a + b) };
}

export async function sendCaptcha(
  bot: Telegraf<BotContext>,
  chatId: string,
  userId: number,
  username: string | undefined,
): Promise<void> {
  try {
    await bot.telegram.restrictChatMember(chatId, userId, {
      permissions: { can_send_messages: false },
    });

    const { question, answer } = generateQuestion();
    await cache.set(captchaKey(chatId, String(userId)), answer, LIMITS.moderation.captchaTimeoutSeconds);

    const name = username ? `@${username}` : 'new member';
    await bot.telegram.sendMessage(
      chatId,
      `👋 Welcome ${name}! Solve this to join the chat:\n\n*What is ${question}?*\n\nReply with just the number. You have 60 seconds.`,
      { parse_mode: 'Markdown' },
    );

    setTimeout(async () => {
      const remaining = await cache.get(captchaKey(chatId, String(userId)));
      if (remaining !== null) {
        await cache.del(captchaKey(chatId, String(userId)));
        await banUser(bot, chatId, userId, 'Failed captcha verification');
        logger.info('[captcha] User timed out', { chatId, userId });
      }
    }, LIMITS.moderation.captchaTimeoutSeconds * 1000);

  } catch (err) {
    logger.error('[captcha] sendCaptcha failed', { chatId, userId, err });
  }
}

export async function verifyCaptcha(
  bot: Telegraf<BotContext>,
  chatId: string,
  userId: number,
  input: string,
): Promise<boolean> {
  const key = captchaKey(chatId, String(userId));
  const expected = await cache.get(key);

  if (expected === null) return false;

  if (input.trim() === expected) {
    await cache.del(key);
    await bot.telegram.restrictChatMember(chatId, userId, {
      permissions: {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_add_web_page_previews: true,
      },
    });
    return true;
  }

  return false;
}

export async function hasPendingCaptcha(chatId: string, userId: string): Promise<boolean> {
  const val = await cache.get(captchaKey(chatId, userId));
  return val !== null;
}
