import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { GpsTracker } from "@/components/gps-tracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Map Diary",
  description: "その日の場所・予定・写真・日記を地図の上でひとつに。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider>
          {children}
          {/* layoutに置くことで、日付移動などページ内遷移をしても記録が途切れない */}
          {session?.user?.id && (
            <div className="pointer-events-none fixed top-4 right-4 z-20">
              <div className="pointer-events-auto">
                <GpsTracker />
              </div>
            </div>
          )}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
