/**
 * YouTube URL Parser and Validator
 * Safely parses YouTube video and playlist URLs without any external dependencies.
 * Extracts standard video IDs and playlist IDs for official iframe embedding.
 */

/**
 * Validates and extracts YouTube video ID or playlist ID from standard URLs.
 * @param {string} inputUrl 
 * @returns {{ valid: boolean, type: 'video' | 'playlist' | null, id: string | null, cleanUrl: string | null, error?: string }}
 */
export function parseYouTubeUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return {
      valid: false,
      type: null,
      id: null,
      cleanUrl: null,
      error: 'Please enter a valid YouTube URL.'
    };
  }

  const trimmed = inputUrl.trim();

  // Basic sanity check
  if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
    return {
      valid: false,
      type: null,
      id: null,
      cleanUrl: null,
      error: 'URL must be a valid youtube.com or youtu.be link.'
    };
  }

  try {
    // Normalise URL if protocol is missing
    const urlString = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Check for Playlist (has 'list' parameter)
    const listParam = url.searchParams.get('list');
    const isPlaylistPath = url.pathname.includes('/playlist');

    // If it is explicitly a playlist URL or contains a list param without a primary video
    if (listParam && (isPlaylistPath || !url.searchParams.has('v'))) {
      // Validate playlist ID characters (alphanumeric, dashes, underscores)
      if (/^[a-zA-Z0-9_-]+$/.test(listParam)) {
        return {
          valid: true,
          type: 'playlist',
          id: listParam,
          cleanUrl: `https://www.youtube.com/playlist?list=${listParam}`,
        };
      } else {
        return {
          valid: false,
          type: null,
          id: null,
          cleanUrl: null,
          error: 'The playlist ID contains invalid characters.'
        };
      }
    }

    // Check for Standard Video in youtu.be shortlinks
    if (hostname === 'youtu.be' || hostname.endsWith('.youtu.be')) {
      const videoId = url.pathname.replace(/^\//, '').split('/')[0]?.split('?')[0];
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return {
          valid: true,
          type: 'video',
          id: videoId,
          cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }
    }

    // Check for Standard Video in youtube.com
    if (hostname.includes('youtube.com')) {
      // /watch?v=VIDEO_ID
      const vParam = url.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return {
          valid: true,
          type: 'video',
          id: vParam,
          cleanUrl: `https://www.youtube.com/watch?v=${vParam}`,
        };
      }

      // /embed/VIDEO_ID or /v/VIDEO_ID or /shorts/VIDEO_ID
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        const prefix = pathParts[0].toLowerCase();
        const candidateId = pathParts[1];

        if (['embed', 'v', 'shorts'].includes(prefix) && /^[a-zA-Z0-9_-]{11}$/.test(candidateId)) {
          return {
            valid: true,
            type: 'video',
            id: candidateId,
            cleanUrl: `https://www.youtube.com/watch?v=${candidateId}`,
          };
        }
      }

      // If URL had both ?v= and ?list=, but user entered watch URL with list
      if (listParam && /^[a-zA-Z0-9_-]+$/.test(listParam)) {
        return {
          valid: true,
          type: 'playlist',
          id: listParam,
          cleanUrl: `https://www.youtube.com/playlist?list=${listParam}`,
        };
      }
    }

    return {
      valid: false,
      type: null,
      id: null,
      cleanUrl: null,
      error: 'Could not extract a valid 11-character YouTube video ID or playlist ID.'
    };
  } catch (err) {
    return {
      valid: false,
      type: null,
      id: null,
      cleanUrl: null,
      error: 'Malformed URL format.'
    };
  }
}
