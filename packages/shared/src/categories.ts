import type { Bilingual, Category, CategoryField, ModelType } from './types.ts';

// All categories, sub-categories and category-specific form fields.
// This is the seed data. After launch, categories are managed from the
// admin panel (Categories manager).

export const models: { key: ModelType; name: Bilingual; billing: 'per_duration' | 'two_months' }[] = [
  { key: 'buy_sell', name: { en: 'Buy and Sell', ur: 'خرید و فروخت' }, billing: 'per_duration' },
  { key: 'vehicles', name: { en: 'Vehicles', ur: 'گاڑیاں' }, billing: 'per_duration' },
  { key: 'property', name: { en: 'Property', ur: 'پراپرٹی' }, billing: 'per_duration' },
  { key: 'jobs', name: { en: 'Jobs', ur: 'نوکریاں' }, billing: 'per_duration' },
  { key: 'services', name: { en: 'Service Providers', ur: 'سروسز' }, billing: 'two_months' },
  { key: 'business', name: { en: 'Business Directory', ur: 'کاروبار' }, billing: 'two_months' },
];

// ---------- reusable option lists ----------

const yesNo = (en: string, ur: string): CategoryField => ({
  key: en.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
  label: { en, ur },
  type: 'boolean',
});

const condition: CategoryField = {
  key: 'condition',
  label: { en: 'Condition', ur: 'حالت' },
  type: 'select',
  required: true,
  options: [
    { en: 'New', ur: 'نیا' },
    { en: 'Used', ur: 'استعمال شدہ' },
  ],
};

const fuel: CategoryField = {
  key: 'fuel',
  label: { en: 'Fuel', ur: 'ایندھن' },
  type: 'select',
  options: [
    { en: 'Petrol', ur: 'پیٹرول' },
    { en: 'Diesel', ur: 'ڈیزل' },
    { en: 'CNG', ur: 'سی این جی' },
    { en: 'Hybrid', ur: 'ہائبرڈ' },
    { en: 'Electric', ur: 'الیکٹرک' },
  ],
};

const vehicleFields: CategoryField[] = [
  condition,
  { key: 'make', label: { en: 'Make', ur: 'کمپنی' }, type: 'text', required: true },
  { key: 'model', label: { en: 'Model', ur: 'ماڈل' }, type: 'text', required: true },
  { key: 'year', label: { en: 'Year', ur: 'سال' }, type: 'year', required: true },
  { key: 'km_driven', label: { en: 'KM driven', ur: 'کتنے کلومیٹر چلی' }, type: 'number', unit: { en: 'km', ur: 'کلومیٹر' } },
  fuel,
  { key: 'registration_city', label: { en: 'Registration city', ur: 'رجسٹریشن شہر' }, type: 'text' },
];

const propertyAreaFields: CategoryField[] = [
  { key: 'area_size', label: { en: 'Area size', ur: 'رقبہ' }, type: 'number', required: true },
  {
    key: 'area_unit',
    label: { en: 'Area unit', ur: 'پیمائش' },
    type: 'select',
    required: true,
    options: [
      { en: 'Marla', ur: 'مرلہ' },
      { en: 'Kanal', ur: 'کنال' },
      { en: 'Acre', ur: 'ایکڑ' },
      { en: 'Square feet', ur: 'مربع فٹ' },
    ],
  },
];

const houseFields: CategoryField[] = [
  ...propertyAreaFields,
  { key: 'bedrooms', label: { en: 'Bedrooms', ur: 'کمرے' }, type: 'number' },
  { key: 'bathrooms', label: { en: 'Bathrooms', ur: 'باتھ روم' }, type: 'number' },
  yesNo('Furnished', 'فرنشڈ'),
];

// ---------- categories ----------

