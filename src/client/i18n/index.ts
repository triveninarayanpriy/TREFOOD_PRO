import { useSyncExternalStore } from 'react';

export const defaultNS = 'translation';
export type SupportedLanguage = 'en' | 'hinglish' | 'hi';

export const resources = {
  en: {
    translation: {
      brand: 'TreFood',
      campus: 'NIT Patna',
      tagline: 'Hyperlocal Campus Delivery',
      zero_delivery_fee: 'Zero Delivery Fee',
      pay_at_gate: 'Pay at Gate',
      curfew_aware: 'Curfew Aware',
      select_gate: 'Select Hostel Gate',
      current_gate: 'Current Gate',
      change: 'Change',
      browse_menu: 'Browse menus',
      search_placeholder: 'Search for food, fruits, snacks, groceries...',
      veg_only: 'Veg only',
      open_now: 'Open now',
      under_100: 'Under ₹100',
      fastest: 'Fastest',
      rating: 'Rating',
      prep_time: '{{min}} mins',
      categories: {
        all: 'All',
        meals: 'Meals',
        snacks: 'Snacks',
        fruits: 'Fruits',
        groceries: 'Groceries',
        vegetables: 'Vegetables',
        raw_chicken: 'Raw Chicken',
        late_night: 'Late Night',
        beverages: 'Drinks & Juice',
      },
      status: {
        placed: 'Order Placed',
        accepted: 'Accepted',
        preparing: 'Preparing',
        out_for_delivery: 'Out for delivery',
        at_gate: 'At Gate',
        at_your_gate: 'At your gate',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
        expired: 'Expired',
      },
      statusSub: {
        placed: 'Sent to vendor counter tablet',
        accepted: 'Kitchen confirmed your order',
        preparing: 'Freshly packed & sealed with code',
        out_for_delivery: 'On the way to your campus gate',
        at_gate: 'Match the 4-digit code on the packet',
        delivered: 'Handover confirmed at the gate',
      },
      ticket: {
        handover_code: 'Match 4-Digit Code at Gate',
        match_digits_notice: 'Confirm that this 4-digit code matches the label on your food packet.',
        confirm_checkbox: 'The 4 digits on my packet match',
        confirm_delivery: 'Confirm received',
        packet_arrived: 'Your packet has reached the gate!',
        updated_just_now: 'Updated just now',
        report_problem: 'Report a problem',
        reorder: 'Reorder',
        rate_review: 'Rate & Review',
        active_tab: 'Active',
        past_tab: 'Past',
      },
      cart: {
        title: 'Your Packet',
        empty: 'Your cart is empty',
        empty_hint: 'Explore campus vendors and add dishes or items.',
        subtotal: 'Subtotal',
        delivery_fee: 'Delivery Fee',
        free: 'FREE',
        total: 'To Collect at Gate',
        checkout: 'Proceed to Checkout',
        clear: 'Clear Cart',
      },
      checkout: {
        title: 'Checkout & Sign In',
        campus_email: 'Campus Email',
        campus_email_hint: 'Only @nitp.ac.in addresses can place orders',
        get_otp: 'Send 6-Digit OTP',
        enter_otp: 'Enter Verification Code',
        verify: 'Verify & Place Order',
        demo_student_btn: '1-Tap Demo Student Login',
        demo_mode_active: 'DEMO MODE ACTIVE',
        place_order: 'Place Order (Pay at Gate)',
      },
      nav: {
        home: 'Home',
        browse: 'Browse menus',
        menus: 'Menus',
        favorites: 'Favourites',
        orders: 'Orders',
        account: 'Account',
        vendor: 'Vendor Console',
        admin: 'Admin',
        how_it_works: 'How it works',
        for_vendors: 'For vendors',
        safety: 'Safety',
        faq: 'FAQ',
      },
      common: {
        loading: 'Loading...',
        retry: 'Retry',
        back: 'Back',
        save: 'Save',
        cancel: 'Cancel',
        close: 'Close',
        delete: 'Delete',
      },
    },
  },
  hinglish: {
    translation: {
      brand: 'TreFood',
      campus: 'NIT Patna',
      tagline: 'Campus Gate Tak Seedhi Delivery',
      zero_delivery_fee: '₹0 Delivery Fee',
      pay_at_gate: 'Gate Par Pay Karein',
      curfew_aware: 'Curfew-Aware Routing',
      select_gate: 'Hostel Gate Chunein',
      current_gate: 'Abhi Ka Gate',
      change: 'Badlein',
      browse_menu: 'Menus Dekho',
      search_placeholder: 'Khana, fal, chai, snacks ya kirana dhoondho...',
      veg_only: 'Sirf Veg',
      open_now: 'Abhi Open Hai',
      under_100: '₹100 Ke Andar',
      fastest: 'Sabse Tez',
      rating: 'Rating',
      prep_time: '{{min}} min',
      categories: {
        all: 'Sab',
        meals: 'Khana / Thali',
        snacks: 'Snacks & Chai',
        fruits: 'Fresh Fruits',
        groceries: 'Roz ka Kirana',
        vegetables: 'Sabziyan',
        raw_chicken: 'Raw Chicken',
        late_night: 'Late Night',
        beverages: 'Juice & Drinks',
      },
      status: {
        placed: 'Order Bhej Diya',
        accepted: 'Accept Ho Gaya',
        preparing: 'Ban Raha Hai',
        out_for_delivery: 'Gate Ke Raaste Mein',
        at_gate: 'Gate Par Pahuncha!',
        at_your_gate: 'Aapke gate par aa gaya',
        delivered: 'Handover Complete',
        cancelled: 'Cancel Ho Gaya',
        expired: 'Time Khatam',
      },
      statusSub: {
        placed: 'Vendor counter tablet par pahuncha',
        accepted: 'Kitchen ne order confirm kar diya',
        preparing: 'Garam pack aur 4-digit code likh rahe hain',
        out_for_delivery: 'Staff aapke hostel gate aa raha hai',
        at_gate: 'Packet par likha 4-digit code match karein',
        delivered: 'Gate par packet handover confirm hua',
      },
      ticket: {
        handover_code: '4-Digit Handover Code',
        match_digits_notice: 'Gate par sealed packet ka code is screen se match karke confirm karein.',
        confirm_checkbox: 'Mere packet par yehi 4 digits likhe hain',
        confirm_delivery: 'Packet Mil Gaya (Confirm)',
        packet_arrived: 'Aapka packet gate par pahunch gaya hai!',
        updated_just_now: 'Abhi update hua',
        report_problem: 'Problem Report Karein',
        reorder: 'Phir Se Mangwayein',
        rate_review: 'Rate aur Review Karein',
        active_tab: 'Active',
        past_tab: 'Purane Orders',
      },
      cart: {
        title: 'Aapka Packet',
        empty: 'Cart khali hai',
        empty_hint: 'Campus dukaano se khana ya zaroori samaan add karein.',
        subtotal: 'Items Total',
        delivery_fee: 'Delivery Charge',
        free: 'FREE',
        total: 'Gate Par Dena Hai',
        checkout: 'Checkout Karein',
        clear: 'Cart Khali Karein',
      },
      checkout: {
        title: 'Checkout aur Sign In',
        campus_email: 'Campus Email',
        campus_email_hint: 'Sirf @nitp.ac.in email se order ho sakta hai',
        get_otp: '6-Digit OTP Bhejo',
        enter_otp: 'OTP Daalein',
        verify: 'Verify Karke Order Bhejo',
        demo_student_btn: '1-Tap Demo Student Login',
        demo_mode_active: 'DEMO MODE ON',
        place_order: 'Order Confirm Karein (Gate Par Pay)',
      },
      nav: {
        home: 'Home',
        browse: 'Menus Dekho',
        menus: 'Menus Dekho',
        favorites: 'Saved Shops',
        orders: 'Mere Orders',
        account: 'Account',
        vendor: 'Vendor Counter',
        admin: 'Admin Panel',
        how_it_works: 'Kaise chalta hai',
        for_vendors: 'Dukaandaar',
        safety: 'Night Safety',
        faq: 'Sawaal-Jawaab',
      },
      common: {
        loading: 'Load ho raha hai...',
        retry: 'Phir Try Karein',
        back: 'Peeche',
        save: 'Save Karein',
        cancel: 'Cancel',
        close: 'Band Karein',
        delete: 'Hatayein',
      },
    },
  },
  hi: {
    translation: {
      brand: 'ट्रीफूड',
      campus: 'एनआईटी पटना',
      tagline: 'कैंपस हाइपरलोकल डिलीवरी',
      zero_delivery_fee: 'शून्य डिलीवरी शुल्क',
      pay_at_gate: 'गेट पर भुगतान करें',
      curfew_aware: 'कर्फ्यू जागरूक',
      select_gate: 'हॉस्टल गेट चुनें',
      current_gate: 'वर्तमान गेट',
      change: 'बदलें',
      browse_menu: 'मेन्यू देखें',
      search_placeholder: 'खाना, फल, चाय, नाश्ता या राशन खोजें...',
      veg_only: 'सिर्फ शाकाहारी',
      open_now: 'खुला है',
      under_100: '₹100 से कम',
      fastest: 'सबसे तेज',
      rating: 'रेटिंग',
      prep_time: '{{min}} मिनट',
      categories: {
        all: 'सभी',
        meals: 'भोजन',
        snacks: 'नाश्ता',
        fruits: 'फल',
        groceries: 'किराना',
        vegetables: 'सब्जियां',
        raw_chicken: 'कच्चा चिकन',
        late_night: 'मिडनाइट',
        beverages: 'पेय और जूस',
      },
      status: {
        placed: 'ऑर्डर भेजा गया',
        accepted: 'स्वीकार हुआ',
        preparing: 'तैयार हो रहा है',
        out_for_delivery: 'रास्ते में है',
        at_gate: 'गेट पर पहुंचा',
        at_your_gate: 'आपके गेट पर पहुंचा',
        delivered: 'डिलीवर हुआ',
        cancelled: 'रद्द हुआ',
        expired: 'समाप्त',
      },
      statusSub: {
        placed: 'वेंडर काउंटर टैबलेट पर भेजा गया',
        accepted: 'रसोई ने आपका ऑर्डर कन्फर्म किया',
        preparing: 'ताज़ा पैक होकर 4-अंकों का कोड लिखा जा रहा है',
        out_for_delivery: 'स्टाफ आपके कैंपस गेट की ओर आ रहा है',
        at_gate: 'पैकेट पर लिखे 4-अंकों के कोड का मिलान करें',
        delivered: 'गेट पर हैंडओवर कन्फर्म हुआ',
      },
      ticket: {
        handover_code: 'हैंडओवर कोड',
        match_digits_notice: 'गेट पर पैकेट के 4 अंक मिलाकर डिलीवरी लें',
        confirm_checkbox: 'मेरे पैकेट के 4 अंक मेल खाते हैं',
        confirm_delivery: 'डिलीवरी प्राप्त की',
        packet_arrived: 'आपका पैकेट गेट पर पहुंच गया है!',
        updated_just_now: 'अभी-अभी अपडेट हुआ',
        report_problem: 'समस्या की रिपोर्ट करें',
        reorder: 'फिर से ऑर्डर करें',
        rate_review: 'रेटिंग व समीक्षा',
        active_tab: 'सक्रिय',
        past_tab: 'पुराने',
      },
      cart: {
        title: 'आपकी टोकरी',
        empty: 'टोकरी खाली है',
        empty_hint: 'कैंपस वेंडरों से व्यंजन या सामान जोड़ें।',
        subtotal: 'सामग्री मूल्य',
        delivery_fee: 'डिलीवरी शुल्क',
        free: 'मुफ्त',
        total: 'गेट पर देय राशि',
        checkout: 'ऑर्डर करने के लिए आगे बढ़ें',
        clear: 'टोकरी खाली करें',
      },
      checkout: {
        title: 'चेकआउट और साइन-इन',
        campus_email: 'कैंपस ईमेल',
        campus_email_hint: 'केवल @nitp.ac.in ईमेल से ऑर्डर कर सकते हैं',
        get_otp: '6 अंकों का ओटीपी भेजें',
        enter_otp: 'ओटीपी दर्ज करें',
        verify: 'सत्यापित करें और ऑर्डर दें',
        demo_student_btn: 'डेमो छात्र के रूप में 1-टैप साइन-इन',
        demo_mode_active: 'डेमो मोड सक्रिय',
        place_order: 'ऑर्डर दें (गेट पर नकद/यूपीआई)',
      },
      nav: {
        home: 'होम',
        browse: 'ब्राउज़',
        menus: 'मेन्यू देखें',
        favorites: 'पसंदीदा',
        orders: 'ऑर्डर',
        account: 'खाता',
        vendor: 'वेंडर बोर्ड',
        admin: 'एडमिन',
        how_it_works: 'कैसे काम करता है',
        for_vendors: 'वेंडर बनें',
        safety: 'रात्रि सुरक्षा',
        faq: 'सवाल-जवाब',
      },
      common: {
        loading: 'लोड हो रहा है...',
        retry: 'पुनः प्रयास करें',
        back: 'पीछे',
        save: 'सुरक्षित करें',
        cancel: 'रद्द करें',
        close: 'बंद करें',
        delete: 'हटाएं',
      },
    },
  },
} as const;

