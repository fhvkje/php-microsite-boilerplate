'use strict';

(function () {
  var hostname = self.location.hostname;


  // Update 'version' if you need to refresh the caches completely (necessary to update the offline page). 
  // Mind to also change the version number in the main config!
  var version = 'v2::';

  // Domain whitelist. Files not served from those domains won't be cached. The domain, which serves the serviceworker is automatically included. So, only add things like your image CDN or similar.
  // Example: domainWhitelist = ["cdn.domain.com", "www2.domain.com", "analytics.otherdomain.com"]
  var domainWhitelist = [
  ];
  domainWhitelist.push(hostname);

  // List of available language slugs. Start with the default one, but leave it empty! So, if you have 'en' and 'de', you would write ['', 'de'].
  var lang = ['', 'de', 'es'];


  // A cache for pages.
  var pagesCacheName = 'pages';
  // A cache for asset files.
  var assetsCacheName = 'assets';


  // Store the offline page.
  var createOfflineCache = function () {
    var offlinePages = [];
    lang.forEach(function(element) {
      if (element != '') {
        element = '/' + element;
      }
      offlinePages.push('https://' + hostname + element + '/offline/')
    });
    return caches.open(version + pagesCacheName)
      .then(function (cache) {
        return cache.addAll(offlinePages);
      });
  };

  // Remove caches whose name is no longer valid.
  var clearOldCaches = function () {
    return caches.keys()
      .then(function (keys) {
        return Promise.all(keys
          .filter(function (key) {
            return key.indexOf(version) !== 0;
          })
          .map(function (key) {
            return caches.delete(key);
          })
        );
      })
  };

  self.addEventListener('install', function (event) {
    event.waitUntil(createOfflineCache()
      .then(function () {
        return self.skipWaiting();
      })
    );
  });

  self.addEventListener('activate', function (event) {
    event.waitUntil(clearOldCaches()
      .then(function () {
        return self.clients.claim();
      })
    );
  });
  
  self.addEventListener('fetch', function (event) {
    var request = event.request;
    // Skip any purge and rebuild requests
    if (request.url.includes('purge/directus_cache') === true || request.url.includes('rebuild/directus_cache') === true) return;
    // Get the request's language slug (used to match the right offline page)
    var langSlug = '';
    var requestpathParts = request.url.split('/');
    if (requestpathParts.length > 3 && typeof requestpathParts[3] !== 'undefined' && requestpathParts[3] !== null && requestpathParts[3] !== '') {
      if (lang.includes(requestpathParts[3])) {
        langSlug = '/' + requestpathParts[3];
      }
    }
    var offlinePagePath = langSlug + '/offline/';

    // For non-GET requests, try the network first, fall back to the offline page.
    if (request.method !== 'GET') {
      event.respondWith(
        fetch(request)
        .catch(function () {
          return caches.match(offlinePagePath);
        })
      );
      return;
    }

    // HTML requests.
    if (request.headers.get('Accept').indexOf('text/html') !== -1) {

      // Fix for Chrome bug: https://code.google.com/p/chromium/issues/detail?id=573937 .
      if (request.mode !== 'navigate') {
        request = new Request(request.url, {
          method: 'GET',
          headers: request.headers,
          mode: request.mode,
          credentials: request.credentials,
          redirect: request.redirect
        });
      }

      // Try the network first, fall back to the cache (and update it), finally the offline page.
      event.respondWith(
        caches.open(version + pagesCacheName).then(function (cache) {
          return cache.match(request).then(function (response) {
            var fetchPromise = fetch(request).then(function (networkResponse) {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
            return fetchPromise || response;
          });
        })
        .catch(function () {
          return caches.match(offlinePagePath);
        }),
      );

    // Non-HTML requests. 
    } else {

      // Skip if the file is not on a whitelisted domain.
      var requesturl = request.url;
      var domainstring = requesturl.replace('http://','').replace('https://','').replace('www.','').split(/[/?#]/)[0];
      if (domainWhitelist.includes(domainstring) === false) {
        return;
      }      
      
      // Look in the cache first (and update it), fall back to the network.
      event.respondWith(
        caches.open(version + assetsCacheName).then(function (cache) {
          return cache.match(request).then(function (response) {
            var fetchPromise = fetch(request).then(function (networkResponse) {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
            return response || fetchPromise;
          });
        }),
      );

    }

  });

})();
