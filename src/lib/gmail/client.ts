import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

/**
 * Get a valid access token for a user, refreshing if expired.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account) {
    throw new Error("No Google account linked");
  }

  const now = Math.floor(Date.now() / 1000);
  const isExpired = account.expires_at && account.expires_at < now;

  if (!isExpired && account.access_token) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new Error("No refresh token available — user needs to re-authenticate");
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2.setCredentials({ refresh_token: account.refresh_token });

  const { credentials } = await oauth2.refreshAccessToken();

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: credentials.access_token,
      expires_at: credentials.expiry_date
        ? Math.floor(credentials.expiry_date / 1000)
        : null,
    },
  });

  return credentials.access_token!;
}

/**
 * Create an authenticated Gmail API client for a user.
 */
export async function getGmailClient(userId: string) {
  const accessToken = await getValidAccessToken(userId);

  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });

  return google.gmail({ version: "v1", auth: oauth2 });
}
