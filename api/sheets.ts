import { google } from "googleapis";

// Range kita selalu mulai dari kolom B, jadi idx 0 = kolom B.
export function colLetter(idx: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[idx + 1];
}

export async function getWriteClient() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"], // read + write
  });
  return google.sheets({ version: "v4", auth });
}

export function findRowIndex(rows: unknown[][], needle: string, from = 0): number {
  for (let i = from; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.some((c) => String(c || "").toLowerCase().includes(needle.toLowerCase()))) return i;
  }
  return -1;
}
