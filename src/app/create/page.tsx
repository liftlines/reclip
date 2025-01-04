'use client'

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { uploadVideo } from "@/lib/uploadVideo"

export default function CreateVideo() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [recording, setRecording] = useState(false)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [title, setTitle] = useState("")
  const [address, setAddress] = useState("")
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push("/")
    return null
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      setError("Failed to access camera")
    }
  }

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return

    const chunks: BlobPart[] = []
    const stream = videoRef.current.srcObject as MediaStream
    const mediaRecorder = new MediaRecorder(stream)

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" })
      setVideoBlob(blob)
    }

    mediaRecorder.start()
    setRecording(true)
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoBlob || !title || !address || !pin || pin.length !== 6) {
      setError("Please fill in all fields and ensure PIN is 6 digits")
      return
    }

    setLoading(true)
    try {
      // Get geolocation
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })

      // Generate video ID
      const videoId = crypto.randomUUID()

      // Upload video to Firebase
      const videoUrl = await uploadVideo(videoBlob, videoId)

      // Save metadata to database
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          title,
          address,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          videoUrl,
          pin,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save video metadata')
      }

      // Redirect to home page
      router.push('/')
    } catch (error) {
      console.error("Error saving video:", error)
      setError("Failed to save video")
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold">Create Video Instruction</h2>
          <p className="mt-1 text-sm text-gray-500">
            Record a video showing how to use equipment or appliances in your home
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="space-y-4">
          {!videoBlob ? (
            <>
              <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex justify-center space-x-4">
                {!videoRef.current?.srcObject && (
                  <button
                    onClick={startCamera}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Start Camera
                  </button>
                )}
                {videoRef.current?.srcObject && !recording && (
                  <button
                    onClick={startRecording}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Start Recording
                  </button>
                )}
                {recording && (
                  <button
                    onClick={stopRecording}
                    className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                  >
                    Stop Recording
                  </button>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                  6-Digit PIN
                </label>
                <input
                  type="password"
                  id="pin"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter 6-digit PIN"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? "Saving..." : "Save Video"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
} 