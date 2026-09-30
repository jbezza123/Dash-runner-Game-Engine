/**
 * Main Gameplay Viewport Component (Vanilla JS / React).
 * Features real-time 60fps canvas game loop, high-precision millisecond timer,
 * practice mode checkpoints, audio rhythm synchronization, pause menu, and victory screen.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TILE_SIZE, PHYSICS } from '../constants/gameDefaults.js';
import { updatePhysics, createDeathBurst } from '../engine/physics.js';
import { drawCharacter, drawTrail, drawDeathParticles } from '../engine/characterRenderer.js';
import { drawLevel, drawForegroundObjects } from '../engine/levelRenderer.js';
import { soundEngine } from '../engine/audioEngine.js';
import { getGameStyleConfig, GAME_STYLES } from '../constants/gameStyles.js';
import {
  Play,
  RotateCcw,
  Pause,
  Flag,
  Trophy,
  Volume2,
  VolumeX,
  PlusCircle,
  MinusCircle,
  Home,
  CheckCircle,
  Sparkles,
  Edit3,
  ShieldCheck,
  Route,
  Crosshair,
  Sword,
  Flame,
  Shield,
  Heart,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Gamepad2
} from 'lucide-react';

export default function GameCanvas({
  level,
  skin,
  isPlaytest = false,
  onReturnToEditor,
  onExitToMenu,
  onSaveProgress,
  onOpenSkinCustomizer
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const [currentPercent, setCurrentPercent] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bestPercent, setBestPercent] = useState(0);
  const [isVictorious, setIsVictorious] = useState(false);
  const [victoryTimeMs, setVictoryTimeMs] = useState(0);
  const [checkpointsCount, setCheckpointsCount] = useState(0);
  const [coinsCount, setCoinsCount] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Practice mode checkpoints stack
  const checkpointsRef = useRef([]);

  // Trail history
  const trailHistoryRef = useRef([]);
  // Active death explosion particles
  const deathParticlesRef = useRef([]);
  // Session crash marks
  const deathMarksRef = useRef([]);
  // Floor Y tracker across screen resizes
  const prevFloorYRef = useRef(null);

  // Trajectory path tracking for Level Editor object placement
  const currentTrajectoryRef = useRef([]);
  const lastSavedTrajectoryRef = useRef([]);
  const hasVerifiedRef = useRef(false);
  const [isLevelVerified, setIsLevelVerified] = useState(false);

  // Multi-genre combat & state
  const [playerHp, setPlayerHp] = useState(100);
  const [pursuerDist, setPursuerDist] = useState(null);
  const [showTouchControls, setShowTouchControls] = useState(true);

  // Game state references for loop performance
  const gameStateRef = useRef({
    player: null,
    levelObjects: [],
    cameraX: 0,
    startTime: 0,
    elapsedMs: 0,
    isDead: false,
    deathTimer: 0,
    input: {
      isHoldingJump: false,
      didPressJump: false,
      moveLeft: false,
      moveRight: false,
      crouch: false,
      isSprinting: false,
      didPressAttack: false
    },
    projectiles: [],
    pursuer: { active: false, x: 0, speed: 280, delay: 1.8, elapsed: 0, dist: 999 },
    isPractice: false
  });

  // Level dimensions
  const levelLengthPixels = (level?.length || 120) * TILE_SIZE;

  // Initialize or reset player entity
  const spawnPlayer = useCallback((fromCheckpoint = false) => {
    // If not reviving from practice checkpoint, cycle and preserve the best attempt trajectory
    if (!fromCheckpoint) {
      if (currentTrajectoryRef.current.length > 0) {
        if (currentTrajectoryRef.current.length > lastSavedTrajectoryRef.current.length) {
          lastSavedTrajectoryRef.current = [...currentTrajectoryRef.current];
        }
        currentTrajectoryRef.current = [];
      }
    }

    const cp = fromCheckpoint && checkpointsRef.current.length > 0
      ? checkpointsRef.current[checkpointsRef.current.length - 1]
      : null;

    deathParticlesRef.current = [];
    trailHistoryRef.current = [];
    gameStateRef.current.projectiles = [];

    const activeGameStyle = level?.gameStyle || 'runner';
    const styleConfig = getGameStyleConfig(activeGameStyle);
    const chaseConfig = level?.chaseHazard;
    const hasChase = chaseConfig && chaseConfig.type && chaseConfig.type !== 'none';

    if (cp) {
      gameStateRef.current.player = {
        x: cp.x,
        y: cp.y,
        vx: cp.vx !== undefined ? cp.vx : (activeGameStyle === 'runner' ? 420 : activeGameStyle === 'aircraft' ? 440 : 0),
        vy: cp.vy || 0,
        width: PHYSICS.playerWidth,
        height: PHYSICS.playerHeight,
        isGrounded: cp.isGrounded !== undefined ? cp.isGrounded : true,
        rotation: 0,
        gravityDir: cp.gravityDir || 1,
        mode: cp.mode || 'runner',
        gameStyle: activeGameStyle,
        styleConfig,
        hp: cp.hp !== undefined ? cp.hp : 100,
        maxHp: 100,
        facing: cp.facing || 1,
        invulnTimer: 0,
        speedMode: cp.speedMode || 'normal',
        animDistance: cp.animDistance || 0,
        coinsCollected: cp.coinsCollected || 0
      };
      gameStateRef.current.cameraX = cp.cameraX || Math.max(0, cp.x - 180);
      gameStateRef.current.elapsedMs = cp.elapsedMs || 0;
      setCoinsCount(cp.coinsCollected || 0);
      setPlayerHp(cp.hp !== undefined ? cp.hp : 100);

      // Restore coins state based on checkpoint
      if (Array.isArray(gameStateRef.current.levelObjects)) {
        const collectedSet = new Set(cp.collectedCoinKeys || []);
        gameStateRef.current.levelObjects.forEach(o => {
          if (o && o.type === 'collectable_coin') {
            o.collected = collectedSet.has(o.customId || `${o.x},${o.y}`);
          }
        });
      }

      soundEngine.playCheckpoint();
    } else {
      const canvas = canvasRef.current;
      const arenaHeight = 10 * TILE_SIZE;
      const canvasHeight = canvas ? canvas.height : 480;
      const floorMargin = Math.max(28, Math.min(80, Math.round((canvasHeight - arenaHeight) / 2)));
      const spawnFloorY = canvasHeight - floorMargin;

      const rawStartX = Number(level?.startX ?? level?.playerStart?.x ?? 1);
      const rawStartY = Number(level?.startY ?? level?.playerStart?.y ?? 0);
      const startGridX = Number.isFinite(rawStartX) ? Math.max(0, rawStartX) : 1;
      const startGridY = Number.isFinite(rawStartY) ? Math.max(0, rawStartY) : 0;

      const spawnX = Math.max(0, startGridX * TILE_SIZE);
      const spawnGroundY = (spawnFloorY - (startGridY * TILE_SIZE)) - PHYSICS.playerHeight;

      gameStateRef.current.player = {
        x: spawnX,
        y: spawnGroundY,
        vx: activeGameStyle === 'runner' ? 420 : activeGameStyle === 'aircraft' ? 440 : 0,
        vy: 0,
        width: PHYSICS.playerWidth,
        height: PHYSICS.playerHeight,
        isGrounded: true,
        rotation: 0,
        gravityDir: 1,
        mode: 'runner',
        gameStyle: activeGameStyle,
        styleConfig,
        hp: 100,
        maxHp: 100,
        facing: 1,
        invulnTimer: 0,
        speedMode: 'normal',
        animDistance: 0,
        coinsCollected: 0
      };
      gameStateRef.current.cameraX = Math.max(0, spawnX - 180);
      gameStateRef.current.elapsedMs = 0;
      gameStateRef.current.startTime = performance.now();
      setCoinsCount(0);
      setPlayerHp(100);

      // Initialize Pursuit Hazard
      gameStateRef.current.pursuer = {
        active: Boolean(hasChase),
        type: chaseConfig?.type || 'none',
        name: chaseConfig?.type === 'shadow_beast' ? 'Shadow Stalker' : 'Wall of Death',
        speed: Number(chaseConfig?.speed) || 290,
        delay: Number(chaseConfig?.delay) || 1.8,
        x: spawnX - 420,
        elapsed: 0,
        dist: 999
      };

      // Reset collected coins
      if (Array.isArray(gameStateRef.current.levelObjects)) {
        gameStateRef.current.levelObjects.forEach(o => {
          if (o && o.type === 'collectable_coin') {
            o.collected = false;
          }
        });
      }
    }

    gameStateRef.current.isDead = false;
    gameStateRef.current.deathTimer = 0;

    // Reset trigger flags on interactive orbs
    if (Array.isArray(gameStateRef.current.levelObjects)) {
      gameStateRef.current.levelObjects.forEach(o => {
        if (o) o.triggered = false;
      });
    }

    // Start background rhythm track
    soundEngine.startRhythmTrack(level?.bpm || 130, level?.theme || 'cyber_cyan');
  }, [level]);

  // Restart run
  const handleFullRestart = () => {
    setAttempts(a => a + 1);
    checkpointsRef.current = [];
    deathMarksRef.current = [];
    setCheckpointsCount(0);
    spawnPlayer(false);
    setIsPaused(false);
    setIsVictorious(false);
  };

  // Add practice checkpoint
  const handleAddCheckpoint = () => {
    const p = gameStateRef.current.player;
    if (!p || gameStateRef.current.isDead) return;

    const collectedCoinKeys = (gameStateRef.current.levelObjects || [])
      .filter(o => o && o.type === 'collectable_coin' && o.collected)
      .map(o => o.customId || `${o.x},${o.y}`);

    checkpointsRef.current.push({
      x: p.x,
      y: p.y,
      vx: p.vx,
      vy: p.vy,
      isGrounded: p.isGrounded,
      gravityDir: p.gravityDir,
      mode: p.mode,
      speedMode: p.speedMode,
      animDistance: p.animDistance,
      cameraX: gameStateRef.current.cameraX,
      elapsedMs: gameStateRef.current.elapsedMs,
      coinsCollected: p.coinsCollected || 0,
      collectedCoinKeys
    });
    setCheckpointsCount(checkpointsRef.current.length);
    soundEngine.playCheckpoint();
  };

  // Remove practice checkpoint
  const handleRemoveCheckpoint = () => {
    if (checkpointsRef.current.length > 0) {
      checkpointsRef.current.pop();
      setCheckpointsCount(checkpointsRef.current.length);
      soundEngine.playClick();
    }
  };

  // Sync practice mode state
  useEffect(() => {
    gameStateRef.current.isPractice = isPracticeMode;
    if (!isPracticeMode) {
      checkpointsRef.current = [];
      setCheckpointsCount(0);
    }
  }, [isPracticeMode]);

  // Clone objects on level mount
  useEffect(() => {
    if (level && Array.isArray(level.objects)) {
      gameStateRef.current.levelObjects = level.objects.map(obj => ({ ...obj, collected: false }));
      const total = level.objects.filter(o => o && o.type === 'collectable_coin').length;
      setTotalCoins(total);
    }
    spawnPlayer(false);

    return () => {
      soundEngine.stopMusic();
    };
  }, [level, spawnPlayer]);

  // Retrieve the completed or furthest player trajectory for the Level Editor
  const getEffectiveTrajectory = useCallback(() => {
    if (currentTrajectoryRef.current.length > 4) {
      return currentTrajectoryRef.current;
    }
    return lastSavedTrajectoryRef.current.length > 0 ? lastSavedTrajectoryRef.current : currentTrajectoryRef.current;
  }, []);

  // Return to Level Editor passing recorded movement trajectory & verification flag
  const handleReturnToEditorWithData = useCallback(() => {
    if (typeof onReturnToEditor !== 'function') return;
    soundEngine.stopMusic();
    onReturnToEditor({
      trajectory: getEffectiveTrajectory(),
      verified: hasVerifiedRef.current
    });
  }, [onReturnToEditor, getEffectiveTrajectory]);

  // Input listeners (Keyboard & Pointer)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default page scrolling for active gameplay controls
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      soundEngine.ensureRunning();

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!e.repeat) {
          gameStateRef.current.input.didPressJump = true;
        }
        gameStateRef.current.input.isHoldingJump = true;
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        gameStateRef.current.input.moveLeft = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        gameStateRef.current.input.moveRight = true;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        gameStateRef.current.input.crouch = true;
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        gameStateRef.current.input.isSprinting = true;
      } else if (e.code === 'KeyJ' || e.code === 'KeyC' || (e.code === 'KeyZ' && !isPracticeMode)) {
        gameStateRef.current.input.didPressAttack = true;
      } else if (e.code === 'KeyZ' && isPracticeMode) {
        handleAddCheckpoint();
      } else if (e.code === 'KeyX' && isPracticeMode) {
        handleRemoveCheckpoint();
      } else if (e.code === 'KeyF') {
        setIsPracticeMode(prev => !prev);
      } else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
        handleFullRestart();
      } else if (e.code === 'KeyE' && isPlaytest && typeof onReturnToEditor === 'function') {
        handleReturnToEditorWithData();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        setIsPaused(prev => !prev);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        gameStateRef.current.input.isHoldingJump = false;
        gameStateRef.current.input.didPressJump = false;
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        gameStateRef.current.input.moveLeft = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        gameStateRef.current.input.moveRight = false;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        gameStateRef.current.input.crouch = false;
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        gameStateRef.current.input.isSprinting = false;
      } else if (e.code === 'KeyJ' || e.code === 'KeyC' || e.code === 'KeyZ') {
        gameStateRef.current.input.didPressAttack = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPracticeMode, isPlaytest, onReturnToEditor]);

  // Pointer / Tap touch handlers
  const handlePointerDown = (e) => {
    soundEngine.ensureRunning();
    const activeStyle = gameStateRef.current.player?.gameStyle || level?.gameStyle || 'runner';
    if (activeStyle === 'runner') {
      gameStateRef.current.input.isHoldingJump = true;
      gameStateRef.current.input.didPressJump = true;
      return;
    }

    // In multi-directional modes (Platformer, Aircraft, Climber, Fighter, Descent):
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    if (relX < 0.35) {
      gameStateRef.current.input.moveLeft = true;
      gameStateRef.current.input.moveRight = false;
    } else if (relX > 0.65) {
      gameStateRef.current.input.moveRight = true;
      gameStateRef.current.input.moveLeft = false;
    }

    if (relY < 0.45) {
      gameStateRef.current.input.isHoldingJump = true;
      gameStateRef.current.input.didPressJump = true;
    } else if (relY > 0.75) {
      gameStateRef.current.input.crouch = true;
    }
  };

  const handlePointerUp = () => {
    const activeStyle = gameStateRef.current.player?.gameStyle || level?.gameStyle || 'runner';
    gameStateRef.current.input.isHoldingJump = false;
    gameStateRef.current.input.didPressJump = false;
    if (activeStyle !== 'runner') {
      gameStateRef.current.input.moveLeft = false;
      gameStateRef.current.input.moveRight = false;
      gameStateRef.current.input.crouch = false;
    }
  };

  // Main 60fps Canvas Loop
  useEffect(() => {
    let lastTime = performance.now();

    const gameLoop = (timeNow) => {
      const dt = Math.min(0.04, (timeNow - lastTime) / 1000);
      lastTime = timeNow;

      const canvas = canvasRef.current;
      if (canvas && !isPaused && !isVictorious) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Exact mathematically invariant playable arena height (10 tiles = 320px)
        const arenaHeight = 10 * TILE_SIZE;
        const floorMarginBottom = Math.max(28, Math.min(80, Math.round((height - arenaHeight) / 2)));
        const floorY = height - floorMarginBottom;
        const ceilingY = floorY - arenaHeight;

        const p = gameStateRef.current.player;

        if (p && !gameStateRef.current.isDead) {
          // Adjust player Y position smoothly if window resized during active gameplay
          if (prevFloorYRef.current !== null && prevFloorYRef.current !== floorY) {
            const deltaFloor = floorY - prevFloorYRef.current;
            p.y += deltaFloor;
          }
          prevFloorYRef.current = floorY;

          // Increment speedrun timer
          gameStateRef.current.elapsedMs += dt * 1000;
          setElapsedMs(gameStateRef.current.elapsedMs);

          // Update physics with multi-genre engine context
          const currentStyle = p.gameStyle || level?.gameStyle || 'runner';
          const physicsResult = updatePhysics(
            p,
            gameStateRef.current.levelObjects,
            dt,
            gameStateRef.current.input,
            floorY,
            ceilingY,
            {
              gameStyle: currentStyle,
              projectiles: gameStateRef.current.projectiles,
              pursuer: gameStateRef.current.pursuer,
              levelHeight: level?.height || 10
            }
          );

          // Sync player HP & Pursuer proximity
          if (p.hp !== undefined && p.hp !== playerHp) {
            setPlayerHp(p.hp);
          }
          if (gameStateRef.current.pursuer?.active && gameStateRef.current.pursuer.dist !== pursuerDist) {
            setPursuerDist(gameStateRef.current.pursuer.dist);
          }

          // Consume instant-tap & attack triggers
          gameStateRef.current.input.didPressJump = false;
          gameStateRef.current.input.didPressAttack = false;

          // Smooth camera follow
          const targetCamX = Math.max(0, p.x - 180);
          gameStateRef.current.cameraX += (targetCamX - gameStateRef.current.cameraX) * 0.18;

          // Record player trail
          trailHistoryRef.current.push({ x: p.x, y: p.y });
          if (trailHistoryRef.current.length > 10) {
            trailHistoryRef.current.shift();
          }

          // Record movement trajectory points for Level Editor (in grid coordinates)
          const curGx = (p.x + p.width / 2) / TILE_SIZE;
          const curGy = (floorY - (p.y + p.height / 2)) / TILE_SIZE;
          const lastPoint = currentTrajectoryRef.current[currentTrajectoryRef.current.length - 1];
          if (!lastPoint || Math.hypot(curGx - lastPoint.gx, curGy - lastPoint.gy) >= 0.08) {
            currentTrajectoryRef.current.push({
              gx: Number(curGx.toFixed(3)),
              gy: Number(curGy.toFixed(3)),
              x: Number(p.x.toFixed(1)),
              y: Number(p.y.toFixed(1)),
              vx: Number(p.vx.toFixed(1)),
              vy: Number(p.vy.toFixed(1)),
              rotation: Number(p.rotation.toFixed(2)),
              isGrounded: Boolean(p.isGrounded),
              mode: p.mode,
              gravityDir: p.gravityDir || 1,
              time: Number((gameStateRef.current.elapsedMs / 1000).toFixed(3))
            });
          }

          // Calculate percentage relative to level start position
          const startPx = Math.max(0, Number(level?.startX ?? level?.playerStart?.x ?? 0)) * TILE_SIZE;
          const totalTravel = Math.max(100, levelLengthPixels - startPx);
          const currentTravel = Math.max(0, p.x - startPx);
          const percent = Math.min(100, Math.floor((currentTravel / totalTravel) * 100));
          setCurrentPercent(percent);
          if (percent > bestPercent) {
            setBestPercent(percent);
          }

          // Check for Victory
          if (physicsResult.isFinished) {
            setIsVictorious(true);
            setVictoryTimeMs(gameStateRef.current.elapsedMs);
            soundEngine.stopMusic();

            currentTrajectoryRef.current.push({
              gx: Number(curGx.toFixed(3)),
              gy: Number(curGy.toFixed(3)),
              isVictory: true
            });
            lastSavedTrajectoryRef.current = [...currentTrajectoryRef.current];

            // If beaten in normal playtest mode (not practice mode), level is successfully verified!
            if (isPlaytest && !gameStateRef.current.isPractice) {
              hasVerifiedRef.current = true;
              setIsLevelVerified(true);
            }

            if (typeof onSaveProgress === 'function') {
              onSaveProgress(level.id, {
                bestPercent: 100,
                isCleared: true,
                attempts,
                coinsCollected: coinsCount,
                timeMs: gameStateRef.current.elapsedMs
              });
            }
          }

          // Check for Crash / Death
          if (physicsResult.isDead) {
            gameStateRef.current.isDead = true;
            gameStateRef.current.deathTimer = 0.65; // Death freeze duration in seconds
            deathParticlesRef.current = createDeathBurst(p, skin);
            soundEngine.stopMusic();

            // Record crash location for visual course mark & editor trajectory
            if (p) {
              deathMarksRef.current.push({ x: p.x, y: p.y });
              if (deathMarksRef.current.length > 20) {
                deathMarksRef.current.shift();
              }

              currentTrajectoryRef.current.push({
                gx: Number(curGx.toFixed(3)),
                gy: Number(curGy.toFixed(3)),
                isDead: true,
                deathReason: physicsResult.deathReason
              });
              if (currentTrajectoryRef.current.length > lastSavedTrajectoryRef.current.length) {
                lastSavedTrajectoryRef.current = [...currentTrajectoryRef.current];
              }
            }

            if (typeof onSaveProgress === 'function') {
              onSaveProgress(level.id, {
                bestPercent: Math.max(bestPercent, percent),
                isCleared: false,
                attempts,
                coinsCollected: Math.max(coinsCount, p?.coinsCollected || 0)
              });
            }
          }

          // Sync collected coins
          if (p.coinsCollected !== undefined && p.coinsCollected !== coinsCount) {
            setCoinsCount(p.coinsCollected);
          }
        } else if (gameStateRef.current.isDead) {
          // Death particle burst update
          gameStateRef.current.deathTimer -= dt;

          deathParticlesRef.current.forEach(pt => {
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.size = Math.max(0.5, pt.size + (pt.growth || 0) * dt);
            pt.life -= (pt.decay || 2.0) * dt;
          });

          if (gameStateRef.current.deathTimer <= 0) {
            // Respawn
            setAttempts(a => a + 1);
            spawnPlayer(gameStateRef.current.isPractice);
          }
        }

        // RENDER FRAME
        ctx.clearRect(0, 0, width, height);

        // Draw level & hazards
        drawLevel(
          ctx,
          gameStateRef.current.cameraX,
          width,
          height,
          gameStateRef.current.levelObjects,
          floorY,
          ceilingY,
          timeNow,
          level?.theme || 'cyber_cyan',
          checkpointsRef.current,
          level?.backgroundUrl,
          level?.bgParallaxSpeed || 0.25,
          level?.parallaxLayers,
          level?.customBlueprints
        );

        // Draw session crash / death markers
        if (deathMarksRef.current.length > 0) {
          ctx.save();
          deathMarksRef.current.forEach(dm => {
            const screenX = dm.x - gameStateRef.current.cameraX;
            if (screenX > -40 && screenX < width + 40) {
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(screenX, dm.y, 9, 0, Math.PI * 2);
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(screenX - 4, dm.y - 4);
              ctx.lineTo(screenX + 4, dm.y + 4);
              ctx.moveTo(screenX + 4, dm.y - 4);
              ctx.lineTo(screenX - 4, dm.y + 4);
              ctx.stroke();
            }
          });
          ctx.restore();
        }

        // Draw trail behind player
        if (p && !gameStateRef.current.isDead) {
          const screenTrail = trailHistoryRef.current.map(pos => ({
            x: pos.x - gameStateRef.current.cameraX,
            y: pos.y
          }));
          drawTrail(ctx, screenTrail, skin);
          
          // Draw character
          const screenPlayer = {
            ...p,
            x: p.x - gameStateRef.current.cameraX
          };
          drawCharacter(ctx, screenPlayer, skin, timeNow);
        }

        // Draw Active Combat Projectiles
        if (Array.isArray(gameStateRef.current.projectiles) && gameStateRef.current.projectiles.length > 0) {
          ctx.save();
          gameStateRef.current.projectiles.forEach(proj => {
            const sx = proj.x - gameStateRef.current.cameraX;
            if (sx > -30 && sx < width + 30) {
              ctx.shadowBlur = 10;
              ctx.shadowColor = proj.color || '#38bdf8';
              ctx.fillStyle = proj.color || '#38bdf8';
              ctx.beginPath();
              ctx.arc(sx + proj.width / 2, proj.y + proj.height / 2, proj.width / 2, 0, Math.PI * 2);
              ctx.fill();

              // Inner bright core
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(sx + proj.width / 2, proj.y + proj.height / 2, proj.width / 4, 0, Math.PI * 2);
              ctx.fill();
            }
          });
          ctx.restore();
        }

        // Draw Pursuer Hazard (Wall of Death / Shadow Stalker)
        const pursuer = gameStateRef.current.pursuer;
        if (pursuer && pursuer.active) {
          const pursuerScreenX = pursuer.x - gameStateRef.current.cameraX;
          if (pursuerScreenX < width + 100) {
            ctx.save();
            if (pursuer.type === 'shadow_beast') {
              // Shadow Stalker: ominous dark smoke and glowing red eyes
              const grad = ctx.createLinearGradient(pursuerScreenX - 80, 0, pursuerScreenX + 40, 0);
              grad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
              grad.addColorStop(0.7, 'rgba(30, 27, 75, 0.7)');
              grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = grad;
              ctx.fillRect(0, ceilingY, Math.max(0, pursuerScreenX + 30), floorY - ceilingY);

              // Glowing eyes
              const eyeY = (floorY + ceilingY) / 2 + Math.sin(timeNow * 0.005) * 20;
              ctx.fillStyle = '#ef4444';
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 15;
              ctx.beginPath();
              ctx.arc(pursuerScreenX, eyeY - 8, 4, 0, Math.PI * 2);
              ctx.arc(pursuerScreenX, eyeY + 8, 4, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Wall of Death: towering pulsating plasma/laser energy wall
              const pulse = Math.sin(timeNow * 0.01) * 0.15 + 0.85;
              const grad = ctx.createLinearGradient(0, 0, pursuerScreenX, 0);
              grad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
              grad.addColorStop(0.8, 'rgba(244, 63, 94, 0.7)');
              grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, Math.max(0, pursuerScreenX), height);

              // Electric barrier border line
              ctx.strokeStyle = `rgba(255, 220, 220, ${pulse})`;
              ctx.lineWidth = 4;
              ctx.shadowColor = '#f43f5e';
              ctx.shadowBlur = 20;
              ctx.beginPath();
              ctx.moveTo(pursuerScreenX, 0);
              for (let y = 0; y <= height; y += 20) {
                const jitter = (Math.random() - 0.5) * 12;
                ctx.lineTo(pursuerScreenX + jitter, y);
              }
              ctx.stroke();
            }
            ctx.restore();
          }
        }

        // Draw death particles
        if (deathParticlesRef.current.length > 0) {
          const screenParticles = deathParticlesRef.current.map(pt => ({
            ...pt,
            x: pt.x - gameStateRef.current.cameraX
          }));
          drawDeathParticles(ctx, screenParticles);
        }

        // Draw foreground scenery objects (player passes behind these visually)
        drawForegroundObjects(
          ctx,
          gameStateRef.current.cameraX,
          width,
          floorY,
          ceilingY,
          gameStateRef.current.levelObjects,
          timeNow,
          TILE_SIZE,
          level?.parallaxLayers,
          level?.customBlueprints
        );
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPaused, isVictorious, bestPercent, attempts, level, skin, levelLengthPixels, spawnPlayer, onSaveProgress]);

  // Canvas auto-resize handling
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Format millisecond timer to MM:SS.mmm
  const formatTimer = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.floor(ms % 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMute(next);
  };

  return (
    <div
      id="game-viewport-container"
      className="fixed inset-0 z-30 bg-neutral-950 overflow-hidden select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* 60fps Game Canvas */}
      <canvas
        ref={canvasRef}
        id="game-active-canvas"
        className="w-full h-full block cursor-pointer"
      />

      {/* TOP HUD BAR */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {/* Level Title & Attempt Count */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-900/80 backdrop-blur border border-neutral-800 pointer-events-auto flex items-center gap-2">
              <span className="text-xs font-bold font-display text-white tracking-wide">{level?.name || 'Level'}</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800">
                Attempt {attempts}
              </span>
            </div>

            {/* Practice Mode Indicator */}
            {isPracticeMode && (
              <div className="px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold pointer-events-auto flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" /> Practice ({checkpointsCount} CPs)
              </div>
            )}

            {/* Secret Coins Counter Badge */}
            {totalCoins > 0 && (
              <div
                id="hud-coins-counter"
                className="px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold pointer-events-auto flex items-center gap-1.5 shadow-sm"
              >
                <span className="text-amber-400 font-bold">★</span>
                <span>{coinsCount} / {totalCoins}</span>
              </div>
            )}
          </div>

          {/* Precision Speedrun Timer */}
          <div className="hidden md:flex px-4 py-1.5 rounded-xl bg-neutral-900/90 backdrop-blur border border-neutral-750 font-mono text-base font-bold text-white shadow-lg pointer-events-auto items-center gap-2">
            <span className="text-cyan-400 text-xs">TIME:</span>
            <span>{formatTimer(elapsedMs)}</span>
          </div>

          {/* Quick HUD Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            {isPlaytest && typeof onReturnToEditor === 'function' && (
              <button
                id="hud-return-editor-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReturnToEditorWithData();
                }}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer"
                title="Return to Level Editor (Hot-key: E) with Movement Trail"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Return to Editor</span>
              </button>
            )}

            <button
              id="hud-sound-toggle"
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              className="p-2 sm:p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition cursor-pointer"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-neutral-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <button
              id="hud-pause-btn"
              onClick={(e) => { e.stopPropagation(); setIsPaused(true); }}
              className="p-2 sm:p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition cursor-pointer"
              title="Pause Game (Esc)"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Level Progress Bar & Percentage */}
        <div className="w-full max-w-xl mx-auto flex items-center gap-3">
          <div className="flex-1 h-2 bg-neutral-900/80 rounded-full overflow-hidden border border-neutral-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-75"
              style={{ width: `${Math.min(100, currentPercent)}%` }}
            />
          </div>
          <span className="text-xs font-bold font-mono text-cyan-300 min-w-[40px] text-right">
            {currentPercent}%
          </span>
        </div>

        {/* Multi-Genre Status Sub-Bar */}
        <div className="flex items-center justify-between max-w-xl mx-auto w-full pt-1">
          {/* Active Game Style Tag & Live Switcher */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-neutral-900/90 border border-neutral-700/80 shadow-sm text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                id="hud-game-style-select"
                value={level?.gameStyle || 'runner'}
                onChange={(e) => {
                  e.stopPropagation();
                  const newStyle = e.target.value;
                  if (level) level.gameStyle = newStyle;
                  if (gameStateRef.current.player) {
                    gameStateRef.current.player.gameStyle = newStyle;
                    gameStateRef.current.player.styleConfig = getGameStyleConfig(newStyle);
                    if (newStyle === 'runner') {
                      gameStateRef.current.player.vx = 420;
                    } else if (newStyle === 'aircraft') {
                      gameStateRef.current.player.vx = 440;
                    } else {
                      gameStateRef.current.player.vx = 0;
                    }
                  }
                  setAttempts(a => a);
                }}
                className="bg-transparent text-white font-bold capitalize focus:outline-none cursor-pointer text-[11px]"
                title="Switch active game style mode"
              >
                {Object.values(GAME_STYLES).map(st => (
                  <option key={st.id} value={st.id} className="bg-neutral-900 text-white">
                    {st.name} Mode
                  </option>
                ))}
              </select>
            </div>

            <button
              id="hud-toggle-touch-controls"
              onClick={(e) => { e.stopPropagation(); setShowTouchControls(prev => !prev); }}
              className={`px-2 py-0.5 rounded-md border text-[11px] font-mono transition cursor-pointer flex items-center gap-1 ${
                showTouchControls ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300' : 'bg-neutral-900/80 border-neutral-700 text-neutral-400'
              }`}
              title="Toggle On-Screen Virtual Gamepad / D-Pad"
            >
              <Gamepad2 className="w-3 h-3" />
              <span className="hidden sm:inline">{showTouchControls ? 'D-Pad' : 'D-Pad'}</span>
            </button>

            {/* Pursuit Hazard Warning */}
            {gameStateRef.current.pursuer?.active && (
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-sm transition ${
                (pursuerDist || 999) < 140
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/80 animate-bounce'
                  : 'bg-amber-950/80 text-amber-300 border-amber-600/40'
              }`}>
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>{gameStateRef.current.pursuer.name}: {Math.max(0, Math.round(pursuerDist || 0))}px</span>
              </span>
            )}
          </div>

          {/* Player HP Bar (Combat / Fighter / Survival) */}
          {(level?.gameStyle === 'fighter' || level?.gameStyle === 'aircraft' || playerHp < 100) && (
            <div className="flex items-center gap-1.5 bg-neutral-900/90 px-2.5 py-0.5 rounded-md border border-neutral-800">
              <Heart className={`w-3.5 h-3.5 ${playerHp < 35 ? 'text-rose-500 animate-ping' : 'text-rose-400'}`} />
              <div className="w-20 h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className={`h-full transition-all duration-150 ${
                    playerHp > 60 ? 'bg-emerald-400' : playerHp > 25 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, playerHp))}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-white">{Math.round(playerHp)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ON-SCREEN RESPONSIVE VIRTUAL CONTROLS */}
      {showTouchControls && (
        <div
          id="virtual-gamepad-layer"
          className="absolute inset-x-0 bottom-4 px-4 pointer-events-none flex justify-between items-end z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left D-Pad: Horizontal & Vertical Movement */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-neutral-950/60 backdrop-blur p-2 rounded-2xl border border-neutral-800/80 shadow-2xl">
            <button
              onPointerDown={(e) => { e.stopPropagation(); gameStateRef.current.input.moveLeft = true; }}
              onPointerUp={(e) => { e.stopPropagation(); gameStateRef.current.input.moveLeft = false; }}
              onPointerLeave={() => { gameStateRef.current.input.moveLeft = false; }}
              className="w-11 h-11 rounded-xl bg-neutral-900/90 active:bg-cyan-500 active:text-neutral-950 border border-neutral-700/60 flex items-center justify-center text-white transition shadow"
              title="Move Left (A / Left Arrow)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex flex-col gap-1.5">
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  gameStateRef.current.input.isHoldingJump = true;
                  gameStateRef.current.input.didPressJump = true;
                  soundEngine.ensureRunning();
                }}
                onPointerUp={(e) => { e.stopPropagation(); gameStateRef.current.input.isHoldingJump = false; }}
                onPointerLeave={() => { gameStateRef.current.input.isHoldingJump = false; }}
                className="w-11 h-11 rounded-xl bg-neutral-900/90 active:bg-cyan-500 active:text-neutral-950 border border-neutral-700/60 flex items-center justify-center text-white transition shadow"
                title="Climb / Ascend (W / Up Arrow)"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                onPointerDown={(e) => { e.stopPropagation(); gameStateRef.current.input.crouch = true; }}
                onPointerUp={(e) => { e.stopPropagation(); gameStateRef.current.input.crouch = false; }}
                onPointerLeave={() => { gameStateRef.current.input.crouch = false; }}
                className="w-11 h-11 rounded-xl bg-neutral-900/90 active:bg-cyan-500 active:text-neutral-950 border border-neutral-700/60 flex items-center justify-center text-white transition shadow"
                title="Crouch / Dive (S / Down Arrow)"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <button
              onPointerDown={(e) => { e.stopPropagation(); gameStateRef.current.input.moveRight = true; }}
              onPointerUp={(e) => { e.stopPropagation(); gameStateRef.current.input.moveRight = false; }}
              onPointerLeave={() => { gameStateRef.current.input.moveRight = false; }}
              className="w-11 h-11 rounded-xl bg-neutral-900/90 active:bg-cyan-500 active:text-neutral-950 border border-neutral-700/60 flex items-center justify-center text-white transition shadow"
              title="Move Right (D / Right Arrow)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right Action Cluster: Jump / Thrust, Attack / Projectile, Sprint */}
          <div className="pointer-events-auto flex items-center gap-2 bg-neutral-950/60 backdrop-blur p-2 rounded-2xl border border-neutral-800/80 shadow-2xl">
            {/* Attack / Projectile Button */}
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                gameStateRef.current.input.didPressAttack = true;
                soundEngine.ensureRunning();
              }}
              onPointerUp={(e) => { e.stopPropagation(); gameStateRef.current.input.didPressAttack = false; }}
              className="w-12 h-12 rounded-xl bg-rose-950/80 active:bg-rose-500 text-rose-300 active:text-white border border-rose-500/50 flex flex-col items-center justify-center text-[10px] font-bold transition shadow"
              title="Combat Attack / Projectile (J / C)"
            >
              <Crosshair className="w-4 h-4" />
              <span>ATK</span>
            </button>

            {/* Jump / Boost Button */}
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                gameStateRef.current.input.isHoldingJump = true;
                gameStateRef.current.input.didPressJump = true;
                soundEngine.ensureRunning();
              }}
              onPointerUp={(e) => { e.stopPropagation(); gameStateRef.current.input.isHoldingJump = false; }}
              onPointerLeave={() => { gameStateRef.current.input.isHoldingJump = false; }}
              className="w-14 h-14 rounded-2xl bg-cyan-500 active:bg-cyan-300 text-neutral-950 border border-cyan-300/60 flex flex-col items-center justify-center font-bold text-xs tracking-wider shadow-lg shadow-cyan-950/50 transition cursor-pointer"
              title="Jump / Thrust (Space / Up Arrow)"
            >
              <Zap className="w-5 h-5" />
              <span className="text-[10px]">JUMP</span>
            </button>
          </div>
        </div>
      )}

      {/* PRACTICE MODE FLOATING CONTROLS (BOTTOM-LEFT) */}
      {isPracticeMode && (
        <div className="absolute bottom-6 left-6 flex items-center gap-2 z-30 pointer-events-auto">
          <button
            id="add-checkpoint-btn"
            onClick={(e) => { e.stopPropagation(); handleAddCheckpoint(); }}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition"
          >
            <PlusCircle className="w-4 h-4" /> Place CP (Z)
          </button>
          <button
            id="remove-checkpoint-btn"
            onClick={(e) => { e.stopPropagation(); handleRemoveCheckpoint(); }}
            disabled={checkpointsCount === 0}
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 font-bold text-xs flex items-center gap-1.5 shadow-lg transition"
          >
            <MinusCircle className="w-4 h-4" /> Remove CP (X)
          </button>
        </div>
      )}

      {/* PAUSE MENU MODAL */}
      {isPaused && (
        <div
          id="pause-menu-modal"
          className="absolute inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-6 text-center">
            <div>
              <h2 className="text-2xl font-bold font-display text-white tracking-wide">PAUSED</h2>
              <p className="text-xs text-neutral-400 mt-1">{level?.name} | {currentPercent}% completed</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 text-left font-mono">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Current Time</span>
                <span className="text-sm font-bold text-cyan-400">{formatTimer(elapsedMs)}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Attempts</span>
                <span className="text-sm font-bold text-neutral-200">{attempts}</span>
              </div>
            </div>

            {/* Pause Actions */}
            <div className="space-y-2.5">
              {isPlaytest && typeof onReturnToEditor === 'function' && (
                <button
                  id="pause-return-editor-btn"
                  onClick={handleReturnToEditorWithData}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" /> Return to Editor (E)
                </button>
              )}

              <button
                id="pause-resume-btn"
                onClick={() => setIsPaused(false)}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-sm tracking-wider uppercase transition shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> Resume
              </button>

              <button
                id="pause-restart-btn"
                onClick={handleFullRestart}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Restart Level
              </button>

              <button
                id="pause-toggle-practice"
                onClick={() => setIsPracticeMode(prev => !prev)}
                className={`w-full py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 border cursor-pointer ${
                  isPracticeMode
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-750'
                }`}
              >
                <Flag className="w-4 h-4" />
                {isPracticeMode ? 'Practice Mode: ON' : 'Practice Mode: OFF'}
              </button>

              <button
                id="pause-skin-workshop"
                onClick={() => {
                  setIsPaused(false);
                  onOpenSkinCustomizer();
                }}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" /> Skin Workshop
              </button>

              <button
                id="pause-exit-menu"
                onClick={() => {
                  soundEngine.stopMusic();
                  onExitToMenu();
                }}
                className="w-full py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" /> Exit to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY LEVEL COMPLETE SCREEN */}
      {isVictorious && (
        <div
          id="victory-modal"
          className="absolute inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-neutral-900 border border-cyan-500/50 rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-cyan-950 text-center space-y-6 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Course Complete</span>
              <h2 className="text-3xl font-bold font-display text-white mt-1">{level?.name}</h2>
              <p className="text-xs text-neutral-400 mt-1">100% Cleared! Incredible timing and reflexes.</p>
            </div>

            {/* Victory Statistics */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 text-left font-mono">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Total Time</span>
                <span className="text-base font-bold text-cyan-300">{formatTimer(victoryTimeMs)}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Attempts</span>
                <span className="text-base font-bold text-neutral-100">{attempts}</span>
              </div>
            </div>

            {totalCoins > 0 && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-center font-mono">
                <span className="text-xs font-bold text-amber-300 flex items-center justify-center gap-2">
                  <span className="text-amber-400">★</span> Secret Coins: {coinsCount} / {totalCoins} Collected!
                </span>
              </div>
            )}

            {/* Playtest Verification Badge */}
            {isPlaytest && (
              <div className={`p-3 rounded-xl border text-center font-mono ${
                !gameStateRef.current.isPractice
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}>
                <div className="flex items-center justify-center gap-2 text-xs font-bold">
                  <ShieldCheck className={`w-4 h-4 ${!gameStateRef.current.isPractice ? 'text-emerald-400' : 'text-amber-400'}`} />
                  {!gameStateRef.current.isPractice ? (
                    <span>LEVEL VERIFIED & VALIDATED (0% - 100%)!</span>
                  ) : (
                    <span>Practice Cleared (Beat in Normal Mode to Validate)</span>
                  )}
                </div>
                {!gameStateRef.current.isPractice && (
                  <p className="text-[10px] text-emerald-400/80 mt-1">
                    Your course is now verified by creator and unlocked for sharing & publishing!
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                id="victory-replay-btn"
                onClick={handleFullRestart}
                className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
              {isPlaytest && typeof onReturnToEditor === 'function' ? (
                <button
                  id="victory-return-editor-btn"
                  onClick={handleReturnToEditorWithData}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" /> Return to Editor
                </button>
              ) : (
                <button
                  id="victory-hub-btn"
                  onClick={() => {
                    soundEngine.stopMusic();
                    onExitToMenu();
                  }}
                  className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Next Level
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
