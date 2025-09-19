self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open('scheduler-v1').then(cache=>cache.addAll([
      'index.html','styles.css','app.js','manifest.json','icon.png'
    ]))
  );
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
