import type { EmitterParams } from './configGenerator';

/**
 * Formats a clean, optimized Javascript boilerplate for slot games using PixiJS & @pixi/particle-emitter.
 */
export function generateBoilerplateJS(params: EmitterParams, configJson: any): string {
  const configString = JSON.stringify(configJson, null, 2);

  return `/**
 * PixiVFX_Weaver Emitter Boilerplate
 * Generated for slot game symbol: '${params.textureName}' (Preset: '${params.preset}')
 * PixiJS version: v7 / v8
 * Dependency: npm install @pixi/particle-emitter
 */
import * as PIXI from 'pixi.js';
import { Emitter } from '@pixi/particle-emitter';

/**
 * Initializes and starts the particle emitter on the target container.
 * @param {PIXI.Container} parentContainer - PixiJS container to add the particles to.
 * @param {PIXI.Texture} particleTexture - Texture to use for the particles.
 * @param {PIXI.Ticker} ticker - PixiJS Application ticker for animations.
 * @param {object} customConfig - Optional overrides for the config.
 * @returns {Emitter} The initialized Emitter instance.
 */
export function initSymbolVFX(
  parentContainer,
  particleTexture,
  ticker,
  customConfig = {}
) {
  // 1. Create a container for high-performance rendering.
  // Standard Container works too, but ParticleContainer is faster.
  const particleContainer = new PIXI.ParticleContainer(
    ${params.maxParticles},
    {
      vertices: false,
      position: true,
      rotation: true,
      uvs: true,
      tint: true
    }
  );
  
  parentContainer.addChild(particleContainer);

  // 2. Base emitter configuration from PixiVFX_Weaver
  const baseConfig = ${configString.split('\n').map((line, idx) => (idx === 0 ? line : '  ' + line)).join('\n')};

  // 3. Inject the particle texture into the behaviors configuration dynamically
  const emitterConfig = {
    ...baseConfig,
    ...customConfig,
    behaviors: baseConfig.behaviors.map((b) => {
      if (b.type === 'textureSingle') {
        return {
          ...b,
          config: {
            ...b.config,
            texture: particleTexture
          }
        };
      }
      return b;
    })
  };

  // 4. Create and initialize the emitter
  const emitter = new Emitter(particleContainer, emitterConfig);

  // 5. Start the emission
  emitter.emit = true;

  // 6. Update emitter on every tick
  const updateTick = (delta) => {
    // Convert ticker delta to seconds (approx. delta * 1/60)
    emitter.update(delta * 0.016);
  };
  ticker.add(updateTick);

  // Attach cleanup helper to emitter object
  emitter.destroyVFX = () => {
    emitter.emit = false;
    ticker.remove(updateTick);
    emitter.destroy();
    if (particleContainer.parent) {
      particleContainer.parent.removeChild(particleContainer);
    }
    particleContainer.destroy({ children: true });
  };

  return emitter;
}
`;
}
