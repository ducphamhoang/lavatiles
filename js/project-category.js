(function () {
  'use strict';

  var projectDetails = {
    '8911': {
      title: 'NAM HÙNG RESORT',
      category: 'Công trình nghỉ dưỡng',
      location: 'Khánh Hòa',
      year: '2020',
      primaryImage: '../assets/project-resort-v1.png',
      secondaryImage: '../assets/project-public-v1.png',
      description: 'Nam Hùng Resort mở ra một không gian nghỉ dưỡng khoáng đạt bên bãi biển Bãi Dài, với ngôn ngữ thiết kế đương đại và nhịp sáng tối được xử lý rất tiết chế.',
      contribution: 'Lavatile tham gia hoàn thiện bề mặt cho những khu vực trọng điểm, giữ cảm giác sang trọng nhưng vẫn đủ nhẹ để hòa vào bối cảnh biển và gió tự nhiên.'
    },
    '8915': {
      title: 'FUSION',
      category: 'Công trình nghỉ dưỡng',
      location: 'Hồ Chí Minh',
      year: '2022',
      primaryImage: '../assets/project-commercial-v1.png',
      secondaryImage: '../assets/project-office-v1.png',
      description: 'Fusion Original Saigon Centre được định hình như một khách sạn đương đại giàu năng lượng thị giác, nơi tính nghệ thuật và nhịp sống đô thị giao nhau rất rõ.',
      contribution: 'Các bề mặt được chọn theo hướng sắc gọn và hiện đại để giữ cho nội thất có chiều sâu nhưng không làm nặng tổng thể công trình.'
    },
    '8919': {
      title: 'KHU NGHỈ DƯỠNG ANGSANA & DHAWA HỒ TRÀM',
      category: 'Công trình nghỉ dưỡng',
      location: 'Vũng Tàu',
      year: '2021',
      primaryImage: '../assets/project-residential-v1.png',
      secondaryImage: '../assets/project-resort-v1.png',
      description: 'Angsana và Dhawa Hồ Tràm lấy cảm hứng từ cảnh quan bản địa, kết hợp tinh thần nghỉ dưỡng nhiệt đới với một cấu trúc không gian giàu nhịp điệu và độ mở.',
      contribution: 'Hệ vật liệu được triển khai để cân bằng giữa sự an nhiên của khối villa nghỉ dưỡng và phần tiện ích mang tiết tấu trẻ hơn.'
    },
    '8925': {
      title: 'KHÁCH SẠN HOLIDAY',
      category: 'Công trình nghỉ dưỡng',
      location: 'Vũng Tàu',
      year: '2021',
      primaryImage: '../assets/project-office-v1.png',
      secondaryImage: '../assets/project-commercial-v1.png',
      description: 'Holiday Inn Resort Ho Tram Beach có tinh thần trẻ và tươi hơn, với bảng màu gợi đại dương và một bố cục mở về phía biển.',
      contribution: 'Giải pháp hoàn thiện tập trung vào độ bền sử dụng và cảm giác sáng, sạch, phù hợp với mật độ lưu trú cao của một resort ven biển.'
    },
    '8931': {
      title: 'M GARDEN CITY HOTEL ĐÀ NẴNG',
      category: 'Công trình nghỉ dưỡng',
      location: 'Đà Nẵng',
      year: '2022',
      primaryImage: '../assets/project-public-v1.png',
      secondaryImage: '../assets/project-residential-v1.png',
      description: 'M Garden City gây ấn tượng bằng ngôn ngữ kiến trúc xanh, đưa mảng thực vật và bê tông mộc vào cùng một hệ thị giác rất đặc trưng.',
      contribution: 'Phần hoàn thiện nội thất được chọn để giữ độ ấm và nhịp nghỉ cần thiết, tránh cảm giác khô cứng của một khối đô thị thuần túy.'
    },
    '8941': {
      title: 'KHÁCH SẠN HOLIDAY NHA TRANG',
      category: 'Công trình nghỉ dưỡng',
      location: 'Nha Trang',
      year: '2023',
      primaryImage: '../assets/project-resort-v1.png',
      secondaryImage: '../assets/project-public-v1.png',
      description: 'The Holiday Nha Trang nổi bật với hình khối gợi chuyển động sóng và mặt dựng mở rộng tầm nhìn về phía biển.',
      contribution: 'Lavatile tham gia ở các khu vực có tần suất sử dụng cao, giữ đồng thời hai yêu cầu: cảm giác nghỉ dưỡng sáng thoáng và độ bền vận hành lâu dài.'
    },
    '8943': {
      title: 'LUXNAM PHÚ QUỐC',
      category: 'Công trình nghỉ dưỡng',
      location: 'Kiên Giang',
      year: '2023 - 2025',
      primaryImage: '../assets/project-commercial-v1.png',
      secondaryImage: '../assets/project-resort-v1.png',
      description: 'Luxnam Phú Quốc được định vị như chuỗi villa riêng tư nằm giữa rừng và biển, với tinh thần nhiệt đới hiện đại và tỷ lệ không gian thoáng rộng.',
      contribution: 'Vật liệu hoàn thiện được chọn để giữ độ sang mà không quá phô trương, giúp công trình hòa vào cảnh quan tự nhiên của đảo.'
    },
    '8947': {
      title: 'NARA BÌNH TIÊN',
      category: 'Công trình nghỉ dưỡng',
      location: 'Ninh Thuận',
      year: '2024',
      primaryImage: '../assets/project-residential-v1.png',
      secondaryImage: '../assets/project-public-v1.png',
      description: 'Nara Bình Tiên bám theo địa hình tự nhiên của vùng vịnh, tạo ra một trải nghiệm nghỉ dưỡng biệt lập với những tầm nhìn mở rộng ra biển.',
      contribution: 'Hệ bề mặt được triển khai để nhấn vào sự tĩnh lặng và riêng tư, phù hợp với tính chất nghỉ dưỡng cao cấp của dự án.'
    },
    '8953': {
      title: 'MALIBU HỘI AN',
      category: 'Công trình nghỉ dưỡng',
      location: 'Quảng Nam',
      year: '2022',
      primaryImage: '../assets/project-office-v1.png',
      secondaryImage: '../assets/project-resort-v1.png',
      description: 'Malibu Hội An kết hợp nhịp sống ven biển với hình ảnh nghỉ dưỡng đương đại, tạo ra cảm giác thoáng đạt và liên tục giữa trong nhà và ngoài trời.',
      contribution: 'Giải pháp vật liệu được tiết chế để hỗ trợ trọn vẹn tầm nhìn và ánh sáng tự nhiên thay vì cạnh tranh với chúng.'
    },
    '8955': {
      title: 'SHERATON ĐÀ NẴNG',
      category: 'Công trình nghỉ dưỡng',
      location: 'Đà Nẵng',
      year: '2019 - 2020',
      primaryImage: '../assets/project-public-v1.png',
      secondaryImage: '../assets/project-commercial-v1.png',
      description: 'Sheraton Đà Nẵng mang tinh thần tân cổ điển sang trọng, với tỷ lệ lớn và một ngôn ngữ nội thất thiên về trải nghiệm lưu trú thượng lưu.',
      contribution: 'Lavatile góp phần củng cố độ trang trọng của không gian bằng hệ hoàn thiện có bề mặt chỉn chu, rõ tỷ lệ và phù hợp với nhịp sử dụng cao.'
    },
    '8957': {
      title: 'LE MÉRIDIEN SÀI GÒN',
      category: 'Công trình nghỉ dưỡng',
      location: 'Hồ Chí Minh',
      year: '2015',
      primaryImage: '../assets/project-resort-v1.png',
      secondaryImage: '../assets/project-office-v1.png',
      description: 'Le Méridien Saigon pha trộn tinh thần văn hóa Pháp với nhịp sống đương đại bên sông Sài Gòn, tạo ra một diện mạo vừa duyên dáng vừa rất đô thị.',
      contribution: 'Các bề mặt được chọn để hỗ trợ ánh sáng, phản chiếu và chiều sâu không gian, giữ cho nội thất có cảm giác thanh lịch nhưng không lạnh.'
    },
    '8977': {
      title: 'PULLMAN SÀI GÒN CENTRE',
      category: 'Công trình nghỉ dưỡng',
      location: 'Hồ Chí Minh',
      year: '2014',
      primaryImage: '../assets/project-commercial-v1.png',
      secondaryImage: '../assets/project-public-v1.png',
      description: 'Pullman Saigon Centre có nhịp năng lượng đô thị rất rõ, với cách tổ chức không gian sắc gọn và phù hợp cho cả lưu trú lẫn hoạt động công việc.',
      contribution: 'Lavatile tham gia định hình các bề mặt nội thất theo hướng hiện đại, chắc tay và dễ bảo trì trong vận hành khách sạn.'
    },
    '8979': {
      title: 'KHÁCH SẠN IBIS SÀI GÒN AIRPORT',
      category: 'Công trình nghỉ dưỡng',
      location: 'Hồ Chí Minh',
      year: '2016',
      primaryImage: '../assets/project-residential-v1.png',
      secondaryImage: '../assets/project-office-v1.png',
      description: 'Ibis Saigon Airport được phát triển như một điểm dừng chân hiệu quả ngay cửa ngõ hàng không, với thẩm mỹ hiện đại và tính công năng rõ ràng.',
      contribution: 'Phần vật liệu hoàn thiện ưu tiên độ bền, nhịp bảo trì hợp lý và trải nghiệm lưu trú gọn gàng cho dòng khách di chuyển nhanh.'
    },
    '8981': {
      title: 'GLOW SCENIA BAY',
      category: 'Công trình nghỉ dưỡng',
      location: 'Nha Trang',
      year: '2019 - 2020',
      primaryImage: '../assets/project-office-v1.png',
      secondaryImage: '../assets/project-residential-v1.png',
      description: 'Glow Scenia Bay nổi bật bằng cấu trúc xếp lớp và định hướng tầm nhìn ra biển, tạo cảm giác trẻ, sáng và phù hợp với nhịp nghỉ dưỡng ven vịnh.',
      contribution: 'Lavatile hỗ trợ phần hoàn thiện theo hướng gọn và sáng, để tận dụng tối đa lợi thế ánh sáng tự nhiên của công trình.'
    },
    '8985': {
      title: 'MIA RESORT',
      category: 'Công trình nghỉ dưỡng',
      location: 'Khánh Hòa',
      year: '2016',
      primaryImage: '../assets/project-public-v1.png',
      secondaryImage: '../assets/project-resort-v1.png',
      description: 'Mia Resort có ngôn ngữ mộc mạc và gần cảnh quan, dùng vật liệu tự nhiên để xóa mờ ranh giới giữa công trình và địa hình ven biển.',
      contribution: 'Hệ hoàn thiện tập trung vào cảm giác yên tĩnh, riêng tư và bền vững với bối cảnh khí hậu biển trong quá trình sử dụng dài hạn.'
    },
    '8989': {
      title: 'PARK HYATT SÀI GÒN',
      category: 'Công trình nghỉ dưỡng',
      location: 'Hồ Chí Minh',
      year: '2005',
      primaryImage: '../assets/project-resort-v1.png',
      secondaryImage: '../assets/project-commercial-v1.png',
      description: 'Park Hyatt Saigon mang vẻ đẹp Đông Dương trang trọng, nơi các chi tiết kiến trúc và nội thất đều được kiểm soát rất kỹ để giữ chất lịch duyệt.',
      contribution: 'Các lựa chọn bề mặt của Lavatile góp phần duy trì cảm giác sang trọng cổ điển nhưng vẫn đủ bền cho nhịp vận hành của một khách sạn biểu tượng.'
    }
  };

  var relatedFeedback = document.getElementById('projectCategoryFeedback');
  var modal = document.getElementById('projectDetailModal');
  var modalTitle = document.getElementById('projectModalTitle');
  var modalCategory = document.getElementById('projectModalCategory');
  var modalLocation = document.getElementById('projectModalLocation');
  var modalYear = document.getElementById('projectModalYear');
  var modalDescription = document.getElementById('projectModalDescription');
  var modalContribution = document.getElementById('projectModalContribution');
  var modalPrimaryImage = document.getElementById('projectModalPrimaryImage');
  var modalSecondaryImage = document.getElementById('projectModalSecondaryImage');
  var lastTrigger = null;

  function showRelatedFeedback(message) {
    if (!relatedFeedback) {
      return;
    }

    relatedFeedback.textContent = message;
    relatedFeedback.hidden = false;
  }

  function renderProject(project) {
    modalCategory.textContent = project.category;
    modalTitle.textContent = project.title;
    modalLocation.textContent = project.location;
    modalYear.textContent = project.year;
    modalDescription.textContent = project.description;
    modalContribution.textContent = project.contribution;
    modalPrimaryImage.src = project.primaryImage;
    modalPrimaryImage.alt = project.title;
    modalSecondaryImage.src = project.secondaryImage;
    modalSecondaryImage.alt = project.title + ' - góc nhìn chi tiết';
  }

  function openModal(projectId, trigger) {
    var project = projectDetails[projectId];
    if (!project || !modal) {
      return;
    }

    renderProject(project);
    lastTrigger = trigger || null;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('project-modal-open');
  }

  function closeModal() {
    if (!modal || !modal.classList.contains('is-open')) {
      return;
    }

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('project-modal-open');

    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
  }

  document.querySelectorAll('[data-project-id]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      openModal(link.getAttribute('data-project-id'), link);
    });
  });

  if (modal) {
    modal.querySelectorAll('[data-project-modal-close]').forEach(function (node) {
      node.addEventListener('click', function () {
        closeModal();
      });
    });

    modal.addEventListener('click', function (event) {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  });

  document.querySelectorAll('[data-project-category-placeholder]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      showRelatedFeedback('Danh mục dự án liên quan chưa được dựng riêng. Hiện bạn có thể quay lại trang Dự án để xem toàn bộ nhóm công trình.');
    });
  });
})();
