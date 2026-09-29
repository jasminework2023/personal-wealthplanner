import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import { parseTransactionText } from "../../src/lib/transactionParser.js";

const LINK_TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_TTL_MS = 15 * 60 * 1000;

function db() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );
}

function telegramApi(method: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum diset");
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function telegramCall(method: string, body: Record<string, unknown>) {
  const response = await fetch(telegramApi(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function sendMessage(chatId: string | number, text: string, replyMarkup?: unknown) {
  return telegramCall("sendMessage", {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function answerCallback(callbackQueryId: string) {
  return telegramCall("answerCallbackQuery", { callback_query_id: callbackQueryId });
}

function callbackData(value: unknown) {
  return String(value || "").trim();
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function formatRupiah(value: unknown) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(amount);
}

function getWebhookSecret(req: VercelRequest) {
  const value = req.headers["x-telegram-bot-api-secret-token"];
  return Array.isArray(value) ? value[0] : value;
}

function isValidWebhook(req: VercelRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return false;
  return getWebhookSecret(req) === expected;
}

async function parseText(text: string) {
  // Keep the same parser used by the dashboard so Telegram and web produce the
  // same transaction shape and category inference.
  return parseTransactionText(text);
}

async function addTransaction(token: string, transaction: any) {
  const response = await fetch("https://www.wealthplanner.id/api/add-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, transaction }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Gagal menyimpan transaksi.");
  return data;
}

async function readReceiptFromTelegram(fileId: string) {
  const fileData = await telegramCall("getFile", { file_id: fileId });
  const filePath = String(fileData?.result?.file_path || "");
  if (!filePath) throw new Error("File Telegram tidak ditemukan.");

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!response.ok) throw new Error("Gagal mengunduh foto dari Telegram.");

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) throw new Error("Foto terlalu besar. Kirim foto struk yang lebih kecil.");
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

async function receiptAi(image: string) {
  const response = await fetch("https://www.wealthplanner.id/api/receipt-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "AI gagal membaca struk.");
  return data.transaction;
}

function telegramLink(code: string) {
  const username = String(process.env.TELEGRAM_BOT_USERNAME || "wealthplannerAI").replace(/^@/, "").trim();
  return `https://t.me/${username}?start=${encodeURIComponent(code)}`;
}

async function connectFromCode(code: string, chatId: string, username: string) {
  const supabase = db();
  const { data: user, error } = await supabase
    .from("users")
    .select("user_id, username, email, dashboard_token, spreadsheet_id, is_active, telegram_chat_id, telegram_link_code, telegram_link_expires_at")
    .eq("telegram_link_code", code)
    .single();

  if (error || !user) return { ok: false, reason: "invalid" as const };
  if (user.telegram_chat_id && String(user.telegram_chat_id) !== chatId) {
    return { ok: false, reason: "already_connected" as const };
  }

  const expires = user.telegram_link_expires_at ? Date.parse(user.telegram_link_expires_at) : 0;
  if (!expires || expires < Date.now()) return { ok: false, reason: "expired" as const };
  if (Number(user.is_active) !== 1) return { ok: false, reason: "inactive" as const };

  const { error: updateError } = await supabase
    .from("users")
    .update({
      telegram_chat_id: chatId,
      telegram_link_code: null,
      telegram_link_expires_at: null,
      username: user.username || username || "User",
    })
    .eq("user_id", user.user_id);

  if (updateError) throw new Error(updateError.message);
  return { ok: true, user };
}

async function getUserByChatId(chatId: string) {
  const { data, error } = await db()
    .from("users")
    .select("user_id, username, email, dashboard_token, spreadsheet_id, is_active, telegram_chat_id, telegram_pending_receipt")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function activeUserOrMessage(user: any) {
  if (!user) return "Telegram belum terhubung ke akun Wealthplanner kamu. Buka email aktivasi atau Dashboard → Hubungkan Telegram dulu ya.";
  if (Number(user.is_active) !== 1) return "Akun Wealthplanner kamu belum aktif. Pastikan pembayaran sudah terkonfirmasi.";
  if (!user.spreadsheet_id) return "Telegram sudah terhubung, tapi Google Sheet kamu belum tersambung. Selesaikan langkah Hubungkan Sheet di Dashboard dulu ya.";
  return "";
}

async function handleStart(chatId: string, username: string, args: string) {
  if (!args) {
    const user = await getUserByChatId(chatId);
    if (user && Number(user.is_active) === 1) {
      await sendMessage(chatId, `👋 Halo ${user.username || username || ""}! Telegram kamu sudah terhubung ke Wealthplanner.\n\nKirim transaksi seperti:\n• beli kopi 25rb\n• gajian 5 juta\n• bayar listrik 300rb\n\nKamu juga bisa kirim foto struk untuk dibaca AI.`);
    } else {
      await sendMessage(chatId, "👋 Halo! Untuk menggunakan Wealthplanner lewat Telegram, hubungkan Telegram dari link aktivasi di email atau dari Dashboard.");
    }
    return;
  }

  const result = await connectFromCode(args, chatId, username);
  if (!result.ok) {
    const message = result.reason === "expired"
      ? "Link Hubungkan Telegram sudah kedaluwarsa. Buka Dashboard → Hubungkan Telegram untuk membuat link baru."
      : result.reason === "already_connected"
        ? "Link ini sudah terhubung ke akun Telegram lain. Jika ini akunmu, buat link Telegram baru dari Dashboard."
        : result.reason === "inactive"
          ? "Pembayaran belum terkonfirmasi. Coba lagi setelah akun Wealthplanner kamu aktif."
          : "Link Hubungkan Telegram tidak valid atau sudah pernah digunakan.";
    await sendMessage(chatId, message);
    return;
  }

  const user = result.user;
  if (!user.spreadsheet_id) {
    await sendMessage(chatId, "✅ Telegram berhasil terhubung!\n\nSekarang selesaikan langkah Hubungkan Google Sheet di Dashboard. Setelah Sheet tersambung, kamu bisa langsung mencatat transaksi di sini.");
    return;
  }

  await sendMessage(chatId, `🎉 Telegram berhasil terhubung, ${user.username || username || ""}!\n\nMulai sekarang kirim transaksi langsung di sini, misalnya:\n• beli makan siang 35rb\n• gajian 5 juta\n• nabung emas 500rb\n\nFoto struk juga bisa dikirim untuk dibaca AI.`);
}

async function handleText(chatId: string, text: string) {
  const user = await getUserByChatId(chatId);
  const blocked = activeUserOrMessage(user);
  if (blocked) {
    await sendMessage(chatId, blocked);
    return;
  }

  const parsed = await parseText(text);
  if (!parsed) {
    await sendMessage(chatId, "Aku belum mengenali itu sebagai transaksi. Coba contoh:\n\n• beli bensin 80rb\n• gajian 5 juta\n• nabung reksadana 500rb");
    return;
  }

  await addTransaction(user.dashboard_token, parsed);
  const emoji = parsed.type === "Income" ? "💰" : parsed.type === "Saving" ? "🏦" : "✅";
  await sendMessage(chatId, `${emoji} Transaksi berhasil dicatat!\n\n💸 Rp ${formatRupiah(parsed.amount)}\n🏷️ ${parsed.category}\n📝 ${parsed.description}\n📅 ${parsed.date}\n\nData langsung masuk ke Google Sheet dan Dashboard kamu.`);
}

async function handlePhoto(chatId: string, fileId: string) {
  const user = await getUserByChatId(chatId);
  const blocked = activeUserOrMessage(user);
  if (blocked) {
    await sendMessage(chatId, blocked);
    return;
  }

  await telegramCall("sendChatAction", { chat_id: chatId, action: "typing" });
  const image = await readReceiptFromTelegram(fileId);
  const transaction = await receiptAi(image);

  const pending = {
    transaction,
    expires_at: new Date(Date.now() + PENDING_TTL_MS).toISOString(),
  };

  const { error } = await db()
    .from("users")
    .update({ telegram_pending_receipt: pending })
    .eq("user_id", user.user_id);
  if (error) throw new Error(error.message);

  await sendMessage(
    chatId,
    `🧾 Struk berhasil dibaca!\n\nCek dulu hasilnya:\n\n💸 Rp ${formatRupiah(transaction.amount)}\n🏷️ ${transaction.category}\n📝 ${transaction.description}\n📅 ${transaction.date || "Hari ini"}\n\nKalau sudah benar, pilih Simpan.`,
    { inline_keyboard: [[{ text: "✅ Simpan", callback_data: "receipt_save" }, { text: "❌ Batal", callback_data: "receipt_cancel" }]] },
  );
}

async function handleReceiptAction(chatId: string, callbackQueryId: string, action: string) {
  await answerCallback(callbackQueryId);
  const user = await getUserByChatId(chatId);
  if (!user) {
    await sendMessage(chatId, "Telegram belum terhubung ke akun Wealthplanner kamu.");
    return;
  }

  const pending = user.telegram_pending_receipt;
  if (!pending?.transaction) {
    await sendMessage(chatId, "Hasil scan struk sudah tidak tersedia. Kirim foto struk lagi ya.");
    return;
  }

  if (action === "receipt_cancel") {
    await db().from("users").update({ telegram_pending_receipt: null }).eq("user_id", user.user_id);
    await sendMessage(chatId, "❌ Scan struk dibatalkan. Data belum masuk ke spreadsheet.");
    return;
  }

  const expires = Date.parse(String(pending.expires_at || ""));
  if (!expires || expires < Date.now()) {
    await db().from("users").update({ telegram_pending_receipt: null }).eq("user_id", user.user_id);
    await sendMessage(chatId, "⏰ Konfirmasi struk sudah kedaluwarsa. Kirim foto struk lagi ya.");
    return;
  }

  await addTransaction(user.dashboard_token, pending.transaction);
  await db().from("users").update({ telegram_pending_receipt: null }).eq("user_id", user.user_id);
  await sendMessage(chatId, `✅ Transaksi berhasil disimpan!\n\n💸 Rp ${formatRupiah(pending.transaction.amount)}\n🏷️ ${pending.transaction.category}\n📝 ${pending.transaction.description}\n📅 ${pending.transaction.date || "Hari ini"}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  if (!isValidWebhook(req)) return res.status(401).json({ error: "Unauthorized webhook" });

  try {
    const update = req.body || {};
    const callback = update.callback_query;
    if (callback) {
      const chatId = String(callback.message?.chat?.id || callback.from?.id || "");
      const action = callbackData(callback.data);
      if (chatId && /^(receipt_save|receipt_cancel)$/.test(action)) {
        await handleReceiptAction(chatId, String(callback.id || ""), action);
      }
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    if (!message) return res.status(200).json({ ok: true, ignored: true });

    const chatId = String(message.chat?.id || "");
    const username = cleanText(message.from?.first_name || message.from?.username || "User");
    if (!chatId) return res.status(200).json({ ok: true, ignored: true });

    if (typeof message.text === "string") {
      const text = message.text.trim();
      if (text.startsWith("/start")) {
        const args = text.replace(/^\/start(?:@\w+)?\s*/i, "").trim();
        await handleStart(chatId, username, args);
      } else if (text.startsWith("/dashboard")) {
        const user = await getUserByChatId(chatId);
        const blocked = activeUserOrMessage(user);
        if (blocked) await sendMessage(chatId, blocked);
        else await sendMessage(chatId, `📊 Dashboard kamu:\nhttps://www.wealthplanner.id/dashboard?token=${encodeURIComponent(user.dashboard_token)}`);
      } else {
        await handleText(chatId, text);
      }
      return res.status(200).json({ ok: true });
    }

    const photos = Array.isArray(message.photo) ? message.photo : [];
    if (photos.length) {
      const largest = photos[photos.length - 1];
      await handlePhoto(chatId, String(largest.file_id));
      return res.status(200).json({ ok: true });
    }

    await sendMessage(chatId, "Kirim teks transaksi atau foto struk ya 😊");
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("telegram-webhook error:", error);
    const message = req.body?.message;
    const chatId = message?.chat?.id;
    if (chatId) {
      try { await sendMessage(chatId, "Maaf, Telegram sedang mengalami kendala. Coba lagi sebentar ya."); } catch { /* best effort */ }
    }
    // Telegram treats non-2xx as webhook failure and retries. For user-facing
    // processing errors, acknowledge the update so one bad receipt/message does
    // not create an endless retry loop.
    return res.status(200).json({ ok: false, handled: true });
  }
}
