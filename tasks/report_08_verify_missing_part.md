# Spec 08 triage: missing links to hide vs links to fill

Source: `tasks/report_07_scan_missing_part.md`.

Goal: classify the missing or placeholder links from a user POV so the site can feel usable while unfinished content is still being produced.

## Decision rule

- `Need fill`: the link is part of a core user journey, a primary visible promise, or a repeated navigation item. If it stays visible, it needs a real destination.
- `Can hide`: the link is optional, secondary, promotional, or a future feature. Hiding it temporarily makes the page feel more complete than leaving a dead link.
- `Not a link-fill issue`: icon-only controls and generic CTA text may still need accessibility or copy cleanup, but they are not content destinations to hide/fill.

## Need fill

These should get real URLs or proper target pages before public handoff. Hiding them would remove important discovery, contact, or content flows that users naturally expect from a premium tile/decor site.

| Area | Missing item(s) | Locations from report | Why it is crucial | Recommended fill |
| --- | --- | --- | --- | --- |
| Global product navigation | Gạch vân đá tự nhiên, Gạch vân gỗ, Gạch thiết kế xi măng, Gạch trang trí | active header/footer, `partials/navbar.html`, `partials/sidenav.html`, footer product column | These are core tile taxonomy links under `Sản phẩm`. Users use them to browse by material/look. | Create category pages or route to `san-pham/gach-op-lat/index.html` with matching filters/anchors. |
| Global sanitary navigation | Lavabo, Bồn cầu, Bồn tắm, Sen tắm, Khung âm và nút nhấn | active header/footer, `partials/navbar.html`, `partials/sidenav.html`, footer sanitary column | These are core sanitary categories. A dead link here makes the main product menu feel unfinished. | Create category pages or route to filtered sanitary listing pages. |
| Global brand navigation | Gessi, Villeroy & Boch | active header/footer, `partials/navbar.html`, `partials/sidenav.html` | Brand lookup is high-intent for luxury sanitary users. | Create brand pages, or link to the sanitary page sections if pages are not ready. |
| Global wood navigation | Sàn gỗ, Sàn gỗ Laminate | active header/footer, `partials/navbar.html`, `partials/sidenav.html` | The homepage/title already promises wood flooring, so users expect a usable destination. | Create wood category page, or temporarily route both to a scoped catalogue/listing page. |
| Contact/showroom journey | Liên hệ, Tìm địa chỉ Showroom, Liên hệ Showroom | header, sidenav, footer, `catalogue.html`, `gach-van-da-marble.html`, `ve-chung-toi.html` | Contact and showroom finding are conversion paths. These should not be dead CTAs. | Create a contact/showroom page, or use `tel:`, `mailto:`, and map links as interim destinations. |
| Catalogue downloads | All `Xem PDF` links on `catalogue.html` | `catalogue.html` lines 47-141 | The catalogue page's main promise is opening/downloading PDFs. If PDFs are not available, the page feels broken. | Add PDF URLs. If some PDFs are missing, remove only those cards until ready. |
| Project category cards | Trung tâm thương mại dịch vụ, Khu dân cư phức hợp, Văn phòng làm việc, Công trình công cộng | `du-an.html` lines 40-67 | Project cards are the whole content grid. Clicking a card should open a category. | Add category pages, or route to a shared project listing filtered by category. |
| Product breadcrumbs | `Sản phẩm`, `Gạch ốp lát` breadcrumb placeholders | `gach-van-da-marble.html`, `san-pham/gach-op-lat/index.html`, `san-pham/thiet-bi-ve-sinh/index.html`, `san-pham/thiet-bi-ve-sinh/voi-nuoc.html` | Breadcrumbs are orientation and backtracking controls. | Link `Sản phẩm` to the nearest product landing, and `Gạch ốp lát` to `san-pham/gach-op-lat/index.html`. |
| Tile category cards | GẠCH VÂN ĐÁ MARBLE, GẠCH VÂN ĐÁ TỰ NHIÊN, GẠCH VÂN GỖ, GẠCH THIẾT KẾ XI MĂNG, GẠCH TRANG TRÍ | `san-pham/gach-op-lat/index.html` lines 50-66 | These cards are prominent product browsing entry points. | Link marble to `gach-van-da-marble.html`; add pages or filtered listing anchors for the other categories. |
| Sanitary group cards | BỒN CẦU, LAVABO, BỒN TẮM, SEN TẮM, KHUNG ÂM VÀ NÚT NHẤN | `san-pham/thiet-bi-ve-sinh/index.html` lines 63-79 | These are primary category cards on the sanitary landing page. | Add category pages or filtered listing anchors. |
| Homepage primary product CTAs | THIẾT BỊ VỆ SINH, SÀN GỖ | `index.html` lines 94, 105 | These are first-page business category CTAs. | Link `THIẾT BỊ VỆ SINH` to `san-pham/thiet-bi-ve-sinh/index.html`; create or route `SÀN GỖ` appropriately. |
| News article cards | All article cards using `data-news-placeholder` | `tin-tuc.html`, `tin-tuc/cam-hung-thiet-ke.html` lines 29-166 | A news listing implies articles can open. Dead article cards feel broken quickly. | Create article detail pages for visible items, or make cards non-clickable until content exists. |
| Search/product support CTA | `Tìm địa chỉ showroom` from product support | `gach-van-da-marble.html` line 142 | This is a strong fallback action when product filtering fails. | Link to the same showroom/contact destination as the global showroom CTA. |

