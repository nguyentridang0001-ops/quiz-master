// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyUser } from "../../../lib/users";

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await verifyUser({
          email: credentials.email,
          password: credentials.password,
        });

        if (!user) return null;

        // BẮT BUỘC: trả về object có id (string càng tốt)
        return {
          id: String(user.id),
          name: user.name || user.email,
          email: user.email,
        };
      },
    }),
  ],

  // BẮT BUỘC nên có
  pages: {
    signIn: "/auth/signin",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      // tránh crash khi session.user undefined
      if (!session.user) session.user = {};

      session.user.id = token.id;
      session.user.email = token.email;
      session.user.name = token.name;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  // bật debug để thấy lỗi trong terminal
  debug: true,
});
