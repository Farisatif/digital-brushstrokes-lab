import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SiteDataProvider } from "@/components/SiteDataProvider";
import { KitsysArrowField } from "@/components/KitsysArrowField";
import { PageBoot } from "@/components/PageBoot";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "cv_fares" },
      { name: "description", content: "Dynamic CV Studio is an interactive, customizable resume builder with physics-based animations." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "cv_fares" },
      { property: "og:description", content: "Dynamic CV Studio is an interactive, customizable resume builder with physics-based animations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "cv_fares" },
      { name: "twitter:description", content: "Dynamic CV Studio is an interactive, customizable resume builder with physics-based animations." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/eb27ffa5-f67d-4e40-bc9c-a57c49abef3f/id-preview-b306cd15--5f443e77-dcf0-4210-92f3-9a49d11c0893.lovable.app-1776942699428.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/eb27ffa5-f67d-4e40-bc9c-a57c49abef3f/id-preview-b306cd15--5f443e77-dcf0-4210-92f3-9a49d11c0893.lovable.app-1776942699428.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Inter:wght@300;400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SiteDataProvider>
          <PageBoot />
          <KitsysArrowField mode="fixed" className="chevron-canvas z-0" />
          <Outlet />
          <Toaster position="bottom-right" />
        </SiteDataProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
