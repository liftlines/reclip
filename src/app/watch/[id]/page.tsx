'use client'

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { getDistance } from "geolib"

interface VideoData {
  url: string
  playlist: {
    location: {
      latitude: number
      longitude: number
    }
  }
}

export default function WatchVideo() {
  const { id } = useParams()
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    // Get user's location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLoading(false)
      },
      (error) => {
        setError("Location access is required to watch this video")
        setLoading(false)
      }
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userLocation) return

    setLoading(true)
    try {
      const response = await fetch(`/api/videos?id=${id}&pin=${pin}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch video')
      }

      const distance = getDistance(
        userLocation,
        {
          latitude: data.playlist.location.latitude,
          longitude: data.playlist.location.longitude,
        }
      )

      if (distance > 20) {
        setError("You must be within 20 meters of the video location to watch it")
        return
      }

      setVideoData(data)
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Failed to verify access")
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {!videoData ? (
        <div className="mx-auto max-w-md">
          <h2 className="text-2xl font-bold">Enter PIN</h2>
          <p className="mt-1 text-sm text-gray-500">
            Please enter the 6-digit PIN to access this video
          </p>
          <form onSubmit={handleSubmit} className="mt-6">
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              placeholder="Enter 6-digit PIN"
              required
            />
            <button
              type="submit"
              className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Access Video
            </button>
          </form>
        </div>
      ) : (
        <div className="aspect-video">
          <video
            src={videoData.url}
            controls
            className="h-full w-full rounded-lg"
          />
        </div>
      )}
    </div>
  )
} 