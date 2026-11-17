import { useState, useMemo, type ImgHTMLAttributes } from 'react';
import {
  type ImageCrop,
  IMAGE_CROP_DIMENSIONS,
  DEFAULT_VENDOR_FALLBACK_COVER,
  buildResponsiveUrls,
  getDominantColor,
  hasResponsiveVariant,
} from '@shared/image-manifest';
import { UtensilsCrossed } from 'lucide-react';

export interface ResponsiveImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> {
  src?: string | null;
  alt: string;
  crop?: ImageCrop;
  fallbackSrc?: string;
  sizes?: string;
  containerClassName?: string;
  priority?: boolean;
}

/**
 * ResponsiveImage enforces:
 * 1. Zero layout shift (explicit width/height attributes and aspect ratio).
 * 2. Responsive AVIF + WebP srcsets across 320, 640, 960, and 1440px widths.
 * 3. Instant dominant-color placeholder background while loading.
 * 4. Graceful error fallback to vendor cover crop, never displaying empty boxes or raw alt text.
 */
export function ResponsiveImage({
  src,
  alt,
  crop = '1x1',
  fallbackSrc = DEFAULT_VENDOR_FALLBACK_COVER,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  containerClassName = '',
  className = '',
  priority = false,
  width,
  height,
  style,
  onLoad,
  ...rest
}: ResponsiveImageProps) {
  const [activeSrc, setActiveSrc] = useState<string | null>(src || null);
  const [fallbackTriggered, setFallbackTriggered] = useState(false);
  const [isBroken, setIsBroken] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Default width/height to crop dimension specs to guarantee CLS = 0
  const dim = IMAGE_CROP_DIMENSIONS[crop] || IMAGE_CROP_DIMENSIONS['1x1'];
  const explicitWidth = width ?? dim.width;
  const explicitHeight = height ?? dim.height;

  const currentPath = activeSrc || fallbackSrc;
  const dominantColor = useMemo(() => getDominantColor(currentPath), [currentPath]);

  const hasVariants = useMemo(
    () => Boolean(currentPath && hasResponsiveVariant(currentPath)),
    [currentPath]
  );

  const responsive = useMemo(() => {
    if (!hasVariants || !currentPath) return null;
    return buildResponsiveUrls(currentPath, crop);
  }, [hasVariants, currentPath, crop]);

  const handleError = () => {
    if (!fallbackTriggered && fallbackSrc && fallbackSrc !== activeSrc) {
      setFallbackTriggered(true);
      setActiveSrc(fallbackSrc);
    } else {
      setIsBroken(true);
    }
  };

  const handleLoaded = () => {
    setIsLoaded(true);
    if (onLoad) {
      // @ts-expect-error matching generic callback
      onLoad();
    }
  };

  if (isBroken || !currentPath) {
    return (
      <div
        role={alt ? 'img' : 'presentation'}
        aria-label={alt || undefined}
        aria-hidden={!alt ? 'true' : undefined}
        className={`flex items-center justify-center overflow-hidden transition-colors ${containerClassName} ${className}`}
        style={{
          backgroundColor: dominantColor,
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
          aspectRatio: `${explicitWidth} / ${explicitHeight}`,
          ...style,
        }}
      >
        <UtensilsCrossed className="h-6 w-6 text-stone-400 opacity-40 dark:text-stone-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${containerClassName}`}
      style={{
        backgroundColor: dominantColor,
        ...style,
      }}
    >
      <picture>
        {responsive && (
          <>
            <source type="image/avif" srcSet={responsive.avifSrcSet} sizes={sizes} />
            <source type="image/webp" srcSet={responsive.webpSrcSet} sizes={sizes} />
          </>
        )}
        <img
          src={responsive ? responsive.fallbackSrc : currentPath}
          alt={alt}
          width={explicitWidth}
          height={explicitHeight}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onError={handleError}
          onLoad={handleLoaded}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-90'} ${className}`}
          {...rest}
        />
      </picture>
    </div>
  );
}
