// YouTube Download edge function
// Given a YouTube video ID, fetches the audio stream URL and proxies it
// back as a downloadable audio file (MPEG/MP4).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const videoId = url.searchParams.get("id");
    const title = url.searchParams.get("title") || "audio";

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Missing 'id' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the YouTube watch page to extract player response data
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const watchResponse = await fetch(watchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!watchResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch video page" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await watchResponse.text();

    // Extract ytInitialPlayerResponse from the page
    const playerResponseMatch = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});<\/script>/s);
    let playerResponse: any = null;

    if (playerResponseMatch) {
      try {
        playerResponse = JSON.parse(playerResponseMatch[1]);
      } catch {
        // try another pattern
      }
    }

    if (!playerResponse) {
      // Try embedded pattern
      const embeddedMatch = html.match(/"playerResponse":({.+?}),"playerAds"/s);
      if (embeddedMatch) {
        try {
          playerResponse = JSON.parse(embeddedMatch[1]);
        } catch {
          // ignore
        }
      }
    }

    if (!playerResponse) {
      return new Response(
        JSON.stringify({ error: "Could not extract player data from YouTube" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get streaming data
    const streamingData = playerResponse?.streamingData;
    if (!streamingData) {
      return new Response(
        JSON.stringify({ error: "No streaming data available for this video" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prefer audio-only formats, fall back to muxed
    const formats = [
      ...(streamingData.adaptiveFormats || []),
      ...(streamingData.formats || []),
    ];

    if (formats.length === 0) {
      return new Response(
        JSON.stringify({ error: "No downloadable formats found" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find best audio-only format (highest bitrate audio)
    const audioFormats = formats
      .filter((f: any) => f.mimeType?.includes("audio"))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

    // Fallback to muxed (has video+audio)
    const muxedFormats = formats
      .filter((f: any) => f.mimeType?.includes("video") && f.audioQuality)
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

    const bestFormat = audioFormats[0] || muxedFormats[0] || formats[0];

    if (!bestFormat?.url) {
      // Some formats need signature deciphering - try the ones with direct URLs
      const urlFormat = formats.find((f: any) => f.url);
      if (!urlFormat) {
        return new Response(
          JSON.stringify({ error: "This video requires signature deciphering and cannot be downloaded directly" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return proxyAudio(urlFormat.url, title, urlFormat.mimeType);
    }

    return proxyAudio(bestFormat.url, title, bestFormat.mimeType);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Download failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function proxyAudio(streamUrl: string, title: string, mimeType: string): Promise<Response> {
  const audioResponse = await fetch(streamUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Referer": "https://www.youtube.com/",
    },
  });

  if (!audioResponse.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to download audio stream" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const ext = mimeType?.includes("mp4") ? "m4a" : mimeType?.includes("webm") ? "webm" : "mp3";
  const safeTitle = title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "audio";

  // Stream the audio back to the client
  return new Response(audioResponse.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": mimeType || "audio/mpeg",
      "Content-Disposition": `attachment; filename="${safeTitle}.${ext}"`,
      "Content-Length": audioResponse.headers.get("content-length") || "",
      "Accept-Ranges": "bytes",
    },
  });
}
