const express = require("express");
const cors = require("cors");
const path = require("path");
const {
  searchAnime,
  getAnimeDetails,
  getUserWatchStatus,
  updateUserWatchList,
} = require("./src/anilist");
const { getAnimeByAnilistId, getEpisodeUrls } = require("./src/anicli");

const app = express();
app.use(cors());
app.use(express.static("public")); // Serve static HTML from public/
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
//   next();
// });

// ------------------- MANIFEST -------------------
const manifest = {
  id: "community.AnilistStream",
  version: "0.0.1",
  catalogs: [
    {
      type: "series",
      id: "anilist",
      name: "Anime",
      extra: [
        {
          name: "search",
          isRequired: true,
        },
      ],
    },
  ],
  resources: [
    "catalog",
    {
      name: "meta",
      types: ["series"],
      idPrefixes: ["ani_"],
    },
    "stream",
  ],
  types: ["series", "movie"],
  name: "AnilistStream",
  description: "Streaming anime and Anilist sync",
  idPrefixes: ["ani_"],
  behaviorHints: {
    configurable: true,
    configurationRequired: false,
  },
  config: [
    {
      key: "anilist_access_token",
      type: "text",
      title:
        'Your Anilist access token. Get it by visiting <a href="https://anilist.co/api/v2/oauth/authorize?client_id=31463&response_type=token" target="_blank" rel="noopener noreferrer">Anilist OAuth Authorize</a> and copying the token from the Box.',
      required: false,
    },
  ],
};

// ------------------- CONFIGURE ROUTES -------------------

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve configuration page (no token)
app.get("/configure", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "configure.html"));
});

// Serve configuration page with token — supports both `/configure` and `/configure.json`
app.get(
  ["/:anilistToken/configure", "/:anilistToken/configure.json"],
  (req, res) => {
    res.sendFile(path.join(__dirname, "public", "configure.html"));
  }
);

// ------------------- PATH-BASED ROUTES -------------------

// Manifest

app.get("/manifest.json", (req, res) => {
  res.setHeader("Cache-Control", "max-age=604800");
  res.setHeader("Content-Type", "application/json");
  res.json(manifest);
});

app.get("/:anilistToken/manifest.json", (req, res) => {
  res.setHeader("Cache-Control", "max-age=604800");
  res.setHeader("Content-Type", "application/json");
  res.json(manifest);
});

// Catalog
app.get("/:anilistToken/catalog/:type/:id/:extra.json", async (req, res) => {
  try {
    const { anilistToken, type, id, extra } = req.params;
    const searchQuery =
      extra && extra.startsWith("search=")
        ? decodeURIComponent(extra.split("=")[1])
        : "";
    const anime = await searchAnime(searchQuery, anilistToken);
    res.json({ metas: anime });
  } catch (err) {
    console.error("Catalog error:", err);
    res.status(500).json({ metas: [] });
  }
});

// Meta
app.get("/:anilistToken/meta/:type/:id.json", async (req, res) => {
  try {
    const { anilistToken, id } = req.params;
    const meta = await getAnimeDetails(id, anilistToken);
    res.json({ meta });
  } catch (err) {
    console.error("Meta error:", err);
    res.status(500).json({ meta: {} });
  }
});

// Stream
app.get("/:anilistToken/stream/:type/:id.json", async (req, res) => {
  try {
    const { anilistToken, id } = req.params;

    if (!id.startsWith("ani_")) return res.json({ streams: [] });

    const [_, animeId, titleRaw, episodeRaw] = id.split("_");
    const title = titleRaw?.replace(/[!?]/g, "");
    const episodeNumber = episodeRaw || 1;

    const privateId = await getAnimeByAnilistId(animeId, title, anilistToken);
    const sources = await getEpisodeUrls(privateId.id, episodeNumber);

    const streams = sources.map((source) => ({
      url: source.url,
      name: "AnilistStream",
      description: `Source: ${source.source} - Quality: ${source.quality}`,
      subtitles: source.subtitles
        ? [{ id: "eng", lang: "English", url: source.subtitles }]
        : [],
      behaviorHints: {
        notWebReady: true,
        proxyHeaders: {
          request: {
            Referer: source.referrer,
            "User-Agent": source["user-agent"],
          },
        },
      },
    }));

    if (anilistToken && streams.length > 0) {
      const userWatchStatus = await getUserWatchStatus(anilistToken, animeId);
      if (userWatchStatus) {
        switch (userWatchStatus) {
          case "PLANNING":
            await updateUserWatchList(
              anilistToken,
              animeId,
              episodeNumber,
              "CURRENT"
            );
            break;
          case "COMPLETED":
            await updateUserWatchList(
              anilistToken,
              animeId,
              episodeNumber,
              "REPEATING"
            );
            break;
          case "REPEATING":
            await updateUserWatchList(
              anilistToken,
              animeId,
              episodeNumber,
              "REPEATING"
            );
            break;
          default:
            await updateUserWatchList(
              anilistToken,
              animeId,
              episodeNumber,
              "CURRENT"
            );
        }
      }
    }

    res.json({ streams });
  } catch (err) {
    console.error("Stream error:", err);
    res.status(500).json({ streams: [] });
  }
});

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 7000;
const HOST = "127.0.0.1";
app.listen(PORT, HOST, () => {
  console.log(`AnilistStream running at http://${HOST}:${PORT}`);
  console.log(`Visit http://${HOST}:${PORT}/configure to set up your token.`);
});
