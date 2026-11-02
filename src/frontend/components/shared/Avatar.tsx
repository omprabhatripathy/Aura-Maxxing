import { useState } from 'react';

interface Props {
  src: string | null;
  name: string | null;
  email?: string | null;
  className: string;
  fallbackClassName: string;
}

/** Profile photo, or the first letter of the username when there's no photo or it fails to load. */
export default function Avatar({ src, name, email, className, fallbackClassName }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const label = (name ?? '').trim() || (email ?? '').trim();
  // Array.from keeps emoji and accented letters intact instead of splitting surrogate pairs.
  const initial = (Array.from(label)[0] ?? '?').toUpperCase();

  if (src && failed !== src) {
    return <img src={src} alt="" className={className} referrerPolicy="no-referrer" onError={() => setFailed(src)} />;
  }
  return (
    <div className={`${className} ${fallbackClassName}`} aria-hidden="true">
      {initial}
    </div>
  );
}
