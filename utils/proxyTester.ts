import axios, { CancelTokenSource } from 'axios'
import { SocksProxyAgent } from 'socks-proxy-agent'

export interface ProxyResult {
    proxy: string
    status: 'success' | 'error'
    message: string
    responseTime?: number
    ip?: string
}

interface ParsedProxy {
    host: string
    port: number
    username?: string
    password?: string
    protocol: 'http' | 'https' | 'socks4' | 'socks5'
}

function parseProxy(proxyString: string): ParsedProxy {
    const trimmed = proxyString.trim()

    // Handle socks5:// prefix
    if (trimmed.startsWith('socks5://')) {
        const url = new URL(trimmed)
        return {
            host: url.hostname,
            port: parseInt(url.port) || 1080,
            username: url.username || undefined,
            password: url.password || undefined,
            protocol: 'socks5'
        }
    }

    // Handle socks4:// prefix
    if (trimmed.startsWith('socks4://')) {
        const url = new URL(trimmed)
        return {
            host: url.hostname,
            port: parseInt(url.port) || 1080,
            username: url.username || undefined,
            password: url.password || undefined,
            protocol: 'socks4'
        }
    }

    // Handle http:// and https:// prefix
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const url = new URL(trimmed)
        return {
            host: url.hostname,
            port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
            username: url.username || undefined,
            password: url.password || undefined,
            protocol: url.protocol === 'https:' ? 'https' : 'http'
        }
    }

    // Handle ip:port:username:password format
    const parts = trimmed.split(':')
    if (parts.length === 4) {
        return {
            host: parts[0],
            port: parseInt(parts[1]),
            username: parts[2],
            password: parts[3],
            protocol: 'http'
        }
    }

    // Handle ip:port format
    if (parts.length === 2) {
        return {
            host: parts[0],
            port: parseInt(parts[1]),
            protocol: 'http'
        }
    }

    throw new Error(`Invalid proxy format: ${proxyString}`)
}

export async function testProxy(
    proxyString: string,
    testUrl: string,
    timeoutSeconds: number = 10,
    signal?: AbortSignal
): Promise<ProxyResult> {
    const startTime = Date.now()
    let source: CancelTokenSource | null = null

    if (signal) {
        source = axios.CancelToken.source()
        signal.addEventListener('abort', () => {
            source?.cancel('Test aborted by user.')
        })
    }

    try {
        const proxy = parseProxy(proxyString)

        if (!proxy.host || isNaN(proxy.port)) {
            throw new Error('Invalid host or port')
        }

        let agent: any
        let proxyAuth: string | undefined

        if (proxy.protocol === 'socks4' || proxy.protocol === 'socks5') {
            // SOCKS proxy
            let socksUrl = `${proxy.protocol}://${proxy.host}:${proxy.port}`
            if (proxy.username && proxy.password) {
                socksUrl = `${proxy.protocol}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
            }
            agent = new SocksProxyAgent(socksUrl)
        } else {
            // HTTP proxy
            if (proxy.username && proxy.password) {
                proxyAuth = Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')
            }
        }

        const config: any = {
            timeout: timeoutSeconds * 1000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            // Disable SSL verification for proxy testing
            httpsAgent: agent || undefined,
            httpAgent: agent || undefined,
            maxRedirects: 5,
            validateStatus: function (status: number) {
                return status >= 200 && status < 400; // Accept redirects as success
            },
            cancelToken: source?.token
        }

        // For HTTPS URLs, disable SSL verification to avoid cert issues
        if (testUrl.startsWith('https://')) {
            const https = require('https')
            if (!agent) {
                config.httpsAgent = new https.Agent({
                    rejectUnauthorized: false,
                    keepAlive: false
                })
            }
        }

        if (agent) {
            config.httpsAgent = agent
            config.httpAgent = agent
        } else {
            // HTTP proxy configuration
            config.proxy = {
                host: proxy.host,
                port: proxy.port,
                ...(proxyAuth && {
                    auth: {
                        username: proxy.username!,
                        password: proxy.password!
                    }
                })
            }
        }

        const response = await axios.get(testUrl, config)
        const responseTime = Date.now() - startTime

        let detectedIp: string | undefined

        // Try to extract IP from common test URLs
        if (response.data && typeof response.data === 'object') {
            detectedIp = response.data.origin || response.data.ip || response.data.query
        } else if (typeof response.data === 'string') {
            // Try to extract IP from string response
            const ipMatch = response.data.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)
            if (ipMatch) {
                detectedIp = ipMatch[0]
            }
        }

        return {
            proxy: proxyString,
            status: 'success',
            message: `Connected successfully (${response.status})`,
            responseTime,
            ip: detectedIp
        }

    } catch (error: any) {
        if (axios.isCancel(error)) {
            return {
                proxy: proxyString,
                status: 'error',
                message: 'Test aborted by user',
            }
        }

        const responseTime = Date.now() - startTime
        let message = 'Connection failed'

        if (error.code === 'ECONNREFUSED') {
            message = 'Connection refused'
        } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            message = 'Connection timeout'
        } else if (error.code === 'ENOTFOUND') {
            message = 'Host not found'
        } else if (error.code === 'EPROTO' || error.message?.includes('SSL') || error.message?.includes('TLS')) {
            message = 'SSL/TLS error - try HTTP instead of HTTPS'
        } else if (error.response?.status === 407) {
            message = 'Proxy authentication required'
        } else if (error.response?.status === 403) {
            message = 'Forbidden (may require authentication)'
        } else if (error.response?.status === 502) {
            message = 'Bad Gateway - proxy server error'
        } else if (error.response?.status === 503) {
            message = 'Service Unavailable - proxy overloaded'
        } else if (error.message) {
            message = error.message
        }

        return {
            proxy: proxyString,
            status: 'error',
            message,
            responseTime: responseTime < 100 ? undefined : responseTime
        }
    }
} 