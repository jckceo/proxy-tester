import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Proxy Tester Pro - Professional Proxy Testing Tool',
    description: 'Test HTTP and SOCKS proxies with real-time results, authentication support, and professional analytics',
    manifest: '/manifest.json',
    themeColor: '#3b82f6',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Proxy Tester Pro'
    },
    icons: {
        icon: '/favicon.ico',
        apple: '/icon-192x192.png'
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
                <meta name="apple-mobile-web-app-title" content="Proxy Tester Pro" />
                <link rel="apple-touch-icon" href="/icon-192x192.png" />
            </head>
            <body className={inter.className}>{children}</body>
        </html>
    )
} 