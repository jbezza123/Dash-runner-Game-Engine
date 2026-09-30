# 2D Web Game & Level Engine: Architecture, Features & Roadmap Checklist

*Project Status: Production-Ready Vanilla JS / React Canvas Game & Creation Suite*
*Engine ID: `dash-runner-2d-canvas`*

---

## 1. Engine Core & Subsystems Checklist

### Graphics, Rendering & Canvas Pipeline
- [x] **High-Performance 2D Canvas Loop:** RequestAnimationFrame running at 60–120 FPS synchronized to monitor refresh rate.
- [x] **Sub-pixel Camera Interpolation:** Smooth camera tracking with customizable lead distance, vertical lerping, and ceiling/floor constraints.
- [x] **Multi-Layer Parallax Backgrounds:** Dynamic multi-depth layers with configurable parallax factors, auto-scroll, image stretching, opacity, and foreground overlay options.
- [x] **Procedural Sprite & Vector Renderers:** Zero external image assets required for core gameplay. Procedural shaders/paths for neon blocks, temples, hazards, portals, jump pads, and orbs.
- [x] **Dual-Layer Grid System (L1 Blocks & L2 Visual Decor):** Separation of physical solid collision blocks from decorative lamps, vines, torches, and hieroglyphs sharing the same coordinates.
- [x] **Foreground Occlusion Layer (FG):** Elements placed in front of player and camera for cinematic depth.
- [x] **Camera Screen Shake:** Physics-driven impact shake with exponential decay on crashes or explosions.
- [x] **Dynamic Particle FX Engine:** Micro-burst particles, flame tails, sparks, plasma confetti, and death fragment scatters.
- [x] **Occlusion Culling & Spatial Partitioning:** Viewport frustum culling that discards off-screen entities and preloads upcoming chunks, minimizing draw calls and memory footprint.

---

### Physics, Collision & Movement
- [x] **Dual Collision Architecture (AABB + SAT Polygon Hitboxes):** High-speed axis-aligned bounding box collision alongside Separating Axis Theorem (SAT) polygon collision for complex custom blueprints.
- [x] **Coyote Time & Jump Buffering:** 80ms coyote jump tolerance after leaving platform edges, plus 120ms pre-landing jump buffering for responsive control.
- [x] **Variable Jump Height:** Mario-style release velocity scaling for dynamic platforming control.
- [x] **Gravity Inversion:** Real-time gravity flips (ceiling run) via portal triggers, reversing player rotation and collision geometry.
- [x] **Aerodynamic Flight Physics:** Dual-axis flight pitch, climb, and dive mechanics with velocity auto-leveling.
- [x] **Subterranean/Underwater Descent Physics:** Buoyancy, fluid drag, vertical dive strokes, and variable density simulation.
- [x] **Wall-Jumping & Wall-Sliding:** Specialized climber physics with wall cling friction and directional kick-offs.
- [x] **Pursuit Hazards ("Wall of Death" & "Shadow Beast"):** Auto-advancing threat walls that chase the player with configurable speeds, start delays, and instant-death triggers.
- [x] **Distance-Based Physics Culling:** Physics loop skips evaluation for objects further than 320px from player centroid, preventing CPU lag on levels with 1,000+ objects.

---

### Character & Entity Architecture
- [x] **Multi-Archetype Runner Frames:** Cyborg, Ninja, Cosmic Explorer, Shadow Stalker, Pixel Vanguard, Electrum Dynamo with limb kinematics.
- [x] **Vehicular Chassis System:** Starfighters (Viper, Stealth), Supercars, Muscle GTs, Armored Haulers, Nautilus Submarines, Plasma Skimmers, and Bi-Pedal Assault Mechs.
- [x] **Automatic Gamestyle Vehicle Swapping:** Engine automatically outfits the character in a vehicle/starfighter when launching Aircraft game mode.
- [x] **Custom Blueprint Characters & NPCs:** Players and creators can draw, design, and import custom characters/NPC blueprints with designated hitboxes and animation frames.
- [x] **Accessory & Headgear System:** Visors, ninja ribbons, golden crowns, laser mohawks, halos, and astronaut helmets.
- [x] **Custom Hitbox Designer:** In-app polygon vertices editor to fine-tune collision perimeters with millimeter precision.
- [x] **Cosmetic Trail Shaders:** Neon ghost, plasma flame, prismatic rainbow, digital matrix, void spark, and solar flare.

---

