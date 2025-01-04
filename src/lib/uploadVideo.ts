import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'

export async function uploadVideo(videoBlob: Blob, videoId: string): Promise<string> {
  try {
    const videoRef = ref(storage, `videos/${videoId}.webm`)
    await uploadBytes(videoRef, videoBlob)
    const url = await getDownloadURL(videoRef)
    return url
  } catch (error) {
    console.error('Error uploading video:', error)
    throw new Error('Failed to upload video')
  }
} 