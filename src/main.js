import * as THREE from 'three';
import {
  createIcons,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Menu,
  Volume2,
  VolumeX,
  X
} from 'lucide';
import '@fontsource/newsreader/300.css';
import '@fontsource/newsreader/300-italic.css';
import '@fontsource/newsreader/400.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import './style.css';

const iconSet = { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Menu, Volume2, VolumeX, X };
const noteField = document.querySelector('#note-field');
const noteDialog = document.querySelector('#note-dialog');
const noteTitle = document.querySelector('#note-dialog-title');
const noteIndex = document.querySelector('#note-dialog-index');
const socialDialog = document.querySelector('#social-dialog');
const socialTrigger = document.querySelector('#social-trigger');
const audio = document.querySelector('#instrumental');
const audioButton = document.querySelector('#audio-toggle');
const langButtons = [...document.querySelectorAll('[data-lang]')];
const layouts = {
  wide: [
    { x: 0.67, y: 0.20, z: 0.7, tilt: -5 },
    { x: 0.84, y: 0.36, z: -1.2, tilt: 4 },
    { x: 0.55, y: 0.47, z: 1.1, tilt: 3 },
    { x: 0.80, y: 0.68, z: 0.2, tilt: -4 },
    { x: 0.38, y: 0.21, z: -1.8, tilt: 5 },
    { x: 0.55, y: 0.78, z: -0.7, tilt: 2 },
    { x: 0.92, y: 0.82, z: -1.7, tilt: -3 }
  ],
  narrow: [
    { x: 0.26, y: 0.20, z: 0.6, tilt: -5 },
    { x: 0.75, y: 0.31, z: -0.7, tilt: 4 },
    { x: 0.71, y: 0.78, z: 0.9, tilt: 3 },
    { x: 0.25, y: 0.82, z: -0.5, tilt: -4 }
  ]
};

let content;
let language = 'en';
let activeNote = 0;
let noteButtons = [];

function nestedValue(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function iconize() {
  createIcons({
    icons: iconSet,
    attrs: { width: 18, height: 18, 'stroke-width': 1.7, 'aria-hidden': 'true' }
  });
}

function makeNoteButtons() {
  const count = content.en.notes.items.length;
  for (let index = 0; index < count; index += 1) {
    const button = document.createElement('button');
    const spark = document.createElement('span');
    const label = document.createElement('span');
    button.type = 'button';
    button.className = 'floating-note note-' + index;
    button.dataset.noteIndex = String(index);
    spark.className = 'note-spark';
    spark.textContent = '✦';
    spark.setAttribute('aria-hidden', 'true');
    label.className = 'note-text';
    button.append(spark, label);
    button.addEventListener('click', () => openNote(index));
    noteField.append(button);
  }
  noteButtons = [...noteField.querySelectorAll('.floating-note')];
}

function makeSocialLinks() {
  const container = document.querySelector('#social-links');
  content.socials.forEach((social) => {
    const link = document.createElement('a');
    const label = document.createElement('span');
    const icon = document.createElement('i');
    link.href = social.url;
    if (!social.url.startsWith('mailto:')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    label.textContent = social.label;
    icon.dataset.lucide = 'arrow-up-right';
    link.append(label, icon);
    container.append(link);
  });
  iconize();
}

function updateAudioButton() {
  const playing = !audio.paused;
  const label = content[language].controls[playing ? 'pauseAudio' : 'playAudio'];
  audioButton.setAttribute('aria-pressed', String(playing));
  audioButton.setAttribute('aria-label', label);
  audioButton.title = label;
}

function paintNoteDialog() {
  const items = content[language].notes.items;
  noteIndex.textContent = String(activeNote + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
  noteTitle.textContent = items[activeNote].full;
}

function setLanguage(nextLanguage) {
  if (!content[nextLanguage]) return;
  language = nextLanguage;
  document.documentElement.lang = language;
  const copy = content[language];

  document.querySelectorAll('[data-copy]').forEach((element) => {
    element.textContent = nestedValue(copy, element.dataset.copy) || '';
  });
  noteButtons.forEach((button, index) => {
    const note = copy.notes.items[index];
    button.querySelector('.note-text').textContent = note.short;
    button.setAttribute('aria-label', note.full);
  });
  langButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.lang === language));
  });
  document.querySelector('.site-nav').setAttribute('aria-label', copy.controls.mainNav);
  document.querySelector('.language-switch').setAttribute('aria-label', copy.controls.language);
  noteField.setAttribute('aria-label', copy.controls.noteField);
  document.querySelector('#note-close').setAttribute('aria-label', copy.controls.closeNote);
  document.querySelector('#note-prev').setAttribute('aria-label', copy.controls.previousNote);
  document.querySelector('#note-next').setAttribute('aria-label', copy.controls.nextNote);
  document.querySelector('#social-close').setAttribute('aria-label', copy.controls.closeMenu);
  updateAudioButton();
  if (noteDialog.open) paintNoteDialog();
  try {
    window.localStorage.setItem('icu-language', language);
  } catch {
    // The page still works when browser storage is unavailable.
  }
}

function openNote(index) {
  activeNote = index;
  paintNoteDialog();
  noteDialog.showModal();
}

function stepNote(direction) {
  const count = content[language].notes.items.length;
  activeNote = (activeNote + direction + count) % count;
  paintNoteDialog();
}

function openSocials() {
  socialDialog.showModal();
  socialTrigger.setAttribute('aria-expanded', 'true');
}

