import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");
const normalizeCode = (value: unknown) => String(value ?? "").trim();
const displayUser = (row: any) => ({
  userId: row.user_id,
  username: row.username || "WealthPlanner user",
});

async function getUser(sb: any, token: string) {
  if (!token || token.length > 512) return null;
  const { data, error } = await sb.from("users").select("user_id,username,email,is_active").eq("dashboard_token", token).maybeSingle();
  if (error) throw error;
  if (!data || !data.is_active) return null;
  return data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const token = typeof req.query.token === "string"
    ? req.query.token.trim()
    : typeof req.body?.token === "string"
      ? req.body.token.trim()
      : "";

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Layanan spouse sharing belum tersedia." });

  try {
    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const user = await getUser(sb, token);
    if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

    if (req.method === "GET") {
      const { data, error } = await sb
        .from("spouse_connections")
        .select("id,requester_user_id,recipient_user_id,status,invite_expires_at,accepted_at,created_at")
        .or(`requester_user_id.eq.${user.user_id},recipient_user_id.eq.${user.user_id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const otherIds = [...new Set((data || []).flatMap((row: any) => [row.requester_user_id, row.recipient_user_id]).filter((id: string) => id && id !== user.user_id))];
      let usersById = new Map<string, any>();
      if (otherIds.length) {
        const { data: others, error: othersError } = await sb.from("users").select("user_id,username,email").in("user_id", otherIds);
        if (othersError) throw othersError;
        usersById = new Map((others || []).map((row: any) => [row.user_id, row]));
      }

      const connections = (data || []).map((row: any) => {
        const otherId = row.requester_user_id === user.user_id ? row.recipient_user_id : row.requester_user_id;
        return {
          id: row.id,
          status: row.status,
          direction: row.requester_user_id === user.user_id ? "outgoing" : "incoming",
          otherUser: otherId ? displayUser(usersById.get(otherId) || { user_id: otherId }) : null,
          inviteExpiresAt: row.invite_expires_at,
          acceptedAt: row.accepted_at,
        };
      });
      return res.status(200).json({ connections });
    }

    const action = String(req.body?.action || "");
    if (action === "create_invite") {
      const { data: existing, error: existingError } = await sb
        .from("spouse_connections")
        .select("id,status")
        .eq("requester_user_id", user.user_id)
        .eq("status", "accepted")
        .limit(1);
      if (existingError) throw existingError;
      if (existing?.length) return res.status(409).json({ error: "Akunmu sudah terhubung dengan pasangan." });

      const { data: pending, error: pendingError } = await sb
        .from("spouse_connections")
        .select("id")
        .eq("requester_user_id", user.user_id)
        .eq("status", "pending")
        .gt("invite_expires_at", new Date().toISOString())
        .limit(1);
      if (pendingError) throw pendingError;
      if (pending?.length) return res.status(409).json({ error: "Kamu masih punya undangan pasangan yang aktif." });

      const code = randomBytes(18).toString("hex");
      const { data: created, error } = await sb
        .from("spouse_connections")
        .insert({
          requester_user_id: user.user_id,
          status: "pending",
          invite_code_hash: hashCode(code),
          invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id,invite_expires_at")
        .single();
      if (error) throw error;

      return res.status(201).json({
        inviteCode: code,
        inviteUrl: `/dashboard/settings?spouse_invite=${encodeURIComponent(code)}`,
        expiresAt: created.invite_expires_at,
      });
    }

    if (action === "accept_invite") {
      const code = normalizeCode(req.body?.code);
      if (!/^[a-f0-9]{36}$/.test(code)) return res.status(400).json({ error: "Kode undangan tidak valid." });

      const { data: invite, error: inviteError } = await sb
        .from("spouse_connections")
        .select("id,requester_user_id,recipient_user_id,status,invite_expires_at")
        .eq("invite_code_hash", hashCode(code))
        .maybeSingle();
      if (inviteError) throw inviteError;
      if (!invite || invite.status !== "pending" || !invite.invite_expires_at || Date.parse(invite.invite_expires_at) <= Date.now()) {
        return res.status(404).json({ error: "Undangan tidak ditemukan atau sudah kedaluwarsa." });
      }
      if (invite.requester_user_id === user.user_id) return res.status(400).json({ error: "Kamu tidak bisa menerima undangan dari akunmu sendiri." });

      const { data: existing, error: existingError } = await sb
        .from("spouse_connections")
        .select("id,status")
        .or(`requester_user_id.eq.${user.user_id},recipient_user_id.eq.${user.user_id}`)
        .eq("status", "accepted")
        .limit(1);
      if (existingError) throw existingError;
      if (existing?.length) return res.status(409).json({ error: "Akunmu sudah terhubung dengan pasangan." });

      const { error: updateError } = await sb
        .from("spouse_connections")
        .update({
          recipient_user_id: user.user_id,
          status: "accepted",
          accepted_at: new Date().toISOString(),
          invite_code_hash: null,
          invite_expires_at: null,
        })
        .eq("id", invite.id)
        .eq("status", "pending");
      if (updateError) throw updateError;

      return res.status(200).json({ success: true, message: "Spouse Sharing berhasil diaktifkan." });
    }

    if (action === "revoke") {
      const id = normalizeCode(req.body?.connectionId);
      if (!id) return res.status(400).json({ error: "Connection tidak valid." });
      const { error } = await sb
        .from("spouse_connections")
        .update({ status: "revoked", invite_code_hash: null, invite_expires_at: null })
        .eq("id", id)
        .or(`requester_user_id.eq.${user.user_id},recipient_user_id.eq.${user.user_id}`);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Action tidak dikenali." });
  } catch (error) {
    console.error("spouse-sharing error:", error);
    return res.status(500).json({ error: "Gagal memproses Spouse Sharing." });
  }
}
