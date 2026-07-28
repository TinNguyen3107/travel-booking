import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'vi' | 'en';

export const translations = {
  vi: {
    // Header nav
    nav_about: 'Về chúng tôi',
    nav_experiences: 'Trải nghiệm',
    nav_how: 'Cách hoạt động',
    nav_community: 'Cộng đồng',
    nav_faq: 'Hỏi đáp',
    nav_dashboard: 'Bảng điều khiển',
    nav_preview: 'Tour đang mở bán',
    nav_login: 'Đăng nhập',
    nav_logout: 'Đăng xuất',
    nav_dark_on: 'Chuyển giao diện tối',
    nav_dark_off: 'Chuyển giao diện sáng',
    lang_toggle: 'Đổi sang tiếng Anh',

    // Hero section
    hero_eyebrow: 'Tour địa phương tại Việt Nam',
    hero_title: 'Đặt tour rõ giá, rõ lịch trình, có đánh giá thật từ người dùng.',
    hero_desc: 'Khám phá Vịnh Hạ Long, Hội An, Bát Tràng, Sa Pa và nhiều trải nghiệm bản địa với quy trình đặt tour đơn giản, bình luận minh bạch.',
    hero_cta_tours: 'Xem tour',
    hero_cta_host: 'Đăng ký làm host',
    hero_stat_safe: 'Bảo đảm an toàn',
    hero_stat_quality: 'Chất lượng',
    hero_stat_review: 'Đánh giá chân thực',

    // About section
    about_eyebrow: 'Về chúng tôi',
    about_title: 'Một quy trình đặt tour gọn, dễ kiểm soát',
    about_desc: 'Khách xem tour và bình luận trước khi đăng nhập. Người dùng đã đăng nhập được đặt tour, hủy đơn đang chờ và gửi đánh giá.',
    about_f1_title: 'Tour rõ thông tin',
    about_f1_text: 'Mỗi tour có địa điểm, thời lượng, giá VNĐ, ảnh và danh mục để người dùng lọc nhanh.',
    about_f2_title: 'Host cộng đồng',
    about_f2_text: 'Kết nối du khách với các host và hướng dẫn viên địa phương đã được xác minh để mang lại trải nghiệm chân thực hơn.',
    about_f3_title: 'Thông tin đặt tour chính xác',
    about_f3_text: 'Email, số điện thoại, ngày khởi hành và số lượng khách được kiểm tra tự động để hạn chế sai sót khi đặt tour.',

    // Experiences section
    exp_eyebrow: 'Trải nghiệm',
    exp_title: 'Tour đang mở bán',
    exp_desc: 'Chi phí tour được niêm yết theo VNĐ và cập nhật trực tiếp trên hệ thống. Tour chưa có đánh giá sẽ hiển thị 0.0 sao.',
    exp_search_placeholder: 'Tìm theo tên tour, địa điểm hoặc danh mục',
    exp_price_from: 'Giá từ...',
    exp_price_to: 'Đến giá...',
    exp_all_categories: 'Tất cả danh mục',
    exp_show_more: 'Xem thêm',
    exp_book: 'Đặt tour',
    exp_view_detail: 'Xem chi tiết',
    exp_no_result: 'Không tìm thấy tour phù hợp.',
    exp_wishlist_login: 'Vui lòng đăng nhập để thêm vào danh sách yêu thích',
    exp_guests: 'khách',
    exp_full: 'Hết chỗ',
    exp_not_open: 'Chưa mở',

    // How it works
    how_eyebrow: 'Cách hoạt động',
    how_title: 'Ba bước để bắt đầu hành trình',
    how_desc: 'Quy trình được giữ ngắn để người dùng mới cũng thao tác nhanh.',
    how_s1_title: 'Khám phá tour',
    how_s1_text: 'Duyệt danh sách các tour địa phương, xem đánh giá thực tế và chọn trải nghiệm phù hợp.',
    how_s2_title: 'Đặt chỗ dễ dàng',
    how_s2_text: 'Chọn ngày, điền thông tin liên lạc và xác nhận đặt tour chỉ trong vài bước đơn giản.',
    how_s3_title: 'Trải nghiệm thực tế',
    how_s3_text: 'Tham gia tour và chia sẻ đánh giá chân thực để giúp cộng đồng du lịch ngày càng tốt hơn.',

    // Community
    community_eyebrow: 'Cộng đồng',
    community_title: 'Chia sẻ hành trình của bạn',
    community_view_all: 'Xem tất cả bài viết',

    // Host register
    host_eyebrow: 'Dành cho Host',
    host_title: 'Trở thành host và chia sẻ trải nghiệm địa phương',
    host_desc: 'Điền thông tin đăng ký và chúng tôi sẽ liên hệ để xác minh trong vòng 24 giờ.',
    host_name: 'Họ và tên',
    host_email: 'Email',
    host_phone: 'Số điện thoại',
    host_address: 'Địa chỉ thường trú',
    host_id: 'Số CMND/CCCD',
    host_exp_location: 'Địa điểm hoạt động',
    host_exp_desc: 'Mô tả trải nghiệm bạn muốn chia sẻ',
    host_submit: 'Gửi đăng ký',
    host_submitting: 'Đang gửi...',

    // Review
    review_eyebrow: 'Đánh giá',
    review_title: 'Đánh giá từ khách hàng',
    review_desc: 'Người dùng đã đăng nhập có thể gửi đánh giá bằng số sao và bình luận. Điểm đánh giá trung bình của tour được cập nhật tự động dựa trên phản hồi từ khách hàng.',
    review_submit_title: 'Gửi đánh giá của bạn',
    review_select_tour: 'Chọn tour',
    review_comment_placeholder: 'Chia sẻ trải nghiệm của bạn...',
    review_submit: 'Gửi đánh giá',
    review_submitting: 'Đang gửi...',
    review_login_required: 'Vui lòng đăng nhập để gửi đánh giá.',

    // Footer
    footer_desc: 'Nền tảng đặt tour địa phương tại Việt Nam với quy trình đơn giản và minh bạch.',
    footer_links: 'Liên kết nhanh',
    footer_contact: 'Liên hệ',
    footer_rights: 'Đã đăng ký bản quyền.',

    // FAQ
    faq_eyebrow: 'Hỏi đáp',
    faq_title: 'Câu hỏi thường gặp',
    faq_q1: 'Tôi chưa đăng nhập có đặt tour được không?',
    faq_a1: 'Khách chưa đăng nhập vẫn xem được toàn bộ tour và bình luận, nhưng cần đăng nhập hoặc đăng ký tài khoản trước khi đặt tour và gửi đánh giá.',
    faq_q2: 'Số sao đánh giá được tính như thế nào?',
    faq_a2: 'Tour mới mặc định 0 sao. Khi người dùng gửi đánh giá, hệ thống tự tính điểm trung bình và tăng số lượt đánh giá.',
    faq_q3: 'Tôi có thể hủy đơn đã đặt không?',
    faq_a3: 'Người dùng có thể hủy đơn khi đơn còn ở trạng thái chờ xử lý. Sau khi được xác nhận, bạn nên liên hệ hỗ trợ để thay đổi lịch.',

    // Bookings (user profile)
    booking_my: 'Đơn đặt tour của tôi',
    booking_tour: 'Tour',
    booking_date: 'Ngày khởi hành',
    booking_guests: 'Số khách',
    booking_total: 'Tổng tiền',
    booking_status: 'Trạng thái',
    
    // Host Tabs
    host_tab_overview: 'Tổng quan',
    host_tab_experiences: 'Quản lý Tour',
    host_tab_bookings: 'Đơn đặt tour',
    host_tab_reviews: 'Đánh giá',
    host_tab_profile: 'Hồ sơ cá nhân',
    booking_status_pending: 'Chờ duyệt',
    booking_status_confirmed: 'Đã xác nhận',
    booking_status_cancelled: 'Đã hủy',
    booking_payment_unpaid: 'Chưa thanh toán',
    booking_payment_paid: 'Đã thanh toán',
    booking_payment_refunded: 'Đã hoàn tiền',

    // Misc
    loading: 'Đang tải...',
    error_generic: 'Có lỗi xảy ra. Vui lòng thử lại.',
    back_home: 'Quay lại trang chủ',
    preparing: 'Đang chuẩn bị hành trình...',
    explore_with: 'Khám phá thế giới cùng',
  },
  en: {
    // Header nav
    nav_about: 'About Us',
    nav_experiences: 'Experiences',
    nav_how: 'How It Works',
    nav_community: 'Community',
    nav_faq: 'FAQ',
    nav_dashboard: 'Dashboard',
    nav_preview: 'Tours on Sale',
    nav_login: 'Log In',
    nav_logout: 'Log Out',
    nav_dark_on: 'Switch to dark mode',
    nav_dark_off: 'Switch to light mode',
    lang_toggle: 'Switch to Vietnamese',

    // Hero section
    hero_eyebrow: 'Local Tours in Vietnam',
    hero_title: 'Book tours with clear prices, schedules & real reviews.',
    hero_desc: 'Discover Ha Long Bay, Hoi An, Bat Trang, Sa Pa and many local experiences with a simple booking process and transparent comments.',
    hero_cta_tours: 'View Tours',
    hero_cta_host: 'Become a Host',
    hero_stat_safe: 'Safe & Secure',
    hero_stat_quality: 'Quality',
    hero_stat_review: 'Honest Reviews',

    // About section
    about_eyebrow: 'About Us',
    about_title: 'A streamlined, easy-to-manage booking process',
    about_desc: 'Guests can browse tours and comments before logging in. Logged-in users can book tours, cancel pending orders, and submit reviews.',
    about_f1_title: 'Clear Tour Information',
    about_f1_text: 'Each tour includes location, duration, price in VND, photos and categories for quick filtering.',
    about_f2_title: 'Community Hosts',
    about_f2_text: 'Connect travelers with verified local hosts and guides for a more authentic experience.',
    about_f3_title: 'Accurate Booking Details',
    about_f3_text: 'Email, phone number, departure date and guest count are automatically validated to minimize errors.',

    // Experiences section
    exp_eyebrow: 'Experiences',
    exp_title: 'Tours Available Now',
    exp_desc: 'Tour prices are listed in VND and updated in real-time. Tours with no reviews will show 0.0 stars.',
    exp_search_placeholder: 'Search by tour name, location or category',
    exp_price_from: 'Price from...',
    exp_price_to: 'Price to...',
    exp_all_categories: 'All Categories',
    exp_show_more: 'Show More',
    exp_book: 'Book Tour',
    exp_view_detail: 'View Details',
    exp_no_result: 'No matching tours found.',
    exp_wishlist_login: 'Please log in to add to wishlist',
    exp_guests: 'guests',
    exp_full: 'Full',
    exp_not_open: 'Not Open',

    // How it works
    how_eyebrow: 'How It Works',
    how_title: 'Three Steps to Start Your Journey',
    how_desc: 'The process is kept short so new users can operate quickly.',
    how_s1_title: 'Discover Tours',
    how_s1_text: 'Browse local tours, read real reviews and choose the experience that fits you.',
    how_s2_title: 'Easy Booking',
    how_s2_text: 'Select a date, fill in your contact details and confirm your booking in just a few simple steps.',
    how_s3_title: 'Real Experience',
    how_s3_text: 'Join the tour and share your honest review to help the travel community keep improving.',

    // Community
    community_eyebrow: 'Community',
    community_title: 'Share Your Journey',
    community_view_all: 'View All Posts',

    // Host register
    host_eyebrow: 'For Hosts',
    host_title: 'Become a host and share your local experiences',
    host_desc: 'Fill in the registration form and we will contact you for verification within 24 hours.',
    host_name: 'Full Name',
    host_email: 'Email',
    host_phone: 'Phone Number',
    host_address: 'Home Address',
    host_id: 'National ID / Passport',
    host_exp_location: 'Operating Location',
    host_exp_desc: 'Describe the experience you want to share',
    host_submit: 'Submit Application',
    host_submitting: 'Submitting...',

    // Review
    review_eyebrow: 'Reviews',
    review_title: 'Customer Reviews',
    review_desc: 'Logged-in users can submit a rating and comment. The average tour rating is updated automatically based on customer feedback.',
    review_submit_title: 'Submit Your Review',
    review_select_tour: 'Select Tour',
    review_comment_placeholder: 'Share your experience...',
    review_submit: 'Submit Review',
    review_submitting: 'Submitting...',
    review_login_required: 'Please log in to submit a review.',

    // Footer
    footer_desc: 'A local tour booking platform in Vietnam with a simple and transparent process.',
    footer_links: 'Quick Links',
    footer_contact: 'Contact',
    footer_rights: 'All rights reserved.',

    // FAQ
    faq_eyebrow: 'FAQ',
    faq_title: 'Frequently Asked Questions',
    faq_q1: 'Can I book a tour without logging in?',
    faq_a1: 'Guests can view all tours and reviews without logging in, but must log in or register before booking and submitting reviews.',
    faq_q2: 'How is the star rating calculated?',
    faq_a2: 'New tours default to 0 stars. When a user submits a review, the system automatically calculates the average score and increments the review count.',
    faq_q3: 'Can I cancel my booking?',
    faq_a3: 'Users can cancel pending bookings. Once confirmed, you should contact support to reschedule.',

    // Bookings (user profile)
    booking_my: 'My Bookings',
    booking_tour: 'Tour',
    booking_date: 'Departure Date',
    booking_guests: 'Guests',
    booking_total: 'Total',
    booking_status: 'Status',
    
    // Host Tabs
    host_tab_overview: 'Overview',
    host_tab_experiences: 'Experiences',
    host_tab_bookings: 'Bookings',
    host_tab_reviews: 'Reviews',
    host_tab_profile: 'Profile',
    booking_status_confirmed: 'Confirmed',
    booking_status_cancelled: 'Cancelled',
    booking_payment_unpaid: 'Unpaid',
    booking_payment_paid: 'Paid',
    booking_payment_refunded: 'Refunded',

    // Misc
    loading: 'Loading...',
    error_generic: 'An error occurred. Please try again.',
    back_home: 'Back to Home',
    preparing: 'Preparing your journey...',
    explore_with: 'Explore the world with',
  }
} as const;

export type TranslationKey = keyof typeof translations['vi'];

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'vi',
  setLang: () => {},
  t: (key) => translations.vi[key]
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'vi';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key: TranslationKey): string => translations[lang][key];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
