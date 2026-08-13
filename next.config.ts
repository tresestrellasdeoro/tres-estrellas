const securityHeaders = [
  // Prevent clickjacking — disallow embedding in iframes from other origins
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevent MIME-type sniffing attacks
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer information sent to other sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features not used by the app
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Force HTTPS for 1 year (includeSubDomains)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
