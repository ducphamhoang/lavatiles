(function () {
  'use strict';

  var CATALOGUES = [
    {
      id: 'vietytile-ga-at',
      title: 'GA + AT SQ',
      brand: 'VietY Tile',
      category: 'gach',
      pdfUrl: 'assets/pdf/GA+AT SQ.pdf',
      coverImage: 'assets/images/catalogue/ga-at-catalogue.jpg',
      basePath: 'assets/pdf/GA+AT SQ',
      totalPages: 174,
      pageFormat: 'page-{03}.jpg'
    },
    {
      id: 'toto',
      title: 'TOTO Mini 1H26',
      brand: 'TOTO',
      category: 'thiet-bi-ve-sinh',
      pdfUrl: 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén.pdf',
      coverImage: 'assets/images/catalogue/toto-catalogue.png',
      basePath: 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén',
      totalPages: 186,
      pageFormat: 'page-{03}.jpg'
    },
    {
      id: 'caesar',
      title: 'Caesar',
      brand: 'Caesar',
      category: 'thiet-bi-ve-sinh',
      pdfUrl: 'assets/pdf/CATALO 06-2026.pdf',
      coverImage: 'assets/images/catalogue/caesar-catalogue.png',
      basePath: 'assets/pdf/CATALO 06-2026',
      totalPages: 64,
      pageFormat: 'page-{02}.jpg'
    },
    {
      id: 'inax',
      title: 'INAX',
      brand: 'INAX',
      category: 'thiet-bi-ve-sinh',
      pdfUrl: 'assets/pdf/INAX-CATALOGUE-01.04.2026.pdf',
      coverImage: 'assets/images/catalogue/inax-catalogue.png',
      basePath: 'assets/pdf/INAX-CATALOGUE-01.04.2026',
      totalPages: 107,
      pageFormat: 'page-{03}.jpg'
    },
    {
      id: 'viglacera',
      title: 'Viglacera T1-2026',
      brand: 'Viglacera',
      category: 'gach',
      pdfUrl: 'assets/pdf/Catalogue T1-2026.pdf',
      coverImage: 'assets/images/catalogue/viglacera-catalogue.png',
      basePath: 'assets/pdf/Catalogue T1-2026',
      totalPages: 65,
      pageFormat: 'page-{02}.jpg'
    },
    {
      id: 'vasta-stone-2024',
      title: 'VASTA STONE 2024 full-body vein',
      brand: 'VASTA',
      category: 'gach',
      pdfUrl: 'assets/pdf/VASTA STONE 2024 full-body vein.pdf',
      coverImage: 'assets/images/catalogue/vasta-stone-2024.jpg',
      basePath: 'assets/pdf/VASTA STONE 2024 full-body vein',
      totalPages: 16,
      pageFormat: 'page-{03}.jpg'
    },
    {
      id: 'vasta-collection',
      title: 'Vasta Collection',
      brand: 'VASTA',
      category: 'gach',
      pdfUrl: 'assets/pdf/Vasta Collection.pdf',
      coverImage: 'assets/images/catalogue/vasta-collection.jpg',
      basePath: 'assets/pdf/Vasta Collection',
      totalPages: 105,
      pageFormat: 'page-{03}.jpg'
    },
    {
      id: 'vasta-essential',
      title: 'Vasta Essential',
      brand: 'VASTA',
      category: 'gach',
      pdfUrl: 'assets/pdf/Vasta Essential.pdf',
      coverImage: 'assets/images/catalogue/vasta-essential.jpg',
      basePath: 'assets/pdf/Vasta Essential',
      totalPages: 6,
      pageFormat: 'page-{03}.jpg'
    },
    {
      id: 'vasta-essentials-production',
      title: 'VASTA ESSENTIALS PRODUCTION - T8.24',
      brand: 'VASTA',
      category: 'gach',
      pdfUrl: 'assets/pdf/VASTA ESSENTIALS_PRODUCTION - THANG 8.24.pdf',
      coverImage: 'assets/images/catalogue/vasta-essentials-production.jpg',
      basePath: 'assets/pdf/VASTA ESSENTIALS_PRODUCTION - THANG 8.24',
      totalPages: 34,
      pageFormat: 'page-{03}.jpg'
    },
    {
      id: 'eurotile-8',
      title: 'NEW EUROTILE 8 - 120x240',
      brand: 'Eurotile',
      category: 'gach',
      pdfUrl: 'assets/pdf/NEW_EUROTILE 8_120x240_200725.pdf',
      coverImage: 'assets/images/catalogue/eurotile-8.jpg',
      basePath: 'assets/pdf/NEW_EUROTILE 8_120x240_200725',
      totalPages: 44,
      pageFormat: 'page-{03}.jpg'
    },
    {
      id: 'viglacera-full',
      title: 'Catalogue Viglacera Full',
      brand: 'Viglacera',
      category: 'gach',
      pdfUrl: 'assets/pdf/_Catalogue Viglacera Full (100dpi).pdf',
      coverImage: 'assets/images/catalogue/viglacera-full.jpg',
      basePath: 'assets/pdf/Catalogue Viglacera Full',
      totalPages: 138,
      pageFormat: 'page-{03}.jpg'
    }
  ];

  // Helper: build page image URL
  window.getCataloguePageUrl = function (catalogue, pageIndex) {
    var num = pageIndex + 1;
    var fmt = catalogue.pageFormat;
    var padded = fmt.replace(/\{(\d+)\}/, function (_, digits) {
      var d = parseInt(digits, 10);
      return String(num).padStart(d, '0');
    });
    return catalogue.basePath + '/' + padded;
  };

  window.LAVATILE_CATALOGUES = CATALOGUES;
})();
