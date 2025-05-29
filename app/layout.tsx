import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Proxy Tester - Private & Open Source',
    description: 'Test HTTP and SOCKS proxies quickly and privately',
    manifest: '/manifest.json',
    themeColor: '#3b82f6',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Proxy Tester'
    },
    icons: {
        icon: '/favicon.svg',
        apple: '/icon-192x192.svg'
    }
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="Proxy Tester" />
                <link rel="apple-touch-icon" href="/icon-192x192.svg" />
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <link rel="alternate icon" href="/favicon.ico" />
            </head>
            <body className={inter.className}>{children}</body>
        </html>
    )
} 