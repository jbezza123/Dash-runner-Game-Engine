/**
 * Physics and Collision Engine for Dash Runner.
 * Implements deterministic grid-aligned collision detection, orbs, pads, gravity portals, and practice checkpoints.
 */

import { TILE_SIZE, BASE_SPEED, SPEED_MULTIPLIERS, PHYSICS } from '../constants/gameDefaults.js';
import { soundEngine } from './audioEngine.js';
import { getBlueprint } from './levelRenderer.js';
import { getGameStyleConfig } from '../constants/gameStyles.js';
import { getPhysicsNearbyObjects } from '../utils/occlusionCulling.js';

/**
 * Checks if two bounding boxes intersect.
 */
export function checkAABB(b1, b2) {
  if (!b1 || !b2) return false;
  return (
    b1.x < b2.x + b2.width &&
    b1.x + b1.width > b2.x &&
    b1.y < b2.y + b2.height &&
    b1.y + b1.height > b2.y
  );
}

/**
 * Checks point-in-circle collision.
 */
export function checkCircleCollision(px, py, pr, cx, cy, cr) {
  const dx = px - cx;
  const dy = py - cy;
  const distSq = dx * dx + dy * dy;
  const radiusSum = pr + cr;
  return distSq <= radiusSum * radiusSum;
}

/**
 * Checks if a point (px, py) is inside a 2D polygon defined by vertices [{x, y}, ...].
 * Ray-casting algorithm.
 */
