'use strict';

const CATEGORY_LABELS = {
  'ban-cau': 'Bàn cầu',
  'ban-cau-thong-minh': 'Bàn cầu thông minh',
  'ban-cau-dien-tu': 'Bàn cầu điện tử',
  'ban-cau-dat-san': 'Bàn cầu đặt sàn',
  'nap-ban-cau-dien-tu': 'Nắp bàn cầu điện tử',
  'nap-rua-dien-tu': 'Nắp rửa điện tử',
  'nap-rua-co': 'Nắp rửa cơ',
  'nap-ban-cau-co': 'Nắp bàn cầu cơ',
  'ban-cau-mot-khoi': 'Bàn cầu một khối',
  'ban-cau-hai-khoi': 'Bàn cầu hai khối',
  'ban-cau-cong-cong': 'Bàn cầu công cộng',
  'ban-cau-treo-tuong': 'Bàn cầu treo tường',
  'ban-cau-xa-cam-ung': 'Bàn cầu xả cảm ứng',
  'ket-nuoc-am-tuong': 'Két nước âm tường',
  'mat-na-xa-nhan': 'Mặt nạ xả nhấn',
  'phu-kien-ban-cau': 'Phụ kiện bàn cầu',
  'lavabo-tu': 'Lavabo tủ',
  'chau-dat-ban': 'Chậu đặt bàn',
  'chau-duong-ban': 'Chậu dương bàn',
  'chau-duong-vanh': 'Chậu dương vành',
  'chau-am-ban': 'Chậu âm bàn',
  'chau-ban-da': 'Chậu bàn đá',
  'chau-galalato': 'Chậu GALALATO',
  'chau-cerafine': 'Chậu Cerafine',
  'chau-treo-tuong': 'Chậu treo tường',
  'chau-rua-chen': 'Chậu rửa chén',
  'chau-rua-tich-hop': 'Chậu rửa tích hợp',
  'chau-rua': 'Chậu rửa',
  'bon-tieu': 'Bồn tiểu',
  'voi-bep': 'Vòi bếp',
  'voi-lanh': 'Vòi lạnh',
  'voi-chau-cam-ung': 'Vòi chậu cảm ứng',
  'voi-chau-cao': 'Vòi chậu cao',
  'voi-chau': 'Vòi chậu',
  'voi-rua-bat': 'Vòi rửa bát',
  'voi-bon-tam': 'Vòi bồn tắm',
  'sen-tam': 'Sen tắm',
  'bat-sen-tam': 'Bát sen tắm',
  'sen-voi': 'Sen vòi',
  'bon-tam': 'Bồn tắm',
  'phu-kien': 'Phụ kiện',
  'chan-chau': 'Chân chậu',
  'ga-thoat-san': 'Ga thoát sàn',
  'may-say-tay': 'Máy sấy tay',
  'thanh-tay-vin': 'Thanh tay vịn',
  'thiet-bi-cong-cong': 'Thiết bị vệ sinh công cộng',
};

