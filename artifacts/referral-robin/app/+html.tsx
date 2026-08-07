import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Customizes Expo Router's root HTML shell (web only, requires
// `web.output: "static"` in app.json — under the default "single" output
// this file is never used at all). Title/description/OG/Twitter tags live in
// app/_layout.tsx via the `Head` component instead of here, so that
// per-page `<Head>` overrides (see LegalPage, brand/[brandId]) replace them
// cleanly instead of producing duplicate <title>/<meta> tags.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#0F1117" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