export function isPointInPolygon(px, py, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if two line segments (p1-p2) and (p3-p4) intersect.
 */
function lineSegmentsIntersect(p1, p2, p3, p4) {
  function ccw(A, B, C) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  }
  return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

/**
 * Checks collision between an AABB box and a polygon.
 */
export function checkPolygonAABB(box, polygon) {
  if (!box || !polygon || polygon.length < 3) return false;

  // 1. Any box corner inside polygon
  const boxCorners = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height }
  ];
  for (let i = 0; i < boxCorners.length; i++) {
    if (isPointInPolygon(boxCorners[i].x, boxCorners[i].y, polygon)) {
      return true;
    }
  }

  // 2. Any polygon vertex inside box
  for (let i = 0; i < polygon.length; i++) {
    const pt = polygon[i];
    if (pt.x >= box.x && pt.x <= box.x + box.width &&
        pt.y >= box.y && pt.y <= box.y + box.height) {
      return true;
    }
  }

  // 3. Edge crossings
  const boxEdges = [
    [boxCorners[0], boxCorners[1]],
    [boxCorners[1], boxCorners[2]],
    [boxCorners[2], boxCorners[3]],
    [boxCorners[3], boxCorners[0]]
  ];

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    for (let j = 0; j < 4; j++) {
      if (lineSegmentsIntersect(p1, p2, boxEdges[j][0], boxEdges[j][1])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks collision between two polygons.
 */
export function checkPolygonPolygon(polyA, polyB) {
  if (!polyA || !polyB || polyA.length < 3 || polyB.length < 3) return false;
  // Point in poly check
  for (let i = 0; i < polyA.length; i++) {
    if (isPointInPolygon(polyA[i].x, polyA[i].y, polyB)) return true;
  }
  for (let i = 0; i < polyB.length; i++) {
    if (isPointInPolygon(polyB[i].x, polyB[i].y, polyA)) return true;
  }
  // Edge intersections
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];
      if (lineSegmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

/**
 * Executes a single physics step.
 * @param {object} player 
 * @param {Array} objects 
 * @param {number} dt Delta time in seconds (clamped)
 * @param {object} inputState { isHoldingJump, didPressJump, moveLeft, moveRight, crouch, isSprinting, didPressAttack }
 * @param {number} floorY Base canvas floor Y coordinate
 * @param {number} ceilingY Base canvas ceiling Y coordinate
 * @param {object} context { gameStyle, projectiles, pursuer, enemies, sparkParticles, levelHeight }
 * @returns {{ isDead: boolean, isFinished: boolean, deathReason: string|null }}
 */
export function updatePhysics(player, objects, dt, inputState = {}, floorY, ceilingY, context = {}) {
  if (!player) return { isDead: false, isFinished: false, deathReason: null };

  // Strict clamp on dt to prevent tunneling on frame lag
  const safeDt = Math.max(0.001, Math.min(0.05, Number(dt) || 0.016));

  // Determine active Game Style and configuration
  const gameStyle = context.gameStyle || player.gameStyle || 'runner';
  const styleConfig = getGameStyleConfig(gameStyle);
  player.gameStyle = gameStyle;
  player.styleConfig = styleConfig;
  player.facing = player.facing || 1;
  player.hp = player.hp !== undefined ? player.hp : 100;
  player.maxHp = 100;
  player.invulnTimer = Math.max(0, (player.invulnTimer || 0) - safeDt);

  const speedMult = SPEED_MULTIPLIERS[player.speedMode] || 1.0;

  // 1. HORIZONTAL VELOCITY & STYLE-AWARE MOVEMENT
  if (gameStyle === 'runner') {
    // Classic Dash Auto-Runner
    if (player.isDashing) {
      player.dashTimer = Math.max(0, (player.dashTimer || 0) - safeDt);
      if (player.dashTimer <= 0 || (!inputState.isHoldingJump && !inputState.didPressJump)) {
        player.isDashing = false;
      }
    }
    const currentSpeed = player.isDashing ? BASE_SPEED * speedMult * 1.65 : BASE_SPEED * speedMult;
    player.vx = currentSpeed;
    player.x += player.vx * safeDt;
    player.animDistance += player.vx * safeDt;
    player.facing = 1;
  } else if (gameStyle === 'aircraft') {
    // Arcade Aircraft / Forward Jet Flight with air brakes & afterburner
    let currentSpeed = (styleConfig.physics.baseSpeed || 440) * speedMult;
    if (inputState.moveRight) {
      currentSpeed *= 1.45; // Afterburner boost!
    } else if (inputState.moveLeft) {
      currentSpeed *= 0.65; // Air brakes!
    }
    player.vx = currentSpeed;
    player.x += player.vx * safeDt;
    player.animDistance += player.vx * safeDt;
    player.facing = 1;
  } else {
    // Manual 2D Precision Movement: Platformer, Tower Climber, Deep Diver, Fighter Arena
    const isSprint = Boolean(inputState.isSprinting);
    const targetMaxSpeed = (isSprint ? (styleConfig.physics.sprintSpeed || 500) : (styleConfig.physics.baseSpeed || 360)) * speedMult;
    const accel = (styleConfig.physics.acceleration || 2400);
    const friction = (styleConfig.physics.friction || 0.82);

    if (inputState.moveLeft) {
      player.vx = Math.max(-targetMaxSpeed, (player.vx || 0) - accel * safeDt);
      player.facing = -1;
      player.animDistance += Math.abs(player.vx) * safeDt;
    } else if (inputState.moveRight) {
      player.vx = Math.min(targetMaxSpeed, (player.vx || 0) + accel * safeDt);
      player.facing = 1;
      player.animDistance += Math.abs(player.vx) * safeDt;
    } else {
      player.vx = (player.vx || 0) * Math.pow(friction, safeDt * 60);
      if (Math.abs(player.vx) < 12) player.vx = 0;
    }

    player.x += (player.vx || 0) * safeDt;
    if (player.x < 0) {
      player.x = 0;
      player.vx = 0;
    }
  }

  // 2. VERTICAL DYNAMICS & JUMP / DIVE INPUT
  const gravityDir = player.gravityDir || 1; // 1 = down, -1 = up
  const gravity = styleConfig.physics.gravity || PHYSICS.gravity;
  const jumpForce = styleConfig.physics.jumpForce || PHYSICS.jumpForce;

  // Jump buffering & coyote time timers
  player.jumpBuffer = Math.max(0, (player.jumpBuffer || 0) - safeDt);
  if (inputState && inputState.didPressJump) {
    player.jumpBuffer = 0.14; // 140ms input buffer for responsive jumping
  }

  if (player.isGrounded) {
    player.coyoteTimer = 0.08; // 80ms coyote time window
    player.isWallSliding = false;
  } else {
    player.coyoteTimer = Math.max(0, (player.coyoteTimer || 0) - safeDt);
  }

  if (player.isDashing) {
    player.vy = player.dashVy || 0;
    player.rotation = 0;
  } else if (gameStyle === 'aircraft') {
    // 2D Arcade Flight Pitch: W / Up flies up, S / Down dives down!
    const flySpeed = 460;
    if (inputState.isHoldingJump || inputState.didPressJump) {
      player.vy = -flySpeed * gravityDir;
      player.rotation = -0.15; // pitch up
    } else if (inputState.crouch) {
      player.vy = flySpeed * gravityDir;
      player.rotation = 0.15; // pitch down
    } else {
      player.vy *= Math.pow(0.85, safeDt * 60); // aerodynamic auto-leveling
      player.rotation *= Math.pow(0.82, safeDt * 60);
    }
  } else if (player.mode === 'fly') {
    // Classic Jetpack Portal
    const thrust = styleConfig.physics.jetpackThrust || PHYSICS.jetpackThrust;
    if (inputState.isHoldingJump) {
      player.vy -= thrust * safeDt * gravityDir;
    } else {
      player.vy += gravity * 0.7 * safeDt * gravityDir;
    }
    const maxFlySpeed = styleConfig.physics.maxFallSpeed || 600;
    player.vy = Math.max(-maxFlySpeed, Math.min(maxFlySpeed, player.vy));
    player.rotation = 0;
  } else if (gameStyle === 'descent') {
    // Deep Diver: Underwater swimming buoyancy & diving
    if (inputState.isHoldingJump || inputState.didPressJump) {
      player.vy = -380 * gravityDir; // upward swim stroke
    } else if (inputState.crouch) {
      player.vy = 420 * gravityDir; // dive downward
    } else {
      player.vy += gravity * safeDt * gravityDir; // gentle descent
    }
    player.vy *= Math.pow(0.92, safeDt * 60); // fluid drag
    player.vy = Math.max(-450, Math.min(500, player.vy));
    player.rotation = 0;
  } else {
    // Platformer, Climber, Fighter, Runner
    const canJump = player.isGrounded || (player.coyoteTimer > 0);
    const wantsJump = inputState.isHoldingJump || inputState.didPressJump || (player.jumpBuffer > 0);

    // Wall jump in climber mode
    if (gameStyle === 'climber' && player.isWallSliding && wantsJump) {
      player.vy = -jumpForce * 0.95;
      player.vx = (player.facing === -1 ? 380 : -380);
      player.facing = -player.facing;
      player.isWallSliding = false;
      player.jumpBuffer = 0;
      soundEngine.playJump();
    } else if (wantsJump && canJump) {
      player.vy = -jumpForce * gravityDir;
      player.isGrounded = false;
      player.coyoteTimer = 0;
      player.jumpBuffer = 0;
      soundEngine.playJump();
    }

    // Variable jump height release (Mario / Platformer style)
    if (styleConfig.physics.variableJump && !inputState.isHoldingJump && player.vy < -200 * gravityDir) {
      player.vy *= 0.62;
    }

    // Apply gravity
    player.vy += gravity * safeDt * gravityDir;
    const maxFall = styleConfig.physics.maxFallSpeed || PHYSICS.maxFallSpeed;
    player.vy = Math.max(-maxFall, Math.min(maxFall, player.vy));

    // Somersault flip rotation in air for auto-runner only
    if (gameStyle === 'runner' && !player.isGrounded) {
      player.rotation += 9.5 * safeDt * gravityDir;
    } else {
      player.rotation = 0;
    }
  }

  // Update Y position
  player.y += player.vy * safeDt;

  // 3. COMBAT & ATTACK ACTIONS
  player.attackTimer = Math.max(0, (player.attackTimer || 0) - safeDt);
  if (player.attackTimer <= 0) {
    player.isAttacking = false;
  }

  if (inputState.didPressAttack) {
    inputState.didPressAttack = false; // consume
    if (gameStyle === 'aircraft' || styleConfig.physics.allowShooting) {
      // Shoot plasma projectile
      if (Array.isArray(context.projectiles)) {
        context.projectiles.push({
          id: Math.random().toString(36).slice(2),
          x: player.facing === -1 ? player.x - 14 : player.x + player.width + 8,
          y: player.y + player.height / 2 - 3,
          vx: (player.facing || 1) * 780,
          vy: 0,
          radius: 5,
          color: '#38bdf8',
          damage: 40,
          life: 1.6
        });
      }
      soundEngine.playShoot();
    }
    if (gameStyle === 'fighter' || styleConfig.hasCombat) {
      player.isAttacking = true;
      player.attackTimer = 0.24;
      player.attackCombo = ((player.attackCombo || 0) % 3) + 1;
      soundEngine.playPunch();
    }
  }

  // 4. PROJECTILE SIMULATION & DAMAGE CHECKS
  if (Array.isArray(context.projectiles)) {
    for (let i = context.projectiles.length - 1; i >= 0; i--) {
      const proj = context.projectiles[i];
      proj.x += proj.vx * safeDt;
      proj.y += proj.vy * safeDt;
      proj.life = (proj.life || 1) - safeDt;
      if (proj.life <= 0) {
        context.projectiles.splice(i, 1);
        continue;
      }
      // Check collision with enemy bots
      if (Array.isArray(context.enemies)) {
        let hitEnemy = false;
        for (let eIdx = 0; eIdx < context.enemies.length; eIdx++) {
          const enemy = context.enemies[eIdx];
          if ((enemy.hp || 0) <= 0) continue;
          if (checkCircleCollision(proj.x, proj.y, proj.radius, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 24)) {
            enemy.hp = Math.max(0, (enemy.hp || 100) - (proj.damage || 35));
            enemy.hitFlash = 0.2;
            soundEngine.playHit();
            hitEnemy = true;
            if (enemy.hp <= 0) {
              soundEngine.playEnemyDeath();
            }
            break;
          }
        }
        if (hitEnemy) {
          context.projectiles.splice(i, 1);
          continue;
        }
      }
    }
  }

  // 5. PURSUIT HAZARD (WALL OF DEATH / SHADOW BEAST)
  if (context.pursuer && context.pursuer.active) {
    const pursuer = context.pursuer;
    pursuer.elapsed = (pursuer.elapsed || 0) + safeDt;
    if (pursuer.elapsed >= (pursuer.delay || 1.5)) {
      pursuer.x += (pursuer.speed || 290) * safeDt;
    }
    pursuer.dist = Math.round((player.x - pursuer.x) / TILE_SIZE);
    if (pursuer.x >= player.x - 16) {
      soundEngine.playCrash();
      return {
        isDead: true,
        isFinished: false,
        deathReason: `Overtaken by ${pursuer.name || 'Death Hazard'}`
      };
    }
  }

  // 3. FLOOR AND CEILING CONSTRAINTS
  const groundLevel = floorY - player.height;
  const ceilingLevel = ceilingY;

  if (gravityDir === 1) {
    if (player.y >= groundLevel) {
      player.y = groundLevel;
      player.vy = 0;
      player.isGrounded = true;
    } else {
      player.isGrounded = false;
    }
    // Death if hitting ceiling in fly mode or out of bounds
    if (player.y < ceilingLevel - 40) {
      player.y = ceilingLevel - 40;
      player.vy = 0;
    }
  } else {
    // Inverted gravity
    if (player.y <= ceilingLevel) {
      player.y = ceilingLevel;
      player.vy = 0;
      player.isGrounded = true;
    } else {
      player.isGrounded = false;
    }
    if (player.y > groundLevel + 40) {
      player.y = groundLevel + 40;
      player.vy = 0;
    }
  }

  // 4. OBJECT INTERACTIONS AND COLLISION
  const playerBox = {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height
  };

  // Tighter hitbox for lethal hazards (gives a fair, responsive arcade feel)
  const hazardBox = {
    x: player.x + 8,
    y: player.y + 6,
    width: player.width - 16,
    height: player.height - 12
  };

  // Compute player polygon if skin has a custom hitbox
  let playerPolygon = null;
  const skinHitbox = player.skin?.hitbox;
  if (skinHitbox?.type === 'polygon' && Array.isArray(skinHitbox.points) && skinHitbox.points.length >= 3) {
    const hw = player.width / 2;
    const hh = player.height / 2;
    const cx = player.x + hw;
    const cy = player.y + hh;
    const rot = player.rotation || 0;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    playerPolygon = skinHitbox.points.map(pt => {
      // Local coordinate relative to center
      const lx = -hw + pt.x * player.width;
      const ly = -hh + pt.y * player.height;
      // Rotated and translated to world coordinate
      return {
        x: cx + (lx * cosR - ly * sinR),
        y: cy + (lx * sinR + ly * cosR)
      };
    });
  }

  if (!Array.isArray(objects)) {
    return { isDead: false, isFinished: false, deathReason: null };
  }

  // Distance culling: only check objects within player's local vicinity using spatial partitioning
  const nearbyObjects = getPhysicsNearbyObjects(objects, player.x, 320);

  for (let i = 0; i < nearbyObjects.length; i++) {
    const obj = nearbyObjects[i];
    if (!obj) continue;

    // Convert grid coordinate to pixel coordinate
    const objPixelX = obj.x * TILE_SIZE;
    const objPixelY = floorY - (obj.y + 1) * TILE_SIZE;

    const objType = obj.type;

    // Resolve role if this is a custom blueprint
    const customBp = (objType?.startsWith('bp_') || obj.customAsset) ? (obj.customAsset || getBlueprint(objType)) : null;
    const customRole = customBp?.role;
    if (customRole === 'decor') continue; // Purely decorative custom assets pass through

    // --- SOLID BLOCKS ---
    if (objType.startsWith('block_') || customRole === 'block' || customRole === 'half_block') {
      const isHalf = objType === 'block_half' || objType === 'block_jungle_slab' || objType === 'block_temple_platform' || customRole === 'half_block';
      const blockH = isHalf ? TILE_SIZE / 2 : TILE_SIZE;
      const blockY = isHalf ? objPixelY + TILE_SIZE / 2 : objPixelY;

      const blockBox = {
        x: objPixelX,
        y: blockY,
        width: TILE_SIZE,
        height: blockH
      };

      if (checkAABB(playerBox, blockBox)) {
        if (gravityDir === 1) {
          const feetY = player.y + player.height;
          // Landing threshold: if feet are within 22px of top edge or above it, and falling or near apex
          if (feetY <= blockBox.y + 22 && player.vy >= -80) {
            player.y = blockBox.y - player.height;
            player.vy = 0;
            player.isGrounded = true;
            player.coyoteTimer = 0.08;
            player.isWallSliding = false;
          }
          // Underside bonk: hitting head on bottom of floating block
          else if (player.y >= blockBox.y + blockBox.height - 18 && player.vy < 0) {
            player.y = blockBox.y + blockBox.height;
            player.vy = 0;
          }
          // Lateral / side collision
          else {
            if (gameStyle === 'runner') {
              if (feetY > blockBox.y + 20 && (player.x + player.width > blockBox.x + 8)) {
                soundEngine.playCrash();
                return { isDead: true, isFinished: false, deathReason: 'Crashed into wall' };
              }
            } else {
              // Smooth wall collision slide / pushback for precision movement modes
              const overlapLeft = (player.x + player.width) - blockBox.x;
              const overlapRight = (blockBox.x + blockBox.width) - player.x;
              if (overlapLeft < overlapRight) {
                player.x = blockBox.x - player.width;
                if (player.vx > 0) player.vx = 0;
              } else {
                player.x = blockBox.x + blockBox.width;
                if (player.vx < 0) player.vx = 0;
              }
              if (gameStyle === 'climber' && !player.isGrounded && player.vy > 40) {
                player.vy = Math.min(player.vy, 140); // slow slide down wall
                player.isWallSliding = true;
              }
            }
          }
        } else {
          // Inverted gravity: landing on ceiling block
          const headY = player.y;
          if (headY >= blockBox.y + blockBox.height - 22 && player.vy <= 80) {
            player.y = blockBox.y + blockBox.height;
            player.vy = 0;
            player.isGrounded = true;
            player.coyoteTimer = 0.08;
            player.isWallSliding = false;
          } else if (headY + player.height <= blockBox.y + 18 && player.vy > 0) {
            player.y = blockBox.y - player.height;
            player.vy = 0;
          } else {
            if (gameStyle === 'runner') {
              if (headY < blockBox.y + blockBox.height - 20 && (player.x + player.width > blockBox.x + 8)) {
                soundEngine.playCrash();
                return { isDead: true, isFinished: false, deathReason: 'Crashed into wall' };
              }
            } else {
              const overlapLeft = (player.x + player.width) - blockBox.x;
              const overlapRight = (blockBox.x + blockBox.width) - player.x;
              if (overlapLeft < overlapRight) {
                player.x = blockBox.x - player.width;
                if (player.vx > 0) player.vx = 0;
              } else {
                player.x = blockBox.x + blockBox.width;
                if (player.vx < 0) player.vx = 0;
              }
            }
          }
        }
      }
    }

    // --- HAZARDS (SPIKES & SAWS WITH ROTATION SUPPORT) ---
    else if (objType === 'saw_blade' || objType === 'hazard_jungle_saw' || customRole === 'saw') {
      const sawCenterX = objPixelX + TILE_SIZE / 2;
      const sawCenterY = objPixelY + TILE_SIZE / 2;
      const sawRadius = (TILE_SIZE / 2) - 8;
      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;

      if (checkCircleCollision(playerCenterX, playerCenterY, 14, sawCenterX, sawCenterY, sawRadius)) {
        if (gameStyle === 'runner' || gameStyle === 'aircraft') {
          soundEngine.playCrash();
          return { isDead: true, isFinished: false, deathReason: customBp?.name ? `Sliced by ${customBp.name}` : 'Sliced by sawblade' };
        } else if (player.invulnTimer <= 0) {
          player.hp -= 30;
          player.invulnTimer = 0.8;
          player.vy = -380 * gravityDir;
          player.vx = (player.facing === -1 ? 220 : -220);
          soundEngine.playHit();
          if (player.hp <= 0) {
            soundEngine.playCrash();
            return { isDead: true, isFinished: false, deathReason: customBp?.name ? `Sliced by ${customBp.name}` : 'Sliced by sawblade' };
          }
        }
      }
    }
    else if (objType === 'spike_floor' || objType === 'spike_ceiling' || objType === 'spike_triple' || objType.startsWith('hazard_') || customRole === 'hazard') {
      const rot = (Math.round((Number(obj.rotation) || 0) / 90) * 90) % 360;
      let effectiveRot = rot;
      if (objType === 'spike_ceiling') {
        effectiveRot = (rot + 180) % 360;
      }

      let tipBox, baseBox;
      if (effectiveRot === 0) {
        // Pointing UP
        tipBox = { x: objPixelX + 16, y: objPixelY + 16, width: TILE_SIZE - 32, height: 18 };
        baseBox = { x: objPixelX + 8, y: objPixelY + 32, width: TILE_SIZE - 16, height: TILE_SIZE - 32 };
      } else if (effectiveRot === 180) {
        // Pointing DOWN
        tipBox = { x: objPixelX + 16, y: objPixelY + TILE_SIZE - 34, width: TILE_SIZE - 32, height: 18 };
        baseBox = { x: objPixelX + 8, y: objPixelY, width: TILE_SIZE - 16, height: TILE_SIZE - 32 };
      } else if (effectiveRot === 90) {
        // Pointing RIGHT
        tipBox = { x: objPixelX + TILE_SIZE - 34, y: objPixelY + 16, width: 18, height: TILE_SIZE - 32 };
        baseBox = { x: objPixelX, y: objPixelY + 8, width: TILE_SIZE - 32, height: TILE_SIZE - 16 };
      } else {
        // Pointing LEFT (270)
        tipBox = { x: objPixelX + 16, y: objPixelY + 16, width: 18, height: TILE_SIZE - 32 };
        baseBox = { x: objPixelX + 32, y: objPixelY + 8, width: TILE_SIZE - 32, height: TILE_SIZE - 16 };
      }

      let isHazardCollided = false;

      // Check if blueprint has a custom polygon hitbox
      if (customBp?.hitbox?.type === 'polygon' && Array.isArray(customBp.hitbox.points) && customBp.hitbox.points.length >= 3) {
        // Map normalized points to world coordinates
        const polyWorld = customBp.hitbox.points.map(pt => ({
          x: objPixelX + pt.x * TILE_SIZE,
          y: objPixelY + pt.y * TILE_SIZE
        }));

        if (playerPolygon) {
          isHazardCollided = checkPolygonPolygon(playerPolygon, polyWorld);
        } else {
          isHazardCollided = checkPolygonAABB(hazardBox, polyWorld);
        }
      } else {
        isHazardCollided = checkAABB(hazardBox, tipBox) || checkAABB(hazardBox, baseBox);
      }

      if (isHazardCollided) {
        const reason = customBp?.name ? `Hit ${customBp.name}` : (objType.startsWith('hazard_') ? `Hit ${objType.replace('hazard_', '')} hazard` : 'Hit hazard');
        if (gameStyle === 'runner' || gameStyle === 'aircraft') {
          soundEngine.playCrash();
          return { isDead: true, isFinished: false, deathReason: reason };
        } else if (player.invulnTimer <= 0) {
          player.hp -= 25;
          player.invulnTimer = 0.8;
          player.vy = -380 * gravityDir;
          player.vx = (player.facing === -1 ? 220 : -220);
          soundEngine.playHit();
          if (player.hp <= 0) {
            soundEngine.playCrash();
            return { isDead: true, isFinished: false, deathReason: reason };
          }
        }
      }
    }

    // --- INTERACTIVE ORBS (Jump rings & Dash orbs with buffered activation) ---
    else if (objType.startsWith('orb_') || customRole === 'orb') {
      const orbCenterX = objPixelX + TILE_SIZE / 2;
      const orbCenterY = objPixelY + TILE_SIZE / 2;
      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;

      const triggerRadius = TILE_SIZE * 0.72; // Generous circular activation field
      const isInsideOrb = checkCircleCollision(playerCenterX, playerCenterY, 16, orbCenterX, orbCenterY, triggerRadius);
      const wantsOrbJump = inputState.didPressJump || inputState.isHoldingJump || (player.jumpBuffer > 0);

      if (isInsideOrb && wantsOrbJump && !obj.triggered) {
        obj.triggered = true; // Prevents multiple activations in same jump
        player.jumpBuffer = 0; // Consume jump buffer
        soundEngine.playOrbHit();

        if (objType === 'orb_yellow' || customRole === 'orb') {
          player.vy = -PHYSICS.orbJumpForce * gravityDir;
          player.isGrounded = false;
          player.isDashing = false;
        } else if (objType === 'orb_pink') {
          player.vy = -PHYSICS.jumpForce * 0.85 * gravityDir;
          player.isGrounded = false;
          player.isDashing = false;
        } else if (objType === 'orb_blue') {
          player.gravityDir = (gravityDir === 1) ? -1 : 1;
          player.vy = -PHYSICS.orbJumpForce * 0.7 * player.gravityDir;
          player.isGrounded = false;
          player.isDashing = false;
          soundEngine.playGravityFlip();
        } else if (objType === 'orb_green') {
          player.gravityDir = (gravityDir === 1) ? -1 : 1;
          player.vy = -PHYSICS.orbJumpForce * player.gravityDir;
          player.isGrounded = false;
          player.isDashing = false;
          soundEngine.playGravityFlip();
        } else if (objType === 'orb_black') {
          // Black slam orb: violently plunges downward
          player.vy = PHYSICS.jumpForce * 1.5 * gravityDir;
          player.isGrounded = false;
          player.isDashing = false;
          soundEngine.playSlam();
        } else if (objType === 'orb_dash_green') {
          // Horizontal green dash orb
          player.isDashing = true;
          player.dashTimer = 0.8;
          player.dashVy = 0;
          player.vy = 0;
          player.isGrounded = false;
          soundEngine.playDash();
        } else if (objType === 'orb_dash_magenta') {
          // Diagonal upward dash orb
          player.isDashing = true;
          player.dashTimer = 0.65;
          player.dashVy = -PHYSICS.jumpForce * 0.85 * gravityDir;
          player.vy = player.dashVy;
          player.isGrounded = false;
          soundEngine.playDash();
        }
      }
    }

    // --- SECRET COLLECTIBLE COINS ---
    else if (objType === 'collectable_coin' || customRole === 'collectable') {
      const coinCenterX = objPixelX + TILE_SIZE / 2;
      const coinCenterY = objPixelY + TILE_SIZE / 2;
      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;

      if (!obj.collected && checkCircleCollision(playerCenterX, playerCenterY, 18, coinCenterX, coinCenterY, 22)) {
        obj.collected = true;
        player.coinsCollected = (player.coinsCollected || 0) + 1;
        soundEngine.playCoin();
      }
    }

    // --- INTERACTIVE PADS (Automatic launch pads on contact) ---
    else if (objType.startsWith('pad_') || customRole === 'pad') {
      const padBox = {
        x: objPixelX + 4,
        y: objPixelY + TILE_SIZE - 16,
        width: TILE_SIZE - 8,
        height: 16
      };

      if (checkAABB(playerBox, padBox)) {
        if (objType === 'pad_yellow' || customRole === 'pad') {
          player.vy = -PHYSICS.padJumpForce * gravityDir;
          player.isGrounded = false;
          soundEngine.playPadBounce();
        } else if (objType === 'pad_pink') {
          player.vy = -PHYSICS.jumpForce * 0.9 * gravityDir;
          player.isGrounded = false;
          soundEngine.playPadBounce();
        } else if (objType === 'pad_red') {
          player.vy = -PHYSICS.superPadForce * gravityDir;
          player.isGrounded = false;
          soundEngine.playPadBounce();
        } else if (objType === 'pad_blue') {
          player.gravityDir = (gravityDir === 1) ? -1 : 1;
          player.vy = -PHYSICS.padJumpForce * 0.8 * player.gravityDir;
          player.isGrounded = false;
          soundEngine.playGravityFlip();
        }
      }
    }

    // --- PORTALS (Gravity, Speed, Vehicle) ---
    else if (objType.startsWith('portal_')) {
      const portalBox = {
        x: objPixelX + 10,
        y: objPixelY,
        width: TILE_SIZE - 20,
        height: TILE_SIZE * 2
      };

      if (checkAABB(playerBox, portalBox)) {
        if (objType === 'portal_gravity_inv' && player.gravityDir !== -1) {
          player.gravityDir = -1;
          soundEngine.playGravityFlip();
        } else if (objType === 'portal_gravity_norm' && player.gravityDir !== 1) {
          player.gravityDir = 1;
          soundEngine.playGravityFlip();
        } else if (objType === 'portal_speed_slow') {
          player.speedMode = 'slow';
        } else if (objType === 'portal_speed_normal') {
          player.speedMode = 'normal';
        } else if (objType === 'portal_speed_fast') {
          player.speedMode = 'fast';
        } else if (objType === 'portal_fly') {
          player.mode = 'fly';
        } else if (objType === 'portal_runner') {
          player.mode = 'runner';
        }
      }
    }

    // --- FINISH GATE ---
    else if (objType === 'finish_gate' || objType === 'finish_gate_full') {
      const isSpanFull = Boolean(obj.spanFull || objType === 'finish_gate_full');
      const finishBox = isSpanFull ? {
        x: objPixelX,
        y: ceilingY,
        width: TILE_SIZE,
        height: Math.max(TILE_SIZE * 3, floorY - ceilingY)
      } : {
        x: objPixelX,
        y: objPixelY - TILE_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE * 3
      };

      if (checkAABB(playerBox, finishBox)) {
        soundEngine.playVictory();
        return { isDead: false, isFinished: true, deathReason: null };
      }
    }
  }

  return { isDead: false, isFinished: false, deathReason: null };
}

/**
 * Creates death burst particle array based on player position and skin.
 */
export function createDeathBurst(player, skin) {
  const particles = [];
  const effectType = skin?.deathEffect || 'pixel_scatter';
  const color = skin?.glowColor || '#06b6d4';
  const secondaryColor = skin?.secondaryColor || '#3b82f6';

  const originX = player.x + player.width / 2;
  const originY = player.y + player.height / 2;

  if (effectType === 'ring_burst') {
    // Expanding shockwave rings
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: originX,
        y: originY,
        vx: 0,
        vy: 0,
        size: 8 + i * 14,
        growth: 140,
        color,
        shape: 'ring',
        life: 1.0,
        decay: 2.2
      });
    }
  }

  // Fragment pieces
  const count = effectType === 'confetti' ? 40 : 25;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
    const speed = 120 + Math.random() * 260;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      size: 4 + Math.random() * 6,
      growth: -2,
      color: i % 2 === 0 ? color : secondaryColor,
      shape: 'box',
      life: 1.0,
      decay: 1.6 + Math.random() * 0.8
    });
  }

  return particles;
}
