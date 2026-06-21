(function () {
  'use strict';

  function cleanRoot(root) {
    if (!root || root === '.') return '';
    return root.replace(/\/$/, '');
  }

  function link(root, path) {
    root = cleanRoot(root);
    return root ? root + '/' + path : path;
  }

  function activeClass(active, section) {
    return active === section ? ' active' : '';
  }

  function renderHeader(target) {
    var root = target.getAttribute('data-site-root') || '.';
    var active = target.getAttribute('data-active-nav') || '';
    target.outerHTML = [
      '<nav class="navbar-vc" id="navbar">',
      '  <div class="container-fluid">',
      '    <a class="navbar-brand" href="' + link(root, 'index.html') + '" aria-label="Lavatile">',
      '      <svg viewBox="0 0 200 46" fill="none" xmlns="http://www.w3.org/2000/svg">',
      '        <rect width="200" height="46" fill="none"></rect>',
      '        <text x="0" y="32" font-family="Averta Std, Avenir Next, sans-serif" font-weight="800" font-size="24" fill="#981B1E" letter-spacing="2" textLength="196" lengthAdjust="spacingAndGlyphs">LAVATILE</text>',
      '      </svg>',
      '    </a>',
      '    <ul class="navbar-menu">',
      '      <li class="nav-item has-megamenu">',
      '        <a class="nav-link' + activeClass(active, 'products') + '" href="' + link(root, 'san-pham/gach-op-lat/index.html') + '">Sản phẩm</a>',
      '        <div class="megamenu">',
      '          <div class="megamenu-inner">',
      '            <div class="megamenu-col">',
      '              <a href="' + link(root, 'san-pham/gach-op-lat/index.html') + '"><h6>Gạch ốp lát</h6></a>',
      '              <ul>',
      '                <li><a href="' + link(root, 'gach-van-da-marble.html') + '">Gạch vân đá marble</a></li>',
      '                <li><a href="#">Gạch vân đá tự nhiên</a></li>',
      '                <li><a href="#">Gạch vân gỗ</a></li>',
      '                <li><a href="#">Gạch thiết kế xi măng</a></li>',
      '                <li><a href="#">Gạch trang trí</a></li>',
      '              </ul>',
      '            </div>',
      '            <div class="megamenu-col">',
      '              <a href="' + link(root, 'san-pham/thiet-bi-ve-sinh/index.html') + '"><h6>Thiết bị vệ sinh</h6></a>',
      '              <ul>',
      '                <li><a href="' + link(root, 'san-pham/thiet-bi-ve-sinh/voi-nuoc.html') + '">Vòi nước</a></li>',
      '                <li><a href="#">Lavabo</a></li>',
      '                <li><a href="#">Bồn cầu</a></li>',
      '                <li><a href="#">Bồn tắm</a></li>',
      '                <li><a href="#">Sen tắm</a></li>',
      '                <li><a href="#">Khung âm và nút nhấn</a></li>',
      '              </ul>',
      '            </div>',
      '            <div class="megamenu-col">',
      '              <ul style="margin-top:38px">',
      '                <li><a href="#">Gessi</a></li>',
      '                <li><a href="#">Villeroy &amp; Boch</a></li>',
      '              </ul>',
      '            </div>',
      '            <div class="megamenu-col">',
      '              <a href="#"><h6>Sàn gỗ</h6></a>',
      '              <ul><li><a href="#">Sàn gỗ Laminate</a></li></ul>',
      '            </div>',
      '          </div>',
      '        </div>',
      '      </li>',
      '      <li class="nav-item"><a class="nav-link' + activeClass(active, 'about') + '" href="' + link(root, 've-chung-toi.html') + '">Về chúng tôi</a></li>',
      '      <li class="nav-item"><a class="nav-link' + activeClass(active, 'projects') + '" href="' + link(root, 'du-an.html') + '">Dự án</a></li>',
      '      <li class="nav-item"><a class="nav-link' + activeClass(active, 'catalogue') + '" href="' + link(root, 'catalogue.html') + '">Catalogue</a></li>',
      '      <li class="nav-item dropdown">',
      '        <a class="nav-link' + activeClass(active, 'news') + '" href="' + link(root, 'tin-tuc/cam-hung-thiet-ke.html') + '">Tin Tức</a>',
      '        <div class="dropdown-menu">',
      '          <h6>Tin Tức</h6>',
      '          <ul>',
      '            <li><a href="' + link(root, 'tin-tuc/cam-hung-thiet-ke.html') + '">Cảm hứng thiết kế</a></li>',
      '            <li><a href="' + link(root, 'tin-tuc.html?category_id=tin-san-pham') + '">Tin sản phẩm</a></li>',
      '            <li><a href="' + link(root, 'tin-tuc.html?category_id=cong-ty') + '">Tin công ty</a></li>',
      '            <li><a href="' + link(root, 'tin-tuc.html?category_id=tin-khuyen-mai') + '">Tin khuyến mãi</a></li>',
      '          </ul>',
      '        </div>',
      '      </li>',
      '      <li class="nav-item"><a class="nav-link" href="#">Showroom 3D</a></li>',
      '      <li class="nav-item"><a class="nav-link" href="#">Liên hệ</a></li>',
      '      <li class="nav-item"><a class="nav-link" href="#">Tuyển dụng</a></li>',
      '    </ul>',
      '    <div class="navbar-actions">',
      '      <a class="nav-link" href="#" aria-label="Tìm kiếm"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></a>',
      '      <a class="nav-link" href="#" aria-label="Yêu thích"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></a>',
      '      <a class="nav-link lang-switch" href="#" aria-label="Ngôn ngữ"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg></a>',
      '      <button class="nav-toggle" id="navToggle" aria-label="Menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></button>',
      '    </div>',
      '  </div>',
      '</nav>',
      '<div class="sidenav-overlay" id="sidenavOverlay"></div>',
      '<div class="sidenav" id="sidenav">',
      '  <ul class="navbar-menu">',
      '    <li class="nav-item dropdown"><a class="nav-link" href="' + link(root, 'san-pham/gach-op-lat/index.html') + '">Gạch ốp lát</a><div class="dropdown-menu"><ul><li><a href="' + link(root, 'gach-van-da-marble.html') + '">Gạch vân đá marble</a></li><li><a href="#">Gạch vân đá tự nhiên</a></li><li><a href="#">Gạch vân gỗ</a></li><li><a href="#">Gạch thiết kế xi măng</a></li><li><a href="#">Gạch trang trí</a></li></ul></div></li>',
      '    <li class="nav-item dropdown"><a class="nav-link" href="' + link(root, 'san-pham/thiet-bi-ve-sinh/index.html') + '">Thiết bị vệ sinh</a><div class="dropdown-menu"><ul><li><a href="' + link(root, 'san-pham/thiet-bi-ve-sinh/voi-nuoc.html') + '">Vòi nước</a></li><li><a href="#">Lavabo</a></li><li><a href="#">Bồn cầu</a></li><li><a href="#">Bồn tắm</a></li><li><a href="#">Sen tắm</a></li><li><a href="#">Khung âm và nút nhấn</a></li><li><a href="#">Gessi</a></li><li><a href="#">Villeroy &amp; Boch</a></li></ul></div></li>',
      '    <li class="nav-item dropdown"><a class="nav-link" href="#">Sàn gỗ</a><div class="dropdown-menu"><ul><li><a href="#">Sàn gỗ Laminate</a></li></ul></div></li>',
      '    <li class="nav-item"><a class="nav-link' + activeClass(active, 'about') + '" href="' + link(root, 've-chung-toi.html') + '">Về chúng tôi</a></li>',
      '    <li class="nav-item"><a class="nav-link' + activeClass(active, 'projects') + '" href="' + link(root, 'du-an.html') + '">Dự án</a></li>',
      '    <li class="nav-item"><a class="nav-link' + activeClass(active, 'catalogue') + '" href="' + link(root, 'catalogue.html') + '">Catalogue</a></li>',
      '    <li class="nav-item dropdown"><a class="nav-link' + activeClass(active, 'news') + '" href="' + link(root, 'tin-tuc/cam-hung-thiet-ke.html') + '">Tin Tức</a><div class="dropdown-menu"><ul><li><a href="' + link(root, 'tin-tuc/cam-hung-thiet-ke.html') + '">Cảm hứng thiết kế</a></li><li><a href="' + link(root, 'tin-tuc.html?category_id=tin-san-pham') + '">Tin sản phẩm</a></li><li><a href="' + link(root, 'tin-tuc.html?category_id=cong-ty') + '">Tin công ty</a></li><li><a href="' + link(root, 'tin-tuc.html?category_id=tin-khuyen-mai') + '">Tin khuyến mãi</a></li></ul></div></li>',
      '    <li class="nav-item"><a class="nav-link" href="#">Showroom 3D</a></li>',
      '    <li class="nav-item"><a class="nav-link" href="#">Liên hệ</a></li>',
      '    <li class="nav-item"><a class="nav-link" href="#">Tuyển dụng</a></li>',
      '  </ul>',
      '</div>'
    ].join('\n');
  }

  function renderFooter(target) {
    var root = target.getAttribute('data-site-root') || '.';
    target.outerHTML = [
      '<footer class="footer" data-reveal="from-bottom">',
      '  <div class="container">',
      '    <div class="footer-top">',
      '      <div class="footer-col">',
      '        <div class="brand-svg"><svg viewBox="0 0 200 46" fill="none"><text x="0" y="32" font-family="Averta Std, Avenir Next, sans-serif" font-weight="800" font-size="22" fill="#fff" letter-spacing="2">LAVATILE</text></svg></div>',
      '        <div class="contact-info"><p><a href="tel:0797555299">0797 555 299</a></p><p><a href="mailto:hello@lavatile.com">hello@lavatile.com</a></p></div>',
      '        <div class="footer-social"><a href="#" aria-label="Facebook">f</a><a href="#" aria-label="YouTube">▶</a><a href="#" aria-label="TikTok">♪</a><a href="#" aria-label="Instagram">◻</a></div>',
      '        <p class="footer-showroom-link"><a href="#">Tìm địa chỉ Showroom</a></p>',
      '      </div>',
      '      <div class="footer-col"><h5>Lavatile</h5><ul><li><a href="' + link(root, 've-chung-toi.html') + '">Về Chúng Tôi</a></li><li><a href="#">Thông tin &amp; Báo cáo</a></li><li><a href="' + link(root, 'du-an.html') + '">Dự án</a></li><li><a href="#">Liên hệ Showroom</a></li><li><a href="#">Dịch vụ khách hàng</a></li></ul></div>',
      '      <div class="footer-col"><h5>Gạch Ốp Lát</h5><ul><li><a href="' + link(root, 'gach-van-da-marble.html') + '">Gạch Vân Đá Marble</a></li><li><a href="#">Gạch Vân Đá Tự Nhiên</a></li><li><a href="#">Gạch Thiết Kế Xi Măng</a></li><li><a href="#">Gạch Trang Trí</a></li><li><a href="#">Gạch Vân Gỗ</a></li></ul></div>',
      '      <div class="footer-col"><h5>Thiết Bị Vệ Sinh</h5><ul><li><a href="' + link(root, 'san-pham/thiet-bi-ve-sinh/voi-nuoc.html') + '">Vòi nước</a></li><li><a href="#">Lavabo</a></li><li><a href="#">Bồn cầu</a></li><li><a href="#">Bồn tắm</a></li><li><a href="#">Sen tắm</a></li><li><a href="#">Khung âm và nút nhấn</a></li></ul></div>',
      '      <div class="footer-col"><h5>Tin Tức</h5><ul><li><a href="' + link(root, 'tin-tuc/cam-hung-thiet-ke.html') + '">Cảm hứng thiết kế</a></li><li><a href="' + link(root, 'tin-tuc.html?category_id=tin-san-pham') + '">Tin sản phẩm</a></li><li><a href="' + link(root, 'tin-tuc.html?category_id=tin-khuyen-mai') + '">Tin khuyến mãi</a></li><li><a href="' + link(root, 'tin-tuc.html?category_id=cong-ty') + '">Tin công ty</a></li><li><a href="#">Tin tuyển dụng</a></li></ul></div>',
      '      <div class="footer-newsletter"><p>Đăng ký để cập nhật thông tin mới nhất về khuyến mãi, sản phẩm và sự kiện</p><form data-newsletter-form><input type="email" placeholder="Email của bạn" required><button type="submit">Đăng ký</button></form></div>',
      '    </div>',
      '    <div class="footer-bottom"><span>@2025 LAVATILE<br>Công Ty Cổ phần Quốc Tế Gốm Sứ Việt<br>cấp ngày 30/07/2011. Đăng ký thay đổi lần thứ 15 do Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh ngày 06/06/2022.</span><div class="cert"><svg width="80" height="40" viewBox="0 0 80 40"><rect fill="#555" width="80" height="40" rx="2"></rect><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="8" fill="#999">Bộ Công Thương</text></svg></div></div>',
      '  </div>',
      '</footer>'
    ].join('\n');
  }

  document.querySelectorAll('[data-site-header]').forEach(renderHeader);
  document.querySelectorAll('[data-site-footer]').forEach(renderFooter);
})();
