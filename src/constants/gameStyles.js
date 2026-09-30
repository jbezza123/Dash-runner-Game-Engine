/**
 * Multi-Genre Game Styles and Pursuit Hazard Configurations.
 * Defines physics parameters, controls, and gameplay mechanics for:
 * - Dash Runner (Classic rhythmic auto-runner)
 * - Free Platformer (Manual 2D Adventure - Mario / Flashback style)
 * - Vertical Climber (Tower ascent / Icy Climber style)
 * - Deep Descent / Diver (Subterranean cavern & underwater exploration)
 * - Arcade Aircraft / Shmup (Jetpack & flying shooter)
 * - Brawler / Fighter Arena (Street Fighter style melee combat & health bars)
 */

export const GAME_STYLES = {
  runner: {
    id: 'runner',
    name: 'Dash Runner',
    tagline: 'Rhythmic auto-runner with timing jumps and gravity portals',
    icon: 'Zap',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    accentColor: '#06b6d4',
    isAutoScroll: true,
    hasCombat: false,
    controls: 'Space / Click to Jump or hold Thruster in Fly mode',
    physics: {
      gravity: 2400,
      jumpForce: 840,
      baseSpeed: 420,
      maxFallSpeed: 1200,
      canMoveBackwards: false,
      variableJump: false,
      allowShooting: false,
    }
  },
  platformer: {
    id: 'platformer',
    name: 'Free Platformer',
    tagline: 'Precision 2D manual exploration (Mario / Flashback style)',
    icon: 'Gamepad2',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    accentColor: '#f59e0b',
    isAutoScroll: false,
    hasCombat: true,
    controls: 'A/D or Arrows to Move, Space/W to Jump, S to Duck, J/Z to Attack',
    physics: {
      gravity: 2200,
      jumpForce: 820,
      baseSpeed: 360,
      sprintSpeed: 520,
      acceleration: 2400,
      friction: 0.82,
      maxFallSpeed: 1200,
      canMoveBackwards: true,
      variableJump: true,
      allowShooting: true,
    }
  },
  climber: {
    id: 'climber',
    name: 'Vertical Tower',
    tagline: 'Ascend ever-higher towers with high-bounce springs and ascending goal',
    icon: 'ArrowUpFromLine',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    accentColor: '#10b981',
    isAutoScroll: false,
    hasCombat: false,
    controls: 'A/D to steer, Space to leap upward, bounce on pads to scale heights',
    physics: {
      gravity: 1900,
      jumpForce: 860,
      baseSpeed: 380,
      acceleration: 2200,
      friction: 0.85,
      maxFallSpeed: 1100,
      canMoveBackwards: true,
      variableJump: true,
      allowShooting: false,
    }
  },
  descent: {
    id: 'descent',
    name: 'Deep Diver / Cavern',
    tagline: 'Subterranean mining & underwater diving into deep cavern depths',
    icon: 'Anchor',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    accentColor: '#3b82f6',
    isAutoScroll: false,
    hasCombat: true,
    controls: 'A/D to steer, Space/W to swim upward, S to dive downward, J/Z to drill/blast',
    physics: {
      gravity: 800, // gentle underwater/subterranean gravity
      jumpForce: 520,
      baseSpeed: 320,
      acceleration: 1600,
      friction: 0.90, // fluid drag
      maxFallSpeed: 600,
      canMoveBackwards: true,
      variableJump: true,
      allowShooting: true,
    }
  },
  aircraft: {
    id: 'aircraft',
    name: 'Arcade Aircraft',
    tagline: 'High-speed jet flight with altitude thrusters & plasma blaster',
    icon: 'Plane',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    accentColor: '#f43f5e',
    isAutoScroll: true,
    hasCombat: true,
    controls: 'Hold Space/Up to thrust altitude, J/Z/Tap to shoot plasma blasters',
    physics: {
      gravity: 1400,
      jetpackThrust: 2200,
      baseSpeed: 440,
      maxFallSpeed: 700,
      canMoveBackwards: false,
      variableJump: false,
      allowShooting: true,
    }
  },
  fighter: {
    id: 'fighter',
    name: 'Brawler Arena',
    tagline: 'Combat fighting arena with punches, kicks, combos, and health bars',
    icon: 'Swords',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    accentColor: '#a855f7',
    isAutoScroll: false,
    hasCombat: true,
    controls: 'A/D to move, Space to Jump, S to Block, J/Z to Punch/Kick combo',
    physics: {
      gravity: 2400,
      jumpForce: 800,
      baseSpeed: 360,
      sprintSpeed: 480,
      acceleration: 2600,
      friction: 0.80,
      maxFallSpeed: 1200,
      canMoveBackwards: true,
      variableJump: true,
      allowShooting: true,
    }
  }
};

export const CHASE_HAZARDS = {
  none: {
    id: 'none',
    name: 'No Pursuer',
    desc: 'Normal course without chasing death hazard',
    icon: 'Check'
  },
  wall_of_death: {
    id: 'wall_of_death',
    name: 'Wall of Death',
    desc: 'Roaring laser/fire wall closing in relentlessly from behind',
    icon: 'Flame',
    color: '#ef4444',
    defaultSpeed: 280,
    delaySeconds: 2.0
  },
  shadow_beast: {
    id: 'shadow_beast',
    name: 'Shadow Beast NPC',
    desc: 'Menacing dark creature with glowing red eyes pursuing the player',
    icon: 'Skull',
    color: '#9333ea',
    defaultSpeed: 300,
    delaySeconds: 1.5
  }
};

export function getGameStyleConfig(styleId) {
  return GAME_STYLES[styleId] || GAME_STYLES.runner;
}

export function getChaseHazardConfig(hazardId) {
  return CHASE_HAZARDS[hazardId] || CHASE_HAZARDS.none;
}
