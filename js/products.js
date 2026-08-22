/**
 * Artisan Alliance — Products catalogue
 * Loads products.json (price-free export catalogue) and renders a filterable grid,
 * a product detail modal, and a bulk-quote request flow.
 */
(function () {
  'use strict';

  var state = { all: [], filtered: [], rooms: [], search: '', category: '' };

  // ---- helpers ---------------------------------------------------------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function lockScroll(on) { document.body.style.overflow = on ? 'hidden' : ''; }

  var PLACEHOLDER =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
      '<rect width="400" height="400" fill="#e7e5e4"/>' +
      '<path d="M120 250l45-55 35 42 30-36 50 59H120z" fill="#a8a29e"/>' +
      '<circle cx="160" cy="150" r="22" fill="#a8a29e"/></svg>'
    );
  function imgSrc(src) { return src ? esc(src) : PLACEHOLDER; }

  // ---- data load -------------------------------------------------------
  function load() {
    fetch('products.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        state.all = data.products || [];
        state.rooms = data.rooms || [];
        buildCategoryOptions();
        applyFilters();
        var loading = $('products-loading');
        if (loading) loading.classList.add('hidden');
      })
      .catch(function (err) {
        console.error('Failed to load products.json', err);
        var loading = $('products-loading');
        if (loading) {
          loading.innerHTML =
            '<p class="text-red-600">Could not load products. Please refresh, or run the site via a local server (not file://).</p>';
        }
      });
  }

  function buildCategoryOptions() {
    var sel = $('category-filter');
    if (!sel) return;
    var counts = {};
    state.all.forEach(function (p) {
      var c = p.category || 'Uncategorised';
      counts[c] = (counts[c] || 0) + 1;
    });
    Object.keys(counts).sort().forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c + ' (' + counts[c] + ')';
      sel.appendChild(opt);
    });
  }

  // ---- filtering + render ---------------------------------------------
  function applyFilters() {
    var q = state.search.trim().toLowerCase();
    state.filtered = state.all.filter(function (p) {
      if (state.category && (p.category || 'Uncategorised') !== state.category) return false;
      if (!q) return true;
      var hay = (p.name + ' ' + (p.description || '') + ' ' + (p.category || '')).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    renderGrid();
  }

  function renderGrid() {
    var grid = $('product-grid');
    var empty = $('products-empty');
    var count = $('result-count');
    if (!grid) return;

    if (count) {
      count.textContent = state.filtered.length + ' of ' + state.all.length + ' products';
    }
    if (!state.filtered.length) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    grid.innerHTML = state.filtered.map(function (p) {
      return (
        '<article class="group bg-white rounded-sm border border-stone-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer" ' +
          'data-id="' + esc(p.id) + '" onclick="productsApp.openDetail(\'' + esc(p.id) + '\')">' +
          '<div class="aspect-square bg-stone-100 overflow-hidden">' +
            '<img src="' + imgSrc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy" ' +
              'class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">' +
          '</div>' +
          '<div class="p-3 md:p-4 flex flex-col flex-1">' +
            '<p class="text-xs uppercase tracking-wide text-amber-800/80 mb-1">' + esc(p.category || '') + '</p>' +
            '<h3 class="font-serif text-stone-900 text-sm md:text-base leading-snug mb-3 line-clamp-2">' + esc(p.name) + '</h3>' +
            '<button onclick="event.stopPropagation(); productsApp.openQuote(\'' + esc(p.id) + '\')" ' +
              'class="mt-auto w-full py-2 text-sm bg-amber-900 text-stone-100 font-medium rounded-sm hover:bg-amber-800 transition-colors">' +
              'Request Bulk Quote</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  // ---- product detail modal -------------------------------------------
  function specRow(label, value) {
    if (!value) return '';
    return (
      '<div class="py-3 border-b border-stone-100">' +
        '<dt class="text-xs uppercase tracking-wide text-stone-500 mb-1">' + esc(label) + '</dt>' +
        '<dd class="text-stone-700 text-sm leading-relaxed">' + nl2br(value) + '</dd>' +
      '</div>'
    );
  }
  function listRow(label, arr) {
    if (!arr || !arr.length) return '';
    var items = arr.map(function (x) {
      return '<li class="flex gap-2"><span class="text-amber-800 mt-0.5">•</span><span>' + esc(x) + '</span></li>';
    }).join('');
    return (
      '<div class="py-3 border-b border-stone-100">' +
        '<dt class="text-xs uppercase tracking-wide text-stone-500 mb-1.5">' + esc(label) + '</dt>' +
        '<dd class="text-stone-700 text-sm"><ul class="space-y-1">' + items + '</ul></dd>' +
      '</div>'
    );
  }
  function dimsText(d) {
    if (!d) return '';
    var parts = [];
    ['length', 'width', 'height', 'depth', 'diameter', 'weight'].forEach(function (k) {
      if (d[k]) parts.push(k.charAt(0).toUpperCase() + k.slice(1) + ': ' + d[k]);
    });
    return parts.join('  •  ');
  }

  function openDetail(id) {
    var p = state.all.find(function (x) { return x.id === id; });
    if (!p) return;
    var d = p.details || {};
    var photos = (d.photos && d.photos.length) ? d.photos : (p.image ? [p.image] : []);

    var thumbs = photos.length > 1
      ? '<div class="flex gap-2 mt-3 overflow-x-auto pb-1">' + photos.map(function (ph, i) {
          return '<button onclick="productsApp.setHero(\'' + esc(ph) + '\')" ' +
            'class="flex-shrink-0 w-16 h-16 rounded-sm overflow-hidden border ' +
            (i === 0 ? 'border-amber-900' : 'border-stone-200') + '">' +
            '<img src="' + imgSrc(ph) + '" alt="" class="w-full h-full object-cover"></button>';
        }).join('') + '</div>'
      : '';

    var relatedSizes = (p.relatedSizes && p.relatedSizes.length)
      ? specRow('Also available in', p.relatedSizes.map(function (r) { return r.size; }).join(', '))
      : '';

    var specs =
      specRow('Materials', d.materials) +
      specRow('Construction', d.construction) +
      specRow('Finish', d.finish) +
      specRow('Dimensions', dimsText(d.dimensions)) +
      specRow('Sizing & measurements', d.usesAndMeasurements) +
      listRow('Highlights', d.usp) +
      listRow('Features', d.features) +
      listRow('Benefits', d.benefits) +
      (d.colors ? specRow('Colours', d.colors.join(', ')) : '') +
      (d.sizes ? specRow('Sizes', d.sizes.join(', ')) : '') +
      specRow('Care', d.care) +
      specRow('Cleaning', d.cleaning) +
      specRow('Maintenance', d.maintenance) +
      specRow('Origin', d.origin) +
      specRow('Artisan', d.artisan) +
      specRow('Sustainability', d.sustainability) +
      relatedSizes;

    $('product-modal-content').innerHTML =
      '<button onclick="productsApp.closeDetail()" class="absolute top-3 right-3 z-10 bg-white/90 rounded-full p-2 text-stone-500 hover:text-stone-800 shadow" aria-label="Close">' +
        '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>' +
      '</button>' +
      '<div class="grid md:grid-cols-2 gap-0 md:gap-6">' +
        '<div class="p-4 md:p-6">' +
          '<div class="aspect-square bg-stone-100 rounded-sm overflow-hidden">' +
            '<img id="detail-hero" src="' + imgSrc(photos[0]) + '" alt="' + esc(p.name) + '" class="w-full h-full object-cover">' +
          '</div>' + thumbs +
        '</div>' +
        '<div class="p-4 md:p-6 md:pr-8 md:max-h-[85vh] md:overflow-y-auto">' +
          '<p class="text-xs uppercase tracking-wide text-amber-800/80 mb-1">' + esc(p.category || '') + '</p>' +
          '<h2 class="text-2xl md:text-3xl font-serif text-stone-900 mb-3">' + esc(p.name) + '</h2>' +
          '<p class="text-stone-600 leading-relaxed mb-4">' + nl2br(p.description) + '</p>' +
          '<dl class="mb-6">' + specs + '</dl>' +
          '<button onclick="productsApp.openQuote(\'' + esc(p.id) + '\')" ' +
            'class="w-full py-3 bg-amber-900 text-stone-100 font-medium rounded-sm hover:bg-amber-800 transition-colors">' +
            'Request Bulk Quote</button>' +
        '</div>' +
      '</div>';

    $('product-modal').classList.remove('hidden');
    lockScroll(true);
  }

  function setHero(src) {
    var hero = $('detail-hero');
    if (hero) hero.src = src;
  }
  function closeDetail() {
    $('product-modal').classList.add('hidden');
    if ($('quote-modal').classList.contains('hidden')) lockScroll(false);
  }

  // ---- quote modal -----------------------------------------------------
  function openQuote(id) {
    var label = $('quote-product-label');
    var hidden = $('quote-product');
    if (id) {
      var p = state.all.find(function (x) { return x.id === id; });
      var name = p ? p.name : id;
      if (label) label.textContent = 'For: ' + name + ' (' + id + ')';
      if (hidden) hidden.value = name + ' [' + id + ']';
    } else {
      if (label) label.textContent = 'Tell us which pieces and quantities you need.';
      if (hidden) hidden.value = 'General bulk enquiry';
    }
    // reset to form view
    $('quote-form').classList.remove('hidden');
    $('quote-success').classList.add('hidden');
    $('quote-modal').classList.remove('hidden');
    lockScroll(true);
  }
  function closeQuote() {
    $('quote-modal').classList.add('hidden');
    if ($('product-modal').classList.contains('hidden')) lockScroll(false);
  }

  function submitQuote(e) {
    e.preventDefault();
    var form = e.target;
    var btn = form.querySelector('button[type="submit"]');
    var original = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Sending…';

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(function (r) {
        if (r.ok) {
          form.reset();
          form.classList.add('hidden');
          $('quote-success').classList.remove('hidden');
        } else {
          return r.json().then(function (data) {
            throw new Error((data && data.error) || 'Submission failed');
          });
        }
      })
      .catch(function (err) {
        alert('Sorry, something went wrong sending your request. Please email arvind@artisanalliance.in directly.\n\n(' + err.message + ')');
      })
      .finally(function () {
        btn.disabled = false;
        btn.innerHTML = original;
      });
  }

  // ---- events ----------------------------------------------------------
  function init() {
    var search = $('product-search');
    if (search) {
      search.addEventListener('input', function () { state.search = search.value; applyFilters(); });
    }
    var cat = $('category-filter');
    if (cat) {
      cat.addEventListener('change', function () { state.category = cat.value; applyFilters(); });
    }
    var qform = $('quote-form');
    if (qform) qform.addEventListener('submit', submitQuote);

    // backdrop click closes modals
    var pm = $('product-modal');
    if (pm) pm.addEventListener('click', function (e) { if (e.target === pm || e.target === pm.firstElementChild) closeDetail(); });
    var qm = $('quote-modal');
    if (qm) qm.addEventListener('click', function (e) { if (e.target === qm || e.target === qm.firstElementChild) closeQuote(); });

    // Escape closes topmost modal
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('quote-modal').classList.contains('hidden')) closeQuote();
      else if (!$('product-modal').classList.contains('hidden')) closeDetail();
    });

    load();
  }

  // Public API used by inline handlers
  window.productsApp = {
    openDetail: openDetail,
    closeDetail: closeDetail,
    setHero: setHero,
    openQuote: openQuote,
    closeQuote: closeQuote
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
