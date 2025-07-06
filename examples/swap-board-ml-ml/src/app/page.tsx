import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Mintlayer P2P Swap Board
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Trade Mintlayer tokens directly with other users using secure HTLC atomic swaps
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Link href="/offers" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
              <div className="text-mintlayer-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Offers</h3>
              <p className="text-gray-600">
                View available token swap offers from other users.
              </p>
            </div>
          </Link>

          <Link href="/create" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
              <div className="text-mintlayer-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Offer</h3>
              <p className="text-gray-600">
                Post your own token swap offer and wait for other users to accept it.
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-12 bg-blue-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">How it works</h2>
          <div className="text-left max-w-2xl mx-auto">
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Create or browse token swap offers</li>
              <li>Accept an offer to initiate an atomic swap</li>
              <li>Both parties create Hash Time Locked Contracts (HTLCs)</li>
              <li>Exchange secrets to claim tokens securely</li>
              <li>Manual refund available if swap fails after timelock expires</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