function closeSocials() {
  socialDialog.close();
}

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

class Universe {
  constructor(canvas, elements) {
    this.canvas = canvas;
    this.elements = elements;
    this.hero = canvas.closest('.hero');
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pointer = { x: 0, y: 0 };
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
      return;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    this.camera.position.z = 18;
    this.addStars();
    this.addNoteGlows();
    this.resize();

    this.hero.addEventListener('pointermove', (event) => {
      const bounds = this.hero.getBoundingClientRect();
      this.pointer.x = (event.clientX - bounds.left) / bounds.width * 2 - 1;
      this.pointer.y = (event.clientY - bounds.top) / bounds.height * 2 - 1;
    });
    this.hero.addEventListener('pointerleave', () => {
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
    new IntersectionObserver((entries) => {
      this.visible = entries[0]?.isIntersecting ?? true;
    }).observe(this.hero);

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
  }

  addNoteGlows() {
    const colors = ['#e6c989', '#dba7a0', '#91cbbb', '#d6b977', '#8ebcca', '#d8a7a8', '#b6c7a1'];
    this.glows = this.elements.map((_, index) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.texture,
        color: colors[index],
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }));
      sprite.scale.set(3.5, 3.5, 1);
      this.scene.add(sprite);
      return sprite;
    });
  }

  layout() {
    return this.width < 700 ? layouts.narrow : layouts.wide;
  }

  worldPosition(layout) {
    const depth = this.camera.position.z - layout.z;
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
    const bounds = this.hero.getBoundingClientRect();
    this.width = Math.max(1, bounds.width);
    this.height = Math.max(1, bounds.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    if (this.reducedMotion) this.renderFrame(0);
  }

  placeFallbackNotes() {
    const layout = window.innerWidth < 700 ? layouts.narrow : layouts.wide;
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
    this.camera.position.x += (this.pointer.x * 0.24 - this.camera.position.x) * 0.025;
    this.camera.position.y += (-this.pointer.y * 0.18 - this.camera.position.y) * 0.025;
    this.camera.lookAt(0, 0, 0);
    this.stars.rotation.y = Math.sin(time * 0.00007) * 0.028;
    this.dust.rotation.z = time * 0.000008;

    const layout = this.layout();
    this.elements.forEach((element, index) => {
      const place = layout[index];
      const glow = this.glows[index];
      element.hidden = !place;
      glow.visible = Boolean(place);
      if (!place) return;
      if (element.dataset.settled === 'true') return;

      const position = this.worldPosition(place);
      if (!this.reducedMotion) {
        position.y += Math.sin(time * 0.00053 + index * 1.7) * 0.12;
        position.x += Math.cos(time * 0.00032 + index * 2.1) * 0.045;
      }
      glow.position.copy(position);
      glow.material.opacity = 0.30 + Math.sin(time * 0.0012 + index) * 0.06;
      const projected = position.clone().project(this.camera);
      element.style.left = ((projected.x + 1) * 0.5 * this.width) + 'px';
      element.style.top = ((1 - projected.y) * 0.5 * this.height) + 'px';
      element.style.transform = 'translate(-50%, -50%) rotate(' + place.tilt + 'deg)';
    });
    this.renderer.render(this.scene, this.camera);
  }

  animate(time) {
    if (this.visible && !document.hidden) this.renderFrame(time);
    requestAnimationFrame((nextTime) => this.animate(nextTime));
  }
}

async function init() {
  const response = await fetch('/content.json');
  if (!response.ok) throw new Error('Could not load content');
  content = await response.json();
  document.querySelector('#year').textContent = new Date().getFullYear();
  document.querySelector('#latest-track-link').href = content.settings.latestTrackUrl;
  document.querySelector('#social-latest').href = content.settings.latestTrackUrl;
  document.querySelector('#apple-link').href = content.settings.appleMusicUrl;
  audio.src = content.settings.audioSrc;
  audio.volume = 0.55;

  makeNoteButtons();
  makeSocialLinks();
  iconize();
  new Universe(document.querySelector('#universe'), noteButtons);

  try {
    language = window.localStorage.getItem('icu-language') || 'en';
  } catch {
    language = 'en';
  }
  setLanguage(content[language] ? language : 'en');

  langButtons.forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.lang));
  });
  document.querySelector('#note-close').addEventListener('click', () => noteDialog.close());
  document.querySelector('#note-prev').addEventListener('click', () => stepNote(-1));
  document.querySelector('#note-next').addEventListener('click', () => stepNote(1));
  noteDialog.addEventListener('click', (event) => {
    if (event.target === noteDialog) noteDialog.close();
  });
  noteDialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') stepNote(-1);
    if (event.key === 'ArrowRight') stepNote(1);
  });
  socialTrigger.addEventListener('click', openSocials);
  document.querySelector('#footer-socials').addEventListener('click', openSocials);
  document.querySelector('#social-close').addEventListener('click', closeSocials);
  socialDialog.addEventListener('close', () => socialTrigger.setAttribute('aria-expanded', 'false'));
  socialDialog.addEventListener('click', (event) => {
    if (event.target === socialDialog) closeSocials();
  });
  audioButton.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        audioButton.classList.add('audio-error');
      }
    } else {
      audio.pause();
    }
    updateAudioButton();
  });
  audio.addEventListener('play', updateAudioButton);
  audio.addEventListener('pause', updateAudioButton);
}

init().catch(() => {
  document.querySelector('.hero-body').textContent = 'The page could not load. Please refresh to try again.';
});
