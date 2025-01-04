import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoId, title, address, latitude, longitude, videoUrl, pin } = await request.json()

    // Create location
    const location = await prisma.location.create({
      data: {
        address,
        latitude,
        longitude,
      },
    })

    // Create playlist
    const playlist = await prisma.playlist.create({
      data: {
        title,
        pin,
        userId: session.user.id,
        locationId: location.id,
      },
    })

    // Create video
    const video = await prisma.video.create({
      data: {
        id: videoId,
        title,
        url: videoUrl,
        qrCode: `${process.env.NEXTAUTH_URL}/watch/${videoId}`,
        playlistId: playlist.id,
      },
    })

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error saving video:', error)
    return NextResponse.json(
      { error: 'Failed to save video' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('id')
    const pin = searchParams.get('pin')

    if (!videoId || !pin) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        playlist: {
          include: {
            location: true,
          },
        },
      },
    })

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    if (video.playlist.pin !== pin) {
      return NextResponse.json(
        { error: 'Incorrect PIN' },
        { status: 401 }
      )
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error fetching video:', error)
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    )
  }
} 