
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
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId parameter' }, { status: 400 });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const drive = google.drive({ version: 'v3', auth });
    
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media',
    }, { responseType: 'stream' });

    // The response.data is a Readable stream
    // Convert to web stream and read content
    const webStream = (response.data as any).toWeb ? (response.data as any).toWeb() : response.data;
    const reader = (webStream as ReadableStream).getReader();
    let content = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += new TextDecoder().decode(value);
    }
    
    return NextResponse.json({ content });

  } catch (error: any) {
    console.error('Google Drive API Error:', error.message);
    if (error.code === 404) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Google Drive API error', details: error.message }, { status: 500 });
  }
}