const savedRaw = typeof window !== 'undefined' ? localStorage.getItem('trefood_lang') : null;
let currentLanguage: SupportedLanguage =
  savedRaw === 'hinglish' || savedRaw === 'hi' || savedRaw === 'en' ? savedRaw : 'en';

const listeners = new Set<() => void>();

function lookupKey(lang: SupportedLanguage, key: string): string | undefined {
  const parts = key.split('.');
  let node: unknown = resources[lang]?.translation;
  for (const part of parts) {
    if (!node || typeof node !== 'object' || !(part in node)) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function translate(
  key: string,
  fallback?: string,
  lang: SupportedLanguage = currentLanguage
): string {
  return lookupKey(lang, key) ?? lookupKey('en', key) ?? fallback ?? key;
}

export const i18n = {
  get language(): SupportedLanguage {
    return currentLanguage;
  },
  changeLanguage(nextLang: string) {
    const normalized: SupportedLanguage =
      nextLang === 'hinglish' || nextLang === 'hi' || nextLang === 'en' ? nextLang : 'en';
    if (normalized === currentLanguage) return Promise.resolve();
    currentLanguage = normalized;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('trefood_lang', normalized);
      } catch {
        // ignore storage quota errors
      }
    }
    listeners.forEach((listener) => listener());
    return Promise.resolve();
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SupportedLanguage {
  return currentLanguage;
}

export function useTranslation() {
  const lang = useSyncExternalStore<SupportedLanguage>(
    subscribe,
    getSnapshot,
    () => 'en'
  );
  return {
    t: (key: string, fallback?: string) => translate(key, fallback, lang),
    i18n: {
      language: lang,
      changeLanguage: i18n.changeLanguage,
    },
  };
}

export default i18n;
