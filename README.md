# Proxy Tester - Privacy-First & No-Log

A privacy-focused web application for testing HTTP and SOCKS proxies with authentication support. **Unlike other online proxy testers, this application runs entirely on your machine and NEVER logs or stores your proxy data.**

## 🔒 Privacy Features

- ✅ **ZERO LOGGING** - Your proxy data never leaves your browser
- ✅ **NO DATA STORAGE** - Proxies are tested in memory only
- ✅ **SELF-HOSTED** - Deploy on your own Vercel account
- ✅ **OPEN SOURCE** - Fully transparent code you can audit

**⚠️ Warning about online proxy testers:** Most online proxy testing services log and store the proxies you input, potentially compromising your proxy lists. This tool ensures your proxy data remains private.

## Features

- ✅ Test HTTP and HTTPS proxies
- ✅ Test SOCKS4 and SOCKS5 proxies
- ✅ Support for username:password authentication
- ✅ Parallel testing for speed
- ✅ Modern and responsive user interface
- ✅ Auto-copy working proxies
- ✅ IP detection through proxy
- ✅ Detailed response time statistics
- ✅ Privacy-first approach with no logging

## Supported Proxy Formats

1. **IP:Port** - `192.168.1.1:8080`
2. **IP:Port:Username:Password** - `192.168.1.1:8080:admin:password123`
3. **SOCKS5 URL** - `socks5://192.168.1.1:1080`
4. **SOCKS5 with Auth** - `socks5://user:pass@192.168.1.1:1080`
5. **HTTP URL** - `http://192.168.1.1:3128`

## Local Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd proxy-tester
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deploy on Vercel

### Method 1: Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Method 2: GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Connect your GitHub repository
4. Vercel will automatically deploy

## Usage

1. **Enter proxies**: Paste your proxy list to test (one per line)
2. **Configure options**:
   - Test URL (default: httpbin.org/ip)
   - Timeout in seconds (default: 10)
3. **Start testing**: Click "Test Proxies"
4. **View results**: See which proxies work with detailed statistics
5. **Copy working proxies**: Use the button to copy only working ones

## Recommended Test URLs

- `https://httpbin.org/ip` - Returns IP in JSON format
- `https://api.ipify.org?format=json` - IP in JSON format
- `https://icanhazip.com` - IP in text format
- `https://checkip.amazonaws.com` - IP in text format

## Project Structure

```
proxy-tester/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Main layout
│   └── page.tsx           # Home page
├── components/            # React components
│   └── ProxyTester.tsx    # Main component
├── pages/api/             # API Routes
│   └── test-proxies.ts    # Proxy testing endpoint
├── utils/                 # Utilities
│   └── proxyTester.ts     # Proxy testing logic
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Static typing
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client
- **socks-proxy-agent** - SOCKS proxy support

## API

### POST /api/test-proxies

Test a list of proxies.

**Request Body:**
```json
{
  "proxies": ["192.168.1.1:8080", "user:pass@proxy.com:3128"],
  "testUrl": "https://httpbin.org/ip",
  "timeout": 10
}
```

**Response:**
```json
{
  "results": [
    {
      "proxy": "192.168.1.1:8080",
      "status": "success",
      "message": "Connected successfully (200)",
      "responseTime": 1234,
      "ip": "203.0.113.1"
    }
  ]
}
```

## Privacy & Security

- **No logging**: Proxy data is never stored or logged anywhere
- **No tracking**: No analytics or tracking scripts
- **Self-contained**: All processing happens on your deployment
- **Open source**: Code is fully auditable for security
- **HTTPS only**: All connections are encrypted in production

## Limitations

- Tests are limited by browser CORS policies for direct requests
- Some proxies may require specific configurations
- Maximum timeout is 60 seconds to avoid Vercel timeouts

## Why Choose This Over Online Testers?

Most online proxy testing services:
- ❌ Log your proxy lists
- ❌ Store proxy data in databases
- ❌ May sell or share your proxy information
- ❌ Track your usage
- ❌ Closed source code

This proxy tester:
- ✅ Never logs proxy data
- ✅ Processes everything locally
- ✅ Open source and auditable
- ✅ Self-hosted on your account
- ✅ Privacy-first design

## Contributing

Contributions, issues and feature requests are welcome! Feel free to check the [issues page](../../issues).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details. 