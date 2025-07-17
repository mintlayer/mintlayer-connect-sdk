import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateOfferRequest } from '@/types/swap'
import { isValidBTCAddress, isValidBTCPublicKey } from '@/lib/btc-request-builder'

export async function GET() {
  try {
    const offers = await prisma.offer.findMany({
      where: {
        status: 'open'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(offers)
  } catch (error) {
    console.error('Error fetching offers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOfferRequest = await request.json()

    // Validate required fields
    if (!body.tokenA || !body.tokenB || !body.amountA || !body.amountB || !body.creatorMLAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate BTC fields if BTC is involved
    if (body.tokenA === 'BTC' || body.tokenB === 'BTC') {
      if (!body.creatorBTCAddress || !body.creatorBTCPublicKey) {
        return NextResponse.json(
          { error: 'BTC address and public key required for BTC offers' },
          { status: 400 }
        )
      }

      if (!isValidBTCAddress(body.creatorBTCAddress)) {
        return NextResponse.json(
          { error: 'Invalid BTC address format' },
          { status: 400 }
        )
      }

      if (!isValidBTCPublicKey(body.creatorBTCPublicKey)) {
        return NextResponse.json(
          { error: 'Invalid BTC public key format' },
          { status: 400 }
        )
      }
    }

    // Calculate price (amountB / amountA)
    const price = parseFloat(body.amountB) / parseFloat(body.amountA)

    const offer = await prisma.offer.create({
      data: {
        direction: `${body.tokenA}->${body.tokenB}`,
        tokenA: body.tokenA,
        tokenB: body.tokenB,
        amountA: body.amountA,
        amountB: body.amountB,
        price: price,
        creatorMLAddress: body.creatorMLAddress,
        // @ts-ignore
        creatorBTCAddress: body.creatorBTCAddress || null,
        creatorBTCPublicKey: body.creatorBTCPublicKey || null,
        contact: body.contact || null,
        status: 'open'
      }
    })

    return NextResponse.json(offer, { status: 201 })
  } catch (error) {
    console.error('Error creating offer:', error)
    return NextResponse.json(
      { error: 'Failed to create offer' },
      { status: 500 }
    )
  }
}