const SOURCE_CATEGORY_MAP = {
  'bon-cau-mot-khoi': 'ban-cau-mot-khoi',
  'bon-cau-hai-khoi': 'ban-cau-hai-khoi',
  'bon-cau-treo-tuong': 'ban-cau-treo-tuong',
  'bon-cau-dat-san': 'ban-cau-dat-san',
  'ban-cau-dien-tu': 'ban-cau-dien-tu',
  'ket-nuoc-am-tuong': 'ket-nuoc-am-tuong',
  'mat-na-xa-nhan': 'mat-na-xa-nhan',
  'phu-kien-bon-cau': 'phu-kien-ban-cau',
  'nap-rua-dien-tu-thong-minh-washlet': 'nap-rua-dien-tu',
  'nap-rua-co-ecowasher': 'nap-rua-co',
  'neorest': 'ban-cau-thong-minh',
  'chau-rua-mat-galalato': 'chau-galalato',
  'chau-rua-mat-dat-tren-ban': 'chau-dat-ban',
  'chau-rua-mat-ban-am-ban': 'chau-am-ban',
  'chau-rua-mat-duong-vanh': 'chau-duong-vanh',
  'chau-rua-mat-am-ban': 'chau-am-ban',
  'chau-rua-mat-treo-tuong': 'chau-treo-tuong',
  'phu-kien-chau-rua-mat': 'phu-kien',
  'voi-chau-rua': 'voi-chau',
  'bat-sen-tam': 'bat-sen-tam',
  'sen-tam': 'sen-tam',
  'voi-bon-tam': 'voi-bon-tam',
  'voi-bep-rua-bat': 'voi-rua-bat',
  'sen-voi-phu-kien': 'phu-kien',
  'bon-tam': 'bon-tam',
  'bon-tam-khong-gian-bon-tam': 'bon-tam',
  'bon-tam-galalato': 'bon-tam',
  'bon-tam-dat-san': 'bon-tam',
  'bon-tam-xay': 'bon-tam',
  'bon-tam-massage': 'bon-tam',
  'ga-thoat-san': 'ga-thoat-san',
  'phu-kien-phong-tam': 'phu-kien',
  'phu-kien-ve-sinh-bo-phu-kien': 'phu-kien',
  'thanh-vat-khan-phong-tam': 'phu-kien',
  'moc-ao': 'phu-kien',
  'lo-xa-bong': 'phu-kien',
  'lo-ban-chai': 'phu-kien',
  'day-voi-xit-ve-sinh': 'phu-kien',
  'ke-kinh': 'phu-kien',
  'lo-giay': 'phu-kien',
  'guong': 'phu-kien',
  'phu-kien-ve-sinh-khac': 'phu-kien',
  'ong-cong': 'phu-kien',
  'z-collections': 'sen-voi',
  'g-collections': 'sen-voi',
  'sen-voi-bo-suu-tap-khac': 'sen-voi',
  'thiet-bi-ve-sinh-cong-cong': 'thiet-bi-cong-cong',
};

const CAESAR_CATEGORY_MAP = {
  'ban-cau': 'ban-cau',
  'ban-cau-1-khoi': 'ban-cau-mot-khoi',
  'ban-cau-2-khoi': 'ban-cau-hai-khoi',
  'ban-cau-thong-minh': 'ban-cau-thong-minh',
  'ban-cau-dien-tu': 'ban-cau-dien-tu',
  'ban-cau-cong-cong': 'ban-cau-cong-cong',
  'ban-cau-thung-nuoc-am-tuong': 'ban-cau',
  lavabo: 'chau-rua',
  'lavabo-tren-ban': 'chau-dat-ban',
  'lavabo-am-ban': 'chau-am-ban',
  'lavabo-duong-ban': 'chau-duong-ban',
  'lavabo-treo-tuong': 'chau-treo-tuong',
  'lavabo-tu-treo': 'lavabo-tu',
  'be-tieu': 'bon-tieu',
  'be-tieu-treo': 'bon-tieu',
  'be-tieu-dung': 'bon-tieu',
  'cam-ung-be-tieu': 'bon-tieu',
  'bo-xa-an-tay': 'bon-tieu',
  'chau-xa': 'bon-tieu',
  'vach-ngan-be-tieu': 'thiet-bi-cong-cong',
  'bon-tam': 'bon-tam',
  'bon-tam-massage': 'bon-tam',
  'bon-tam-goc': 'bon-tam',
  'bon-tam-goc-massage': 'bon-tam',
  'bon-tam-dac-biet': 'bon-tam',
  'cua-tam-dung': 'bon-tam',
  voi: 'voi-chau',
  'voi-cam-ung': 'voi-chau-cam-ung',
  'voi-nong-lanh': 'voi-chau',
  'voi-lanh': 'voi-lanh',
  'voi-bep': 'voi-bep',
  'voi-gan-tuong': 'voi-chau',
  'voi-xit': 'phu-kien',
  sen: 'sen-tam',
  'phu-kien': 'phu-kien',
  'phu-kien-phong-tam-khac': 'phu-kien',
  'gia-de-hop-xa-phong': 'phu-kien',
  'gia-treo-vong-treo-khan': 'phu-kien',
  'thanh-vin': 'thanh-tay-vin',
  'hop-giay-ve-sinh': 'phu-kien',
  'ke-inox': 'phu-kien',
  'phieu-thoat-san': 'ga-thoat-san',
  'moc-ao': 'phu-kien',
  'ke-guong': 'phu-kien',
  'may-say-tay': 'may-say-tay',
  'nap-ban-cau': 'nap-ban-cau-co',
  'nap-ban-cau-em': 'nap-ban-cau-co',
  'nap-ban-cau-thong-minh': 'nap-ban-cau-dien-tu',
  'nap-thuong': 'nap-ban-cau-co',
  'nap-ban-cau-tre-em': 'nap-ban-cau-co',
  guong: 'phu-kien',
};

