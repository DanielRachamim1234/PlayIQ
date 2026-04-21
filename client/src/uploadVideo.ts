// src/uploadVideo.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadVideoToStorage(blob: Blob, fileName: string): Promise<string> {
  const videoRef = ref(storage, `videos/${fileName}`);
  await uploadBytes(videoRef, blob);
  const url = await getDownloadURL(videoRef);
  return url;
}
