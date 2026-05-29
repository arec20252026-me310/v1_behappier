import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Looking Glass - AI-Powered Occupancy Insights',
  description: 'Transform video feeds into actionable behavioral insights for your spaces',
  generator: 'v0.app',
  icons: {
    icon: '/looking-glass-icon.jpg',
    apple: '/looking-glass-icon.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background h-full overflow-hidden">
      <body className="font-sans antialiased h-full overflow-hidden">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