const PARENT_CATEGORIES = new Set([
  'san-pham-moi',
  'washlet',
  'ban-cau-ve-sinh',
  'chau-rua-mat',
  'sen-voi',
  'thiet-bi-ve-sinh-cong-cong',
]);

function normalizedTitle(product) {
  return String(product.title || '').toLocaleLowerCase('vi');
}

function titleCategory(product) {
  const title = normalizedTitle(product);
  if (/bàn cầu.*(một|1) khối/.test(title)) return 'ban-cau-mot-khoi';
  if (/bàn cầu.*(hai|2) khối/.test(title)) return 'ban-cau-hai-khoi';
  if (/bàn cầu.*treo tường/.test(title)) return 'ban-cau-treo-tuong';
  if (/nắp rửa điện tử|washlet/.test(title)) return 'nap-rua-dien-tu';
  if (/nắp rửa cơ|ecowasher/.test(title)) return 'nap-rua-co';
  if (/neorest|bàn cầu thông minh/.test(title)) return 'ban-cau-thong-minh';
  if (/bàn cầu/.test(title)) return 'ban-cau';
  if (/chậu.*(đặt trên bàn|đặt bàn)/.test(title)) return 'chau-dat-ban';
  if (/chậu.*bán âm bàn/.test(title)) return 'chau-am-ban';
  if (/chậu.*dương vành/.test(title)) return 'chau-duong-vanh';
  if (/chậu.*âm bàn/.test(title)) return 'chau-am-ban';
  if (/chậu.*treo tường/.test(title)) return 'chau-treo-tuong';
  if (/chậu/.test(title)) return 'chau-rua';
  if (/bồn tiểu/.test(title)) return 'bon-tieu';
  if (/vòi.*chậu.*(cảm ứng|cảm ứng)/.test(title)) return 'voi-chau-cam-ung';
  if (/vòi.*chậu.*rửa bát|vòi.*bếp/.test(title)) return 'voi-rua-bat';
  if (/vòi.*bồn tắm/.test(title)) return 'voi-bon-tam';
  if (/bát sen/.test(title)) return 'bat-sen-tam';
  if (/sen tắm/.test(title)) return 'sen-tam';
  if (/bồn tắm/.test(title)) return 'bon-tam';
  if (/máy sấy tay/.test(title)) return 'may-say-tay';
  if (/tay vịn/.test(title)) return 'thanh-tay-vin';
  if (/ga thoát sàn/.test(title)) return 'ga-thoat-san';
  return '';
}

function categoryForProduct(product, sourceCategories = []) {
  const categories = [...new Set(sourceCategories.filter(Boolean))];
  const hasWashletSet = categories.some((key) => key.startsWith('tat-ca-san-pham-nap-rua-'));
  const inferred = titleCategory(product);

  // Combination products and public-facility products need the product title,
  // not the broad collection/category page that exposed them.
  if (hasWashletSet || categories.includes('thiet-bi-ve-sinh-cong-cong') || categories.includes('san-pham-moi')) {
    if (inferred) return inferred;
  }

  for (const category of categories) {
    if (SOURCE_CATEGORY_MAP[category]) return SOURCE_CATEGORY_MAP[category];
  }
  if (inferred) return inferred;
  for (const category of categories) {
    if (!PARENT_CATEGORIES.has(category) && category !== 'washlet') return category;
  }
  return 'phu-kien';
}

