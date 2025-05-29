import { testProxy } from '@/utils/proxyTester'
import { NextApiRequest, NextApiResponse } from 'next'

interface ProxyTestRequest {
    proxies: string[]
    testUrl: string
    timeout: number
    workers?: number
}

// Worker pool implementation with streaming
async function processProxiesWithWorkersStreaming(
    proxies: string[],
    testUrl: string,
    timeout: number,
    maxWorkers: number = 10,
    onResult: (result: any, index: number) => void,
    signal: AbortSignal
) {
    const results: any[] = new Array(proxies.length)
    const workers: Promise<void>[] = []
    let currentIndex = 0
    let completedCount = 0

    // Create worker function
    const worker = async (workerId: number) => {
        while (currentIndex < proxies.length && !signal.aborted) {
            const index = currentIndex++
            const proxy = proxies[index]

            try {
                console.log(`Worker ${workerId} testing proxy ${index + 1}/${proxies.length}: ${proxy}`)
                const result = await testProxy(proxy, testUrl, timeout, signal)
                results[index] = result

                if (signal.aborted) {
                    console.log(`Worker ${workerId} aborted after test for proxy ${index + 1}`)
                    break
                }

                onResult(result, index)
                completedCount++
            } catch (error) {
                if (signal.aborted) {
                    console.log(`Worker ${workerId} aborted during error handling for proxy ${index + 1}`)
                    break
                }

                const errorResult = {
                    proxy,
                    status: 'error' as const,
                    message: error instanceof Error ? error.message : 'Unknown error',
                }
                results[index] = errorResult
                onResult(errorResult, index)
                completedCount++
            }
        }
        console.log(`Worker ${workerId} finished or aborted.`)
    }

    // Start workers
    for (let i = 0; i < Math.min(maxWorkers, proxies.length); i++) {
        workers.push(worker(i + 1))
    }

    // Wait for all workers to complete or abort
    await Promise.all(workers)

    return results
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const abortController = new AbortController()
    req.on('close', () => {
        console.log('Client disconnected, aborting test from API handler')
        abortController.abort()
    })

    try {
        const { proxies, testUrl, timeout, workers = 10 }: ProxyTestRequest = req.body

        if (!proxies || !Array.isArray(proxies) || proxies.length === 0) {
            return res.status(400).json({ error: 'Proxies array is required' })
        }

        if (!testUrl) {
            return res.status(400).json({ error: 'Test URL is required' })
        }

        const actualWorkers = Math.max(1, Math.min(50, workers))
        console.log(`Starting proxy test with ${actualWorkers} workers for ${proxies.length} proxies`)

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Transfer-Encoding', 'chunked')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const startTime = Date.now()
        let completedResults: any[] = []

        // Stream results as they complete
        const onResult = (result: any, index: number) => {
            if (abortController.signal.aborted) return // Don't send if already aborted

            completedResults.push(result)
            const streamData = JSON.stringify({
                type: 'result',
                result,
                index
            }) + '\n'

            try {
                res.write(streamData)
            } catch (e) {
                console.error("Error writing to response stream:", e)
                abortController.abort() // Abort if stream is broken
            }
        }

        // Process proxies with streaming
        await processProxiesWithWorkersStreaming(
            proxies,
            testUrl,
            timeout,
            actualWorkers,
            onResult,
            abortController.signal
        )

        if (abortController.signal.aborted) {
            console.log("Test was aborted, skipping final meta send.")
            if (!res.writableEnded) res.end()
            return
        }

        const endTime = Date.now()
        const totalTime = endTime - startTime

        console.log(`Completed proxy testing in ${totalTime}ms`)
        console.log(`Working: ${completedResults.filter(r => r.status === 'success').length}/${completedResults.length}`)

        // Send final metadata
        const finalData = JSON.stringify({
            type: 'complete',
            meta: {
                totalTime,
                workersUsed: actualWorkers,
                totalProxies: proxies.length,
                workingProxies: completedResults.filter(r => r.status === 'success').length
            }
        }) + '\n'

        if (!res.writableEnded) {
            res.write(finalData)
            res.end()
        }

    } catch (error) {
        if (!abortController.signal.aborted) {
            console.error('Error in proxy test API:', error)
        }

        if (!res.headersSent && !res.writableEnded) {
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            })
        } else if (!res.writableEnded) {
            const errorData = JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            }) + '\n'
            res.write(errorData)
            res.end()
        }
    }
} 