'use client'

import { useMemo, useRef, useState } from 'react'

interface ProxyResult {
    proxy: string
    status: 'success' | 'error'
    message: string
    responseTime?: number
    ip?: string
}

interface TestMeta {
    totalTime: number
    workersUsed: number
    totalProxies: number
    workingProxies: number
}

interface ProgressInfo {
    completed: number
    total: number
    percentage: number
}

export default function ProxyTester() {
    const [proxies, setProxies] = useState('')
    const [testUrl, setTestUrl] = useState('http://httpbin.org/ip')
    const [timeout, setTimeout] = useState(60)
    const [workers, setWorkers] = useState(10)
    const [useHttps, setUseHttps] = useState(false)
    const [results, setResults] = useState<ProxyResult[]>([])
    const [testMeta, setTestMeta] = useState<TestMeta | null>(null)
    const [totalProxiesToTest, setTotalProxiesToTest] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    const handleTest = async () => {
        if (!proxies.trim()) {
            alert('Please enter at least one proxy')
            return
        }

        const proxyList = proxies.trim().split('\n').filter(p => p.trim())
        setIsLoading(true)
        setResults([])
        setTestMeta(null)
        setTotalProxiesToTest(proxyList.length)
        setProgressInfo({ completed: 0, total: proxyList.length, percentage: 0 })

        // Create abort controller for stopping the test
        abortControllerRef.current = new AbortController()

        try {
            const response = await fetch('/api/test-proxies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    proxies: proxyList,
                    testUrl,
                    timeout,
                    workers,
                }),
                signal: abortControllerRef.current.signal,
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const data = JSON.parse(line)
                                if (data.type === 'result') {
                                    setResults(prev => [...prev, data.result])
                                    // Update progress if provided in the stream
                                    if (data.progress) {
                                        setProgressInfo(data.progress)
                                    }
                                } else if (data.type === 'complete') {
                                    setTestMeta(data.meta)
                                    setProgressInfo(null)
                                }
                            } catch (e) {
                                console.error('Error parsing line:', line, e)
                            }
                        }
                    }
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Test was stopped by user')
                // Keep the results we have so far
            } else {
                console.error('Error testing proxies:', error)
                alert('Error while testing proxies: ' + error.message)
            }
        } finally {
            setIsLoading(false)
            setProgressInfo(null)
            abortControllerRef.current = null
        }
    }

    const handleStop = () => {
        if (abortControllerRef.current) {
            console.log('Stopping test...')
            abortControllerRef.current.abort()
            // The finally block in handleTest will handle cleanup
        }
    }

    const handleClear = () => {
        setProxies('')
        setResults([])
        setTestMeta(null)
        setTotalProxiesToTest(0)
        setProgressInfo(null)
    }

    const getWorkingProxies = () => {
        return results
            .filter(r => r.status === 'success')
            .map(r => r.proxy)
            .join('\n')
    }

    const exportWorking = () => {
        const working = getWorkingProxies()
        if (working) {
            navigator.clipboard.writeText(working)
            alert('Working proxies exported to clipboard!')
        } else {
            alert('No working proxies to export!')
        }
    }

    const toggleProtocol = () => {
        const newUseHttps = !useHttps
        setUseHttps(newUseHttps)

        if (newUseHttps) {
            setTestUrl('https://httpbin.org/ip')
        } else {
            setTestUrl('http://httpbin.org/ip')
        }
    }

    const formatTime = (milliseconds: number) => {
        if (milliseconds < 1000) return `${milliseconds}ms`
        return `${(milliseconds / 1000).toFixed(1)}s`
    }

    const progress = useMemo(() => {
        // Use progressInfo if available (real-time updates from stream)
        if (progressInfo) {
            return progressInfo
        }
        // Fallback to calculating from results
        if (!isLoading && !totalProxiesToTest) return null
        const completed = results.length
        const remaining = totalProxiesToTest - completed
        const percentage = totalProxiesToTest > 0 ? (completed / totalProxiesToTest) * 100 : 0
        return { completed, remaining, percentage, total: totalProxiesToTest }
    }, [isLoading, results.length, totalProxiesToTest, progressInfo])

    return (
        <div>
            <div className="card">
                <div className="input-group">
                    <label htmlFor="proxies">
                        Proxy List (one per line)
                    </label>
                    <textarea
                        id="proxies"
                        value={proxies}
                        onChange={(e) => setProxies(e.target.value)}
                        placeholder="127.0.0.1:8080&#10;192.168.1.1:3128:username:password&#10;socks5://127.0.0.1:1080"
                        rows={10}
                        disabled={isLoading}
                    />
                    <small className="text-gray-500">
                        Supported formats: ip:port, ip:port:username:password, socks5://ip:port
                    </small>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                    <div className="input-group">
                        <label htmlFor="testUrl">Test URL</label>
                        <input
                            id="testUrl"
                            type="url"
                            value={testUrl}
                            onChange={(e) => setTestUrl(e.target.value)}
                            placeholder="http://httpbin.org/ip"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="timeout">Timeout (seconds)</label>
                        <input
                            id="timeout"
                            type="number"
                            value={timeout}
                            onChange={(e) => setTimeout(Number(e.target.value))}
                            min={1}
                            max={60}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="workers">Workers</label>
                        <input
                            id="workers"
                            type="number"
                            value={workers}
                            onChange={(e) => setWorkers(Math.max(1, Math.min(50, Number(e.target.value))))}
                            min={1}
                            max={50}
                            disabled={isLoading}
                        />
                        <small className="text-gray-500">1-50 workers</small>
                    </div>

                    <div className="input-group">
                        <label htmlFor="protocol">Protocol</label>
                        <div className="flex items-center gap-2 mt-2">
                            <button
                                type="button"
                                onClick={toggleProtocol}
                                disabled={isLoading}
                                className={`btn ${useHttps ? 'btn-primary' : ''}`}
                                style={!useHttps ? { backgroundColor: '#10b981', color: 'white' } : {}}
                            >
                                {useHttps ? 'HTTPS' : 'HTTP'}
                            </button>
                            <small className="text-gray-500">
                                {useHttps ? 'SSL errors possible' : 'Recommended'}
                            </small>
                        </div>
                    </div>
                </div>

                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                        💡 <strong>Tip:</strong> If you get SSL/HTTPS errors, try using HTTP instead of HTTPS for testing.
                        Many HTTP proxies don't support HTTPS tunneling properly.
                    </p>
                </div>

                <div className="flex gap-2">
                    {!isLoading ? (
                        <button
                            onClick={handleTest}
                            className="btn btn-primary"
                        >
                            Start Testing ({workers} Workers)
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            className="btn"
                            style={{ backgroundColor: '#ef4444', color: 'white' }}
                        >
                            🛑 Stop Testing
                        </button>
                    )}

                    <button
                        onClick={handleClear}
                        disabled={isLoading}
                        className="btn"
                        style={{ backgroundColor: '#6b7280', color: 'white' }}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {(results.length > 0 || isLoading) && (
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">
                            {isLoading ? 'Live Results' : 'Test Results'}
                        </h2>
                        <div className="text-sm text-gray-600">
                            ✅ {results.filter(r => r.status === 'success').length} working /
                            ❌ {results.filter(r => r.status === 'error').length} failed /
                            📊 {results.length} total
                            {progress && isLoading && ` (${progress.total - progress.completed} remaining)`}
                        </div>
                    </div>

                    {testMeta && !isLoading && (
                        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="font-semibold text-gray-700">Processing Time:</span>
                                    <div className="text-blue-600 font-mono">{formatTime(testMeta.totalTime)}</div>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-700">Workers Used:</span>
                                    <div className="text-green-600 font-mono">{testMeta.workersUsed}</div>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-700">Success Rate:</span>
                                    <div className="text-purple-600 font-mono">
                                        {testMeta.totalProxies > 0 ?
                                            ((testMeta.workingProxies / testMeta.totalProxies) * 100).toFixed(1) + '%'
                                            : 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-700">Avg per Proxy:</span>
                                    <div className="text-orange-600 font-mono">
                                        {testMeta.totalProxies > 0 ?
                                            formatTime(Math.round(testMeta.totalTime / testMeta.totalProxies))
                                            : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mb-4">
                        <button
                            onClick={exportWorking}
                            className="btn"
                            style={{ backgroundColor: '#10b981', color: 'white' }}
                            disabled={results.filter(r => r.status === 'success').length === 0}
                        >
                            Export Working ({results.filter(r => r.status === 'success').length})
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="proxy-table">
                            <thead>
                                <tr>
                                    <th>Proxy</th>
                                    <th>Status</th>
                                    <th>Response Time</th>
                                    <th>Detected IP</th>
                                    <th>Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result, index) => (
                                    <tr
                                        key={index}
                                        className={result.status === 'success' ? 'row-success' : 'row-error'}
                                    >
                                        <td className="proxy-cell">{result.proxy}</td>
                                        <td className="status-cell">
                                            <span className={result.status === 'success' ? 'status-success' : 'status-error'}>
                                                {result.status === 'success' ? '✅ Working' : '❌ Failed'}
                                            </span>
                                        </td>
                                        <td className="time-cell">
                                            {result.responseTime ? `${result.responseTime}ms` : '-'}
                                        </td>
                                        <td className="ip-cell">
                                            {result.ip || '-'}
                                        </td>
                                        <td className="message-cell">
                                            {result.message}
                                        </td>
                                    </tr>
                                ))}
                                {isLoading && results.length < totalProxiesToTest && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="loading-spinner"></span>
                                                <span className="text-gray-500">
                                                    Testing in progress...
                                                    {progress && ` (${progress.total - progress.completed} remaining)`}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
} 