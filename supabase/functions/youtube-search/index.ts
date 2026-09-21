// YouTube search edge function
// Searches YouTube for songs by name without requiring an API key.
// Uses YouTube's internal Innertube API which returns structured JSON.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface YTSearchResult {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number; // seconds
}

// Parse ISO 8601 duration (PT1H2M3S) to seconds
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || "0", 10);
  const m = parseInt(match[2] || "0", 10);
  const s = parseInt(match[3] || "0", 10);
  return h * 3600 + m * 60 + s;
}

// Extract artist from title - tries to split on " - " or " – "
function extractArtist(title: string): string {
  // Remove common noise patterns
  let clean = title.replace(/\(.*?official.*?\)/gi, "").replace(/\[.*?official.*?\]/gi, "");
  clean = clean.replace(/\(.*?audio.*?\)/gi, "").replace(/\[.*?audio.*?\]/gi, "");
  clean = clean.replace(/\(.*?lyrics.*?\)/gi, "").replace(/\[.*?lyrics.*?\]/gi, "");
  clean = clean.replace(/\(.*?music video.*?\)/gi, "").replace(/\[.*?music video.*?\]/gi, "");
  clean = clean.replace(/\(.*?visualizer.*?\)/gi, "").replace(/\[.*?visualizer.*?\]/gi, "");
  clean = clean.replace(/\|.*$/gi, "").trim();

  const separators = [" - ", " – ", " — ", " ~ "];
  for (const sep of separators) {
    if (clean.includes(sep)) {
      const parts = clean.split(sep);
      if (parts.length >= 2) {
        return parts[0].trim();
      }
    }
  }
  // If no separator, try to extract from "Topic" or channel-like patterns
  return "Unknown Artist";
}

function cleanTitle(title: string): string {
  let clean = title.replace(/\(.*?official.*?\)/gi, "").replace(/\[.*?official.*?\]/gi, "");
  clean = clean.replace(/\(.*?audio.*?\)/gi, "").replace(/\[.*?audio.*?\]/gi, "");
  clean = clean.replace(/\(.*?lyrics.*?\)/gi, "").replace(/\[.*?lyrics.*?\]/gi, "");
  clean = clean.replace(/\(.*?music video.*?\)/gi, "").replace(/\[.*?music video.*?\]/gi, "");
  clean = clean.replace(/\(.*?visualizer.*?\)/gi, "").replace(/\[.*?visualizer.*?\]/gi, "");
  clean = clean.replace(/\|.*$/gi, "").trim();
  // Remove leading "Artist - " to get just the song name
  const separators = [" - ", " – ", " — ", " ~ "];
  for (const sep of separators) {
    if (clean.includes(sep)) {
      const parts = clean.split(sep);
      if (parts.length >= 2) {
        return parts.slice(1).join(sep).trim();
      }
    }
  }
  return clean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q");
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "15", 10), 25);

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Missing search query parameter 'q'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use YouTube's Innertube search API (no API key required)
    // First, get a client context
    const initData = {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240501.00.00",
        },
      },
      query: query + " song",
    };

    const searchUrl = "https://www.youtube.com/youtubei/v1/search?prettyPrint=false";
    
    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(initData),
    });

    if (!response.ok) {
      // Fallback: scrape the YouTube search page
      return await fallbackScrapeSearch(query, limit);
    }

    const data = await response.json();
    const results: YTSearchResult[] = [];

    // Parse the Innertube response - look for video renderers
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (results.length >= limit) break;
        const renderer = item?.videoRenderer;
        if (renderer) {
          const videoId = renderer.videoId;
          if (!videoId) continue;
          const rawTitle = renderer.title?.runs?.map((r: any) => r.text).join("") || renderer.title?.simpleText || "";
          const thumbnail = renderer.thumbnail?.thumbnails?.pop()?.url || "";
          const durationText = renderer.lengthText?.simpleText || renderer.lengthText?.accessibility?.accessibilityData?.label || "";
          const channelName = renderer.ownerText?.runs?.[0]?.text || renderer.shortBylineText?.runs?.[0]?.text || "";
          
          let duration = 0;
          // Try to parse from accessibility label like "3 minutes 45 seconds"
          if (durationText) {
            const minMatch = durationText.match(/(\d+)\s*minute/);
            const secMatch = durationText.match(/(\d+)\s*second/);
            const hourMatch = durationText.match(/(\d+)\s*hour/);
            if (minMatch || secMatch || hourMatch) {
              const h = hourMatch ? parseInt(hourMatch[1], 10) : 0;
              const m = minMatch ? parseInt(minMatch[1], 10) : 0;
              const s = secMatch ? parseInt(secMatch[1], 10) : 0;
              duration = h * 3600 + m * 60 + s;
            } else {
              // Try colon format like 3:45
              const colonMatch = durationText.match(/(\d+):(\d+)(?::(\d+))?/);
              if (colonMatch) {
                if (colonMatch[3]) {
                  duration = parseInt(colonMatch[1], 10) * 3600 + parseInt(colonMatch[2], 10) * 60 + parseInt(colonMatch[3], 10);
                } else {
                  duration = parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
                }
              }
            }
          }
          
          results.push({
            videoId,
            title: cleanTitle(rawTitle),
            artist: channelName || extractArtist(rawTitle),
            thumbnail: thumbnail.replace(/=w\d+-h\d+.*$/, "=w480-h360-c-k-c0x00ffffff-no-rj"),
            duration,
          });
        }
      }
    }

    if (results.length === 0) {
      return await fallbackScrapeSearch(query, limit);
    }

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fallback: scrape YouTube search results page HTML
async function fallbackScrapeSearch(query: string, limit: number): Promise<Response> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " song")}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "YouTube search unavailable", results: [] }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await response.text();
    
    // Extract ytInitialData JSON from the page
    const dataMatch = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/s);
    if (!dataMatch) {
      return new Response(
        JSON.stringify({ results: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = JSON.parse(dataMatch[1]);
    const results: YTSearchResult[] = [];

    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (results.length >= limit) break;
        const renderer = item?.videoRenderer;
        if (renderer) {
          const videoId = renderer.videoId;
          if (!videoId) continue;
          const rawTitle = renderer.title?.runs?.map((r: any) => r.text).join("") || renderer.title?.simpleText || "";
          const thumbnail = renderer.thumbnail?.thumbnails?.pop()?.url || "";
          const durationText = renderer.lengthText?.simpleText || "";
          const channelName = renderer.ownerText?.runs?.[0]?.text || "";
          
          let duration = 0;
          const colonMatch = durationText.match(/(\d+):(\d+)(?::(\d+))?/);
          if (colonMatch) {
            if (colonMatch[3]) {
              duration = parseInt(colonMatch[1], 10) * 3600 + parseInt(colonMatch[2], 10) * 60 + parseInt(colonMatch[3], 10);
            } else {
              duration = parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
            }
          }

          results.push({
            videoId,
            title: cleanTitle(rawTitle),
            artist: channelName || extractArtist(rawTitle),
            thumbnail: thumbnail.replace(/=w\d+-h\d+.*$/, "=w480-h360-c-k-c0x00ffffff-no-rj"),
            duration,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Search failed", results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
