<img
  src="https://github.com/Saadiq8149/AnilistStream/blob/1cba2e46de9e627f1607d6782e2790193cdad501/public/logo.png"
  alt="AnilistStream Logo"
  width="256"
  height="256"
/>

# AnilistStream — A Stremio addon for HTTP Anime streaming 

**AnilistStream** is a Stremio addon that provides **HTTP-based anime streaming** (not torrents) with AniList integration for metadata and watch progress synchronization.

It is designed to work seamlessly inside Stremio while sourcing anime streams from multiple providers and keeping your AniList watch state up to date.

---

## Installation & Usa<img width="256" height="256" alt="logo" src="https://github.com/user-attachments/assets/7f5cef57-237e-4497-8863-83839c56e901" />
ge

Install the addon in Stremio by visiting:

**https://miraitv.stremio.edmit.in**

Open Stremio and start streaming anime.

---

## What This Addon Is

- A **HTTP streaming addon provider** (no torrents involved)
- Focused on **anime streaming**, not general media
- Uses AniList for metadata, tracking, and organization
- Designed to work natively inside Stremio with minimal setup

---

## Catalog Support

- Supports **AnimeKitsu catalogs directly**  
  (works alongside existing Kitsu-based setups in Stremio)

- Includes a **custom AniList-based catalog**
  - Used for improved AniList matching and personalization
  - This catalog **may be removed or merged** in the future

---

## How It Works

### Search
Anime search is powered by AniList metadata, providing accurate titles, episodes, and season information.

### Watch Lists
- Shows anime you are currently watching
- Shows anime you are planning to watch
- Automatically updates AniList status when you start or finish watching
- Saves episode progress automatically

### Streaming
- Streams anime episodes over **direct HTTP sources**
- Multiple providers per episode when available
- Automatic episode availability detection
- Subtitle support (including HLS-based subtitles)
- Dubbed anime support where available

---

## Technical Details

- Built with **Node.js** and **Express**
- Uses the **AniList GraphQL API**
- Implements the **Stremio addon protocol**
- Discovers anime streams from multiple providers
- No torrents, magnet links, or peer-to-peer streaming
- No user credentials stored on external servers

---

## FAQ

### Is this a torrent addon?
No.  
AnilistStream provides **direct HTTP streams only**.

### Are my credentials stored?
No.  
The addon does not store user credentials or personal data externally.

### Why is there a custom catalog?
The custom catalog exists to improve AniList-specific behavior and matching.  
Based on user feedback, it may be removed in the future, with everything relying entirely on **AnimeKitsu** catalogs instead.

---

## Contributors

Contributions are welcome.

If you want to help:
- Improve stream discovery
- Improve AniList ↔ catalog matching
- Add tests or CI/CD
- Improve error handling or logging

Feel free to open issues or submit pull requests.

## License

This project is provided **as-is** for personal use.

---

## Acknowledgements

This addon uses a slightly modified version of **ani-cli**  
to discover and retrieve anime streaming sources.

https://github.com/pystardust/ani-cli
