self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open('scheduler-cache').then(function(cache){
      return cache.addAll([
        'index.html',
        'styles.css',
        'app.js',
        'manifest.json',
        'icon.png'
      ]);
    })
  );
});

self.addEventListener('fetch', function(event){
  event.respondWith(
    caches.match(event.request).then(function(response){
      return response || fetch(event.request);
    })
  );
});
