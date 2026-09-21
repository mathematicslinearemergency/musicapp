// Loads the YouTube IFrame Player API once and resolves with the global YT.Player constructor.

let apiPromise: Promise<typeof YT> | null = null;

export function loadYouTubeAPI(): Promise<typeof YT> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') return;

    // If already loaded
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    // Inject the script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    // The API calls window.onYouTubeIframeAPIReady when ready
    window.onYouTubeIframeAPIReady = () => {
      resolve(window.YT);
    };
  });

  return apiPromise;
}

// Augment the global window for TypeScript
declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}
