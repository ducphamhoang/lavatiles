(function () {
  'use strict';

  var CATALOGUES = [
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
