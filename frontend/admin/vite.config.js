// Force reload configuration for darkMode class strategy
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const httpsCertificatePath = path.resolve(__dirname, '../../.cert/hrm-dev.pfx')
const httpsEnabled = fs.existsSync(httpsCertificatePath)

// https://vitejs.dev/config/
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    https: httpsEnabled ? {
      pfx: fs.readFileSync(httpsCertificatePath),
      passphrase: process.env.HRM_HTTPS_CERT_PASSWORD || 'hrm-dev-only',
    } : undefined,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'ws://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared').replace(/\\/g, '/'),
      // Map React packages to the root node_modules to ensure a single shared context instance
      'react': path.resolve(__dirname, '../../node_modules/react').replace(/\\/g, '/'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom').replace(/\\/g, '/'),
      'react-router-dom': path.resolve(__dirname, '../../node_modules/react-router-dom').replace(/\\/g, '/'),
      'recharts': path.resolve(__dirname, '../../node_modules/recharts').replace(/\\/g, '/'),
      'lucide-react': path.resolve(__dirname, '../../node_modules/lucide-react').replace(/\\/g, '/')
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'socket.io-client',
      'recharts',
      'lucide-react',
      'zustand',
      'react-hot-toast',
      'emoji-picker-react',
      'date-fns',
      'framer-motion'
    ]
  }
})
