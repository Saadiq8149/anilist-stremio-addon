const { getEpisodesList, getAnimeByAnilistId } = require("./anicli");

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
      MediaList(mediaId: $id, type: ANIME) {
        status
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
  return data.data.MediaList ? data.data.MediaList.status : null;
}

async function updateUserWatchList(anilistToken, anilistId, status, progress) {
  const mutation = `  
    mutation ($mediaId: Int!, $status: MediaListStatus!, $progress: Int!) {
      SaveMediaList(mediaId: $mediaId, status: $status, progress: $progress) {
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

module.exports = {
  searchAnime,
  getAnimeDetails,
  getUserWatchStatus,
  updateUserWatchList,
};
