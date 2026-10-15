import { useUi } from './store';

export function BannerView() {
  const banner = useUi((s) => s.banner);
  if (!banner) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[26%] grid place-items-center">
      <div
        key={banner.key}
        data-tone={banner.tone}
        className="animate-banner -rotate-6 border-5 border-banner-edge bg-pink px-[.4em] pt-[.05em] pb-[.1em] font-display text-[clamp(26px,7vw,96px)] tracking-[1px] whitespace-nowrap text-fg shadow-[8px_8px_0_var(--color-banner-edge)] [paint-order:stroke_fill] [-webkit-text-stroke:2px_var(--color-banner-edge)] data-[tone=gold]:bg-gold data-[tone=gold]:text-[#3a1a00] data-[tone=gold]:[-webkit-text-stroke:0]"
      >
        {banner.text}
      </div>
    </div>
  );
}
