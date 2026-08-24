/**
 * Artisan Alliance — Products catalogue
 * Loads products.json (price-free export catalogue) and renders a filterable grid,
 * a product detail modal, and a bulk-quote request flow.
 */
(function () {
  'use strict';

  // `listings` holds one entry per catalogue tile: a single product, or the
  // smallest member of a size/finish family that stands in for the whole family.
  // `groupOf` maps every product id to its family (undefined when standalone).
  var state = {
    all: [], listings: [], filtered: [], rooms: [],
    groupOf: {}, search: '', category: ''
  };

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

  // ---- size / finish families -----------------------------------------
  // Lower rank = shown first, and the lowest-ranked member represents the
  // family in the grid. Anything unrecognised (a finish name such as
  // "Dark Walnut") lands on OTHER_RANK and keeps its file order.
  var OTHER_RANK = 500;
  function variantRank(label) {
    var s = String(label || '').toLowerCase();
    if (/\b(?:set|pack)\s+of\b/.test(s)) {
      var n = parseInt(s.replace(/\D+/g, ''), 10);
      return 900 + (isNaN(n) ? 0 : n);
    }
    if (s.indexOf('small') !== -1) return 100;
    if (s.indexOf('medium') !== -1) return 200 + (s.indexOf('alt') !== -1 ? 1 : 0);
    if (s.indexOf('large') !== -1) return 300;
    return OTHER_RANK;
  }

  // A product lists its siblings' labels but never its own, so a member's label
  // is whatever its siblings call it. A few entries are only linked one way;
  // fall back to reading a "Set of N" out of the name.
  function fallbackLabel(p) {
    var m = /\b(?:set|pack)\s+of\s+(\d+)/i.exec(p.name || '');
    return m ? 'Set of ' + m[1] : 'Standard';
  }

  function buildGroups() {
    var byId = {};
    state.all.forEach(function (p) { byId[p.id] = p; });

    // Union-find: relatedSizes edges stitch each family together.
    var parent = {};
    function find(x) {
      if (parent[x] === undefined) parent[x] = x;
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    }
    function union(a, b) {
      var ra = find(a), rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    }

    var ownLabel = {};
    state.all.forEach(function (p) {
      find(p.id);
      (p.relatedSizes || []).forEach(function (r) {
        if (!r || !byId[r.productId]) return;
        union(p.id, r.productId);
        if (!ownLabel[r.productId]) ownLabel[r.productId] = r.size;
      });
    });

    var buckets = {};
    state.all.forEach(function (p, i) {
      var root = find(p.id);
      (buckets[root] || (buckets[root] = [])).push({ product: p, index: i });
    });

    state.groupOf = {};
    state.listings = [];

    Object.keys(buckets).forEach(function (root) {
      var rows = buckets[root];
      var firstIndex = rows[0].index;

      rows.forEach(function (row) {
        row.label = ownLabel[row.product.id] || fallbackLabel(row.product);
        row.rank = variantRank(row.label);
        if (row.index < firstIndex) firstIndex = row.index;
      });

      // Smallest first; ties (finishes) keep the order they appear in the file.
      rows.sort(function (a, b) { return (a.rank - b.rank) || (a.index - b.index); });

      var members = rows.map(function (row) {
        return { id: row.product.id, label: row.label, product: row.product };
      });
      var group = null;

      if (members.length > 1) {
        group = {
          members: members,
          // "Set of 3" is still a size choice; a bare finish name is not.
          noun: rows.every(function (r) { return r.rank !== OTHER_RANK; }) ? 'sizes' : 'finishes'
        };
        members.forEach(function (m) { state.groupOf[m.id] = group; });
      }

      // Searching should surface a family via any of its members' text.
      var haystack = members.map(function (m) {
        return m.product.name + ' ' + (m.product.description || '') + ' ' +
          (m.product.category || '') + ' ' + m.label;
      }).join(' ').toLowerCase();

      state.listings.push({
        product: members[0].product,
        group: group,
        haystack: haystack,
        order: firstIndex
      });
    });

    // Keep the catalogue in products.json order.
    state.listings.sort(function (a, b) { return a.order - b.order; });
  }

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
        buildGroups();
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
    state.listings.forEach(function (l) {
      var c = l.product.category || 'Uncategorised';
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
    state.filtered = state.listings.filter(function (l) {
      if (state.category && (l.product.category || 'Uncategorised') !== state.category) return false;
      if (!q) return true;
      return l.haystack.indexOf(q) !== -1;
    });
    renderGrid();
  }

  function renderGrid() {
    var grid = $('product-grid');
    var empty = $('products-empty');
    var count = $('result-count');
    if (!grid) return;

    if (count) {
      count.textContent = state.filtered.length + ' of ' + state.listings.length + ' products';
    }
    if (!state.filtered.length) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    grid.innerHTML = state.filtered.map(function (l) {
      var p = l.product;
      var badge = l.group
        ? '<span class="flex-shrink-0 text-[10px] uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2 py-0.5">' +
            l.group.members.length + ' ' + l.group.noun + '</span>'
        : '';
      return (
        '<article class="group bg-white rounded-sm border border-stone-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer" ' +
          'data-id="' + esc(p.id) + '" onclick="productsApp.openDetail(\'' + esc(p.id) + '\')">' +
          '<div class="aspect-square bg-stone-100 overflow-hidden">' +
            '<img src="' + imgSrc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy" ' +
              'class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">' +
          '</div>' +
          '<div class="p-3 md:p-4 flex flex-col flex-1">' +
            '<div class="flex items-start justify-between gap-2 mb-1">' +
              '<p class="text-xs uppercase tracking-wide text-amber-800/80 truncate">' + esc(p.category || '') + '</p>' +
              badge +
            '</div>' +
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

  // Buttons that swap the modal between members of a size/finish family.
  function variantToggle(p) {
    var g = state.groupOf[p.id];
    if (!g) return '';
    var heading = g.noun === 'sizes' ? 'Select size' : 'Select finish';
    var btns = g.members.map(function (m) {
      var on = m.id === p.id;
      return '<button type="button" onclick="productsApp.showVariant(\'' + esc(m.id) + '\')" ' +
        'aria-pressed="' + (on ? 'true' : 'false') + '" ' +
        'class="px-3 py-1.5 text-sm rounded-sm border transition-colors ' +
        (on
          ? 'bg-amber-900 text-stone-100 border-amber-900'
          : 'bg-white text-stone-700 border-stone-300 hover:border-amber-700 hover:text-amber-900') +
        '">' + esc(m.label) + '</button>';
    }).join('');
    return (
      '<div class="mb-5 p-3 bg-stone-50 border border-stone-200 rounded-sm">' +
        '<p class="text-xs uppercase tracking-wide text-stone-500 mb-2">' + esc(heading) + '</p>' +
        '<div class="flex flex-wrap gap-2">' + btns + '</div>' +
        '<p class="text-xs text-stone-500 mt-2">Photos, dimensions and specifications update with your selection.</p>' +
      '</div>'
    );
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
      specRow('Item code', p.id);

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
        '<div id="detail-pane" class="p-4 md:p-6 md:pr-8 md:max-h-[85vh] md:overflow-y-auto">' +
          '<p class="text-xs uppercase tracking-wide text-amber-800/80 mb-1">' + esc(p.category || '') + '</p>' +
          '<h2 class="text-2xl md:text-3xl font-serif text-stone-900 mb-3">' + esc(p.name) + '</h2>' +
          '<p class="text-stone-600 leading-relaxed mb-4">' + nl2br(p.description) + '</p>' +
          variantToggle(p) +
          '<dl class="mb-6">' + specs + '</dl>' +
          '<button onclick="productsApp.openQuote(\'' + esc(p.id) + '\')" ' +
            'class="w-full py-3 bg-amber-900 text-stone-100 font-medium rounded-sm hover:bg-amber-800 transition-colors">' +
            'Request Bulk Quote</button>' +
        '</div>' +
      '</div>';

    $('product-modal').classList.remove('hidden');
    lockScroll(true);
  }

  // Swap to another member of the family, keeping the reader's scroll position.
  function showVariant(id) {
    var pane = $('detail-pane');
    var offset = pane ? pane.scrollTop : 0;
    openDetail(id);
    var next = $('detail-pane');
    if (next) next.scrollTop = offset;
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
    showVariant: showVariant,
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
