'use client'

import ProxyTester from '@/components/ProxyTester'

export default function Home() {
    return (
        <main className="container">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-4">Proxy Tester</h1>
                <p className="text-lg text-gray-600">
                    Test HTTP and SOCKS proxies with optional authentication
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    Supports formats: <code>ip:port</code> and <code>ip:port:username:password</code>
                </p>
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                        🔒 Privacy-First: Your proxy data never leaves your browser - No logging, no tracking!
                    </p>
                </div>
            </div>

            <ProxyTester />
        </main>
    )
} 