function categoryInfo(slug) {
  return { slug, label: CATEGORY_LABELS[slug] || slug.replace(/-/g, ' ') };
}

function categoryGroup(slug) {
  if (/^(ban-cau|nap-|ket-nuoc|mat-na)/.test(slug)) return 'Bàn cầu';
  if (/^(chau|lavabo)/.test(slug)) return 'Chậu rửa';
  if (/^(voi|sen|bat-sen)/.test(slug)) return 'Sen vòi';
  if (slug === 'bon-tam') return 'Bồn tắm';
  if (slug === 'thiet-bi-cong-cong') return 'Thiết bị công cộng';
  return 'Phụ kiện';
}

function flattenTotoTree(data) {
  const products = new Map();
  for (const [sourceCategory, entries] of Object.entries(data)) {
    for (const [slug, product] of Object.entries(entries || {})) {
      const existing = products.get(slug);
      const sourceCategories = new Set(existing ? existing.sourceCategories : []);
      sourceCategories.add(sourceCategory);
      for (const category of product.categories || []) sourceCategories.add(category);
      if (existing) {
        existing.sourceCategories = [...sourceCategories];
      } else {
        products.set(slug, { slug, product, sourceCategories: [...sourceCategories] });
      }
    }
  }
  return [...products.values()].map(({ slug, product, sourceCategories }) => {
    const categorySlug = categoryForProduct(product, sourceCategories);
    return {
      slug,
      product,
      sourceCategories,
      category: categoryInfo(categorySlug),
      categoryGroup: categoryGroup(categorySlug),
    };
  });
}

function flattenCaesarTree(data) {
  const products = new Map();
  for (const [sourceCategory, entries] of Object.entries(data)) {
    for (const [slug, product] of Object.entries(entries || {})) {
      const existing = products.get(slug);
      const sourceCategories = new Set(existing ? existing.sourceCategories : []);
      sourceCategories.add(sourceCategory);
      for (const category of product.categories || []) sourceCategories.add(category);
      if (existing) existing.sourceCategories = [...sourceCategories];
      else products.set(slug, { slug, product, sourceCategories: [...sourceCategories] });
    }
  }
  return [...products.values()].map(({ slug, product, sourceCategories }) => {
    const categorySlug = [...sourceCategories].reverse().map((key) => CAESAR_CATEGORY_MAP[key]).find(Boolean) || 'phu-kien';
    return {
      slug,
      product,
      sourceCategories,
      category: categoryInfo(categorySlug),
      categoryGroup: categoryGroup(categorySlug),
    };
  });
}

function flattenViglaceraTree(data, categories = {}) {
  const products = new Map();
  for (const [sourceCategory, entries] of Object.entries(data || {})) {
    for (const [slug, product] of Object.entries(entries || {})) {
      if (products.has(slug)) continue;
      const categoryKeys = product.categories || [sourceCategory];
      const child = categoryKeys.find((key) => categories[key] && categories[key].parent);
      const categoryKey = child || sourceCategory;
      const parent = categories[categoryKey]?.parent || categoryKey;
      const group = parent === 'ban-cau' ? 'Bàn cầu'
        : parent === 'chau-rua' ? 'Chậu rửa'
          : parent === 'voi-chau' || parent === 'sen-tam' ? 'Sen vòi'
            : parent === 'bon-tieu' ? 'Bồn tiểu' : 'Phụ kiện';
      products.set(slug, {
        slug,
        product,
        sourceCategories: categoryKeys,
        category: { slug: categoryKey, label: categories[categoryKey]?.title || CATEGORY_LABELS[categoryKey] || categoryKey.replace(/-/g, ' ') },
        categoryGroup: group,
      });
    }
  }
  return [...products.values()];
}

module.exports = {
  CATEGORY_LABELS,
  categoryForProduct,
  categoryInfo,
  categoryGroup,
  flattenTotoTree,
  flattenCaesarTree,
  flattenViglaceraTree,
};
