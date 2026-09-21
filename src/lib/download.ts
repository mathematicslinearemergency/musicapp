const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-download`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Triggers a download of the audio for a given YouTube video ID.
// Opens a streaming download in a new tab.
export function downloadSong(videoId: string, title: string): void {
  const safeTitle = title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'audio';
  const url = `${API_URL}?id=${encodeURIComponent(videoId)}&title=${encodeURIComponent(safeTitle)}`;
  
  // Create a temporary link and click it to trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeTitle}.mp3`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Check if a download is likely to succeed (lightweight check)
export async function checkDownloadAvailable(videoId: string): Promise<boolean> {
  try {
    const url = `${API_URL}?id=${encodeURIComponent(videoId)}&title=check`;
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        Authorization: `Bearer ${ANON_KEY}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
