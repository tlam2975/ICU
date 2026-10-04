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
const musicalSymbols = ['♪', '♫', '♩', '♬', '♫', '♪', '♬'];
const fragmentIndices = new Set([0, 4, 6]);
const page = document.body.dataset.page;
// Resolve public files from the site root, including on /ICU/music/.
const siteBase = new URL(document.body.dataset.siteBase, document.baseURI);

let content;
let language = 'en';
let activeNote = 0;
let noteButtons = [];
const storyChapters = [];
const releases = [];

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
    button.type = 'button';
    button.className = 'floating-note note-' + index;
    button.dataset.noteIndex = String(index);
    if (fragmentIndices.has(index)) {
      button.classList.add('fragment-note');
      spark.className = 'fragment-paper';
      const label = document.createElement('span');
      label.className = 'fragment-text';
      spark.append(label);
    } else {
      spark.className = 'note-spark';
      spark.textContent = musicalSymbols[index % musicalSymbols.length];
      spark.setAttribute('aria-hidden', 'true');
    }
    button.append(spark);
    button.addEventListener('click', () => openNote(index));
    noteField.append(button);
  }
  noteButtons = [...noteField.querySelectorAll('.floating-note')];
}

function makeSocialLinks() {
  document.querySelectorAll('[data-social-links]').forEach((container) => {
    content.socials.forEach((social) => container.append(externalLink(social.url, social.label)));
  });
}

function externalLink(url, text) {
  const link = document.createElement('a');
  const label = document.createElement('span');
  const icon = document.createElement('i');
  link.href = url;
  if (!url.startsWith('mailto:')) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  label.textContent = text;
  icon.dataset.lucide = 'arrow-up-right';
  link.append(label, icon);
  return link;
}

function setRouteLinks() {
  document.querySelectorAll('[data-route]').forEach((link) => {
    const url = new URL(link.dataset.route === 'music' ? 'music/' : './', siteBase);
    if (link.dataset.anchor) url.hash = link.dataset.anchor;
    link.href = url.href;
  });
}

function makeStoryChapters() {
  const container = document.querySelector('#story-chapters');
  if (!container) return;
  const intro = content.story.introImage;
  const introImage = document.querySelector('#story-intro-image');
  introImage.src = new URL(intro.src, siteBase).href;
  introImage.width = intro.width;
  introImage.height = intro.height;
  if (!intro.pixelArt) {
    document.querySelector('#story-intro-artwork').className = 'story-photo-wrap';
    introImage.className = 'intro-photo';
  }

  content.story.chapters.forEach((chapter, index) => {
    const section = document.createElement('section');
    const inner = document.createElement('div');
    const text = document.createElement('div');
    const eyebrow = document.createElement('p');
    const title = document.createElement('h2');
    const body = document.createElement('div');
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    const caption = document.createElement('figcaption');
    const layout = chapter.layout || (index % 3 === 2 ? 'wide' : 'split');
    section.className = 'story-chapter' + (layout === 'wide' ? ' story-chapter--wide' : '') + (!chapter.image ? ' story-chapter--text' : '');
    section.id = chapter.id || 'chapter-' + (index + 1);
    title.id = 'chapter-title-' + index;
    inner.className = 'section-inner story-chapter-inner';
    text.className = 'story-chapter-copy';
    eyebrow.className = 'eyebrow';
    body.className = 'story-paragraphs';
    figure.className = 'story-photo';
    image.loading = 'lazy';
    image.decoding = 'async';
    if (chapter.image) {
      image.src = new URL(chapter.image, siteBase).href;
      image.width = chapter.width || 1600;
      image.height = chapter.height || 1200;
      figure.append(image, caption);
      inner.append(figure);
    }
    text.append(eyebrow, title, body);
    inner.append(text);
    section.append(inner);
    container.append(section);
    storyChapters.push({ chapter, section, eyebrow, title, body, image, caption });
  });
}

function makeReleases() {
  const container = document.querySelector('#release-list');
  if (!container) return;
  content.releases.forEach((release, index) => {
    const article = document.createElement('article');
    const artwork = document.createElement('div');
    const fallback = document.createElement('span');
    const image = document.createElement('img');
    const info = document.createElement('div');
    const label = document.createElement('p');
    const title = document.createElement('h2');
    const meta = document.createElement('p');
    const link = externalLink(release.url, '');
    article.className = 'release-entry';
    article.dataset.release = release.id;
    artwork.className = 'release-artwork';
    fallback.className = 'cover-fallback';
    fallback.textContent = 'ICU';
    fallback.setAttribute('aria-hidden', 'true');
    image.src = new URL(release.cover, siteBase).href;
    image.width = release.width || 300;
    image.height = release.height || 300;
    image.loading = index === 0 ? 'eager' : 'lazy';
    image.addEventListener('error', () => { image.hidden = true; });
    info.className = 'release-copy';
    label.className = 'eyebrow';
    label.dataset.copy = index === 0 ? 'music.latestLabel' : 'music.releaseLabel';
    title.textContent = release.title;
    meta.className = 'release-meta';
    link.className = 'text-link';
    link.querySelector('span').dataset.copy = 'music.spotify';
    artwork.append(fallback, image);
    info.append(label, title, meta, link);
    article.append(artwork, info);
    container.append(article);
    releases.push({ release, image, meta });
  });
}

