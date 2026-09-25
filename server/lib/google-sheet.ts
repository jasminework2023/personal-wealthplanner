import { google } from "googleapis";

const DEFAULT_TEMPLATE_ID = "1N-IJSv76LwaBv-RNmf-fPtI5oCBsa2cM0VYZWAI1apo";

type CreateCustomerSpreadsheetArgs = {
  customerEmail: string;
  customerName?: string;
  existingSpreadsheetId?: string | null;
};

function getGoogleCredentials() {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_CREDENTIALS belum diset");
  return JSON.parse(raw);
}

function getDriveClient() {
  const credentials = getGoogleCredentials();
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

function getTemplateId() {
  const configured = process.env.GOOGLE_TEMPLATE_URL || "";
  const match = configured.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] || DEFAULT_TEMPLATE_ID;
}

function safeName(value: string) {
  return String(value || "Customer").replace(/[\\/:*?"<>|]/g, " ").trim() || "Customer";
}

export async function createCustomerSpreadsheet({
  customerEmail,
  customerName,
  existingSpreadsheetId,
}: CreateCustomerSpreadsheetArgs) {
  if (!customerEmail) throw new Error("Email customer kosong");

  if (existingSpreadsheetId) {
    return {
      id: existingSpreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${existingSpreadsheetId}/edit`,
      reused: true,
    };
  }

  const drive = getDriveClient();
  const templateId = getTemplateId();
  const name = `Wealthplanner — ${safeName(customerName || "Customer")}`;

  const copied = await drive.files.copy({
    fileId: templateId,
    requestBody: { name },
    fields: "id,webViewLink",
  });

  const spreadsheetId = copied.data.id;
  if (!spreadsheetId) throw new Error("Google Sheet customer gagal dibuat.");

  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      type: "user",
      role: "writer",
      emailAddress: customerEmail,
    },
    sendNotificationEmail: false,
  });

  return {
    id: spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    reused: false,
  };
}

export default createCustomerSpreadsheet;
