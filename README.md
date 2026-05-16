# PassNest

PassNest is a static, installable web app for saving boarding passes, tickets, and service cards in the browser.

## What is included

- Apple Wallet-inspired pass interface
- Boarding pass class, seat number, and file upload fields
- Local browser storage
- JSON import and export
- PWA manifest and offline service worker
- Privacy and terms pages
- Netlify static hosting config

## Run Locally

```sh
python3 -m http.server 4173
```

Then open:

```txt
http://localhost:4173
```

## Deploy

The simplest deployment is Netlify:

1. Create a GitHub repository and add these files.
2. In Netlify, choose "Add new site" and connect the repository.
3. Use no build command.
4. Set the publish directory to `.`.
5. Deploy.

For Vercel, import the repository as a static project and keep the output directory as the project root.

## Before Launch

- Replace `https://example.com` in `sitemap.xml` with your real domain.
- Replace starter legal copy in `privacy.html` and `terms.html`.
- Add cloud accounts and encrypted backend storage if users need sync across devices.
- Add real issuer integrations if you want automatic pass importing.
