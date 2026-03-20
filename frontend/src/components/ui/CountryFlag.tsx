/**
 * CountryFlag – renders a country flag as an <img> from flagcdn.com.
 * Works on all platforms (Windows doesn't render emoji flags).
 */

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code, e.g. "AE", "US" */
  iso: string
  /** Size in pixels (width). Height auto-scales to 3:4 ratio. Default 20. */
  size?: number
  className?: string
}

export function CountryFlag({ iso, size = 20, className }: CountryFlagProps) {
  const code = iso.toLowerCase()
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 1x, https://flagcdn.com/w80/${code}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={iso}
      className={className}
      loading="lazy"
      style={{ objectFit: 'cover', borderRadius: 2 }}
    />
  )
}
