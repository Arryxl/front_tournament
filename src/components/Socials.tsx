import type { ReactElement } from 'react';
import { SOCIALS } from '../config';

const ICONS: Record<string, ReactElement> = {
  tiktok: (
    <path d="M21 8.5a6.3 6.3 0 0 1-3.7-1.2v6.9a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.9a2.8 2.8 0 1 0 2 2.7V2h2.8a3.5 3.5 0 0 0 3.4 3.5V8.5Z" />
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
    </>
  ),
  discord: (
    <path d="M19.5 5.6A16 16 0 0 0 15.5 4.4l-.2.4a12 12 0 0 1 3.5 1.8 14 14 0 0 0-11.6 0A12 12 0 0 1 10.7 4.8l-.2-.4A16 16 0 0 0 6.5 5.6 16.5 16.5 0 0 0 3.6 17a16 16 0 0 0 4.9 2.5l.6-1a10 10 0 0 1-1.6-.8l.4-.3a11.4 11.4 0 0 0 9.8 0l.4.3a10 10 0 0 1-1.6.8l.6 1A16 16 0 0 0 22.4 17 16.5 16.5 0 0 0 19.5 5.6ZM9.5 14.5c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6 1.4.7 1.4 1.6-.6 1.6-1.4 1.6Zm5 0c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6 1.4.7 1.4 1.6-.6 1.6-1.4 1.6Z" />
  ),
  twitch: (
    <path d="M4 3 3 6.5v12H7V21h3l2.5-2.5H16l5-5V3H4Zm15 9-3 3h-4l-2.5 2.5V15H7V5h12v7Zm-3-5h-1.8v4H16V7Zm-5 0H9.2v4H11V7Z" />
  ),
};

const LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  discord: 'Discord',
  twitch: 'Twitch',
};

export function SocialRow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {Object.entries(SOCIALS).map(([key, url]) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={LABELS[key]}
          className="w-10 h-10 grid place-items-center rounded-md border border-line text-mute hover:text-ignite hover:border-ignite transition-colors"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            {ICONS[key]}
          </svg>
        </a>
      ))}
    </div>
  );
}
