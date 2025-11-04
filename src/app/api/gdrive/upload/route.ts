
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { google } from 'googleapis';
import { Readable } from 'stream';

// Assuming you have your authOptions defined in a separate file
// You need to export authOptions from your `[...nextauth]` route file
import { GET as getAuth, POST as postAuth } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { title, content, fileId } = await req.json();

    if (!title || content === undefined) {
      return NextResponse.json({ error: 'Missing title or content' }, { status: 400 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: title,
      ...(fileId ? {} : { parents: ['appDataFolder'] }), // Only set parent on create
    };
    
    const media = {
      mimeType: 'text/plain',
      body: Readable.from(content),
    };
    
    let response;
    if (fileId) {
      // If a fileId is provided, update the existing file
      response = await drive.files.update({
        fileId: fileId,
        media: media,
        requestBody: fileMetadata,
        fields: 'id, name',
      });
    } else {
      // Otherwise, create a new file
      response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name',
      });
    }

    return NextResponse.json({ fileId: response.data.id, name: response.data.name });

  } catch (error: any) {
    console.error('Google Drive API Error:', error.message);
    // TODO: Add refresh token logic if error is due to expired token
    return NextResponse.json({ error: 'Google Drive API error', details: error.message }, { status: 500 });
  }
}
