import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateSwapRequest } from '@/types/swap'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const swapId = parseInt(params.id)

    if (isNaN(swapId)) {
      return NextResponse.json(
        { error: 'Invalid swap ID' },
        { status: 400 }
      )
    }

    const swap = await prisma.swap.findUnique({
      where: { id: swapId },
      include: {
        offer: true
      }
    })

    if (!swap) {
      return NextResponse.json(
        { error: 'Swap not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(swap)
  } catch (error) {
    console.error('Error fetching swap:', error)
    return NextResponse.json(
      { error: 'Failed to fetch swap' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const swapId = parseInt(params.id)
    const body: UpdateSwapRequest = await request.json()

    if (isNaN(swapId)) {
      return NextResponse.json(
        { error: 'Invalid swap ID' },
        { status: 400 }
      )
    }

    // Check if swap exists
    const existingSwap = await prisma.swap.findUnique({
      where: { id: swapId }
    })

    if (!existingSwap) {
      return NextResponse.json(
        { error: 'Swap not found' },
        { status: 404 }
      )
    }

    // Update swap with provided fields
    const updateData: any = {}
    if (body.status) updateData.status = body.status
    if (body.secretHash) updateData.secretHash = body.secretHash
    if (body.secret) updateData.secret = body.secret

    // Mintlayer HTLC updates
    if (body.creatorHtlcTxHash) updateData.creatorHtlcTxHash = body.creatorHtlcTxHash
    if (body.creatorHtlcTxHex) updateData.creatorHtlcTxHex = body.creatorHtlcTxHex
    if (body.takerHtlcTxHash) updateData.takerHtlcTxHash = body.takerHtlcTxHash
    if (body.takerHtlcTxHex) updateData.takerHtlcTxHex = body.takerHtlcTxHex
    if (body.claimTxHash) updateData.claimTxHash = body.claimTxHash
    if (body.claimTxHex) updateData.claimTxHex = body.claimTxHex

    // BTC HTLC updates
    if (body.btcHtlcAddress) updateData.btcHtlcAddress = body.btcHtlcAddress
    if (body.btcRedeemScript) updateData.btcRedeemScript = body.btcRedeemScript
    if (body.btcHtlcTxId) updateData.btcHtlcTxId = body.btcHtlcTxId
    if (body.btcHtlcTxHex) updateData.btcHtlcTxHex = body.btcHtlcTxHex
    if (body.btcClaimTxId) updateData.btcClaimTxId = body.btcClaimTxId
    if (body.btcClaimTxHex) updateData.btcClaimTxHex = body.btcClaimTxHex
    if (body.btcRefundTxId) updateData.btcRefundTxId = body.btcRefundTxId
    if (body.btcRefundTxHex) updateData.btcRefundTxHex = body.btcRefundTxHex

    const updatedSwap = await prisma.swap.update({
      where: { id: swapId },
      data: updateData,
      include: {
        offer: true
      }
    })

    // If swap is completed, update offer status
    if (body.status === 'completed') {
      await prisma.offer.update({
        where: { id: updatedSwap.offerId },
        data: { status: 'completed' }
      })
    }

    return NextResponse.json(updatedSwap)
  } catch (error) {
    console.error('Error updating swap:', error)
    return NextResponse.json(
      { error: 'Failed to update swap' },
      { status: 500 }
    )
  }
}
