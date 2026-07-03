export interface FishingRenderProfileInput {
  isMobile: boolean;
  prefersReducedMotion: boolean;
  lowPower: boolean;
}

export interface FishingRenderProfile {
  dprMax: 1 | 1.25 | 1.75;
  particleCount: number;
  animateParticles: boolean;
}

export function getFishingRenderProfile({ isMobile, prefersReducedMotion, lowPower }: FishingRenderProfileInput): FishingRenderProfile {
  if (prefersReducedMotion || lowPower) {
    return {
      dprMax: 1,
      particleCount: 8,
      animateParticles: false,
    };
  }

  if (isMobile) {
    return {
      dprMax: 1.25,
      particleCount: 16,
      animateParticles: true,
    };
  }

  return {
    dprMax: 1.75,
    particleCount: 28,
    animateParticles: true,
  };
}
