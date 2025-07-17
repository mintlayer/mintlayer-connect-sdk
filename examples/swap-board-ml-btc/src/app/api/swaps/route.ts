import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AcceptOfferRequest } from '@/types/swap'

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
    
    // Create swap and update offer status
    const [swap] = await prisma.$transaction([
      prisma.swap.create({
        data: {
          offerId: body.offerId,
          takerMLAddress: body.takerMLAddress,
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
