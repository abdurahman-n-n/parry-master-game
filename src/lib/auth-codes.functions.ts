import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EmailSchema = z.string().email().max(254).transform((s) => s.toLowerCase().trim());
const PurposeSchema = z.enum(["register", "login"]);

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

function generateCode() {
  // 6-digit zero-padded
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

async function sendCodeEmail(to: string, code: string, purpose: "register" | "login") {
  const subject = `Your PARRY! ${purpose === "register" ? "sign-up" : "login"} code: ${code}`;
  const html = `
    <div style="font-family:ui-monospace,Menlo,Consolas,monospace;background:#0a0a0a;color:#fafafa;padding:32px;border-radius:8px;max-width:480px;margin:0 auto">
      <h1 style="letter-spacing:.3em;font-size:18px;margin:0 0 24px">PARRY!</h1>
      <p style="font-size:13px;margin:0 0 16px">Your one-time code:</p>
      <div style="font-size:36px;letter-spacing:.5em;font-weight:bold;padding:16px;background:#1a1a1a;text-align:center;border:2px solid #333">${code}</div>
      <p style="font-size:11px;opacity:.6;margin:24px 0 0">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
    </div>
  `;
  const text = `Your PARRY! code is ${code}. It expires in 10 minutes.`;

  // Enqueue via Lovable Emails queue (created by setup_email_infra).
  const { error } = await supabaseAdmin.rpc("enqueue_email" as never, {
    p_to: to,
    p_subject: subject,
    p_html: html,
    p_text: text,
  } as never);

  if (error) {
    console.error("[auth-codes] enqueue_email failed:", error);
    throw new Error("Could not send verification email. Please try again in a moment.");
  }
}

export const requestEmailCode = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ email: EmailSchema, purpose: PurposeSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { email, purpose } = data;

    // Throttle: 1 send per 30s per (email, purpose)
    const { data: existing } = await supabaseAdmin
      .from("auth_codes")
      .select("last_sent_at")
      .eq("email", email)
      .eq("purpose", purpose)
      .maybeSingle();

    if (existing?.last_sent_at) {
      const elapsed = Date.now() - new Date(existing.last_sent_at).getTime();
      if (elapsed < 30_000) {
        return { ok: false, error: `Please wait ${Math.ceil((30_000 - elapsed) / 1000)}s before requesting another code.` };
      }
    }

    const code = generateCode();
    const code_hash = sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error: upsertErr } = await supabaseAdmin
      .from("auth_codes")
      .upsert({
        email,
        purpose,
        code_hash,
        expires_at,
        attempts: 0,
        last_sent_at: new Date().toISOString(),
      });

    if (upsertErr) {
      console.error("[auth-codes] upsert failed:", upsertErr);
      return { ok: false, error: "Could not generate code. Try again." };
    }

    try {
      await sendCodeEmail(email, code, purpose);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send email.";
      return { ok: false, error: msg };
    }

    return { ok: true };
  });

export const verifyEmailCode = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        email: EmailSchema,
        purpose: PurposeSchema,
        code: z.string().regex(/^\d{6}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { email, purpose, code } = data;

    const { data: row, error } = await supabaseAdmin
      .from("auth_codes")
      .select("code_hash, expires_at, attempts")
      .eq("email", email)
      .eq("purpose", purpose)
      .maybeSingle();

    if (error || !row) {
      return { ok: false, error: "No code requested. Click 'Resend'." };
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from("auth_codes").delete().eq("email", email).eq("purpose", purpose);
      return { ok: false, error: "Code expired. Click 'Resend'." };
    }

    if (row.attempts >= 5) {
      await supabaseAdmin.from("auth_codes").delete().eq("email", email).eq("purpose", purpose);
      return { ok: false, error: "Too many attempts. Click 'Resend'." };
    }

    if (sha256(code) !== row.code_hash) {
      await supabaseAdmin
        .from("auth_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("email", email)
        .eq("purpose", purpose);
      return { ok: false, error: `Wrong code. ${4 - row.attempts} attempts left.` };
    }

    await supabaseAdmin.from("auth_codes").delete().eq("email", email).eq("purpose", purpose);
    return { ok: true };
  });
