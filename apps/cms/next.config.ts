import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  output: 'standalone',
  // Pozwala wchodzić w dev z innych urządzeń w LAN (telefon → http://192.168.x.x:3000/admin).
  // Bez tego Next.js 15+ blokuje requesty z hostów spoza localhost (cross-origin warning + HMR fail).
  allowedDevOrigins: ['192.168.0.19', '*.local', '192.168.0.*'],
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
  // W monorepo Next.js domyślnie próbuje wykryć "workspace root" idąc w górę
  // od katalogu projektu. Bez outputFileTracingRoot Turbopack myli ścieżki
  // i nie znajduje `next/package.json` (hoisted do root node_modules).
  outputFileTracingRoot: path.resolve(dirname, '../..'),
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    // Musi być spójne z outputFileTracingRoot powyżej (oba wskazują na root monorepo).
    root: path.resolve(dirname, '../..'),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
