
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { saveGoogleCredentials } from '@/lib/supabase';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.appdata',
          ].join(' '),
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : undefined;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub || session.user.id;
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.expiresAt = token.expiresAt as number;
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
        if (account && account.provider === 'google') {
            await saveGoogleCredentials({
                userId: user.id,
                accessToken: account.access_token!,
                refreshToken: account.refresh_token!,
                expiryDate: account.expires_at ? new Date(account.expires_at * 1000) : new Date(Date.now() + 3600 * 1000),
            });
        }
    }
  }
});

export { handler as GET, handler as POST };
