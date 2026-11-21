import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EMOTES, VEHICLE_LISTINGS } from '../game/catalog';
import { clampDt, findNearbyOnlinePlayers, getDistrictAt, groundHeightAt, resolveWorldMovement } from '../game/rules';
import type {
  CharacterAppearance,
  DistrictId,
  EmoteId,
  OnlinePlayerPresence,
  TimeOfDay,
  WeatherMode,
} from '../game/types';
import { createHumanRig, type ArticulatedHumanRig } from '../three/avatarBuilder';
import { createWorldTextures } from '../three/proceduralTextures';
import { soundEngine } from '../three/soundEngine';
import { createVehicleRig, type VehicleRig } from '../three/vehicleBuilder';
import { buildMikayWorld, type InteractableZone } from '../three/worldBuilder';

export interface WorldViewportHandle {
  teleportTo: (pos: [number, number, number]) => void;
  captureSnapshot: () => string | null;
  getPlayerPosition: () => [number, number, number];
}

interface WorldViewportProps {
  gameState: 'title' | 'playing' | 'paused';
  appearance: CharacterAppearance;
  timeOfDay: TimeOfDay;
  weather: WeatherMode;
  christmasEdition: boolean;
  activeVehicleId: string | null;
  activeVehicleColor: string;
  driving: boolean;
  onlinePlayers: OnlinePlayerPresence[];
  activeEmote: { id: EmoteId; startedAt: number } | null;
  touchInputRef: React.MutableRefObject<{ x: number; y: number }>;
  onDistrictChange: (district: DistrictId) => void;
  onNearbyInteractable: (zone: InteractableZone | null) => void;
  onNearbyOnlinePlayersChange?: (players: OnlinePlayerPresence[]) => void;
  onInteractTriggered: (zone: InteractableZone) => void;
  onToggleDrive: () => void;
  onEmoteTriggered?: (emoteId: EmoteId) => void;
  onPlayerMoveBroadcast: (pos: [number, number, number], rotY: number, district: DistrictId, moving: boolean, inVehicle: boolean) => void;
  onSpeedChange?: (kmh: number) => void;
}

const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();

