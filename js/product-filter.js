(function () {
  'use strict';

  function text(value) {
    return String(value == null ? '' : value);
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fieldValue(product, field) {
    var value = product[field];
    return Array.isArray(value) ? value.join(' ') : text(value);
  }

  function initProductFilter(config) {
    var products = config.products || [];
    var filterKeys = config.filterKeys || [];
    var searchFields = config.searchFields || [];
    var initialLimit = config.initialLimit || 8;
    var loadStep = config.loadStep || 4;
    var initialFilters = config.initialFilters || {};
    var state = { search: text(initialFilters.search || '').toLowerCase(), limit: initialLimit };

    filterKeys.forEach(function (key) {
      state[key] = (initialFilters[key] || []).map(text);
    });

    var grid = document.getElementById(config.gridId || 'pd-grid');
    var empty = document.getElementById(config.emptyId || 'pdEmpty');
    var count = document.getElementById(config.countId || 'pdResultCount');
    var active = document.getElementById(config.activeId || 'pdActiveFilters');
    var loadMore = document.getElementById(config.loadMoreId || 'pdLoadMore');
    var search = document.getElementById(config.searchId || 'pdSearch');
    var reset = document.getElementById(config.resetId || 'pdReset');

    if (!grid || !empty || !count || !active || !loadMore || !search || !reset || !config.cardMarkup) {
      return null;
    }

    var postRender = config.postRender || null;

    function hasMatch(product, key) {
      if (!state[key].length) return true;
      if (Array.isArray(product[key])) {
        return state[key].some(function (value) { return product[key].indexOf(value) !== -1; });
      }
      return state[key].indexOf(product[key]) !== -1;
    }

    function passesSearch(product) {
      if (!state.search) return true;
      return searchFields.map(function (field) {
        return fieldValue(product, field);
      }).join(' ').toLowerCase().indexOf(state.search) !== -1;
    }

    function filteredProducts() {
      return products.filter(function (product) {
        return passesSearch(product) && filterKeys.every(function (key) {
          return hasMatch(product, key);
        });
      });
    }

    function renderActiveFilters() {
      var tokens = [];
      filterKeys.forEach(function (key) {
        state[key].forEach(function (value) { tokens.push(value); });
      });
      if (state.search) tokens.push('Tìm: ' + state.search);
      active.innerHTML = tokens.map(function (token) {
        return '<span class="pd-active-token">' + escapeHtml(token) + '</span>';
      }).join('');
    }

    function render() {
      var matches = filteredProducts();
      var visible = matches.slice(0, state.limit);
      count.textContent = String(matches.length);
      grid.innerHTML = visible.map(config.cardMarkup).join('');
      empty.hidden = matches.length !== 0;
      loadMore.hidden = visible.length >= matches.length;
      renderActiveFilters();
      if (postRender) postRender(state);
    }

    document.querySelectorAll('input[data-filter-group]').forEach(function (input) {
      input.addEventListener('change', function () {
        var key = input.getAttribute('data-filter-group');
        if (!state[key]) return;
        state[key] = Array.prototype.slice.call(
          document.querySelectorAll('input[data-filter-group="' + key + '"]:checked')
        ).map(function (el) { return el.value; });
        state.limit = initialLimit;
        render();
      });
    });

    document.querySelectorAll('.pd-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var key = chip.getAttribute('data-filter-group');
        var value = chip.getAttribute('data-filter-value');
        if (!state[key]) return;
        var idx = state[key].indexOf(value);
        if (idx === -1) {
          state[key].push(value);
          chip.classList.add('is-active');
        } else {
          state[key].splice(idx, 1);
          chip.classList.remove('is-active');
        }
        state.limit = initialLimit;
        render();
      });
    });

    search.addEventListener('input', function () {
      state.search = search.value.trim().toLowerCase();
      state.limit = initialLimit;
      render();
    });

    loadMore.addEventListener('click', function () {
      state.limit += loadStep;
      render();
    });

    reset.addEventListener('click', function () {
      state.search = '';
      filterKeys.forEach(function (key) {
        state[key] = [];
      });
      state.limit = initialLimit;
      search.value = '';
      document.querySelectorAll('input[data-filter-group]').forEach(function (input) {
        input.checked = false;
      });
      document.querySelectorAll('.pd-chip').forEach(function (chip) {
        chip.classList.remove('is-active');
      });
      render();
    });

    function syncControls() {
      filterKeys.forEach(function (key) {
        var values = state[key] || [];
        if (!values.length) return;
        document.querySelectorAll('.pd-chip[data-filter-group="' + key + '"]').forEach(function (chip) {
          if (values.indexOf(chip.getAttribute('data-filter-value')) !== -1) {
            chip.classList.add('is-active');
          }
        });
        document.querySelectorAll('input[data-filter-group="' + key + '"]').forEach(function (input) {
          if (values.indexOf(input.value) !== -1) {
            input.checked = true;
          }
        });
      });
    }
    syncControls();
    render();
    return { render: render, state: state };
  }

  window.VCProductFilter = {
    init: initProductFilter
  };
})();
