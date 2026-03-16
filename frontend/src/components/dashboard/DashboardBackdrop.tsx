import { useEffect, useState } from 'react';
import { LightPillar } from './LightPillar';

export function DashboardBackdrop() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const sync = () => setIsDark(document.body.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,24,0.96),rgba(4,6,18,1))] dark:block hidden" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(252,250,255,1),rgba(246,243,255,1))] block dark:hidden" />
      <LightPillar
        className="absolute inset-0"
        topColor={isDark ? '#5E8BFF' : '#A78BFA'}
        bottomColor={isDark ? '#D78CFF' : '#E9D5FF'}
        intensity={isDark ? 1.05 : 0.7}
        rotationSpeed={0.22}
        interactive={false}
        glowAmount={0.006}
        pillarWidth={3.2}
        pillarHeight={0.42}
        noiseIntensity={isDark ? 0.38 : 0.16}
        mixBlendMode={isDark ? 'screen' : 'multiply'}
        pillarRotation={0}
        quality="medium"
      />
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white/18 via-white/4 to-transparent dark:from-white/6 dark:via-white/[0.02]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/72 to-transparent" />
    </div>
  );
}
