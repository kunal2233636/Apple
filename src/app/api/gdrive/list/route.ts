
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { google } from 'googleapis';

// You need to export authOptions from your `[...nextauth]` route file
import { GET as getAuth, POST as postAuth } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: Request) {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const { searchParams } = new URL(req.url);
  let pageToken = searchParams.get('pageToken') || undefined;

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      spaces: 'appDataFolder',
      fields: 'nextPageToken, files(id, name, modifiedTime)',
      pageSize: 100, // Adjust as needed
      pageToken: pageToken,
    });

    return NextResponse.json({
        files: response.data.files,
        nextPageToken: response.data.nextPageToken,
    });

  } catch (error: any) {
    console.error('Google Drive API Error:', error.message);
    return NextResponse.json({ error: 'Google Drive API error', details: error.message }, { status: 500 });
  }
}
