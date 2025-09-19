const CACHE_NAME = 'wf-planner-v2'; // Increment version to force update
const FILES_TO_CACHE = [
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icon.png'
];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  evt.respondWith(caches.match(evt.request).then(resp => resp || fetch(evt.request)));
});