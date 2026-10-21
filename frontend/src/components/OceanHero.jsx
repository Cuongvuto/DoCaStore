import { useEffect, useState, useSyncExternalStore } from 'react';
import './OceanHero.css';

const slides = [
  { src: '/images/ocean/sea-19939688.jpg', position: '50% 55%' },
  { src: '/images/ocean/sea-20121974.jpg', position: '50% 72%' },
  { src: '/images/ocean/sea-22936980.jpg', position: '50% 65%' },
];
const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
function subscribeVisibility(callback) {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
}
const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getHidden = () => document.hidden;
const getServerSnapshot = () => true;

export default function OceanHero({ children, className = '' }) {
  const [active, setActive] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, getServerSnapshot);
  const hidden = useSyncExternalStore(subscribeVisibility, getHidden, getServerSnapshot);

  useEffect(() => {
    if (reducedMotion || hidden) return;
    const timer = window.setTimeout(() => setActive(index => (index + 1) % slides.length), 6000);
    return () => window.clearTimeout(timer);
  }, [active, reducedMotion, hidden]);

  return <section className={`store-info-hero ocean-hero ${className}`}>
    <div className="ocean-hero-background" aria-hidden="true">
      {slides.map((slide, index) => <img
        key={slide.src}
        className={`ocean-hero-slide${active === index ? ' is-active' : ''}`}
        src={slide.src}
        alt=""
        style={{ objectPosition: slide.position }}
        decoding="async"
        fetchPriority={index === 0 ? 'high' : 'low'}
      />)}
    </div>
    <div className="ocean-hero-content">{children}</div>
  </section>;
}