export const WorldViewport = React.forwardRef<WorldViewportHandle, WorldViewportProps>(
  function WorldViewport(props, ref) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const propsRef = useRef(props);
    propsRef.current = props;

    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const playerRigRef = useRef<ArticulatedHumanRig | null>(null);
    const playerPosRef = useRef(new THREE.Vector3(0, 0, 14));
    const playerRotYRef = useRef(Math.PI);
    const vehicleRigRef = useRef<VehicleRig | null>(null);
    const vehicleMeshHolderRef = useRef<THREE.Group | null>(null);
    const vehicleSpeedRef = useRef(0);

    useImperativeHandle(ref, () => ({
      teleportTo: (pos: [number, number, number]) => {
        playerPosRef.current.set(pos[0], groundHeightAt(pos[0], pos[2]), pos[2]);
        vehicleSpeedRef.current = 0;
        if (playerRigRef.current) {
          playerRigRef.current.root.position.copy(playerPosRef.current);
        }
      },
      captureSnapshot: () => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        if (!renderer || !scene || !camera) return null;
        renderer.render(scene, camera);
        try {
          return renderer.domElement.toDataURL('image/png');
        } catch {
          return null;
        }
      },
      getPlayerPosition: () => [
        Number(playerPosRef.current.x.toFixed(2)),
        Number(playerPosRef.current.y.toFixed(2)),
        Number(playerPosRef.current.z.toFixed(2)),
      ],
    }));

    // Sync appearance updates without recreating WebGL context
    useEffect(() => {
      if (playerRigRef.current) {
        playerRigRef.current.updateAppearance(props.appearance);
      }
    }, [props.appearance]);

    // Sync active vehicle model when vehicleId / color changes
    useEffect(() => {
      const holder = vehicleMeshHolderRef.current;
      if (!holder) return;
      while (holder.children.length > 0) {
        holder.remove(holder.children[0]);
      }
      vehicleRigRef.current = null;
      if (props.activeVehicleId) {
        const rig = createVehicleRig(props.activeVehicleId, props.activeVehicleColor);
        holder.add(rig.root);
        vehicleRigRef.current = rig;
      }
    }, [props.activeVehicleId, props.activeVehicleColor]);

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const isSoftwareGl = (() => {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      })();

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      pmremGenerator.dispose();

      const camera = new THREE.PerspectiveCamera(
        56,
        (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
        0.2,
        340,
      );
      cameraRef.current = camera;

      const textures = createWorldTextures(renderer.capabilities.getMaxAnisotropy());
      const world = buildMikayWorld(scene, textures, isSoftwareGl);

      const playerRig = createHumanRig(propsRef.current.appearance, textures);
      playerRig.root.position.copy(playerPosRef.current);
      scene.add(playerRig.root);
      playerRigRef.current = playerRig;

      const vehicleHolder = new THREE.Group();
      scene.add(vehicleHolder);
      vehicleMeshHolderRef.current = vehicleHolder;
      if (propsRef.current.activeVehicleId) {
        const rig = createVehicleRig(propsRef.current.activeVehicleId, propsRef.current.activeVehicleColor);
        vehicleHolder.add(rig.root);
        vehicleRigRef.current = rig;
      }

      // Remote real multiplayer avatars pool
      const remoteAvatars = new Map<
        string,
        { rig: ArticulatedHumanRig; targetPos: THREE.Vector3; targetRotY: number; moving: boolean }
      >();

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      // Input state (separate held keys vs edge triggers + clear on blur)
      const heldKeys = new Set<string>();
      let camYaw = 0;
      let camPitch = 0.21;
      let isDragging = false;
      let lastPointerX = 0;
      let lastPointerY = 0;

      const onKeyDown = (e: KeyboardEvent) => {
        if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
          return;
        }
        heldKeys.add(e.code);
        if (!e.repeat && propsRef.current.gameState === 'playing') {
          if (e.code === 'KeyE') {
            const nearby = findNearestInteractable();
            if (nearby) propsRef.current.onInteractTriggered(nearby);
          } else if (e.code === 'KeyF') {
            propsRef.current.onToggleDrive();
          } else if (e.code === 'Digit1') {
            propsRef.current.onEmoteTriggered?.('wave');
          } else if (e.code === 'Digit2') {
            propsRef.current.onEmoteTriggered?.('dance');
          } else if (e.code === 'Digit3') {
            propsRef.current.onEmoteTriggered?.('laugh');
          } else if (e.code === 'Digit4') {
            propsRef.current.onEmoteTriggered?.('clap');
          } else if (e.code === 'Digit5') {
            propsRef.current.onEmoteTriggered?.('pose');
          }
        }
      };

      const onKeyUp = (e: KeyboardEvent) => {
        heldKeys.delete(e.code);
      };

      const clearInputs = () => {
        heldKeys.clear();
        isDragging = false;
      };

      const onPointerDown = (e: PointerEvent) => {
        if (propsRef.current.gameState !== 'playing') return;
        isDragging = true;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        camYaw -= dx * 0.006;
        camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.004, 0.08, 0.95);
      };

      const onPointerUp = () => {
        isDragging = false;
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', clearInputs);
      document.addEventListener('visibilitychange', clearInputs);
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      const resizeObserver = new ResizeObserver(() => {
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      resizeObserver.observe(container);

      function findNearestInteractable(): InteractableZone | null {
        let best: InteractableZone | null = null;
        let bestDist = Infinity;
        for (const zone of world.interactables) {
          const d = playerPosRef.current.distanceTo(zone.pos);
          if (d <= zone.radius && d < bestDist) {
            bestDist = d;
            best = zone;
          }
        }
        return best;
      }

      let frameId = 0;
      let lastTime = performance.now();
      let elapsed = 0;
      let walkPhase = 0;
      let footstepTimer = 0;
      let lastDistrict: DistrictId = 'city';
      let lastNearbyId: string | null = null;
      let lastNearbyPlayersKey = '';
      let lastNearbyPlayersCheck = 0;
      let lastBroadcastTime = 0;
      let lastHudSpeed = -1;

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      function syncOnlinePlayers(dt: number) {
        const activeIds = new Set<string>();
        for (const p of propsRef.current.onlinePlayers) {
          activeIds.add(p.sessionId);
          let entry = remoteAvatars.get(p.sessionId);
          if (!entry) {
            const rig = createHumanRig(p.appearance, textures);
            rig.root.position.set(p.pos[0], p.pos[1], p.pos[2]);
            scene.add(rig.root);
            entry = {
              rig,
              targetPos: new THREE.Vector3(...p.pos),
              targetRotY: p.rotY,
              moving: p.moving,
            };
            remoteAvatars.set(p.sessionId, entry);
          } else {
            entry.targetPos.set(p.pos[0], p.pos[1], p.pos[2]);
            entry.targetRotY = p.rotY;
            entry.moving = p.moving;
          }
          const damp = 1 - Math.exp(-10 * dt);
          entry.rig.root.position.lerp(entry.targetPos, damp);
          entry.rig.root.rotation.y = entry.targetRotY;
          let remoteEmote: EmoteId | null = null;
          let remoteEmoteElapsed = 0;
          if (p.activeEmote && p.emoteStartedAt && !entry.moving && !p.inVehicle) {
            const emoteDef = EMOTES.find((em) => em.id === p.activeEmote);
            const ageMs = Date.now() - p.emoteStartedAt;
            if (emoteDef && ageMs >= 0 && ageMs < emoteDef.durationMs) {
              remoteEmote = p.activeEmote;
              remoteEmoteElapsed = ageMs / 1000;
            }
          }
          entry.rig.animate(dt, entry.moving ? 5.2 : 0, elapsed * 6, elapsed, p.inVehicle, remoteEmote, remoteEmoteElapsed);
        }
        for (const [id, entry] of remoteAvatars.entries()) {
          if (!activeIds.has(id)) {
            scene.remove(entry.rig.root);
            remoteAvatars.delete(id);
          }
        }
      }

      function tick() {
        const now = performance.now();
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        const dt = clampDt(rawDt);
        elapsed += dt;

        const {
          gameState,
          timeOfDay,
          weather,
          christmasEdition,
          driving,
          activeVehicleId,
          touchInputRef,
        } = propsRef.current;

        world.updateAtmosphere(timeOfDay, weather, christmasEdition, dt, elapsed);
        syncOnlinePlayers(dt);

        if (gameState === 'title') {
          // Cinematic Live World Camera Flyover around Mikay's City Plaza & Christmas Tree
          const orbitAngle = elapsed * 0.14;
          const r = 34;
          camera.position.set(Math.sin(orbitAngle) * r, 14 + Math.sin(elapsed * 0.25) * 2.5, Math.cos(orbitAngle) * r - 4);
          camera.lookAt(0, 5.5, -4);
          playerRig.animate(dt, 0, 0, elapsed, false);
        } else if (gameState === 'playing') {
          // Movement input (WASD + Arrows + Mobile Virtual Thumbstick)
          let moveX = touchInputRef.current.x;
          let moveZ = touchInputRef.current.y;
          if (heldKeys.has('KeyW') || heldKeys.has('ArrowUp')) moveZ -= 1;
          if (heldKeys.has('KeyS') || heldKeys.has('ArrowDown')) moveZ += 1;
          if (heldKeys.has('KeyA') || heldKeys.has('ArrowLeft')) moveX -= 1;
          if (heldKeys.has('KeyD') || heldKeys.has('ArrowRight')) moveX += 1;

          const inputMag = Math.hypot(moveX, moveZ);
          if (inputMag > 1) {
            moveX /= inputMag;
            moveZ /= inputMag;
          }

          let currentSpeed = 0;
          let isMoving = false;
          const isSprinting = heldKeys.has('ShiftLeft') || heldKeys.has('ShiftRight');

          if (driving && activeVehicleId && vehicleRigRef.current) {
            const vDef = VEHICLE_LISTINGS.find((v) => v.id === activeVehicleId);
            const maxSpd = vDef?.maxSpeed ?? 24;
            const steerRate = vDef?.handling ?? 2.8;

            const throttle = -moveZ;
            const steer = -moveX;
            if (Math.abs(throttle) > 0.05) {
              vehicleSpeedRef.current = THREE.MathUtils.clamp(
                vehicleSpeedRef.current + throttle * 22 * dt,
                -8,
                maxSpd,
              );
            } else {
              vehicleSpeedRef.current *= Math.exp(-2.8 * dt);
              if (Math.abs(vehicleSpeedRef.current) < 0.08) vehicleSpeedRef.current = 0;
            }

            if (Math.abs(vehicleSpeedRef.current) > 0.4) {
              const dirSign = vehicleSpeedRef.current >= 0 ? 1 : -1;
              playerRotYRef.current += steer * steerRate * dt * dirSign;
            }

            const distStep = vehicleSpeedRef.current * dt;
            const nx = playerPosRef.current.x + Math.sin(playerRotYRef.current) * distStep;
            const nz = playerPosRef.current.z + Math.cos(playerRotYRef.current) * distStep;
            const resolved = resolveWorldMovement(nx, nz, world.colliders, 1.45);
            playerPosRef.current.set(resolved.x, groundHeightAt(resolved.x, resolved.z), resolved.z);

            vehicleHolder.visible = true;
            vehicleHolder.position.copy(playerPosRef.current);
            vehicleHolder.rotation.y = playerRotYRef.current;
            vehicleRigRef.current.updateSpin(distStep, steer);

            playerRig.root.position.set(
              playerPosRef.current.x,
              playerPosRef.current.y + 0.14,
              playerPosRef.current.z,
            );
            playerRig.root.rotation.y = playerRotYRef.current;
            playerRig.animate(dt, 0, 0, elapsed, true);
            currentSpeed = Math.abs(vehicleSpeedRef.current);
            isMoving = currentSpeed > 0.5;
          } else {
            vehicleSpeedRef.current = 0;
            vehicleHolder.visible = false;

            if (inputMag > 0.08) {
              isMoving = true;
              const walkSpeed = isSprinting ? 9.4 : 5.8;
              _forward.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
              _right.set(Math.cos(camYaw), 0, -Math.sin(camYaw));

              const worldDirX = _forward.x * -moveZ + _right.x * moveX;
              const worldDirZ = _forward.z * -moveZ + _right.z * moveX;
              const len = Math.hypot(worldDirX, worldDirZ) || 1;
              const dirX = worldDirX / len;
              const dirZ = worldDirZ / len;

              const nx = playerPosRef.current.x + dirX * walkSpeed * dt;
              const nz = playerPosRef.current.z + dirZ * walkSpeed * dt;
              const resolved = resolveWorldMovement(nx, nz, world.colliders, 0.55);
              playerPosRef.current.set(resolved.x, groundHeightAt(resolved.x, resolved.z), resolved.z);

              const targetYaw = Math.atan2(dirX, dirZ);
              let diff = targetYaw - playerRotYRef.current;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              playerRotYRef.current += diff * Math.min(1, 14 * dt);

              currentSpeed = walkSpeed;
              walkPhase += dt * walkSpeed * 1.65;
              footstepTimer += dt;
              if (footstepTimer > (isSprinting ? 0.28 : 0.42)) {
                footstepTimer = 0;
                soundEngine.playFootstep();
              }
            }

            playerRig.root.position.copy(playerPosRef.current);
            playerRig.root.rotation.y = playerRotYRef.current;
            const localEmote = propsRef.current.activeEmote;
            const localEmoteElapsed = localEmote ? Math.max(0, (Date.now() - localEmote.startedAt) / 1000) : 0;
            playerRig.animate(
              dt,
              currentSpeed,
              walkPhase,
              elapsed,
              false,
              isMoving ? null : localEmote?.id ?? null,
              localEmoteElapsed,
            );
          }

          // Smooth third-person follow camera
          const camDist = driving ? 9.5 : 5.6;
          const camHeight = driving ? 3.2 : 2.15;
          const effectiveYaw = driving ? playerRotYRef.current + Math.PI + camYaw * 0.25 : camYaw;
          _desiredCamPos.set(
            playerPosRef.current.x + Math.sin(effectiveYaw) * Math.cos(camPitch) * camDist,
            playerPosRef.current.y + camHeight + Math.sin(camPitch) * camDist * 0.45,
            playerPosRef.current.z + Math.cos(effectiveYaw) * Math.cos(camPitch) * camDist,
          );
          camera.position.lerp(_desiredCamPos, 1 - Math.exp(-9 * dt));
          _camTarget.set(playerPosRef.current.x, playerPosRef.current.y + 1.65, playerPosRef.current.z);
          camera.lookAt(_camTarget);

          // District & Nearby Interactable check (throttled state callbacks)
          const distId = getDistrictAt(playerPosRef.current.x, playerPosRef.current.z);
          if (distId !== lastDistrict) {
            lastDistrict = distId;
            propsRef.current.onDistrictChange(distId);
          }

          const nearby = findNearestInteractable();
          const nextNearbyId = nearby?.id ?? null;
          if (nextNearbyId !== lastNearbyId) {
            lastNearbyId = nextNearbyId;
            propsRef.current.onNearbyInteractable(nearby);
          }

          if (now - lastNearbyPlayersCheck > 250) {
            lastNearbyPlayersCheck = now;
            const nearbyPlayers = findNearbyOnlinePlayers(
              [playerPosRef.current.x, playerPosRef.current.y, playerPosRef.current.z],
              propsRef.current.onlinePlayers,
            );
            const key = nearbyPlayers.map((pl) => pl.sessionId).join(',');
            if (key !== lastNearbyPlayersKey) {
              lastNearbyPlayersKey = key;
              propsRef.current.onNearbyOnlinePlayersChange?.(nearbyPlayers);
            }
          }

          const kmh = Math.round(currentSpeed * 3.6);
          if (kmh !== lastHudSpeed) {
            lastHudSpeed = kmh;
            propsRef.current.onSpeedChange?.(kmh);
          }

          if (now - lastBroadcastTime > 120) {
            lastBroadcastTime = now;
            propsRef.current.onPlayerMoveBroadcast(
              [
                Number(playerPosRef.current.x.toFixed(2)),
                Number(playerPosRef.current.y.toFixed(2)),
                Number(playerPosRef.current.z.toFixed(2)),
              ],
              Number(playerRotYRef.current.toFixed(3)),
              distId,
              isMoving,
              driving,
            );
          }
        }

        renderer.render(scene, camera);
        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      }

      tick();

      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        resizeObserver.disconnect();
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', clearInputs);
        document.removeEventListener('visibilitychange', clearInputs);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        world.dispose();
        textures.dispose();
        envTex.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []);

    return <div ref={mountRef} data-testid="world-viewport" className="fixed inset-0 w-full h-full overflow-hidden" />;
  },
);
