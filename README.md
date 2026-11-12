# CDPC Puchong

A locally hosted church website for City Discipleship Presbyterian Church, Puchong. The design is an original editorial interpretation of a cinematic, immersive church experience.

## Run locally

```powershell
npm start
```

Open http://127.0.0.1:4173

The site has no runtime dependencies. Node 18 or newer is required. To use a different port:

```powershell
$env:PORT=8080; npm start
```

## Structure

```text
index.html            Page content and structure
css/styles.css        Design system, layout, motion and responsive rules
js/main.js            Menu, reveals, score, parallax, cursor and interactions
server.js             Minimal local static server
assets/fonts/         Self-hosted Bodoni Moda and Instrument Sans
assets/images/        Optimized local WebP photography
assets/favicon.svg    Site favicon
assets/logo-fish.svg  CDPC fish mark
```

## Notes

- All fonts and images are served locally, so the site works fully offline.
- Service times, address, leadership, beliefs and sermons reflect the information published at https://puchong.cdpc.my/.
- External links point to the official church site, Spotify sermons, WhatsApp, Google Maps and the Children's Library.
- The service card opens the IOI Boulevard location in Google Maps.
- Motion respects the visitor's reduced-motion preference. The original cinematic score is synthesized in the browser and only begins after a deliberate choice.
