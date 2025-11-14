const BASE_URL = "https://graphql.anilist.co";

async function fetchAnilist(query, variables) {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: query,
      variables: variables,
    }),
  });
  return response.json();
}

async function searchAnime(searchQuery, type) {
  const query = `
    query ($search: String!) {
      Page {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
          }
          format
        }
      }
    }`;
  const variables = { search: searchQuery };
  const data = await fetchAnilist(query, variables);
  return data.data.Page.media.map((anime) => ({
    id: "ani_" + anime.id.toString(),
    type: "series",
    name: anime.title.english || anime.title.romaji || anime.title.native,
    poster: anime.coverImage.large,
    format: anime.format,
  }));
}

async function getAnimeDetails(animeId) {
  const query = `
    query ($id: Int!) {
      Media(id: $id, type: ANIME) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
        }
        bannerImage
        genres
        averageScore
        seasonYear
        format
        episodes
        description
        status
        nextAiringEpisode {
          episode
        }
      }
    }`;
  const variables = { id: parseInt(animeId.split("_")[1]) };
  const data = await fetchAnilist(query, variables);
  const anime = data.data.Media;

  var videos = [];
  const episodeCount =
    anime.episodes || anime.nextAiringEpisode.episode - 1 || 0;
  const cleanDescription = anime.description
    ? anime.description.replace(/<\/?[^>]+(>|$)/g, "")
    : "";
  const title = anime.title.english || anime.title.romaji || anime.title.native;

  for (var i = 0; i < episodeCount; i++) {
    videos.push({
      id: `ani_${anime.id}_${title.replace("?", "").replace("!", "")}_${i + 1}`,
      title: `Episode ${i + 1}`,
      episode: episodeCount - i + 1,
      type: "episode",
      available: true,
    });
  }
  return {
    id: "ani_" + anime.id.toString(),
    type: "series",
    name: title,
    genres: anime.genres,
    poster: anime.coverImage.large,
    background: anime.bannerImage,
    description: cleanDescription,
    releaseInfo: anime.seasonYear,
    imdbRating: anime.averageScore,
    videos: videos,
  };
}

async function getUserWatchStatus(anilistToken, anilistId) {
  const query = `
    query ($id: Int!) {
      Media(id: $id, type: ANIME) {
        id
        mediaListEntry {
          status
        }
      }
    }`;
  const variables = { id: parseInt(anilistId) };
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${anilistToken}`,
    },
    body: JSON.stringify({
      query: query,
      variables: variables,
    }),
  });
  const data = await response.json();

  if (!data.data.Media) {
    return null;
  }

  return data.data.Media.mediaListEntry
    ? data.data.Media.mediaListEntry.status
    : null;
}

async function updateUserWatchList(anilistToken, anilistId, progress, status) {
  const animeDetails = await getAnimeDetails("ani_" + anilistId);

  if (progress >= animeDetails.videos.length) {
    status = "COMPLETED";
  }

  const mutation = `  
    mutation ($mediaId: Int!, $status: MediaListStatus!, $progress: Int!) {
      SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress) {
        id
        status
        progress
      }
    }`;
  const variables = { mediaId: parseInt(anilistId), status, progress };
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${anilistToken}`,
    },
    body: JSON.stringify({
      query: mutation,
      variables: variables,
    }),
  });
  const data = await response.json();
  return data.data.SaveMediaList || null;
}

async function getPlanningAnime(anilistToken) {
  // First, get the user ID
  const viewerQuery = `
    query {
      Viewer {
        id
        name
      }
    }`;

  const viewerResponse = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${anilistToken}`,
    },
    body: JSON.stringify({
      query: viewerQuery,
    }),
  });
  const viewerData = await viewerResponse.json();
  console.log("Viewer data:", viewerData);

  if (!viewerData.data.Viewer) {
    return [];
  }

  const userId = viewerData.data.Viewer.id;

  // Now fetch the planning anime with the user ID
  const query = `
    query ($type: MediaType!, $userId: Int!) {
      MediaListCollection(type: $type, userId: $userId, status: PLANNING) {
        lists {
          name
          entries {
            id
            media {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
              }
              format
            }
          }
        }
      }
    }`;

  const variables = { type: "ANIME", userId: userId };

  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${anilistToken}`,
    },
    body: JSON.stringify({
      query: query,
      variables: variables,
    }),
  });
  const data = await response.json();

  let planningAnime = [];
  data.data.MediaListCollection.lists.forEach((list) => {
    list.entries.forEach((entry) => {
      const anime = entry.media;
      planningAnime.push({
        id: "ani_" + anime.id.toString(),
        type: "series",
        name: anime.title.english || anime.title.romaji || anime.title.native,
        poster: anime.coverImage.large,
        format: anime.format,
      });
    });
  });
  return planningAnime.reverse();
}

async function getWatchingAnime(anilistToken) {
  // First, get the user ID
  const viewerQuery = `
    query {
      Viewer {
        id
        name
      }
    }`;

  const viewerResponse = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${anilistToken}`,
    },
    body: JSON.stringify({
      query: viewerQuery,
    }),
  });
  const viewerData = await viewerResponse.json();

  if (!viewerData.data.Viewer) {
    return [];
  }

  const userId = viewerData.data?.Viewer.id;

  // Now fetch the watching anime with the user ID
  const query = `
    query ($type: MediaType!, $userId: Int!) {
      MediaListCollection(type: $type, userId: $userId, status: CURRENT) {
        lists {
          name
          entries {
            id
            progress
            media {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
              }
              format
              status
              episodes
              nextAiringEpisode {
                airingAt
                episode
              }
            }
          }
        }
      }
    }`;

  const variables = { type: "ANIME", userId: userId };

  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${anilistToken}`,
    },
    body: JSON.stringify({
      query: query,
      variables: variables,
    }),
  });
  const data = await response.json();

  let watchingAnime = [];
  data.data.MediaListCollection.lists.forEach((list) => {
    list.entries.forEach((entry) => {
      const anime = entry.media;

      watchingAnime.push({
        id: "ani_" + anime.id.toString(),
        type: "series",
        name: anime.title.english || anime.title.romaji || anime.title.native,
        poster:
          anime.status === "RELEASING"
            ? `https://miraitv.stremio.edmit.in/poster/${anime.id}.png` +
              `?url=${encodeURIComponent(anime.coverImage.large)}` +
              `&status=${anime.status}` +
              `&progress=${entry.progress || 0}` +
              `&episodes=${anime.nextAiringEpisode?.episode - 1 || 0}` +
              `&nextAir=${anime.nextAiringEpisode?.airingAt || 0}`
            : anime.coverImage.large,

        format: anime.format,
      });
    });
  });
  return watchingAnime.reverse();
}

module.exports = {
  searchAnime,
  getAnimeDetails,
  getUserWatchStatus,
  updateUserWatchList,
  getPlanningAnime,
  getWatchingAnime,
};