### Multi-Genre Game Modes
- [x] **Dash Runner:** Classic rhythm-driven auto-runner with precision jumps and gravity portals.
- [x] **Free Platformer:** Manual 2D exploration with left/right motion, variable jumping, ducking, and projectile combat.
- [x] **Vertical Tower Climber:** Endless upward ascension with wall kicks and super-bounce spring pads.
- [x] **Deep Diver / Cavern:** Subterranean mining and underwater exploration with 2D buoyancy.
- [x] **Arcade Aircraft / Shmup:** Jetpack flight with altitude thrusters, aerodynamic pitching, and plasma blasters.
- [x] **Brawler Arena:** Combat fighting arena with punches, kicks, projectile blasts, invulnerability frames, and health bars.

---

### Level Editor & Creation Suite
- [x] **Dedicated Left-Hand Tool Dock:** Clean tool column containing Selection [V], Placement [P], Bulldozer [B], Spawn Beacon [S], and Hand Pan [H].
- [x] **Contextual Right-Hand Properties Inspector:** Dedicated panel displaying selected object coordinates, layer depth (Behind/In Front), rotation, dimensions, and custom blueprint properties.
- [x] **Dropdown Menus for Tools, Modes & Styles:** Streamlined UI with zero duplicate top/bottom tool buttons.
- [x] **Unreal/Unity Style Collapsible Asset Browser:** Categorized drawers for Blocks, Hazards, Decor, Orbs, Pads, Portals, and Custom Blueprints.
- [x] **Parallax Background Studio:** In-editor multi-layer background creator with live speed, scale, and opacity adjustments.
- [x] **2D Spritesheet Studio:** Multi-block slicer, sprite packer, and coordinate exporter.
- [x] **Infinite Undo / Redo History:** State-based JSON snapshots with stack restoration.
- [x] **Playtest Movement Trajectory Recording:** Ghost replayer displaying previous attempt paths, waypoint speeds, and crash coordinates.
- [x] **BPM 4/4 Beat Guides:** Audio synchronization grid lines overlaying musical downbeats for rhythm design.
- [x] **Zero-Tamper Level Verification System:** Requires creators to complete a full 0% to 100% run before a level can be shared or exported.
- [x] **ZIP Level Bundler (.zip):** Bundles level JSON along with embedded custom blueprints and spritesheet assets.

---

### Audio Subsystem
- [x] **Web Audio API Procedural Synthesizer:** Pure synthetic SFX for jumps, pad launches, gravity flips, orb triggers, explosions, coin collection, and UI clicks (no external MP3 asset dependency).
- [x] **Multi-Track Background Music Player:** Integrated rhythmic audio tracks synced to level BPM.
- [x] **Integrated YouTube Music Player:** Official embedded YouTube player for custom playlist playback with local storage persistence.

---

## 2. What the Engine Currently Does NOT Have (Gaps & Limitations)

1. **No Tilemap Auto-Tiling / Bitmasking:** Currently, placing blocks requires manually picking corners/edges rather than auto-joining adjacent walls.
2. **No Dynamic Lighting & Shadow Rays:** While lighting objects have glowing auras and radial gradients, there is no real-time 2D raycast shadow casting.
3. **No Networked Multiplayer:** Current architecture supports local ghost trajectory comparisons and local records, but no real-time WebSocket multiplayer.
4. **No Visual Node Scripting for Logic:** Triggers and portals have fixed behaviors; there is no visual node wire editor (e.g., Unreal Blueprints) for custom level scripting.
5. **No Built-in Bezier Slope Physics:** Slopes are currently represented via half-blocks or diagonal hazard lines rather than continuous curved spline terrain.

---

## 3. High-Value Roadmap & New Feature Ideas

### Idea 1: Visual Logic Wire System (Triggers, Doors & Switches)
- Connect a pressure plate or jump orb to a sliding door, light switch, or moving hazard platform using a visual line link in the Level Editor.

### Idea 2: Intelligent 9-Slice Auto-Tiler (Terrain Brush)
- Drag a selection box to create contiguous terrain blocks; the engine automatically assigns top grass, inner stone, and left/right wall cap tiles using standard 47-tile bitmask rules.

### Idea 3: Custom NPC Behavior State Machine
- Allow blueprints created in the custom blueprint editor to have AI behaviors: *Patrol*, *Hover*, *Follow Player*, *Shoot at Interval*, or *Flee*.

### Idea 4: Boss Battle Encounter Creator
- A specialized entity type with a health bar, phase transitions (e.g. 50% HP rage mode), and projectile attack patterns.

### Idea 5: Replay Ghost Racer (Time Attack)
- While playing campaign or community levels, render a translucent ghost of the player's personal best run or the level author's verification run side-by-side.

### Idea 6: Bezier Curve Spline Paths for Flying / Aircraft Mode
- Allow aircraft levels to feature guide rings and curved flight tubes generated via cubic Bezier paths.
