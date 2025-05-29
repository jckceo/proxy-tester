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

    const workingCount = results.filter(r => r.status === 'success').length
    const failedCount = results.filter(r => r.status === 'error').length

    return (
        <div className="app-container">
            {/* Header */}
            <header className="app-header">
                <div className="header-content">
                    <div className="logo">
                        <div className="logo-icon">P</div>
                        <span>Proxy Tester</span>
                    </div>
                    <div className="header-badge">Private & Open Source</div>
                </div>
            </header>

            {/* Main Content */}
            <main className="main-content">
                {/* Left Panel - Controls */}
                <div className="controls-panel">
                    <div className="panel-header">
                        <h2 className="panel-title">Configuration</h2>
                        <p className="panel-subtitle">Set up your proxy testing parameters</p>
                    </div>

                    <div className="panel-content">
                        {/* Proxy List */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="proxies">
                                Proxy List
                            </label>
                            <textarea
                                id="proxies"
                                className="form-textarea"
                                value={proxies}
                                onChange={(e) => setProxies(e.target.value)}
                                placeholder="127.0.0.1:8080&#10;192.168.1.1:3128:username:password&#10;socks5://127.0.0.1:1080"
                                rows={8}
                                disabled={isLoading}
                            />
                            <div className="form-help">
                                Supported formats: ip:port, ip:port:username:password, socks5://ip:port
                            </div>
                        </div>

                        {/* Test URL */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="testUrl">Test URL</label>
                            <input
                                id="testUrl"
                                className="form-input"
                                type="url"
                                value={testUrl}
                                onChange={(e) => setTestUrl(e.target.value)}
                                placeholder="http://httpbin.org/ip"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Settings Grid */}
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label" htmlFor="timeout">Timeout (seconds)</label>
                                <input
                                    id="timeout"
                                    className="form-input"
                                    type="number"
                                    value={timeout}
                                    onChange={(e) => setTimeout(Number(e.target.value))}
                                    min={1}
                                    max={60}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="workers">Workers</label>
                                <input
                                    id="workers"
                                    className="form-input"
                                    type="number"
                                    value={workers}
                                    onChange={(e) => setWorkers(Math.max(1, Math.min(50, Number(e.target.value))))}
                                    min={1}
                                    max={50}
                                    disabled={isLoading}
                                />
                                <div className="form-help">1-50 concurrent workers</div>
                            </div>
                        </div>

                        {/* Protocol Toggle */}
                        <div className="form-group">
                            <label className="form-label">Protocol</label>
                            <div className="protocol-toggle">
                                <button
                                    type="button"
                                    onClick={() => !useHttps && toggleProtocol()}
                                    disabled={isLoading}
                                    className={`protocol-option ${!useHttps ? 'active' : ''}`}
                                >
                                    HTTP
                                </button>
                                <button
                                    type="button"
                                    onClick={() => useHttps && toggleProtocol()}
                                    disabled={isLoading}
                                    className={`protocol-option ${useHttps ? 'active' : ''}`}
                                >
                                    HTTPS
                                </button>
                            </div>
                            <div className="form-help">
                                {useHttps ? 'SSL errors possible with some proxies' : 'Recommended for better compatibility'}
                            </div>
                        </div>

                        {/* Info Cards */}
                        <div className="info-card info-card-performance">
                            <div className="info-card-title">⚡ High Performance</div>
                            <div>Using {workers} concurrent workers for fast testing with real-time results.</div>
                        </div>

                        <div className="info-card info-card-tip">
                            <div className="info-card-title">💡 Pro Tip</div>
                            <div>Use HTTP for better compatibility. Many proxies don't support HTTPS tunneling.</div>
                        </div>

                        {/* Action Buttons */}
                        <div className="btn-group">
                            {!isLoading ? (
                                <button
                                    onClick={handleTest}
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                >
                                    🚀 Start Testing ({workers} Workers)
                                </button>
                            ) : (
                                <button
                                    onClick={handleStop}
                                    className="btn btn-danger"
                                    style={{ width: '100%' }}
                                >
                                    🛑 Stop Testing
                                </button>
                            )}

                            <button
                                onClick={handleClear}
                                disabled={isLoading}
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                            >
                                🗑️ Clear All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Results */}
                <div className="results-panel">
                    <div className="results-header">
                        <h2 className="results-title">
                            {isLoading ? '🔄 Live Results' : '📊 Test Results'}
                        </h2>
                        <div className="results-stats">
                            <div className="stat-item stat-success">
                                <span>✅</span>
                                <span>{workingCount} working</span>
                            </div>
                            <div className="stat-item stat-error">
                                <span>❌</span>
                                <span>{failedCount} failed</span>
                            </div>
                            <div className="stat-item stat-total">
                                <span>📊</span>
                                <span>{results.length} total</span>
                            </div>
                        </div>
                    </div>

                    <div className="results-content">
                        {/* Meta Stats */}
                        {testMeta && !isLoading && (
                            <div className="meta-stats">
                                <div className="meta-stat">
                                    <div className="meta-stat-label">Processing Time</div>
                                    <div className="meta-stat-value meta-stat-time">{formatTime(testMeta.totalTime)}</div>
                                </div>
                                <div className="meta-stat">
                                    <div className="meta-stat-label">Workers Used</div>
                                    <div className="meta-stat-value meta-stat-workers">{testMeta.workersUsed}</div>
                                </div>
                                <div className="meta-stat">
                                    <div className="meta-stat-label">Success Rate</div>
                                    <div className="meta-stat-value meta-stat-rate">
                                        {testMeta.totalProxies > 0 ?
                                            ((testMeta.workingProxies / testMeta.totalProxies) * 100).toFixed(1) + '%'
                                            : 'N/A'}
                                    </div>
                                </div>
                                <div className="meta-stat">
                                    <div className="meta-stat-label">Avg per Proxy</div>
                                    <div className="meta-stat-value meta-stat-avg">
                                        {testMeta.totalProxies > 0 ?
                                            formatTime(Math.round(testMeta.totalTime / testMeta.totalProxies))
                                            : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Export Button */}
                        {results.length > 0 && (
                            <div style={{ padding: '0 1.5rem' }}>
                                <button
                                    onClick={exportWorking}
                                    className="btn btn-success"
                                    disabled={workingCount === 0}
                                >
                                    📋 Export Working Proxies ({workingCount})
                                </button>
                            </div>
                        )}

                        {/* Results Table */}
                        <div className="results-table-container">
                            {results.length === 0 && !isLoading ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon">🎯</div>
                                    <div className="empty-state-title">Ready to Test Proxies</div>
                                    <div className="empty-state-description">
                                        Enter your proxy list and click "Start Testing" to begin
                                    </div>
                                </div>
                            ) : (
                                <table className="results-table">
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
                                            <tr key={index}>
                                                <td className="proxy-cell">{result.proxy}</td>
                                                <td className="status-cell">
                                                    <span className={`status-badge ${result.status === 'success' ? 'status-success' : 'status-error'}`}>
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
                                                <td colSpan={5} className="loading-row">
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                        <span className="loading-spinner"></span>
                                                        <span>
                                                            Testing in progress...
                                                            {progress && ` (${progress.total - progress.completed} remaining)`}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
} 