export const categories: Category[] = [
  // ===== Buy and Sell =====
  {
    slug: 'mobiles',
    model: 'buy_sell',
    name: { en: 'Mobiles', ur: 'موبائل' },
    icon: 'mobile',
    showOnHome: true,
    subcategories: [
      { slug: 'mobile-phones', name: { en: 'Mobile Phones', ur: 'موبائل فون' } },
      { slug: 'tablets', name: { en: 'Tablets', ur: 'ٹیبلٹ' } },
      { slug: 'accessories', name: { en: 'Accessories', ur: 'لوازمات' } },
      { slug: 'smart-watches', name: { en: 'Smart Watches', ur: 'سمارٹ گھڑیاں' } },
    ],
    fields: [
      condition,
      { key: 'brand', label: { en: 'Brand', ur: 'برانڈ' }, type: 'text' },
      { key: 'storage', label: { en: 'Storage', ur: 'اسٹوریج' }, type: 'text' },
      yesNo('PTA approved', 'پی ٹی اے منظور شدہ'),
    ],
  },
  {
    slug: 'electronics',
    model: 'buy_sell',
    name: { en: 'Electronics and Home Appliances', ur: 'الیکٹرانکس اور گھریلو سامان' },
    icon: 'electronics',
    showOnHome: true,
    subcategories: [
      { slug: 'tv', name: { en: 'TV and Video', ur: 'ٹی وی' } },
      { slug: 'fridge', name: { en: 'Fridge and Freezer', ur: 'فریج اور فریزر' } },
      { slug: 'ac', name: { en: 'AC and Coolers', ur: 'اے سی اور کولر' } },
      { slug: 'washing-machine', name: { en: 'Washing Machines', ur: 'واشنگ مشین' } },
      { slug: 'computers', name: { en: 'Computers and Laptops', ur: 'کمپیوٹر اور لیپ ٹاپ' } },
      { slug: 'cameras', name: { en: 'Cameras', ur: 'کیمرے' } },
      { slug: 'solar', name: { en: 'Solar Panels', ur: 'سولر پینل' } },
      { slug: 'ups-batteries', name: { en: 'UPS and Batteries', ur: 'یو پی ایس اور بیٹریاں' } },
      { slug: 'kitchen-appliances', name: { en: 'Kitchen Appliances', ur: 'کچن کا سامان' } },
      { slug: 'other-electronics', name: { en: 'Other Electronics', ur: 'دیگر الیکٹرانکس' } },
    ],
    fields: [condition, { key: 'brand', label: { en: 'Brand', ur: 'برانڈ' }, type: 'text' }],
  },
  {
    slug: 'furniture',
    model: 'buy_sell',
    name: { en: 'Furniture and Home Decor', ur: 'فرنیچر اور گھر کی سجاوٹ' },
    icon: 'furniture',
    showOnHome: true,
    subcategories: [
      { slug: 'sofa', name: { en: 'Sofa and Chairs', ur: 'صوفہ اور کرسیاں' } },
      { slug: 'beds', name: { en: 'Beds and Wardrobes', ur: 'بیڈ اور الماریاں' } },
      { slug: 'tables', name: { en: 'Tables and Dining', ur: 'میز اور ڈائننگ' } },
      { slug: 'office-furniture', name: { en: 'Office Furniture', ur: 'دفتری فرنیچر' } },
      { slug: 'home-decor', name: { en: 'Home Decor', ur: 'گھر کی سجاوٹ' } },
      { slug: 'rugs', name: { en: 'Rugs and Carpets', ur: 'قالین' } },
    ],
    fields: [condition],
  },
  {
    slug: 'fashion',
    model: 'buy_sell',
    name: { en: 'Fashion and Beauty', ur: 'فیشن اور بیوٹی' },
    icon: 'fashion',
    showOnHome: true,
    subcategories: [
      { slug: 'men', name: { en: 'Men Clothing', ur: 'مردانہ کپڑے' } },
      { slug: 'women', name: { en: 'Women Clothing', ur: 'زنانہ کپڑے' } },
      { slug: 'kids-clothing', name: { en: 'Kids Clothing', ur: 'بچوں کے کپڑے' } },
      { slug: 'shoes', name: { en: 'Shoes', ur: 'جوتے' } },
      { slug: 'jewelry', name: { en: 'Jewelry', ur: 'زیورات' } },
      { slug: 'watches', name: { en: 'Watches', ur: 'گھڑیاں' } },
      { slug: 'cosmetics', name: { en: 'Cosmetics', ur: 'کاسمیٹکس' } },
    ],
    fields: [condition],
  },
  {
    slug: 'books-hobbies',
    model: 'buy_sell',
    name: { en: 'Books, Sports and Hobbies', ur: 'کتابیں، کھیل اور مشغلے' },
    icon: 'books',
    showOnHome: true,
    subcategories: [
      { slug: 'books', name: { en: 'Books', ur: 'کتابیں' } },
      { slug: 'sports', name: { en: 'Sports Equipment', ur: 'کھیلوں کا سامان' } },
      { slug: 'gym', name: { en: 'Gym and Fitness', ur: 'جم اور فٹنس' } },
      { slug: 'musical-instruments', name: { en: 'Musical Instruments', ur: 'آلاتِ موسیقی' } },
      { slug: 'collectibles', name: { en: 'Collectibles', ur: 'نوادرات' } },
    ],
    fields: [condition],
  },
  {
    slug: 'kids',
    model: 'buy_sell',
    name: { en: 'Kids', ur: 'بچوں کا سامان' },
    icon: 'kids',
    showOnHome: true,
    subcategories: [
      { slug: 'toys', name: { en: 'Toys', ur: 'کھلونے' } },
      { slug: 'baby-gear', name: { en: 'Baby Gear and Prams', ur: 'بچوں کا سامان اور پرام' } },
      { slug: 'kids-furniture', name: { en: 'Kids Furniture', ur: 'بچوں کا فرنیچر' } },
    ],
    fields: [condition],
  },
  {
    slug: 'animals',
    model: 'buy_sell',
    name: { en: 'Mawaishi (Animals)', ur: 'مویشی' },
    icon: 'animals',
    showOnHome: true,
    subcategories: [
      { slug: 'cows', name: { en: 'Cows', ur: 'گائے' } },
      { slug: 'buffaloes', name: { en: 'Buffaloes', ur: 'بھینسیں' } },
      { slug: 'goats', name: { en: 'Goats', ur: 'بکریاں' } },
      { slug: 'sheep', name: { en: 'Sheep', ur: 'بھیڑیں' } },
      { slug: 'qurbani', name: { en: 'Qurbani Animals', ur: 'قربانی کے جانور' } },
      { slug: 'poultry', name: { en: 'Hens and Poultry', ur: 'مرغیاں' } },
      { slug: 'birds', name: { en: 'Birds', ur: 'پرندے' } },
      { slug: 'pets', name: { en: 'Pets', ur: 'پالتو جانور' } },
      { slug: 'animal-feed', name: { en: 'Animal Feed', ur: 'جانوروں کی خوراک' } },
    ],
    fields: [
      { key: 'breed', label: { en: 'Breed', ur: 'نسل' }, type: 'text' },
      { key: 'age', label: { en: 'Age', ur: 'عمر' }, type: 'text' },
      { key: 'weight', label: { en: 'Weight', ur: 'وزن' }, type: 'number', unit: { en: 'kg', ur: 'کلو' } },
      { key: 'milk_per_day', label: { en: 'Milk per day', ur: 'روزانہ دودھ' }, type: 'number', unit: { en: 'litres', ur: 'لیٹر' } },
    ],
  },
  {
    slug: 'agriculture',
    model: 'buy_sell',
    name: { en: 'Zarai (Agriculture)', ur: 'زرعی' },
    icon: 'agriculture',
    showOnHome: true,
    subcategories: [
      { slug: 'seeds', name: { en: 'Seeds', ur: 'بیج' } },
      { slug: 'fertilizer', name: { en: 'Fertilizer', ur: 'کھاد' } },
      { slug: 'agri-tools', name: { en: 'Agri Tools', ur: 'زرعی اوزار' } },
      { slug: 'tube-wells', name: { en: 'Tube Wells and Motors', ur: 'ٹیوب ویل اور موٹریں' } },
      { slug: 'crops', name: { en: 'Crops and Produce', ur: 'فصلیں اور اجناس' } },
    ],
    fields: [condition],
  },
  {
    slug: 'business-industrial',
    model: 'buy_sell',
    name: { en: 'Business and Industrial', ur: 'کاروباری اور صنعتی سامان' },
    icon: 'industrial',
    showOnHome: false,
    subcategories: [
      { slug: 'machinery', name: { en: 'Machinery', ur: 'مشینری' } },
      { slug: 'shop-equipment', name: { en: 'Shop Equipment', ur: 'دکان کا سامان' } },
      { slug: 'raw-material', name: { en: 'Raw Material', ur: 'خام مال' } },
      { slug: 'wholesale', name: { en: 'Wholesale Stock', ur: 'ہول سیل مال' } },
    ],
    fields: [condition],
  },
  {
    slug: 'other',
    model: 'buy_sell',
    name: { en: 'Other', ur: 'دیگر' },
    icon: 'other',
    showOnHome: false,
    subcategories: [{ slug: 'other-items', name: { en: 'Other Items', ur: 'دیگر اشیاء' } }],
    fields: [condition],
  },

  // ===== Vehicles =====
  {
    slug: 'vehicles',
    model: 'vehicles',
    name: { en: 'Vehicles', ur: 'گاڑیاں' },
    icon: 'car',
    showOnHome: true,
    subcategories: [
      { slug: 'cars', name: { en: 'Cars', ur: 'کاریں' } },
      { slug: 'motorcycles', name: { en: 'Motorcycles', ur: 'موٹر سائیکل' } },
      { slug: 'rickshaws', name: { en: 'Rickshaws and Loaders', ur: 'رکشہ اور لوڈر' } },
      { slug: 'tractors', name: { en: 'Tractors and Trolleys', ur: 'ٹریکٹر اور ٹرالی' } },
      { slug: 'bicycles', name: { en: 'Bicycles', ur: 'سائیکل' } },
      { slug: 'buses-vans', name: { en: 'Buses and Vans', ur: 'بسیں اور ویگنیں' } },
      { slug: 'spare-parts', name: { en: 'Spare Parts', ur: 'اسپیئر پارٹس' } },
      { slug: 'vehicle-accessories', name: { en: 'Accessories', ur: 'لوازمات' } },
    ],
    fields: vehicleFields,
  },

  // ===== Property =====
  {
    slug: 'property-sale',
    model: 'property',
    name: { en: 'Property for Sale', ur: 'برائے فروخت پراپرٹی' },
    icon: 'home',
    showOnHome: true,
    subcategories: [
      { slug: 'houses', name: { en: 'Houses', ur: 'مکان' } },
      { slug: 'plots', name: { en: 'Plots', ur: 'پلاٹ' } },
      { slug: 'shops', name: { en: 'Shops', ur: 'دکانیں' } },
      { slug: 'commercial', name: { en: 'Commercial', ur: 'کمرشل' } },
      { slug: 'agricultural-land', name: { en: 'Agricultural Land', ur: 'زرعی زمین' } },
    ],
    fields: houseFields,
  },
  {
    slug: 'property-rent',
    model: 'property',
    name: { en: 'Property for Rent', ur: 'کرائے پر پراپرٹی' },
    icon: 'home-rent',
    showOnHome: true,
    subcategories: [
      { slug: 'houses-rent', name: { en: 'Houses', ur: 'مکان' } },
      { slug: 'portions', name: { en: 'Upper / Lower Portions', ur: 'پورشن' } },
      { slug: 'rooms', name: { en: 'Rooms', ur: 'کمرے' } },
      { slug: 'shops-rent', name: { en: 'Shops', ur: 'دکانیں' } },
      { slug: 'offices', name: { en: 'Offices', ur: 'دفاتر' } },
      { slug: 'hostels', name: { en: 'Hostels', ur: 'ہاسٹل' } },
      { slug: 'warehouses', name: { en: 'Warehouses', ur: 'گودام' } },
    ],
    fields: [
      ...houseFields,
      { key: 'monthly_rent', label: { en: 'Monthly rent', ur: 'ماہانہ کرایہ' }, type: 'number', unit: { en: 'Rs', ur: 'روپے' } },
    ],
  },

  // ===== Jobs =====
  {
    slug: 'jobs',
    model: 'jobs',
    name: { en: 'Jobs', ur: 'نوکریاں' },
    icon: 'briefcase',
    showOnHome: true,
    subcategories: [
      { slug: 'sales', name: { en: 'Sales', ur: 'سیلز' } },
      { slug: 'driver', name: { en: 'Driver', ur: 'ڈرائیور' } },
      { slug: 'teacher', name: { en: 'Teacher and Tutor', ur: 'استاد اور ٹیوٹر' } },
      { slug: 'office', name: { en: 'Office and Admin', ur: 'دفتری کام' } },
      { slug: 'it', name: { en: 'IT and Computer', ur: 'آئی ٹی اور کمپیوٹر' } },
      { slug: 'accountant', name: { en: 'Accountant', ur: 'اکاؤنٹنٹ' } },
      { slug: 'labour', name: { en: 'Labour', ur: 'مزدوری' } },
      { slug: 'security', name: { en: 'Security Guard', ur: 'سیکیورٹی گارڈ' } },
      { slug: 'domestic', name: { en: 'Cook and Domestic', ur: 'باورچی اور گھریلو ملازم' } },
      { slug: 'medical', name: { en: 'Medical', ur: 'میڈیکل' } },
      { slug: 'part-time', name: { en: 'Part-time', ur: 'پارٹ ٹائم' } },
      { slug: 'other-jobs', name: { en: 'Other Jobs', ur: 'دیگر نوکریاں' } },
    ],
    fields: [
      {
        key: 'job_post_type',
        label: { en: 'Ad type', ur: 'اشتہار کی قسم' },
        type: 'select',
        required: true,
        options: [
          { en: 'Hiring', ur: 'ملازم چاہیے' },
          { en: 'Looking for work', ur: 'نوکری چاہیے' },
        ],
      },
      {
        key: 'job_type',
        label: { en: 'Job type', ur: 'نوکری کی قسم' },
        type: 'select',
        options: [
          { en: 'Full-time', ur: 'فل ٹائم' },
          { en: 'Part-time', ur: 'پارٹ ٹائم' },
          { en: 'Contract', ur: 'کنٹریکٹ' },
        ],
      },
      { key: 'salary_from', label: { en: 'Salary from', ur: 'تنخواہ (کم از کم)' }, type: 'number', unit: { en: 'Rs', ur: 'روپے' } },
      { key: 'salary_to', label: { en: 'Salary to', ur: 'تنخواہ (زیادہ سے زیادہ)' }, type: 'number', unit: { en: 'Rs', ur: 'روپے' } },
      { key: 'experience', label: { en: 'Experience', ur: 'تجربہ' }, type: 'text' },
    ],
  },

  // ===== Service Providers =====
  {
    slug: 'services',
    model: 'services',
    name: { en: 'Services', ur: 'سروسز' },
    icon: 'tools',
    showOnHome: true,
    subcategories: [
      { slug: 'plumber', name: { en: 'Plumber', ur: 'پلمبر' } },
      { slug: 'electrician', name: { en: 'Electrician', ur: 'الیکٹریشن' } },
      { slug: 'ac-mechanic', name: { en: 'AC / Fridge Mechanic', ur: 'اے سی / فریج مکینک' } },
      { slug: 'carpenter', name: { en: 'Carpenter', ur: 'بڑھئی' } },
      { slug: 'painter', name: { en: 'Painter', ur: 'پینٹر' } },
      { slug: 'mason', name: { en: 'Mason (Mistri)', ur: 'مستری' } },
      { slug: 'welder', name: { en: 'Welder', ur: 'ویلڈر' } },
      { slug: 'auto-mechanic', name: { en: 'Auto Mechanic', ur: 'گاڑیوں کا مکینک' } },
      { slug: 'mobile-repair', name: { en: 'Mobile / Computer Repair', ur: 'موبائل / کمپیوٹر مرمت' } },
      { slug: 'cctv', name: { en: 'CCTV Installer', ur: 'سی سی ٹی وی' } },
      { slug: 'solar-installer', name: { en: 'Solar Installer', ur: 'سولر انسٹالر' } },
      { slug: 'tutor', name: { en: 'Tutor and Academy', ur: 'ٹیوٹر اور اکیڈمی' } },
      { slug: 'tailor', name: { en: 'Tailor (Darzi)', ur: 'درزی' } },
      { slug: 'beautician', name: { en: 'Beautician and Salon', ur: 'بیوٹیشن اور سیلون' } },
      { slug: 'catering', name: { en: 'Catering', ur: 'کیٹرنگ' } },
      { slug: 'tent-decor', name: { en: 'Tent and Decor', ur: 'ٹینٹ اور سجاوٹ' } },
      { slug: 'movers', name: { en: 'Movers and Packers', ur: 'سامان کی منتقلی' } },
      { slug: 'cleaning', name: { en: 'Cleaning', ur: 'صفائی' } },
      { slug: 'pest-control', name: { en: 'Pest Control', ur: 'کیڑے مار سپرے' } },
      { slug: 'photographer', name: { en: 'Photographer', ur: 'فوٹوگرافر' } },
      { slug: 'driver-on-call', name: { en: 'Driver on Call', ur: 'ڈرائیور آن کال' } },
      { slug: 'other-services', name: { en: 'Other Services', ur: 'دیگر سروسز' } },
    ],
    fields: [
      { key: 'experience_years', label: { en: 'Experience (years)', ur: 'تجربہ (سال)' }, type: 'number' },
      { key: 'areas_served', label: { en: 'Areas served', ur: 'کن علاقوں میں کام' }, type: 'text' },
      { key: 'timings', label: { en: 'Timings', ur: 'اوقات' }, type: 'text' },
      { key: 'starting_rate', label: { en: 'Starting rate', ur: 'ابتدائی ریٹ' }, type: 'number', unit: { en: 'Rs', ur: 'روپے' } },
    ],
  },

  // ===== Business Directory =====
  {
    slug: 'business',
    model: 'business',
    name: { en: 'Business Directory', ur: 'کاروبار' },
    icon: 'store',
    showOnHome: true,
    subcategories: [
      { slug: 'shops-stores', name: { en: 'Shops and Stores', ur: 'دکانیں اور اسٹور' } },
      { slug: 'restaurants', name: { en: 'Restaurants and Food', ur: 'ریسٹورنٹ اور کھانا' } },
      { slug: 'clinics', name: { en: 'Clinics and Hospitals', ur: 'کلینک اور ہسپتال' } },
      { slug: 'pharmacies', name: { en: 'Pharmacies', ur: 'میڈیکل اسٹور' } },
      { slug: 'schools', name: { en: 'Schools and Academies', ur: 'اسکول اور اکیڈمیاں' } },
      { slug: 'showrooms', name: { en: 'Showrooms', ur: 'شوروم' } },
      { slug: 'workshops', name: { en: 'Workshops', ur: 'ورکشاپس' } },
      { slug: 'marriage-halls', name: { en: 'Hotels and Marriage Halls', ur: 'ہوٹل اور شادی ہال' } },
      { slug: 'wholesalers', name: { en: 'Wholesalers', ur: 'ہول سیلرز' } },
      { slug: 'offices-banks', name: { en: 'Banks and Offices', ur: 'بینک اور دفاتر' } },
      { slug: 'other-business', name: { en: 'Other Business', ur: 'دیگر کاروبار' } },
    ],
    fields: [
      { key: 'timings', label: { en: 'Opening hours', ur: 'اوقاتِ کار' }, type: 'text' },
      { key: 'address', label: { en: 'Address', ur: 'پتہ' }, type: 'text', required: true },
      { key: 'map_link', label: { en: 'Google Maps link', ur: 'گوگل میپ لنک' }, type: 'text' },
      { key: 'website', label: { en: 'Website', ur: 'ویب سائٹ' }, type: 'text' },
    ],
  },
];

export function findCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function categoriesByModel(model: ModelType): Category[] {
  return categories.filter((c) => c.model === model);
}

export const homeCategories = categories.filter((c) => c.showOnHome);
