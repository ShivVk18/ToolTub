import Link from "next/link";
import { SearchButton } from "@/components/search/CommandPalette";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-4">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-fg text-xs font-bold text-bg">K</span>
          KlipKit
        </Link>
        <nav aria-label="Categories" className="hidden gap-1 text-sm text-fg-muted md:flex">
          <Link href="/pdf-tools" className="rounded-md px-2 py-1 hover:text-fg">PDF</Link>
          <Link href="/image-tools" className="rounded-md px-2 py-1 hover:text-fg">Image</Link>
          <Link href="/developer-tools" className="rounded-md px-2 py-1 hover:text-fg">Developer</Link>
          <Link href="/video-tools" className="rounded-md px-2 py-1 hover:text-fg">Video</Link>
          <Link href="/creator-tools" className="rounded-md px-2 py-1 hover:text-fg">Creator</Link>
        </nav>
        <SearchButton className="ml-auto h-11 w-40 sm:h-9 sm:w-64" />
        <ThemeToggle />
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-fg-muted sm:grid-cols-4">
        <div className="sm:col-span-2">
          <p className="font-medium text-fg">KlipKit</p>
          <p className="mt-2 max-w-sm">KlipKit is a free collection of fast, private online tools for PDFs, images, developers and creators. No sign-up required.</p>
        </div>
        <ul className="space-y-2">
          <li><Link href="/pdf-tools">PDF tools</Link></li>
          <li><Link href="/image-tools">Image tools</Link></li>
          <li><Link href="/developer-tools">Developer tools</Link></li>
          <li><Link href="/creator-tools">Creator tools</Link></li>
        </ul>
        <ul className="space-y-2">
          <li><Link href="/about">About</Link></li>
          <li><Link href="/privacy">Privacy</Link></li>
          <li><Link href="/licences">Open-source licences</Link></li>
          <li><a href="/llms.txt">llms.txt</a></li>
        </ul>
      </div>
    </footer>
  );
}
