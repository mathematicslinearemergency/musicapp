// Spotify Import edge function
// Accepts a Spotify track or playlist URL, scrapes Spotify's public embed page
// to extract track names + artists, then searches YouTube for each to find
// the equivalent video. Returns a list of matched songs.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SpotifyTrack {
  title: string;
  artist: string;
}

interface MatchedSong {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  spotifyTitle: string;
  spotifyArtist: string;
}

// Parse Spotify URL to determine type and ID
function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  const patterns = [
    /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/album\/([a-zA-Z0-9]+)/,
    /spotify\.link\/([a-zA-Z0-9]+)/,
  /spotify:track:([a-zA-Z0-9]+)/,
    /spotify:playlist:([a-zA-Z0-9]+)/,
  /spotify:album:([a-zA-Z0-9]+)/,
  /^([a-zA-Z0-9]{22})$/,
  /^([a-zA-Z0-9]{16})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) {
      let type = "track";
      if (p.source.includes("playlist")) type = "playlist";
      else if (p.source.includes("album")) type = "album";
      return { type, id: m[1] };
    }
  }
  return null;
}

// Fetch the Spotify embed page and extract track data from embedded JSON
async function getSpotifyTracks(type: string, id: string): Promise<SpotifyTrack[]> {
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
  const response = await fetch(embedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Spotify page (${response.status})`);
  }

  const html = await response.text();
  const tracks: SpotifyTrack[] = [];

  // The embed page contains a <script id="__NEXT_DATA__" type="application/json"> with all data
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const entity = data?.props?.pageProps?.state?.data?.entity;
      if (entity) {
        if (entity.trackList) {
          for (const t of entity.trackList) {
            tracks.push({
              title: t.title,
              artist: Array.isArray(t.subtitle) ? t.subtitle.join(", ") : (t.subtitle || "Unknown Artist"),
            });
          }
        } else if (entity.name) {
          // Single track
          tracks.push({
            title: entity.name,
            artist: Array.isArray(entity.artists) ? entity.artists.map((a: any) => a.name).join(", ") : (entity.artists?.[0]?.name || entity.subtitle || "Unknown Artist"),
          });
        }
      }
    } catch {
      // fall through to regex
    }
  }

  // Fallback: parse meta tags and track list from the embed HTML
  if (tracks.length === 0) {
    // Try og:title for single track
    const ogTitle = html.match(/<meta property="og:title" content="([^"]*)"/);
    const ogDesc = html.match(/<meta property="og:description" content="([^"]*)"/);
    if (ogTitle) {
      const title = ogTitle[1];
      let artist = "Unknown Artist";
      if (ogDesc) {
        // Description is usually "Song • Artist • 2021" or "Playlist • 50 songs"
        const parts = ogDesc[1].split("•");
        if (parts.length >= 2) {
          artist = parts[1].trim();
        }
      }
      tracks.push({ title, artist });
    }

    // Try to find track list entries in the HTML
    const trackMatches = [...html.matchAll(/"title":"([^"]{2,100})"[^}]*"subtitle":"([^"]{2,100})"/g)];
    for (const m of trackMatches) {
      const title = m[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"');
      const artist = m[2].replace(/\\u0026/g, "&").replace(/\\"/g, '"');
      if (!tracks.some((t) => t.title === title)) {
        tracks.push({ title, artist });
      }
    }
  }

  // Another fallback: look for the resource data in script tags
  if (tracks.length === 0) {
    const resourceMatches = [...html.matchAll(/"name":"([^"]{2,100})","artists":\[\{"name":"([^"]{2,100})"/g)];
    for (const m of resourceMatches) {
      const title = m[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"');
      const artist = m[2].replace(/\\u0026/g, "&").replace(/\\"/g, '"');
      if (!tracks.some((t) => t.title === title)) {
        tracks.push({ title, artist });
      }
    }
  }

  return tracks;
}

// Search YouTube for a song (reuses the same innertube approach as youtube-search)
async function searchYouTube(query: string): Promise<MatchedSong | null> {
  const initData = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20240501.00.00",
      },
    },
    query: query,
  };

  try {
    const response = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(initData),
    });

    if (!response.ok) {
      // Fallback to scraping
      return await scrapeYouTube(query);
    }

    const data = await response.json();
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const renderer = item?.videoRenderer;
        if (renderer) {
          const videoId = renderer.videoId;
          if (!videoId) continue;
          const rawTitle = renderer.title?.runs?.map((r: any) => r.text).join("") || renderer.title?.simpleText || "";
          const thumbnail = renderer.thumbnail?.thumbnails?.pop()?.url || "";
          const durationText = renderer.lengthText?.simpleText || "";
          const channelName = renderer.ownerText?.runs?.[0]?.text || renderer.shortBylineText?.runs?.[0]?.text || "";

          let duration = 0;
          const colonMatch = durationText.match(/(\d+):(\d+)(?::(\d+))?/);
          if (colonMatch) {
            if (colonMatch[3]) {
              duration = parseInt(colonMatch[1], 10) * 3600 + parseInt(colonMatch[2], 10) * 60 + parseInt(colonMatch[3], 10);
            } else {
              duration = parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
            }
          }

          return {
            videoId,
            title: rawTitle,
            artist: channelName,
            thumbnail: thumbnail.replace(/=w\d+-h\d+.*$/, "=w480-h360-c-k-c0x00ffffff-no-rj"),
            duration,
            spotifyTitle: "",
            spotifyArtist: "",
          };
        }
      }
    }
  } catch {
    // try scraping fallback
  }

  return scrapeYouTube(query);
}

async function scrapeYouTube(query: string): Promise<MatchedSong | null> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const dataMatch = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/s);
    if (!dataMatch) return null;
    const data = JSON.parse(dataMatch[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
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
          return {
            videoId,
            title: rawTitle,
            artist: channelName,
            thumbnail: thumbnail.replace(/=w\d+-h\d+.*$/, "=w480-h360-c-k-c0x00ffffff-no-rj"),
            duration,
            spotifyTitle: "",
            spotifyArtist: "",
          };
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const spotifyUrl = url.searchParams.get("url");

    if (!spotifyUrl) {
      return new Response(
        JSON.stringify({ error: "Missing 'url' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = parseSpotifyUrl(spotifyUrl);
    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "Invalid Spotify URL. Please provide a track or playlist link." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch tracks from Spotify
    const spotifyTracks = await getSpotifyTracks(parsed.type, parsed.id);

    if (spotifyTracks.length === 0) {
      return new Response(
        JSON.stringify({ error: "Could not find any tracks in this Spotify link. The link may be private or region-restricted." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search YouTube for each track (limit to 50 tracks max)
    const tracksToProcess = spotifyTracks.slice(0, 50);
    const matched: MatchedSong[] = [];
    const notFound: SpotifyTrack[] = [];

    // Process in batches of 5 for speed
    const batchSize = 5;
    for (let i = 0; i < tracksToProcess.length; i += batchSize) {
      const batch = tracksToProcess.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (track) => {
          const query = `${track.title} ${track.artist}`;
          const match = await searchYouTube(query);
          if (match) {
            match.spotifyTitle = track.title;
            match.spotifyArtist = track.artist;
            return match;
          }
          return null;
        })
      );
      results.forEach((r, i) => {
        if (r) matched.push(r);
        else notFound.push(batch[i]);
      });
    }

    return new Response(
      JSON.stringify({
        type: parsed.type,
        totalTracks: spotifyTracks.length,
        matched: matched,
        notFound: notFound,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Import failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
