import * as THREE from 'three';

const fragmentIndices = new Set([0, 4, 6]);
const layouts = {
  wide: [
    { x: 0.67, y: 0.20, z: 2.8, tilt: -5 },
    { x: 0.84, y: 0.36, z: -2.5, tilt: 4 },
    { x: 0.60, y: 0.47, z: 2.1, tilt: 3 },
    { x: 0.80, y: 0.68, z: -0.8, tilt: -4 },
    { x: 0.38, y: 0.21, z: -3.6, tilt: 5 },
    { x: 0.57, y: 0.78, z: 1.4, tilt: 2 },
    { x: 0.86, y: 0.82, z: -2.1, tilt: -3 }
  ],
  narrow: [
    { x: 0.26, y: 0.18, z: 0.6, tilt: -5 },
    { x: 0.75, y: 0.22, z: -0.7, tilt: 4 },
    { x: 0.71, y: 0.80, z: 0.9, tilt: 3 },
    { x: 0.25, y: 0.82, z: -0.5, tilt: -4 }
  ]
};

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.13, 'rgba(255,255,255,.85)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export default class Universe {
  constructor(canvas, elements) {
    this.canvas = canvas;
    this.elements = elements;
    this.hero = document.querySelector('.hero');
    this.stage = canvas.closest('.universe-stage');
    this.flow = canvas.closest('.universe-flow');
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pointer = { x: 0, y: 0 };
    this.motion = { x: 0, y: 0 };
    this.baseCameraZ = 18;
    this.width = 0;
    this.height = 0;
    this.visible = true;
    this.time = 0;
    this.texture = glowTexture();

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'low-power'
      });
    } catch {
      canvas.hidden = true;
      this.placeFallbackNotes();
      window.addEventListener('resize', () => this.placeFallbackNotes());
      return;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    this.camera.position.z = this.baseCameraZ;
    this.addStars();
    this.addConstellations();
    this.addPlanet();
    this.addNoteGlows();
    this.resize();

    this.flow.addEventListener('pointermove', (event) => {
      if (this.reducedMotion || event.pointerType === 'touch') return;
      const bounds = this.stage.getBoundingClientRect();
      this.pointer.x = (event.clientX - bounds.left) / bounds.width * 2 - 1;
      this.pointer.y = (event.clientY - bounds.top) / bounds.height * 2 - 1;
    });
    this.flow.addEventListener('pointerleave', () => {
      this.pointer.x = 0;
      this.pointer.y = 0;
    });
    this.elements.forEach((element) => {
      element.addEventListener('pointerenter', () => element.dataset.settled = 'true');
      element.addEventListener('pointerleave', () => delete element.dataset.settled);
      element.addEventListener('focus', () => element.dataset.settled = 'true');
      element.addEventListener('blur', () => delete element.dataset.settled);
    });
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('scroll', () => {
      if (this.reducedMotion) this.renderFrame(0);
    }, { passive: true });
    new IntersectionObserver((entries) => {
      this.visible = entries[0]?.isIntersecting ?? true;
    }).observe(this.flow);

    if (this.reducedMotion) {
      this.renderFrame(0);
    } else {
      requestAnimationFrame((time) => this.animate(time));
    }
  }

  addStars() {
    const random = seededRandom(1412);
    const count = window.innerWidth < 700 ? 650 : 1150;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = ['#f5f1e8', '#d6b977', '#83bdb2', '#dfa99b'];
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (random() - 0.5) * 44;
      positions[index * 3 + 1] = (random() - 0.5) * 26;
      positions[index * 3 + 2] = -8 - random() * 30;
      color.set(palette[Math.floor(random() * palette.length)]);
      const brightness = 0.35 + random() * 0.65;
      colors[index * 3] = color.r * brightness;
      colors[index * 3 + 1] = color.g * brightness;
      colors[index * 3 + 2] = color.b * brightness;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.26,
      map: this.texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);

    const dustCount = 320;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let index = 0; index < dustCount; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 6 + random() * 7;
      dustPositions[index * 3] = Math.cos(angle) * radius;
      dustPositions[index * 3 + 1] = Math.sin(angle) * radius * 0.52;
      dustPositions[index * 3 + 2] = -12 + (random() - 0.5) * 7;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    this.dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
      color: '#8db4ad',
      size: 0.28,
      map: this.texture,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.dust);

    const nearPositions = new Float32Array(80 * 3);
    for (let index = 0; index < 80; index += 1) {
      nearPositions[index * 3] = (random() - 0.5) * 28;
      nearPositions[index * 3 + 1] = (random() - 0.5) * 18;
      nearPositions[index * 3 + 2] = 2 + random() * 5;
    }
    const nearGeometry = new THREE.BufferGeometry();
    nearGeometry.setAttribute('position', new THREE.BufferAttribute(nearPositions, 3));
    this.nearStars = new THREE.Points(nearGeometry, new THREE.PointsMaterial({
      color: '#f5f1e8',
      size: 0.075,
      map: this.texture,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.nearStars);
  }

  addConstellations() {
    this.constellations = new THREE.Group();
    const paths = [
      [[-3, 5, -9], [1, 3.5, -6], [5, 4, -4], [8, 1, -7]],
      [[-2, -3, -5], [2, -4, -8], [6, -1.5, -6], [7, 2, -9]]
    ];
    paths.forEach((path, index) => {
      const curve = new THREE.CatmullRomCurve3(path.map((point) => new THREE.Vector3(...point)));
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(70));
      this.constellations.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({
        color: index ? '#83bdb2' : '#d6b977',
        transparent: true,
        opacity: 0.12,
        depthWrite: false
      })));
      const stars = new THREE.BufferGeometry().setFromPoints(curve.getPoints(6));
      this.constellations.add(new THREE.Points(stars, new THREE.PointsMaterial({
        color: index ? '#b4d8cf' : '#e8d6a8',
        size: 0.14,
        map: this.texture,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })));
    });
    this.constellations.position.x = 3;
    this.scene.add(this.constellations);
  }

  addPlanet() {
    this.planet = new THREE.Group();
    this.planetPieces = [];
    const colors = ['#a8c8c0', '#a4b9c9', '#d5aaa1'];
    const radius = 1.05;
    const innerRadius = 0.86;
    const capShape = new THREE.Shape();
    for (let index = 0; index <= 24; index += 1) {
      const angle = index / 24 * Math.PI;
      const x = Math.sin(angle) * radius;
      const y = Math.cos(angle) * radius;
      if (index === 0) capShape.moveTo(x, y);
      else capShape.lineTo(x, y);
    }
    for (let index = 24; index >= 0; index -= 1) {
      const angle = index / 24 * Math.PI;
      capShape.lineTo(Math.sin(angle) * innerRadius, Math.cos(angle) * innerRadius);
    }
    capShape.closePath();
    const capGeometry = new THREE.ShapeGeometry(capShape);

    colors.forEach((color, index) => {
      const piece = new THREE.Group();
      const start = index * Math.PI * 2 / 3 + 0.075;
      const length = Math.PI * 2 / 3 - 0.15;
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.92, flatShading: true });
      piece.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 16, start, length), material));
      piece.add(new THREE.Mesh(new THREE.SphereGeometry(innerRadius, 14, 16, start, length), new THREE.MeshStandardMaterial({
        color: '#425862', roughness: 1, side: THREE.BackSide
      })));
      // Close the exposed sides of each spherical shell fragment.
      [start, start + length].forEach((angle) => {
        const cap = new THREE.Mesh(capGeometry, new THREE.MeshStandardMaterial({
          color: '#71938c', roughness: 1, side: THREE.DoubleSide
        }));
        cap.rotation.y = angle - Math.PI;
        piece.add(cap);
      });
      const middle = start + length / 2;
      piece.userData.offset = new THREE.Vector3(-Math.cos(middle), (index - 1) * 0.18, Math.sin(middle));
      this.planetPieces.push(piece);
      this.planet.add(piece);
    });
    const shardGeometry = new THREE.TetrahedronGeometry(0.11);
    for (let index = 0; index < 3; index += 1) {
      const shard = new THREE.Mesh(shardGeometry, new THREE.MeshStandardMaterial({ color: colors[index], roughness: 1 }));
      const angle = index * Math.PI * 2 / 3;
      shard.position.set(Math.cos(angle) * 1.55, Math.sin(angle) * 1.25, 0.3);
      this.planet.add(shard);
    }
    this.scene.add(this.planet);
    this.scene.add(new THREE.AmbientLight('#d8e8e4', 1.4));
    const moonlight = new THREE.DirectionalLight('#fff1df', 2.4);
    moonlight.position.set(-4, 6, 8);
    this.scene.add(moonlight);
  }

  addNoteGlows() {
    const colors = ['#e6c989', '#dba7a0', '#91cbbb', '#d6b977', '#8ebcca', '#d8a7a8', '#b6c7a1'];
    this.glows = this.elements.map((_, index) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.texture,
        color: colors[index],
        transparent: true,
        opacity: fragmentIndices.has(index) ? 0.18 : 0.36,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }));
      sprite.scale.set(3.5, 3.5, 1);
      this.scene.add(sprite);
      return sprite;
    });
  }

  layout() {
    return this.width <= 1100 ? layouts.narrow : layouts.wide;
  }

  worldPosition(layout) {
    const depth = this.baseCameraZ - layout.z;
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * depth;
    const halfWidth = halfHeight * this.camera.aspect;
    return new THREE.Vector3(
      (layout.x * 2 - 1) * halfWidth,
      (1 - layout.y * 2) * halfHeight,
      layout.z
    );
  }

  resize() {
    if (!this.renderer) {
      this.placeFallbackNotes();
      return;
    }
    const bounds = this.stage.getBoundingClientRect();
    this.width = Math.max(1, bounds.width);
    this.height = Math.max(1, bounds.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    this.constellations.scale.x = Math.min(1.5, this.camera.aspect / 1.5);
    if (this.reducedMotion) this.renderFrame(0);
  }

  placeFallbackNotes() {
    const layout = window.innerWidth <= 1100 ? layouts.narrow : layouts.wide;
    this.elements.forEach((element, index) => {
      const place = layout[index];
      element.hidden = !place;
      if (place) {
        element.style.left = place.x * 100 + '%';
        element.style.top = place.y * 100 + '%';
        element.style.transform = 'translate(-50%, -50%) rotate(' + place.tilt + 'deg)';
      }
    });
  }

  renderFrame(time) {
    this.time = time;
    const heroBounds = this.hero.getBoundingClientRect();
    const stageBounds = this.stage.getBoundingClientRect();
    const scrollProgress = THREE.MathUtils.clamp(-heroBounds.top / this.height, 0, 1);
    const noteScroll = stageBounds.top - heroBounds.top;
    this.motion.x += (this.pointer.x - this.motion.x) * 0.035;
    this.motion.y += (this.pointer.y - this.motion.y) * 0.035;
    this.camera.position.x = this.motion.x * 0.9;
    this.camera.position.y = -this.motion.y * 0.55;
    this.camera.position.z = this.baseCameraZ - (this.reducedMotion ? 0 : scrollProgress * 1.35);
    this.camera.lookAt(0, 0, 0);
    this.stars.rotation.y = Math.sin(time * 0.00007) * 0.045;
    this.dust.rotation.z = time * 0.000008;
    this.nearStars.rotation.z = Math.sin(time * 0.00005) * 0.012;
    this.constellations.rotation.set(0.2, Math.sin(time * 0.00008) * 0.1, -0.12);
    const planetLayout = this.width <= 700
      ? { x: 0.77, y: 0.12, z: -2 }
      : this.width <= 1100
        ? { x: 0.89, y: 0.43, z: -2 }
        : { x: 0.88, y: 0.16, z: -2 };
    this.planet.position.copy(this.worldPosition({ ...planetLayout, y: planetLayout.y - scrollProgress }));
    this.planet.scale.setScalar(this.width <= 700 ? 0.66 : 1);
    this.planet.rotation.set(0.2 + this.motion.y * 0.07, 0.35 + time * 0.000045, -0.2 + this.motion.x * 0.06);
    this.planetPieces.forEach((piece, index) => {
      const separation = 0.18 + Math.sin(time * 0.00035 + index) * 0.025;
      piece.position.copy(piece.userData.offset).multiplyScalar(separation);
    });
    this.flow.style.setProperty('--character-x', (this.motion.x * 12).toFixed(2) + 'px');
    this.flow.style.setProperty('--character-y', (-this.motion.y * 7).toFixed(2) + 'px');
    this.flow.style.setProperty('--character-tilt', (this.motion.x * 5).toFixed(2) + 'deg');

    const layout = this.layout();
    this.elements.forEach((element, index) => {
      const place = layout[index];
      const glow = this.glows[index];
      element.hidden = !place;
      glow.visible = Boolean(place);
      if (!place) return;

      const position = this.worldPosition(place);
      if (!this.reducedMotion) {
        position.y += Math.sin(time * 0.00053 + index * 1.7) * 0.16;
        position.x += Math.cos(time * 0.00032 + index * 2.1) * 0.06;
      }
      const projected = position.clone().project(this.camera);
      if (element.dataset.settled !== 'true') {
        element.style.left = ((projected.x + 1) * 0.5 * this.width) + 'px';
        element.style.top = ((1 - projected.y) * 0.5 * this.height) + 'px';
        const tilt = place.tilt + (this.reducedMotion ? 0 : Math.sin(time * 0.0004 + index) * 2);
        const scale = THREE.MathUtils.clamp(this.baseCameraZ / (this.camera.position.z - place.z), 0.84, 1.15);
        element.style.transform = 'translate(-50%, -50%) rotateX(' + (-this.motion.y * 9) + 'deg) rotateY(' + (this.motion.x * 12) + 'deg) rotate(' + tilt + 'deg) scale(' + scale + ')';
      }
      // Hover pauses the paper, but its glow still follows the page when scrolling.
      const glowProjection = new THREE.Vector3(
        parseFloat(element.style.left) / this.width * 2 - 1,
        1 - (parseFloat(element.style.top) - noteScroll) / this.height * 2,
        projected.z
      );
      glow.position.copy(glowProjection.unproject(this.camera));
      glow.material.opacity = (fragmentIndices.has(index) ? 0.14 : 0.30) + Math.sin(time * 0.0012 + index) * 0.04;
    });
    this.renderer.render(this.scene, this.camera);
  }

  animate(time) {
    if (this.visible && !document.hidden) this.renderFrame(time);
    requestAnimationFrame((nextTime) => this.animate(nextTime));
  }
}

