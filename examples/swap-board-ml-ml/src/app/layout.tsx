import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mintlayer P2P Swap Board',
  description: 'Peer-to-peer token swaps on Mintlayer using HTLC atomic swaps',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <a href="/" className="text-xl font-bold text-mintlayer-600">
                    ML Swap Board
                  </a>
                </div>
                <div className="flex items-center space-x-4">
                  <a href="/offers" className="text-gray-700 hover:text-mintlayer-600">
                    Browse Offers
                  </a>
                  <a href="/create" className="bg-mintlayer-600 text-white px-4 py-2 rounded-md hover:bg-mintlayer-700">
                    Create Offer
                  </a>
                </div>
              </div>
            </div>
          </nav>
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
