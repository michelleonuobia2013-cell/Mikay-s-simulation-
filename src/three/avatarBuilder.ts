import * as THREE from 'three';
import type { CharacterAppearance, EmoteId } from '../game/types';
import type { WorldTextures } from './proceduralTextures';

export interface ArticulatedHumanRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftForearmPivot: THREE.Group;
  rightForearmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftShinPivot: THREE.Group;
  rightShinPivot: THREE.Group;
  updateAppearance: (appearance: CharacterAppearance) => void;
  animate: (
    dt: number,
    speed: number,
    walkPhase: number,
    elapsed: number,
    sitting?: boolean,
    activeEmote?: EmoteId | null,
    emoteElapsed?: number,
  ) => void;
}

// Sculpted realistic human proportions (total height ~1.74m, bottom-center pivot at y=0)
export function createHumanRig(
  initialAppearance: CharacterAppearance,
  textures?: WorldTextures,
): ArticulatedHumanRig {
  const root = new THREE.Group();

  // Contact shadow disc grounded at y=0.015
  const shadowGeo = new THREE.CircleGeometry(0.38, 24);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x05030a,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  root.add(shadowDisc);

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: initialAppearance.skinTone,
    roughness: 0.56,
    metalness: 0.02,
    sheen: 0.25,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color('#ffcab5'),
    bumpMap: textures?.skinMicroMap ?? null,
    bumpScale: 0.003,
  });

  const outfitPrimaryMat = new THREE.MeshPhysicalMaterial({
    color: initialAppearance.primaryColor,
    roughness: 0.68,
    metalness: 0.06,
    sheen: 0.55,
    sheenRoughness: 0.45,
    bumpMap: textures?.fabricBumpMap ?? null,
    bumpScale: 0.008,
  });

  const outfitAccentMat = new THREE.MeshPhysicalMaterial({
    color: initialAppearance.accentColor,
    roughness: 0.35,
    metalness: 0.38,
    clearcoat: 0.2,
  });

  const hairMat = new THREE.MeshPhysicalMaterial({
    color: initialAppearance.hairColor,
    roughness: 0.42,
    metalness: 0.08,
    sheen: 0.7,
    sheenRoughness: 0.3,
  });

  const eyeIrisMat = new THREE.MeshStandardMaterial({
    color: initialAppearance.eyeColor,
    roughness: 0.15,
    metalness: 0.1,
  });

  const lipMat = new THREE.MeshStandardMaterial({
    color: initialAppearance.lipColor,
    roughness: 0.3,
    metalness: 0.05,
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: '#1b1624',
    roughness: 0.32,
    metalness: 0.25,
  });

  const scleraMat = new THREE.MeshStandardMaterial({ color: '#f7f4ef', roughness: 0.2 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.1 });
  const metalTrimMat = new THREE.MeshStandardMaterial({ color: '#e2c07d', roughness: 0.22, metalness: 0.88 });

  const hips = new THREE.Group();
  hips.position.y = 0.88;
  root.add(hips);

  // Pelvis / Skirt / Trousers base
  const pelvisMesh = new THREE.Mesh(new THREE.SphereGeometry(0.145, 20, 16), outfitPrimaryMat);
  pelvisMesh.scale.set(1.18, 0.78, 0.86);
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  // Flowing skirt / coat hem (toggled for Evening / Elegant / Traditional / Dress silhouettes)
  const skirtGeo = new THREE.CylinderGeometry(0.14, 0.26, 0.46, 22, 1, true);
  const skirtMat = outfitPrimaryMat.clone();
  skirtMat.side = THREE.DoubleSide;
  const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
  skirtMesh.position.y = -0.2;
  skirtMesh.castShadow = true;
  hips.add(skirtMesh);

  // Torso group
  const torso = new THREE.Group();
  torso.position.y = 0.06;
  hips.add(torso);

  // Sculpted waist + chest via LatheGeometry for organic human curve (not a box!)
  const torsoPoints = [
    new THREE.Vector2(0.11, 0),
    new THREE.Vector2(0.105, 0.12),
    new THREE.Vector2(0.142, 0.28),
    new THREE.Vector2(0.15, 0.38),
    new THREE.Vector2(0.085, 0.46),
    new THREE.Vector2(0.05, 0.48),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoPoints, 24);
  const torsoMesh = new THREE.Mesh(torsoGeo, outfitPrimaryMat);
  torsoMesh.scale.set(1.12, 1, 0.76);
  torsoMesh.castShadow = true;
  torso.add(torsoMesh);

  // Collar / Lapel / Sash Accent
  const sashMesh = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 10, 24), outfitAccentMat);
  sashMesh.rotation.x = Math.PI / 2;
  sashMesh.position.y = 0.09;
  sashMesh.scale.set(1.06, 0.85, 1);
  torso.add(sashMesh);

  const collarMesh = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 10, 20), outfitAccentMat);
  collarMesh.rotation.x = Math.PI / 2 - 0.18;
  collarMesh.position.set(0, 0.44, 0.01);
  torso.add(collarMesh);

  // Neck & Head Group
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.47;
  torso.add(headGroup);

  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.054, 0.11, 16), skinMat);
  neckMesh.position.y = 0.04;
  headGroup.add(neckMesh);

  // Sculpted cranial dome + jawline
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.112, 24, 20), skinMat);
  cranium.position.y = 0.175;
  cranium.scale.set(0.92, 1.06, 0.98);
  cranium.castShadow = true;
  headGroup.add(cranium);

  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.082, 20, 16), skinMat);
  jaw.position.set(0, 0.128, 0.02);
  jaw.scale.set(0.86, 0.88, 0.92);
  headGroup.add(jaw);

  // Sculpted Nose bridge
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.042, 12), skinMat);
  nose.rotation.x = Math.PI * 0.42;
  nose.position.set(0, 0.158, 0.106);
  headGroup.add(nose);

  // Lips
  const lips = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0065, 8, 16, Math.PI), lipMat);
  lips.rotation.x = Math.PI * 0.9;
  lips.position.set(0, 0.122, 0.095);
  headGroup.add(lips);

  // Expressive Eyes (left & right)
  [-1, 1].forEach((side) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.036, 0.178, 0.093);

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), scleraMat);
    sclera.scale.set(1.1, 0.82, 0.65);
    eyeGroup.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 12, 10), eyeIrisMat);
    iris.position.z = 0.007;
    iris.scale.set(1, 1, 0.5);
    eyeGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), pupilMat);
    pupil.position.z = 0.0095;
    eyeGroup.add(pupil);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.005, 0.007), hairMat);
    brow.position.set(0, 0.018, 0.005);
    brow.rotation.z = side * -0.08;
    eyeGroup.add(brow);

    headGroup.add(eyeGroup);

    // Ears
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), skinMat);
    ear.scale.set(0.45, 1.15, 0.75);
    ear.position.set(side * 0.102, 0.165, -0.005);
    headGroup.add(ear);
  });

  // Hair Container (swappable sculpted styles)
  const hairContainer = new THREE.Group();
  hairContainer.position.y = 0.18;
  headGroup.add(hairContainer);

  // Accessory Container (earrings, sunglasses, tiara, scarf)
  const accessoryContainer = new THREE.Group();
  headGroup.add(accessoryContainer);

  // Arms (upper arm + elbow + forearm + hand)
  function buildArm(side: -1 | 1) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.185, 0.40, 0);
    torso.add(shoulder);

    const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 12), outfitPrimaryMat);
    shoulder.add(shoulderJoint);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.25, 14), outfitPrimaryMat);
    upperArm.position.y = -0.125;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.y = -0.25;
    shoulder.add(forearmPivot);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.024, 0.24, 14), skinMat);
    forearm.position.y = -0.12;
    forearm.castShadow = true;
    forearmPivot.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.029, 12, 10), skinMat);
    hand.scale.set(0.8, 1.25, 0.65);
    hand.position.y = -0.255;
    forearmPivot.add(hand);

    return { shoulder, forearmPivot };
  }

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Legs (thigh + knee + calf + sculpted shoe)
  function buildLeg(side: -1 | 1) {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.088, -0.03, 0);
    hips.add(hipPivot);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.048, 0.42, 16), outfitPrimaryMat);
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    hipPivot.add(thigh);

    const shinPivot = new THREE.Group();
    shinPivot.position.y = -0.42;
    hipPivot.add(shinPivot);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.033, 0.40, 16), skinMat);
    shin.position.y = -0.20;
    shin.castShadow = true;
    shinPivot.add(shin);

    const footGroup = new THREE.Group();
    footGroup.position.set(0, -0.41, 0.035);
    shinPivot.add(footGroup);

    const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.036, 0.165), shoeMat);
    shoeSole.castShadow = true;
    footGroup.add(shoeSole);

    const shoeVamp = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), shoeMat);
    shoeVamp.scale.set(0.95, 0.72, 1.6);
    shoeVamp.position.set(0, 0.018, 0.02);
    footGroup.add(shoeVamp);

    return { hipPivot, shinPivot, thigh, shin, shoeSole };
  }

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  function rebuildHair(app: CharacterAppearance) {
    while (hairContainer.children.length > 0) {
      const c = hairContainer.children[0];
      hairContainer.remove(c);
    }
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.118, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat,
    );
    cap.scale.set(0.94, 1.05, 1.01);
    hairContainer.add(cap);

    if (app.hairStyle === 'flowing_waves') {
      const backCurtain = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.145, 0.34, 18, 1, false, Math.PI * 0.45, Math.PI * 1.1), hairMat);
      backCurtain.position.set(0, -0.14, -0.02);
      hairContainer.add(backCurtain);
      [-1, 1].forEach((s) => {
        const lock = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), hairMat);
        lock.scale.set(0.7, 2.5, 0.75);
        lock.position.set(s * 0.098, -0.12, 0.02);
        hairContainer.add(lock);
      });
    } else if (app.hairStyle === 'sleek_ponytail') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 12), hairMat);
      bun.position.set(0, 0.06, -0.12);
      hairContainer.add(bun);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.32, 14), hairMat);
      tail.rotation.x = Math.PI + 0.25;
      tail.position.set(0, -0.09, -0.16);
      hairContainer.add(tail);
    } else if (app.hairStyle === 'braided_crown') {
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.026, 10, 24), hairMat);
      crown.rotation.x = Math.PI / 2 - 0.25;
      crown.position.set(0, 0.055, -0.005);
      hairContainer.add(crown);
    } else if (app.hairStyle === 'voluminous_curls') {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), hairMat);
        puff.position.set(Math.sin(angle) * 0.09, 0.02 + (i % 2) * 0.04, Math.cos(angle) * 0.085 - 0.015);
        hairContainer.add(puff);
      }
    } else if (app.hairStyle === 'side_bob') {
      const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, 0.19, 18, 1, false, Math.PI * 0.35, Math.PI * 1.3), hairMat);
      bob.position.set(0, -0.05, -0.015);
      hairContainer.add(bob);
    } else if (app.hairStyle === 'luxury_updo' || app.hairStyle === 'festive_chignon') {
      const chignon = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 12), hairMat);
      chignon.position.set(0, 0.08, -0.09);
      hairContainer.add(chignon);
      if (app.hairStyle === 'festive_chignon') {
        const pin = new THREE.Mesh(new THREE.OctahedronGeometry(0.022), metalTrimMat);
        pin.position.set(0.04, 0.11, -0.07);
        hairContainer.add(pin);
      }
    }
  }

  function rebuildAccessories(app: CharacterAppearance) {
    while (accessoryContainer.children.length > 0) {
      accessoryContainer.remove(accessoryContainer.children[0]);
    }
    if (app.accessory === 'pearl_earrings') {
      [-1, 1].forEach((s) => {
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 10), metalTrimMat);
        pearl.position.set(s * 0.105, 0.138, -0.004);
        accessoryContainer.add(pearl);
      });
    } else if (app.accessory === 'sunglasses') {
      const lensMat = new THREE.MeshPhysicalMaterial({ color: '#0c0a14', roughness: 0.05, metalness: 0.85, clearcoat: 1 });
      [-1, 1].forEach((s) => {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.024, 0.012), lensMat);
        lens.position.set(s * 0.036, 0.178, 0.108);
        accessoryContainer.add(lens);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.005, 0.01), metalTrimMat);
      bridge.position.set(0, 0.183, 0.108);
      accessoryContainer.add(bridge);
    } else if (app.accessory === 'tiara') {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.009, 8, 20, Math.PI), metalTrimMat);
      arc.position.set(0, 0.27, 0.02);
      arc.rotation.x = -0.35;
      accessoryContainer.add(arc);
    } else if (app.accessory === 'holiday_scarf' || app.accessory === 'gold_chain') {
      const scarf = new THREE.Mesh(
        new THREE.TorusGeometry(0.076, app.accessory === 'holiday_scarf' ? 0.028 : 0.01, 10, 22),
        app.accessory === 'holiday_scarf' ? outfitAccentMat : metalTrimMat,
      );
      scarf.rotation.x = Math.PI / 2;
      scarf.position.set(0, 0.02, 0.005);
      accessoryContainer.add(scarf);
    }
  }

  function updateAppearance(app: CharacterAppearance) {
    skinMat.color.set(app.skinTone);
    hairMat.color.set(app.hairColor);
    eyeIrisMat.color.set(app.eyeColor);
    lipMat.color.set(app.lipColor);

    if (app.outfitCategory === 'Traditional African' && textures?.ankaraPatternMap) {
      outfitPrimaryMat.map = textures.ankaraPatternMap;
      outfitPrimaryMat.color.set('#ffffff');
      skirtMat.map = textures.ankaraPatternMap;
      skirtMat.color.set('#ffffff');
    } else {
      outfitPrimaryMat.map = null;
      outfitPrimaryMat.color.set(app.primaryColor);
      skirtMat.map = null;
      skirtMat.color.set(app.primaryColor);
    }
    outfitPrimaryMat.needsUpdate = true;
    skirtMat.needsUpdate = true;

    outfitAccentMat.color.set(app.accentColor);

    // Gender & Silhouette refinements
    const isFemale = app.gender === 'female';
    torsoMesh.scale.set(isFemale ? 1.06 : 1.24, 1, isFemale ? 0.74 : 0.84);
    pelvisMesh.scale.set(isFemale ? 1.22 : 1.08, 0.78, 0.86);

    const hasSkirt =
      isFemale &&
      ['Evening', 'Elegant', 'Veloria Exclusive', 'Traditional African', 'Party', 'Celebrity', 'Christmas'].includes(
        app.outfitCategory,
      );
    skirtMesh.visible = hasSkirt;

    // Trousers vs bare legs for beachwear/skirts
    const bareLegs = hasSkirt || app.outfitCategory === 'Beachwear';
    leftLeg.thigh.material = bareLegs ? skinMat : outfitPrimaryMat;
    rightLeg.thigh.material = bareLegs ? skinMat : outfitPrimaryMat;

    shoeMat.color.set(
      app.shoeStyle === 'sneakers'
        ? '#e2e8f0'
        : app.shoeStyle === 'sandals'
          ? '#a16207'
          : app.shoeStyle === 'boots'
            ? '#271a18'
            : '#18141f',
    );

    rebuildHair(app);
    rebuildAccessories(app);
  }

  updateAppearance(initialAppearance);

  function animate(
    _dt: number,
    speed: number,
    walkPhase: number,
    elapsed: number,
    sitting = false,
    activeEmote: EmoteId | null = null,
    emoteElapsed = 0,
  ) {
    if (sitting) {
      hips.position.y = 0.56;
      leftLeg.hipPivot.rotation.x = -1.35;
      rightLeg.hipPivot.rotation.x = -1.35;
      leftLeg.shinPivot.rotation.x = 1.2;
      rightLeg.shinPivot.rotation.x = 1.2;
      leftArm.shoulder.rotation.x = -0.75;
      rightArm.shoulder.rotation.x = -0.75;
      leftArm.shoulder.rotation.z = -0.06;
      rightArm.shoulder.rotation.z = 0.06;
      leftArm.forearmPivot.rotation.x = -0.25;
      rightArm.forearmPivot.rotation.x = -0.25;
      leftArm.forearmPivot.rotation.z = 0;
      rightArm.forearmPivot.rotation.z = 0;
      torso.rotation.set(0.05, 0, 0);
      headGroup.rotation.set(0, 0, 0);
      return;
    }

    const movingFactor = Math.min(1, speed / 5.5);

    if (activeEmote && movingFactor < 0.15) {
      hips.position.y = 0.88;
      torso.position.y = 0.06;
      leftLeg.hipPivot.rotation.x = 0;
      rightLeg.hipPivot.rotation.x = 0;
      leftLeg.shinPivot.rotation.x = 0;
      rightLeg.shinPivot.rotation.x = 0;

      if (activeEmote === 'wave') {
        torso.rotation.set(0.02, 0.08, -0.04);
        headGroup.rotation.set(-0.04, 0.1, 0.08);
        leftArm.shoulder.rotation.set(-0.08, 0, -0.14);
        leftArm.forearmPivot.rotation.set(-0.2, 0, 0);
        // Raise right arm overhead (+Z) and wave forearm smoothly
        rightArm.shoulder.rotation.set(-0.32, 0, 2.38);
        rightArm.forearmPivot.rotation.set(-0.18, 0, Math.sin(emoteElapsed * 9.5) * 0.42);
        return;
      }

      if (activeEmote === 'dance') {
        const beat = emoteElapsed * 6.4;
        const bounce = Math.abs(Math.sin(beat)) * 0.075;
        hips.position.y = 0.88 - bounce * 0.55;
        torso.position.y = 0.06 + bounce * 0.4;
        torso.rotation.set(0.06, Math.sin(beat * 0.5) * 0.24, Math.cos(beat * 0.5) * 0.09);
        headGroup.rotation.set(Math.sin(beat) * 0.07, Math.sin(beat * 0.5) * 0.14, -Math.cos(beat * 0.5) * 0.07);

        leftLeg.hipPivot.rotation.x = -0.18 - Math.max(0, Math.sin(beat)) * 0.26;
        rightLeg.hipPivot.rotation.x = -0.18 - Math.max(0, -Math.sin(beat)) * 0.26;
        leftLeg.shinPivot.rotation.x = 0.28 + Math.max(0, Math.sin(beat)) * 0.35;
        rightLeg.shinPivot.rotation.x = 0.28 + Math.max(0, -Math.sin(beat)) * 0.35;

        leftArm.shoulder.rotation.set(-0.55, 0, -0.82 - Math.sin(beat) * 0.38);
        rightArm.shoulder.rotation.set(-0.55, 0, 0.82 - Math.sin(beat) * 0.38);
        leftArm.forearmPivot.rotation.set(-1.05, 0, Math.cos(beat) * 0.22);
        rightArm.forearmPivot.rotation.set(-1.05, 0, -Math.cos(beat) * 0.22);
        return;
      }

      if (activeEmote === 'laugh') {
        const chuckle = Math.sin(emoteElapsed * 12);
        hips.position.y = 0.88 + Math.abs(chuckle) * 0.018;
        torso.rotation.set(-0.15 + Math.abs(chuckle) * 0.1, 0, 0);
        headGroup.rotation.set(-0.2 + chuckle * 0.07, Math.sin(emoteElapsed * 4) * 0.08, 0);
        leftArm.shoulder.rotation.set(-0.35, 0, -0.22);
        leftArm.forearmPivot.rotation.set(-0.75, 0, 0);
        rightArm.shoulder.rotation.set(-0.88, 0, 0.28);
        rightArm.forearmPivot.rotation.set(-1.28, 0, chuckle * 0.08);
        return;
      }

      if (activeEmote === 'clap') {
        const clapPhase = Math.abs(Math.sin(emoteElapsed * 9));
        torso.rotation.set(0.05, 0, 0);
        headGroup.rotation.set(0.04 * clapPhase, 0, 0);
        leftArm.shoulder.rotation.set(-0.88, 0, -0.26);
        rightArm.shoulder.rotation.set(-0.88, 0, 0.26);
        leftArm.forearmPivot.rotation.set(-0.78, 0, -0.25 + clapPhase * 0.38);
        rightArm.forearmPivot.rotation.set(-0.78, 0, 0.25 - clapPhase * 0.38);
        return;
      }

      if (activeEmote === 'pose') {
        torso.rotation.set(-0.04, 0.28, 0.05);
        headGroup.rotation.set(-0.08, -0.22, 0.06);
        leftLeg.hipPivot.rotation.x = -0.14;
        rightLeg.hipPivot.rotation.x = 0.1;
        leftLeg.shinPivot.rotation.x = 0.18;
        rightLeg.shinPivot.rotation.x = 0;
        leftArm.shoulder.rotation.set(-0.15, 0, -0.62);
        leftArm.forearmPivot.rotation.set(-0.4, 0, 0.92);
        rightArm.shoulder.rotation.set(-0.35, 0, 0.78);
        rightArm.forearmPivot.rotation.set(-0.32, 0, 0.18);
        return;
      }
    }

    const swing = Math.sin(walkPhase) * 0.68 * movingFactor;
    const bob = Math.abs(Math.sin(walkPhase)) * 0.045 * movingFactor;
    const breath = Math.sin(elapsed * 2.1) * 0.012;

    hips.position.y = 0.88 + bob;
    torso.position.y = 0.06 + breath;
    torso.rotation.y = Math.sin(walkPhase) * 0.08 * movingFactor;
    torso.rotation.x = 0.06 * movingFactor;
    torso.rotation.z = 0;

    leftLeg.hipPivot.rotation.x = swing;
    rightLeg.hipPivot.rotation.x = -swing;
    leftLeg.shinPivot.rotation.x = Math.max(0, -Math.cos(walkPhase) * 0.55 * movingFactor);
    rightLeg.shinPivot.rotation.x = Math.max(0, Math.cos(walkPhase) * 0.55 * movingFactor);

    leftArm.shoulder.rotation.x = -swing * 0.78;
    rightArm.shoulder.rotation.x = swing * 0.78;
    leftArm.shoulder.rotation.z = -0.09;
    rightArm.shoulder.rotation.z = 0.09;
    leftArm.forearmPivot.rotation.x = -0.22 - Math.max(0, swing) * 0.3;
    rightArm.forearmPivot.rotation.x = -0.22 - Math.max(0, -swing) * 0.3;
    leftArm.forearmPivot.rotation.z = 0;
    rightArm.forearmPivot.rotation.z = 0;

    headGroup.rotation.x = 0;
    headGroup.rotation.y = Math.sin(elapsed * 0.65) * 0.05 * (1 - movingFactor);
    headGroup.rotation.z = 0;
  }

  return {
    root,
    hips,
    torso,
    headGroup,
    leftArmPivot: leftArm.shoulder,
    rightArmPivot: rightArm.shoulder,
    leftForearmPivot: leftArm.forearmPivot,
    rightForearmPivot: rightArm.forearmPivot,
    leftLegPivot: leftLeg.hipPivot,
    rightLegPivot: rightLeg.hipPivot,
    leftShinPivot: leftLeg.shinPivot,
    rightShinPivot: rightLeg.shinPivot,
    updateAppearance,
    animate,
  };
}
