const { spawn } = require("node:child_process");

async function searchAnime(query) {
  const searchGql = `
    query($search: SearchInput, $limit: Int, $page: Int, $translationType: VaildTranslationTypeEnumType, $countryOrigin: VaildCountryOriginEnumType) {
      shows(search: $search, limit: $limit, page: $page, translationType: $translationType, countryOrigin: $countryOrigin) {
        edges {
          _id
          aniListId
          name
        }
      }
    }
  `;

  const variables = {
    search: { allowAdult: false, allowUnknown: false, query },
    limit: 40,
    page: 1,
    translationType: "sub",
    countryOrigin: "ALL",
  };

  const url = new URL(`https://api.allanime.day/api`);
  url.searchParams.append("variables", JSON.stringify(variables));
  url.searchParams.append("query", searchGql);

  const res = await fetch(url, {
    headers: {
      Referer: "https://allmanga.to",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    },
  });

  if (!res.ok) return [];
  const data = await res.json();
  const shows = data?.data?.shows?.edges ?? [];

  return shows.map((show) => ({
    id: show._id,
    anilistId: show.aniListId,
    name: show.name,
  }));
}

async function getAnimeByAnilistId(anilistId, title) {
  title = title.replace(/[!?\.]/g, "");
  const results = await searchAnime(title);
  return results.find((anime) => anime.anilistId == anilistId) || null;
}

function getValidLines(chunks) {
  // Combine all chunks
  let text = chunks.join("");

  // Remove escape codes
  text = text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "");

  // Split lines
  const lines = text.split(/\r?\n/);

  var validLines = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    validLines.push(line);
  }

  return validLines;
}

function runAniCli(args) {
  return new Promise((resolve) => {
    const proc = spawn("public/ani-cli.sh", args);
    let chunks = [];

    proc.stdout.on("data", (d) => chunks.push(d.toString()));
    proc.stderr.on("data", (d) => { });
    proc.on("close", () => resolve(getValidLines(chunks)));
  });
}

async function getEpisodeUrls(allAnimeId, episodeNumber) {
  const streams = { sub: [], dub: [] };
  let subs = null;
  let refr = null;

  const subLines = await runAniCli(["-e", episodeNumber, allAnimeId]);
  const dubLines = await runAniCli(["-e", episodeNumber, allAnimeId, "--dub"]);

  // Parse subtitle + referer
  function parse(lines) {
    const list = [];

    for (let line of lines) {
      if (line.includes("No episodes found")) {
        return list;
      }

      const [prefix, url] = line.split(">");

      if (prefix.trim() === "subtitle") subs = url.trim();
      if (prefix.trim() === "m3u8_refr") refr = url.trim();
    }

    for (let line of lines) {
      const [prefix, url] = line.split(">");

      if (prefix === undefined || url === undefined) continue;

      if (prefix.trim() === "subtitle" || prefix.trim() === "m3u8_refr")
        continue;

      list.push({
        url: url.trim(),
        referer: refr,
        quality: prefix.split(" ")[0],
        type: prefix.includes("cc") ? "Soft" : "Hard",
        subtitles: subs,
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
      });
    }

    return list;
  }

  streams.sub = parse(subLines);
  streams.dub = parse(dubLines);

  return streams;
}

async function getSubtitles(allAnimeId, episodeNumber) {
  const subLines = await runAniCli(["-e", episodeNumber, allAnimeId]);

  for (let line of subLines) {
    if (line.includes("No episodes found")) {
      return null;
    }

    const [prefix, url] = line.split(">");

    if (prefix.trim() === "subtitle") {
      return url.trim();
    }
  }
}

module.exports = {
  searchAnime,
  getAnimeByAnilistId,
  getEpisodeUrls,
  getSubtitles,
};
