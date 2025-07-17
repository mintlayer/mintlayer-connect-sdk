import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AcceptOfferRequest } from '@/types/swap'
import { isValidBTCAddress, isValidBTCPublicKey } from '@/lib/btc-request-builder'

export async function POST(request: NextRequest) {
  try {
    const body: AcceptOfferRequest = await request.json()

    // Validate required fields
    if (!body.offerId || !body.takerMLAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if offer exists and is open
    const offer = await prisma.offer.findUnique({
      where: { id: body.offerId }
    })

    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    if (offer.status !== 'open') {
      return NextResponse.json(
        { error: 'Offer is no longer available' },
        { status: 400 }
      )
    }

    // Validate BTC fields if BTC is involved
    if (offer.tokenA === 'BTC' || offer.tokenB === 'BTC') {
      if (!body.takerBTCAddress || !body.takerBTCPublicKey) {
        return NextResponse.json(
          { error: 'BTC address and public key required for BTC swaps' },
          { status: 400 }
        )
      }

      if (!isValidBTCAddress(body.takerBTCAddress)) {
        return NextResponse.json(
          { error: 'Invalid BTC address format' },
          { status: 400 }
        )
      }

      if (!isValidBTCPublicKey(body.takerBTCPublicKey)) {
        return NextResponse.json(
          { error: 'Invalid BTC public key format' },
          { status: 400 }
        )
      }
    }

    // Create swap and update offer status
    const [swap] = await prisma.$transaction([
      prisma.swap.create({
        data: {
          offerId: body.offerId,
          takerMLAddress: body.takerMLAddress,
          // @ts-ignore
          takerBTCAddress: body.takerBTCAddress || null,
          takerBTCPublicKey: body.takerBTCPublicKey || null,
          status: 'pending'
        },
        include: {
          offer: true
        }
      }),
      prisma.offer.update({
        where: { id: body.offerId },
        data: { status: 'taken' }
      })
    ])

    return NextResponse.json(swap, { status: 201 })
  } catch (error) {
    console.error('Error accepting offer:', error)
    return NextResponse.json(
      { error: 'Failed to accept offer' },
      { status: 500 }
    )
  }
}
