# Earth Jukebox

A web jukebox where you pick a NASA Earth Information Center visualization and hear it. The soundscape is generated live in the browser from the visualization's own frames.

Built for the NASA Space Apps Challenge 2026, "The Earth Information Jukebox". Work in progress.

- Site: <https://nyanko3434.github.io/The_Earth_Information_Jukebox/>
- Planning docs: [`docs/`](docs/), starting with [`docs/VISION.md`](docs/VISION.md)

## Run it locally

Needs Node.js and npm.

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check and build to dist/
npm run preview  # serve the built site
npm run lint     # oxlint
```

## Use of AI tools

- Planning documents were written with the help of Claude.
- Code in this repository is written with the help of Claude Code. Commits containing AI-written code carry a `Co-Authored-By: Claude` trailer.
- The sound is synthesised at run time by rules we wrote. It is not produced by a generative AI model.
- No AI-generated images or video are used.

## Licence

MIT. See [`LICENSE`](LICENSE).