## Can hide temporarily

These can be removed, disabled, or made non-clickable until real destinations exist. Hiding them should make the current site feel cleaner instead of incomplete.

| Area | Missing item(s) | Locations from report | Temporary action |
| --- | --- | --- | --- |
| Future utility icons | Tìm kiếm, Yêu thích, Ngôn ngữ | active header/footer, `partials/navbar.html` | Hide these icons until search, wishlist, or language switching exists. |
| Future social links | Facebook, YouTube, TikTok, Instagram icon links | active footer, `partials/footer.html` | Hide the social row or add real external profile URLs. |
| Non-core corporate links | Showroom 3D, Tuyển dụng, Tin tuyển dụng, Thông tin & Báo cáo, Dịch vụ khách hàng | header, sidenav, footer | Hide from nav/footer until pages exist. Keep `Liên hệ`/showroom instead. |
| Homepage secondary collection CTAs | Papier, Onyce, Marvel Diva `Xem thêm`; hero slide CTAs without a page | `index.html` lines 41, 54, 150, 158, 166 | Keep the visual cards/slides, but hide the `Xem thêm` buttons until collection pages exist. |
| Tile collection slider cards | TELE DI MARMO LUMIA, ONYCE, MARVEL DIVA, PAPIER, LOG | `san-pham/gach-op-lat/index.html` lines 164-188 | Convert cards to non-clickable display cards, or hide the section until collection pages exist. |
| Tile solution cards | Phòng khách, Phòng ngủ, Phòng bếp, Phòng tắm, Phòng làm việc, Sân vườn, Nhà hàng, Cửa hàng thời trang, SPA, Khách sạn | `san-pham/gach-op-lat/index.html` lines 209-254 | Keep as inspiration tiles without anchors, or hide section until solution pages exist. |
| Sanitary brand panel buttons | Gessi and Villeroy & Boch `Xem thêm` buttons | `san-pham/thiet-bi-ve-sinh/index.html` lines 37, 48 | Hide just the buttons if brand pages are not ready; the brand story panels can remain. |
| Sanitary style/combo cards | Gần gũi với thiên nhiên, Hiện đại, Cổ điển - Tân cổ điển, Bespoke, Combo cao cấp, Combo tiết kiệm, Combo mạ màu | `san-pham/thiet-bi-ve-sinh/index.html` lines 97-139 | Make these cards non-clickable or hide the sections until style/combo pages exist. |
| Advanced search CTAs | `Tìm kiếm nâng cao` | `gach-van-da-marble.html` line 141, `san-pham/thiet-bi-ve-sinh/voi-nuoc.html` line 155 | Hide until a real advanced search page or modal exists. Existing filters already cover the basic job. |
| Catalogue custom-support CTA | `Liên hệ showroom` inside catalogue CTA | `catalogue.html` line 157 | Can hide only if global contact/showroom link is filled elsewhere; otherwise treat as `Need fill`. |

## Not a link-fill issue

These should not be sorted into hide/fill destination work.

| Issue | Locations | Recommendation |
| --- | --- | --- |
| Scroll-to-top, carousel previous/next, modal close buttons | Multiple pages in the `Thiếu text hiển thị` rows | Keep icon-only UI if it has good `aria-label`; no visible text is required for familiar controls. |
| Homepage hero pagination dots with no label | `index.html` lines 66-68 | Add `aria-label` or accessible text for each dot. This is accessibility work, not missing page content. |
| `Xem thêm` generic CTA text with valid destination | Multiple rows with non-placeholder hrefs | Optional copy improvement. It does not block usability if the link destination works. |
| Product load-more buttons | Product listing pages | Keep as buttons. They are actions, not missing URL destinations. |

## Priority order

1. Fill contact/showroom links first because they are conversion exits across multiple pages.
2. Fill or reroute global product navigation and breadcrumb placeholders.
3. Fill catalogue PDFs or remove missing PDF cards from `catalogue.html`.
4. Fill product category cards on tile and sanitary landing pages.
5. Fill project and news article cards if those sections stay in the public navigation.
6. Hide optional utilities, secondary collection CTAs, future feature links, and inspiration cards until their destinations exist.