function updatePageContent() {
  storyChapters.forEach(({ chapter, section, eyebrow, title, body, image, caption }) => {
    const copy = chapter[language] || chapter.en;
    eyebrow.textContent = copy.eyebrow || '';
    eyebrow.hidden = !copy.eyebrow;
    title.textContent = copy.title || '';
    title.hidden = !copy.title;
    if (copy.title) section.setAttribute('aria-labelledby', title.id);
    else section.removeAttribute('aria-labelledby');
    const paragraphs = (copy.paragraphs || []).map((paragraph) => {
      const element = document.createElement('p');
      element.textContent = paragraph;
      return element;
    });
    body.replaceChildren(...paragraphs);
    image.alt = copy.alt || '';
    caption.textContent = copy.caption || '';
    caption.hidden = !copy.caption;
  });
  releases.forEach(({ release, image, meta }) => {
    const copy = release[language] || release.en;
    image.alt = copy.coverAlt;
    meta.textContent = [release.artist, copy.type].filter(Boolean).join(' · ');
  });
  document.title = (page === 'music' ? content[language].music.pageTitle + ' · ' : '') + 'ICU · innerchild.universe';
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
  document.querySelectorAll('[data-copy-alt]').forEach((element) => {
    element.alt = nestedValue(copy, element.dataset.copyAlt) || '';
  });
  noteButtons.forEach((button, index) => {
    const note = copy.notes.items[index];
    const fragment = button.querySelector('.fragment-text');
    if (fragment) fragment.textContent = note.fragment;
    button.setAttribute('aria-label', note.full);
    button.title = note.full;
  });
  langButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.lang === language));
  });
  document.querySelectorAll('.site-nav, .drawer-nav').forEach((nav) => nav.setAttribute('aria-label', copy.controls.mainNav));
  document.querySelector('.language-switch').setAttribute('aria-label', copy.controls.language);
  noteField?.setAttribute('aria-label', copy.controls.noteField);
  document.querySelector('#note-close')?.setAttribute('aria-label', copy.controls.closeNote);
  document.querySelector('#note-prev')?.setAttribute('aria-label', copy.controls.previousNote);
  document.querySelector('#note-next')?.setAttribute('aria-label', copy.controls.nextNote);
  document.querySelector('#social-close').setAttribute('aria-label', copy.controls.closeMenu);
  socialTrigger.setAttribute('aria-label', copy.nav.menuTitle);
  socialTrigger.title = copy.nav.menuTitle;
  updateAudioButton();
  updatePageContent();
  if (noteDialog?.open) paintNoteDialog();
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

async function init() {
  const response = await fetch(new URL('content.json', siteBase));
  if (!response.ok) throw new Error('Could not load content');
  content = await response.json();
  document.querySelector('#year').textContent = new Date().getFullYear();
  document.querySelector('#social-latest').href = content.releases[0]?.url || content.settings.latestTrackUrl;
  audio.src = new URL(content.settings.audioSrc, siteBase).href;
  audio.volume = 0.55;

  setRouteLinks();
  makeStoryChapters();
  makeReleases();
  if (noteField) makeNoteButtons();
  makeSocialLinks();

  try {
    language = window.localStorage.getItem('icu-language') || 'en';
  } catch {
    language = 'en';
  }
  setLanguage(content[language] ? language : 'en');
  iconize();

  langButtons.forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.lang));
  });
  document.querySelector('#note-close')?.addEventListener('click', () => noteDialog.close());
  document.querySelector('#note-prev')?.addEventListener('click', () => stepNote(-1));
  document.querySelector('#note-next')?.addEventListener('click', () => stepNote(1));
  noteDialog?.addEventListener('click', (event) => {
    if (event.target === noteDialog) noteDialog.close();
  });
  noteDialog?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') stepNote(-1);
    if (event.key === 'ArrowRight') stepNote(1);
  });
  socialTrigger.addEventListener('click', openSocials);
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

  if (noteField) {
    const { default: Universe } = await import('./universe.js');
    new Universe(document.querySelector('#universe'), noteButtons);
  }
}

init().catch(() => {
  const message = document.querySelector('.hero-body, .music-heading > p:last-child');
  message.textContent = content?.[language]?.controls.loadError || 'The page could not load. Please refresh to try again.';
  message.setAttribute('role', 'alert');
});
