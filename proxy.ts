import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Défense en profondeur : sans cookie de session, toute page renvoie vers /connexion.
 * Contrôle optimiste (présence du cookie seulement) : la session est réellement
 * vérifiée côté serveur par requireUser / requirePageUser, y compris dans chaque Server Action.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/connexion" || getSessionCookie(request)) return NextResponse.next();

  const url = new URL("/connexion", request.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Tout sauf les ressources statiques de Next.js et les fichiers publics
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
