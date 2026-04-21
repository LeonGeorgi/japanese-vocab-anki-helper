# Vocab

Japanese vocabulary extraction and Anki card helper.

The app can:

- Extract Japanese text from an image.
- Pick study-worthy vocabulary and generate short i+1 example sentences.
- Create Anki cards through AnkiConnect.
- Backfill missing sentence and word translations on existing Anki notes.

## Requirements

- Node.js 25 or newer.
- An Anthropic API key.
- Anki with the AnkiConnect add-on for Anki features.

AnkiConnect must be reachable at `http://127.0.0.1:8765`. Browser requests to AnkiConnect may require allowing the origin where this app is hosted in AnkiConnect's configuration.

## Local Development

```sh
npm ci
npm run dev
```

## Quality Check

Run the full pre-distribution check:

```sh
npm run check
```

This runs linting, tests, and a production build.

## Build For Distribution

```sh
npm ci
npm run build
```

The distributable static site is written to `dist/`.

You can preview the production build locally:

```sh
npm run preview
```

To test it from another device on the same network:

```sh
npm run preview:host
```

## Deployment

Upload the contents of `dist/` to any static web host.

The Vite build uses relative asset paths, so the app can be hosted at a domain root or under a subpath.

## Runtime Notes

- The Anthropic API key is stored in browser `localStorage`.
- Session state and Anki field/deck settings are stored in browser `localStorage`.
- Do not host this publicly for untrusted users with a shared API key. Each user should provide their own key.
- Anki features only work on machines where AnkiConnect is running and reachable from the browser.
