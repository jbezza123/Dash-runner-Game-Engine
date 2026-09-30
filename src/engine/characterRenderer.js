/**
 * Procedural Canvas Character Renderer with full animations:
 * - Running limb kinematics
 * - Flip somersaults in mid-air
 * - Jetpack flight thrusters
 * - Customizable archetypes, headgear, colors, and trail effects
 */

import { getCachedCustomImage } from '../utils/customAssetsManager.js';

export const isVehicleArchetype = (arch) => {
  if (!arch || typeof arch !== 'string') return false;
  return arch.startsWith('spaceship_') ||
    arch.startsWith('car_') ||
    arch.startsWith('truck_') ||
    arch.startsWith('sub_') ||
    arch.startsWith('hovercraft_') ||
    arch.startsWith('mech_') ||
    arch === 'custom_asset';
};

/**
 * Procedural Vehicle Renderer with animated thrusters, rotating wheels, propellers, and laser pods.
 */
export function drawVehicle(ctx, player, skin, timeNow, halfW, halfH, width, height) {
  if (!ctx || !player) return;

  try {
    const {
      archetype = 'spaceship_viper',
      primaryColor = '#06b6d4',
      secondaryColor = '#3b82f6',
      glowColor = '#67e8f9',
      eyeColor = '#ffffff',
      customImageUrl = '',
      customScale = 1
    } = skin || {};

    const isMoving = Math.abs(player.vx || 0) > 20 || player.mode === 'fly' || player.gameStyle === 'aircraft';
    const animPhase = (player.animDistance || 0) / 10;
    const flameFlicker = Math.sin((timeNow || 0) * 0.03) * 6 + Math.random() * 4;

  // 1. CUSTOM IMPORTED ASSET FROM ASSET BROWSER OR USER UPLOAD
  if (archetype === 'custom_asset' || customImageUrl) {
    const cachedImg = getCachedCustomImage(customImageUrl);
    ctx.save();
    if (customScale && customScale !== 1) {
      ctx.scale(customScale, customScale);
    }
    if (cachedImg && cachedImg.naturalWidth > 0) {
      ctx.drawImage(cachedImg, -halfW, -halfH, width, height);
    } else {
      // Holographic cyber drone wireframe
      ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
      ctx.strokeStyle = glowColor || '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-halfW, -halfH, width, height);
      ctx.strokeRect(-halfW, -halfH, width, height);
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Engine jet at rear
    if (isMoving) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-halfW, -3);
      ctx.lineTo(-halfW - 14 - flameFlicker, 0);
      ctx.lineTo(-halfW, 3);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // 2. SPACESHIPS (Viper Interceptor & Stealth Phantom)
  if (archetype === 'spaceship_viper' || archetype === 'spaceship_stealth') {
    ctx.save();
    const isStealth = archetype === 'spaceship_stealth';

    // Rear Dual Thrusters Exhaust Jet
    ctx.save();
    ctx.fillStyle = isStealth ? '#a855f7' : '#06b6d4';
    ctx.shadowColor = isStealth ? '#c084fc' : '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-halfW + 4, -8);
    ctx.lineTo(-halfW - 16 - flameFlicker, -8);
    ctx.lineTo(-halfW + 4, -4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-halfW + 4, 4);
    ctx.lineTo(-halfW - 16 - flameFlicker, 8);
    ctx.lineTo(-halfW + 4, 8);
    ctx.fill();
    ctx.restore();

    // Fuselage / Hull (Delta wing arrowhead)
    ctx.fillStyle = primaryColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    if (isStealth) {
      ctx.moveTo(halfW + 4, 0);
      ctx.lineTo(halfW - 8, -6);
      ctx.lineTo(-halfW + 6, -halfH + 2);
      ctx.lineTo(-halfW + 2, -4);
      ctx.lineTo(-halfW - 4, 0);
      ctx.lineTo(-halfW + 2, 4);
      ctx.lineTo(-halfW + 6, halfH - 2);
      ctx.lineTo(halfW - 8, 6);
      ctx.closePath();
    } else {
      ctx.moveTo(halfW + 6, 0);
      ctx.lineTo(halfW - 6, -8);
      ctx.lineTo(-halfW + 8, -halfH);
      ctx.lineTo(-halfW, -6);
      ctx.lineTo(-halfW - 2, 0);
      ctx.lineTo(-halfW, 6);
      ctx.lineTo(-halfW + 8, halfH);
      ctx.lineTo(halfW - 6, 8);
      ctx.closePath();
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Wing armor trim
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.moveTo(-halfW + 6, -halfH + 4);
    ctx.lineTo(0, -6);
    ctx.lineTo(0, 6);
    ctx.lineTo(-halfW + 6, halfH - 4);
    ctx.closePath();
    ctx.fill();

    // Cockpit Canopy Glass
    ctx.fillStyle = eyeColor || '#38bdf8';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(halfW * 0.3, 0, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wingtip Plasma Cannons
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(-halfW + 4, -halfH - 2, 12, 3);
    ctx.fillRect(-halfW + 4, halfH - 1, 12, 3);
    ctx.fillStyle = glowColor;
    ctx.fillRect(halfW - 12, -halfH - 2, 4, 3);
    ctx.fillRect(halfW - 12, halfH - 1, 4, 3);

    ctx.restore();
    return;
  }

  // 3. CARS (Neon Drifter & Retro Muscle)
  if (archetype === 'car_neon_drifter' || archetype === 'car_retro_muscle') {
    ctx.save();
    const isMuscle = archetype === 'car_retro_muscle';

    // Neon Underglow
    ctx.save();
    ctx.fillStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 14;
    ctx.fillRect(-halfW + 4, halfH - 4, width - 8, 4);
    ctx.restore();

    // Wheels
    const wheelY = halfH - 6;
    const wheelRadius = isMuscle ? 9 : 8;
    const rearWheelX = -halfW + 10;
    const frontWheelX = halfW - 10;

    [rearWheelX, frontWheelX].forEach(wx => {
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(wx, wheelY, wheelRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = glowColor;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(animPhase) * wheelRadius * 0.7, wheelY + Math.sin(animPhase) * wheelRadius * 0.7);
      ctx.lineTo(wx - Math.cos(animPhase) * wheelRadius * 0.7, wheelY - Math.sin(animPhase) * wheelRadius * 0.7);
      ctx.stroke();
      ctx.restore();
    });

    // Car Body
    ctx.fillStyle = primaryColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    if (isMuscle) {
      ctx.moveTo(-halfW + 2, halfH - 8);
      ctx.lineTo(-halfW + 2, 0);
      ctx.lineTo(-halfW + 12, -halfH + 8);
      ctx.lineTo(4, -halfH + 8);
      ctx.lineTo(14, 0);
      ctx.lineTo(halfW + 4, 0);
      ctx.lineTo(halfW + 4, halfH - 8);
      ctx.closePath();
    } else {
      ctx.moveTo(-halfW + 2, halfH - 8);
      ctx.lineTo(-halfW + 2, -2);
      ctx.lineTo(-halfW + 10, -halfH + 6);
      ctx.lineTo(6, -halfH + 6);
      ctx.lineTo(halfW + 6, 2);
      ctx.lineTo(halfW + 6, halfH - 8);
      ctx.closePath();
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Windshield
    ctx.fillStyle = eyeColor || '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-halfW + 14, -halfH + 9);
    ctx.lineTo(2, -halfH + 9);
    ctx.lineTo(10, 0);
    ctx.lineTo(-halfW + 14, 0);
    ctx.closePath();
    ctx.fill();

    // Spoiler
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(-halfW - 2, -halfH + 2, 8, 4);
    ctx.fillRect(-halfW + 2, -halfH + 6, 2, 6);

    // Exhaust Nitro Flame
    if (isMoving) {
      ctx.save();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-halfW + 2, halfH - 12);
      ctx.lineTo(-halfW - 14 - flameFlicker, halfH - 10);
      ctx.lineTo(-halfW + 2, halfH - 8);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    return;
  }

  // 4. TRUCKS (Armored Hauler & Offroad Titan)
  if (archetype === 'truck_hauler' || archetype === 'truck_rover') {
    ctx.save();
    const isRover = archetype === 'truck_rover';
    const wheelY = halfH - 6;
    const wheelR = 9;
    const wheelXs = isRover
      ? [-halfW + 8, 0, halfW - 8]
      : [-halfW + 8, halfW - 8];

    wheelXs.forEach(wx => {
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(wx, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(wx, wheelY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Heavy Truck Chassis
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(-halfW, halfH - 8);
    ctx.lineTo(-halfW, -halfH + 10);
    ctx.lineTo(6, -halfH + 10);
    ctx.lineTo(6, -halfH + 2);
    ctx.lineTo(halfW + 2, -halfH + 2);
    ctx.lineTo(halfW + 4, halfH - 8);
    ctx.closePath();
    ctx.fill();

    // Battering Ram
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(halfW, -2, 6, halfH - 6);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(halfW + 1, 2, 4, 3);
    ctx.fillRect(halfW + 1, 8, 4, 3);

    // Windshield
    ctx.fillStyle = eyeColor || '#38bdf8';
    ctx.fillRect(8, -halfH + 4, halfW - 8, 8);

    // Smokestacks
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(2, -halfH - 8, 3, 10);
    if (isMoving) {
      ctx.save();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      const smokeShift = Math.sin(timeNow * 0.02) * 4;
      ctx.beginPath();
      ctx.arc(-2 + smokeShift, -halfH - 12, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    return;
  }

  // 5. NAUTILUS SUBMERSIBLE
  if (archetype === 'sub_nautilus') {
    ctx.save();
    ctx.fillStyle = primaryColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfW + 2, halfH - 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Conning Tower
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(-6, -halfH - 4, 12, 8);
    ctx.fillRect(-2, -halfH - 10, 4, 8);
    ctx.fillStyle = glowColor;
    ctx.fillRect(0, -halfH - 10, 4, 3);

    // Observation Dome & Searchlight
    ctx.fillStyle = eyeColor || '#facc15';
    ctx.beginPath();
    ctx.arc(halfW - 2, 0, 7, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    ctx.save();
    const grad = ctx.createLinearGradient(halfW + 4, 0, halfW + 36, 0);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.35)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(halfW + 4, -4);
    ctx.lineTo(halfW + 36, -14);
    ctx.lineTo(halfW + 36, 14);
    ctx.lineTo(halfW + 4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Propeller
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-halfW - 4, -4, 4, 8);
    const propAngle = timeNow * 0.02;
    ctx.translate(-halfW - 4, 0);
    ctx.rotate(propAngle);
    ctx.fillRect(-1, -8, 2, 16);
    ctx.restore();

    if (isMoving) {
      ctx.save();
      ctx.strokeStyle = '#93c5fd';
      ctx.fillStyle = 'rgba(147, 197, 253, 0.5)';
      for (let b = 0; b < 3; b++) {
        const bx = -halfW - 10 - b * 8;
        const by = Math.sin(timeNow * 0.005 + b) * 5;
        ctx.beginPath();
        ctx.arc(bx, by, 2.5 + b, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
    return;
  }

  // 6. PLASMA HOVERCRAFT SKIMMER
  if (archetype === 'hovercraft_skimmer') {
    ctx.save();
    const bob = Math.sin(timeNow * 0.008) * 3;
    ctx.translate(0, bob);

    ctx.save();
    ctx.fillStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.fillRect(-halfW + 6, halfH - 8, width - 12, 4);
    ctx.restore();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-halfW, halfH - 12, width, 8, 4);
    ctx.fill();

    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(-halfW + 4, halfH - 10);
    ctx.lineTo(-halfW + 8, -4);
    ctx.lineTo(0, -halfH + 4);
    ctx.lineTo(halfW - 2, 0);
    ctx.lineTo(halfW, halfH - 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = eyeColor || '#38bdf8';
    ctx.fillRect(-2, -6, 14, 6);

    ctx.fillStyle = secondaryColor;
    ctx.fillRect(-halfW - 2, -6, 8, 10);
    if (isMoving) {
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-halfW - 12 - flameFlicker, -4, 10, 6);
    }
    ctx.restore();
    return;
  }

  // 7. COMBAT MECH WALKER
  if (archetype === 'mech_strider') {
    ctx.save();
    const step = Math.sin(animPhase) * 8;

    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(-8 - step, halfH - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(8 + step, halfH - 4);
    ctx.stroke();

    ctx.fillStyle = primaryColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(-12, -halfH + 4, 24, 20);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.fillRect(-4, -halfH + 10, 14, 4);

    ctx.fillStyle = secondaryColor;
    ctx.fillRect(-halfW - 2, -halfH + 2, 8, 10);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-halfW, -halfH + 4, 3, 3);
    ctx.fillRect(-halfW, -halfH + 8, 3, 3);

    ctx.fillStyle = '#475569';
    ctx.fillRect(8, -2, 16, 6);
    ctx.fillStyle = glowColor;
    ctx.fillRect(22, -1, 4, 4);

    ctx.restore();
    return;
  }

  ctx.restore();
  } catch (err) {
    console.error('Error in drawVehicle:', err);
  }
}

/**
 * Draws the customizable runner character or vehicle on a 2D canvas.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {object} player 
 * @param {object} skin 
 * @param {number} timeNow 
 */
export function drawCharacter(ctx, player, skin, timeNow = 0) {
  if (!ctx || !player) return;

  try {
    const {
      x = 0,
      y = 0,
      width = 40,
      height = 48,
      isGrounded = false,
      rotation = 0,
      gravityDir = 1,
      mode = 'runner', // 'runner' or 'fly'
      animDistance = 0
    } = player;

    const {
      archetype = 'cyborg',
      primaryColor = '#06b6d4',
      secondaryColor = '#3b82f6',
      glowColor = '#67e8f9',
      eyeColor = '#ffffff',
      accessory = 'visor'
    } = skin || {};

    ctx.save();
    // Center translation for rotation
    ctx.translate(x + width / 2, y + height / 2);

    // Gravity flip
    if (gravityDir === -1) {
      ctx.scale(1, -1);
    }

    // Horizontal direction flip (facing left vs right)
    if (player.facing === -1) {
      ctx.scale(-1, 1);
    }

    // Hit flash blinking when invulnerable/hurt
    if ((player.invulnTimer || 0) > 0 && Math.floor((timeNow || performance.now()) / 70) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Mid-air flip or angle
    if (!isGrounded && mode === 'runner' && (!player.gameStyle || player.gameStyle === 'runner')) {
      ctx.rotate(rotation);
    } else if (mode === 'fly' || player.gameStyle === 'aircraft') {
      // Tilt slightly up or down based on vertical velocity
      const tilt = Math.max(-0.4, Math.min(0.4, (player.vy || 0) * 0.0006));
      ctx.rotate(tilt);
    } else if (player.gameStyle === 'descent') {
      // Swimming horizontal tilt
      const swimTilt = Math.max(-0.35, Math.min(0.35, (player.vy || 0) * 0.0008));
      ctx.rotate(swimTilt);
    }

    const halfW = width / 2;
    const halfH = height / 2;

    // Check if player is using a vehicle (Spaceship, Car, Truck, Submersible, Mech) or custom imported asset,
    // or if current gamestyle is aircraft (which visually requires an aircraft/starfighter)
    const isAircraftMode = player.gameStyle === 'aircraft' || player.mode === 'aircraft';
    if (skin?.category === 'vehicle' || skin?.isVehicle || isVehicleArchetype(archetype) || isAircraftMode) {
      // If skin is not explicitly a vehicle but player is in aircraft game style, render aircraft vehicle visuals!
      const effectiveSkin = (skin?.category === 'vehicle' || skin?.isVehicle || isVehicleArchetype(archetype))
        ? skin
        : {
            ...skin,
            archetype: 'spaceship_viper',
            category: 'vehicle',
            isVehicle: true
          };
      drawVehicle(ctx, player, effectiveSkin, timeNow, halfW, halfH, width, height);
      ctx.restore();
      return;
    }

    // Running cycle phase (0 to 2*PI)
    const isMovingH = Math.abs(player.vx || 0) > 20;
    const runPhase = isGrounded && isMovingH ? (animDistance / 14) : 0;
    const legSwing = Math.sin(runPhase) * 14;
    const armSwing = -Math.sin(runPhase) * 12;

    // Aircraft Wings / Thruster Jet (if in aircraft mode)
    if (player.gameStyle === 'aircraft' || mode === 'fly') {
      ctx.save();
      const flameFlicker = Math.random() * 8;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-halfW - 4, -4);
      ctx.lineTo(-halfW - 22 - flameFlicker, 0);
      ctx.lineTo(-halfW - 4, 4);
      ctx.closePath();
      ctx.fill();

      // Inner core flame
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-halfW - 4, -2);
      ctx.lineTo(-halfW - 14 - flameFlicker * 0.5, 0);
      ctx.lineTo(-halfW - 4, 2);
      ctx.closePath();
      ctx.fill();

      // Aircraft Top Wing & Blaster Pod
      if (player.gameStyle === 'aircraft') {
        ctx.fillStyle = primaryColor;
        ctx.fillRect(-halfW - 2, -halfH - 4, halfW + 12, 4);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(halfW - 2, -halfH - 6, 6, 8); // Cannon tip
      }
      ctx.restore();
    }

    // Diver Bubbles
    if (player.gameStyle === 'descent') {
      ctx.save();
      ctx.strokeStyle = '#93c5fd';
      ctx.fillStyle = 'rgba(147, 197, 253, 0.4)';
      ctx.lineWidth = 1.5;
      for (let b = 0; b < 3; b++) {
        const bx = -halfW - 8 - b * 8;
        const by = -halfH / 2 + Math.sin(timeNow * 0.005 + b) * 8;
        ctx.beginPath();
        ctx.arc(bx, by, 3 + b, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 1. BACK ARM (behind body)
    if (isGrounded && mode === 'runner') {
      ctx.save();
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.roundRect(-4 - armSwing * 0.5, -2, 6, 16, 3);
      ctx.fill();
      ctx.restore();
    }

    // 2. BACK LEG
    if (isGrounded && mode === 'runner') {
      ctx.save();
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.roundRect(-2 - legSwing, 6, 7, 18, 3);
      ctx.fill();
      // Foot
      ctx.fillStyle = primaryColor;
      ctx.fillRect(-1 - legSwing, 21, 9, 4);
      ctx.restore();
    }

    // 3. MAIN TORSO / BODY
    ctx.save();
    ctx.fillStyle = primaryColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    
    // Archetype specific body shape
    if (archetype === 'retro') {
      // Pixel chunky torso
      ctx.fillRect(-12, -8, 24, 20);
    } else {
      // Sleek curved torso
      ctx.beginPath();
      ctx.roundRect(-12, -8, 24, 20, 6);
      ctx.fill();
    }
    ctx.restore();

    // Torso armor plate / Core emblem
    ctx.save();
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(-8, -4, 16, 12);

    // Glowing core reactor
    ctx.fillStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. FRONT LEG
    if (isGrounded && mode === 'runner') {
      ctx.save();
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.roundRect(2 + legSwing, 6, 7, 18, 3);
      ctx.fill();
      // Foot
      ctx.fillStyle = secondaryColor;
      ctx.fillRect(3 + legSwing, 21, 9, 4);
      ctx.restore();
    } else if (!isGrounded && mode === 'runner') {
      // Acrobatic tucked legs during jumps
      ctx.save();
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.roundRect(-6, 8, 14, 8, 4);
      ctx.fill();
      ctx.restore();
    } else if (mode === 'fly') {
      // Streamlined trailing legs
      ctx.save();
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.roundRect(-10, 8, 16, 7, 3);
      ctx.fill();
      ctx.restore();
    }

    // 5. FRONT ARM & ATTACK VISUALS
    if (player.isAttacking) {
      ctx.save();
      const combo = player.attackCombo || 1;
      if (combo === 1) {
        // Straight cyber punch
        ctx.fillStyle = primaryColor;
        ctx.fillRect(4, -4, 22, 7);
        // Glowing energy fist
        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(26, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (combo === 2) {
        // Uppercut
        ctx.fillStyle = primaryColor;
        ctx.fillRect(4, -14, 18, 7);
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(22, -14, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // High kick energy burst
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(24, 8, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (isGrounded && (mode === 'runner' || isMovingH)) {
      ctx.save();
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.roundRect(2 + armSwing * 0.5, -2, 6, 16, 3);
      ctx.fill();
      ctx.restore();
    } else {
      // Idle or ready arm
      ctx.save();
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.roundRect(2, 0, 6, 14, 3);
      ctx.fill();
      ctx.restore();
    }

    // 6. HEAD
    ctx.save();
    ctx.fillStyle = primaryColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(-10, -23, 20, 16, 5);
    ctx.fill();
    ctx.restore();

    // Face Visor / Eyes
    ctx.save();
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    if (archetype === 'shadow') {
      // Twin menacing glowing eye slits
      ctx.fillRect(0, -17, 7, 3);
    } else if (archetype === 'astro') {
      // Big curved gold bubble visor
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(-2, -19, 11, 9, 3);
      ctx.fill();
      // Reflection streak
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, -18, 2, 4);
    } else {
      // Sleek cyber visor
      ctx.fillRect(-2, -18, 11, 4.5);
    }
    ctx.restore();

    // 7. ACCESSORIES
    drawAccessory(ctx, accessory, glowColor, secondaryColor, runPhase, timeNow);

    ctx.restore();
  } catch (err) {
    console.warn('Error in drawCharacter:', err);
    ctx.restore();
  }
}

/**
 * Draws headgear or attached accessories.
 */
function drawAccessory(ctx, accessory, glowColor, secondaryColor, runPhase, timeNow) {
  if (!accessory || accessory === 'none') return;

  try {
    ctx.save();
    switch (accessory) {
      case 'headband': {
        // Ninja forehead band
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-11, -21, 22, 3.5);
        // Fluttering twin tails trailing behind head
        const flutter1 = Math.sin(runPhase * 2 + timeNow * 0.01) * 5;
        const flutter2 = Math.cos(runPhase * 2 + timeNow * 0.01) * 5;
        ctx.beginPath();
        ctx.moveTo(-10, -20);
        ctx.quadraticCurveTo(-18, -22 + flutter1, -26, -18 + flutter1);
        ctx.lineTo(-24, -15 + flutter1);
        ctx.quadraticCurveTo(-16, -18 + flutter1, -10, -18);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-10, -19);
        ctx.quadraticCurveTo(-17, -25 + flutter2, -23, -22 + flutter2);
        ctx.lineTo(-21, -19 + flutter2);
        ctx.quadraticCurveTo(-15, -21 + flutter2, -10, -17);
        ctx.fill();
        break;
      }
      case 'visor': {
        // Futuristic cyber visor glow bar
        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
        ctx.fillRect(-11, -19, 22, 4);
        break;
      }
      case 'halo': {
        // Floating holy neon ring
        ctx.strokeStyle = '#fef08a';
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, -29, 12, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'horns': {
        // Cybernetic angled horns
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 8;
        // Left horn
        ctx.beginPath();
        ctx.moveTo(-8, -23);
        ctx.lineTo(-14, -32);
        ctx.lineTo(-5, -24);
        ctx.fill();
        // Right horn
        ctx.beginPath();
        ctx.moveTo(8, -23);
        ctx.lineTo(14, -32);
        ctx.lineTo(5, -24);
        ctx.fill();
        break;
      }
      case 'crown': {
        // Golden crown
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-9, -23);
        ctx.lineTo(-9, -30);
        ctx.lineTo(-5, -25);
        ctx.lineTo(0, -32);
        ctx.lineTo(5, -25);
        ctx.lineTo(9, -30);
        ctx.lineTo(9, -23);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'headphones': {
        // DJ Pulse headphones
        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 6;
        // Ear cups
        ctx.fillRect(-12, -20, 3, 9);
        ctx.fillRect(9, -20, 3, 9);
        // Overhead band
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -18, 11, Math.PI, 0);
        ctx.stroke();
        break;
      }
      case 'mohawk': {
        // Laser mohawk
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(-6, -23);
        ctx.lineTo(-2, -32);
        ctx.lineTo(2, -33);
        ctx.lineTo(6, -23);
        ctx.fill();
        break;
      }
      case 'astronaut': {
        // Pressurized outer dome ring
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -15, 12, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      default:
        break;
    }
    ctx.restore();
  } catch (err) {
    ctx.restore();
  }
}

/**
 * Renders particle trails left behind the runner.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Array} trailHistory 
 * @param {object} skin 
 */
export function drawTrail(ctx, trailHistory, skin) {
  if (!ctx || !Array.isArray(trailHistory) || trailHistory.length === 0) return;

  try {
    const trailType = skin?.trail || 'neon';
    ctx.save();

    for (let i = 0; i < trailHistory.length; i++) {
      const item = trailHistory[i];
      if (!item || !Number.isFinite(item.x) || !Number.isFinite(item.y)) continue;

      const alpha = (i + 1) / trailHistory.length * 0.45;
      const sizeScale = (i + 1) / trailHistory.length;

      ctx.globalAlpha = alpha;

      if (trailType === 'fire') {
        ctx.fillStyle = i % 2 === 0 ? '#ea580c' : '#facc15';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(item.x + 20, item.y + 24, 6 * sizeScale, 0, Math.PI * 2);
        ctx.fill();
      } else if (trailType === 'rainbow') {
        const hue = (i * 24 + Date.now() * 0.2) % 360;
        ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
        ctx.beginPath();
        ctx.roundRect(item.x + 8, item.y + 12, 24 * sizeScale, 24 * sizeScale, 4);
        ctx.fill();
      } else if (trailType === 'matrix') {
        ctx.fillStyle = '#22c55e';
        ctx.font = '10px monospace';
        ctx.fillText(i % 2 === 0 ? '1' : '0', item.x + 16, item.y + 24);
      } else if (trailType === 'void') {
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(item.x + 20, item.y + 24, 7 * sizeScale, 0, Math.PI * 2);
        ctx.fill();
      } else if (trailType === 'solar') {
        ctx.fillStyle = '#eab308';
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(item.x + 20, item.y + 24, 8 * sizeScale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Neon Ghost Trail
        ctx.fillStyle = skin?.glowColor || '#06b6d4';
        ctx.shadowColor = skin?.glowColor || '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(item.x + 6, item.y + 8, 28 * sizeScale, 36 * sizeScale, 6);
        ctx.fill();
      }
    }
    ctx.restore();
  } catch (err) {
    ctx.restore();
  }
}

/**
 * Draws death explosion particles.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Array} particles 
 */
export function drawDeathParticles(ctx, particles) {
  if (!ctx || !Array.isArray(particles)) return;

  try {
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p || p.life <= 0) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color || '#06b6d4';
      ctx.shadowColor = p.color || '#06b6d4';
      ctx.shadowBlur = 8;

      if (p.shape === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
    ctx.restore();
  } catch (err) {
    ctx.restore();
  }
}
