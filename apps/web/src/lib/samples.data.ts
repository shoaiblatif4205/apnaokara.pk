// Sample ads (Admin -> Sample ads). Photos come from Pexels (free licence, no attribution needed)
// and are fetched by the server at import time. Generated from .local/sample-ads.json.
export type SampleAd = { cat: string; sub: string; title: string; price: number | null; city: string; fields: Record<string, string | number | boolean>; photo: number };
export const SAMPLE_ADS: SampleAd[] = [
 {
  "cat": "mobiles",
  "sub": "mobile-phones",
  "title": "iPhone 13 128GB PTA approved, 89% battery",
  "price": 118000,
  "city": "okara",
  "fields": {
   "condition": "Used",
   "brand": "Apple",
   "storage": "128GB",
   "pta_approved": true
  },
  "photo": 9727470
 },
 {
  "cat": "mobiles",
  "sub": "mobile-phones",
  "title": "Samsung Galaxy A35 8/256 box pack",
  "price": 84000,
  "city": "sahiwal",
  "fields": {
   "condition": "New",
   "brand": "Samsung",
   "storage": "256GB",
   "pta_approved": true
  },
  "photo": 47261
 },
 {
  "cat": "mobiles",
  "sub": "tablets",
  "title": "iPad 9th generation 64GB with cover",
  "price": 62000,
  "city": "renala-khurd",
  "fields": {
   "condition": "Used",
   "brand": "Apple",
   "storage": "64GB"
  },
  "photo": 10535365
 },
 {
  "cat": "mobiles",
  "sub": "smart-watches",
  "title": "Smart watch, call + heart rate, 10 days used",
  "price": 6500,
  "city": "pakpattan",
  "fields": {
   "condition": "Used",
   "brand": "Haylou"
  },
  "photo": 6373177
 },
 {
  "cat": "electronics",
  "sub": "tv",
  "title": "Samsung 43 inch Smart LED TV, 4K",
  "price": 78000,
  "city": "okara",
  "fields": {
   "condition": "Used",
   "brand": "Samsung"
  },
  "photo": 5202925
 },
 {
  "cat": "electronics",
  "sub": "fridge",
  "title": "Haier double door fridge, medium size",
  "price": 55000,
  "city": "depalpur",
  "fields": {
   "condition": "Used",
   "brand": "Haier"
  },
  "photo": 38853682
 },
 {
  "cat": "electronics",
  "sub": "computers",
  "title": "Dell Core i5 laptop, 8GB RAM, 256 SSD",
  "price": 72000,
  "city": "sahiwal",
  "fields": {
   "condition": "Used",
   "brand": "Dell"
  },
  "photo": 1128207
 },
 {
  "cat": "electronics",
  "sub": "solar",
  "title": "Solar panels 585W (Longi), 6 pieces",
  "price": 180000,
  "city": "chichawatni",
  "fields": {
   "condition": "New",
   "brand": "Longi"
  },
  "photo": 38021376
 },
 {
  "cat": "furniture",
  "sub": "sofa",
  "title": "7 seater sofa set, wooden frame, new foam",
  "price": 65000,
  "city": "okara",
  "fields": {
   "condition": "Used"
  },
  "photo": 12273851
 },
 {
  "cat": "furniture",
  "sub": "beds",
  "title": "King size bed with mattress, sheesham wood",
  "price": 85000,
  "city": "arifwala",
  "fields": {
   "condition": "Used"
  },
  "photo": 15456211
 },
 {
  "cat": "furniture",
  "sub": "tables",
  "title": "Dining table with 6 chairs",
  "price": 48000,
  "city": "sahiwal",
  "fields": {
   "condition": "Used"
  },
  "photo": 3935326
 },
 {
  "cat": "furniture",
  "sub": "office-furniture",
  "title": "Office chair, revolving, almost new",
  "price": 14000,
  "city": "okara",
  "fields": {
   "condition": "Used"
  },
  "photo": 295480
 },
 {
  "cat": "fashion",
  "sub": "women",
  "title": "Bridal lehnga, worn once, heavy work",
  "price": 45000,
  "city": "okara",
  "fields": {
   "condition": "Used"
  },
  "photo": 6358795
 },
 {
  "cat": "fashion",
  "sub": "men",
  "title": "Gents shalwar kameez, wash & wear, 3 suits",
  "price": 7500,
  "city": "depalpur",
  "fields": {
   "condition": "New"
  },
  "photo": 4109759
 },
 {
  "cat": "fashion",
  "sub": "shoes",
  "title": "Leather Peshawari chappal, size 9",
  "price": 3500,
  "city": "pakpattan",
  "fields": {
   "condition": "New"
  },
  "photo": 26954370
 },
 {
  "cat": "fashion",
  "sub": "watches",
  "title": "Men's steel wrist watch, original box",
  "price": 9000,
  "city": "sahiwal",
  "fields": {
   "condition": "New"
  },
  "photo": 9713527
 },
 {
  "cat": "books-hobbies",
  "sub": "books",
  "title": "FSc Pre-Medical complete books set",
  "price": 4500,
  "city": "okara",
  "fields": {
   "condition": "Used"
  },
  "photo": 1383379
 },
 {
  "cat": "books-hobbies",
  "sub": "sports",
  "title": "Cricket hard balls, 6 pieces, new",
  "price": 6000,
  "city": "sahiwal",
  "fields": {
   "condition": "Used"
  },
  "photo": 37043030
 },
 {
  "cat": "books-hobbies",
  "sub": "gym",
  "title": "Dumbbells set 20kg with rod",
  "price": 8500,
  "city": "renala-khurd",
  "fields": {
   "condition": "Used"
  },
  "photo": 19025674
 },
 {
  "cat": "books-hobbies",
  "sub": "musical-instruments",
  "title": "Acoustic guitar with bag",
  "price": 11000,
  "city": "okara",
  "fields": {
   "condition": "Used"
  },
  "photo": 725469
 },
 {
  "cat": "kids",
  "sub": "toys",
  "title": "Kids remote control car, rechargeable",
  "price": 4500,
  "city": "okara",
  "fields": {
   "condition": "New"
  },
  "photo": 2767818
 },
 {
  "cat": "kids",
  "sub": "baby-gear",
  "title": "Baby pram / stroller, foldable",
  "price": 9500,
  "city": "sahiwal",
  "fields": {
   "condition": "Used"
  },
  "photo": 15501373
 },
 {
  "cat": "kids",
  "sub": "kids-furniture",
  "title": "Kids study table and chair",
  "price": 7000,
  "city": "pakpattan",
  "fields": {
   "condition": "Used"
  },
  "photo": 6265942
 },
 {
  "cat": "kids",
  "sub": "toys",
  "title": "Kids bicycle 16 inch with side wheels",
  "price": 8000,
  "city": "depalpur",
  "fields": {
   "condition": "Used"
  },
  "photo": 28506741
 },
 {
  "cat": "animals",
  "sub": "cows",
  "title": "Sahiwal cow, 12 litre milk, 2nd calving",
  "price": 320000,
  "city": "okara",
  "fields": {
   "breed": "Sahiwal",
   "age": "4 years",
   "milk_per_day": 12
  },
  "photo": 66400
 },
 {
  "cat": "animals",
  "sub": "goats",
  "title": "Beetal goat pair, healthy",
  "price": 95000,
  "city": "depalpur",
  "fields": {
   "breed": "Beetal",
   "age": "1.5 years"
  },
  "photo": 5953665
 },
 {
  "cat": "animals",
  "sub": "buffaloes",
  "title": "Nili Ravi buffalo, 14 litre milk",
  "price": 380000,
  "city": "pakpattan",
  "fields": {
   "breed": "Nili Ravi",
   "age": "5 years",
   "milk_per_day": 14
  },
  "photo": 6711724
 },
 {
  "cat": "animals",
  "sub": "poultry",
  "title": "Desi hens, 10 pieces, laying eggs",
  "price": 25000,
  "city": "haveli-lakha",
  "fields": {
   "breed": "Desi",
   "age": "1 year"
  },
  "photo": 11891477
 },
 {
  "cat": "agriculture",
  "sub": "agri-tools",
  "title": "Rotavator 7 feet, good condition",
  "price": 210000,
  "city": "okara",
  "fields": {
   "condition": "Used"
  },
  "photo": 34632627
 },
 {
  "cat": "agriculture",
  "sub": "seeds",
  "title": "Wheat seed, certified, 50kg bags",
  "price": 7500,
  "city": "depalpur",
  "fields": {
   "condition": "New"
  },
  "photo": 33397323
 },
 {
  "cat": "agriculture",
  "sub": "tube-wells",
  "title": "Tube well motor 10 HP with pipes",
  "price": 135000,
  "city": "basirpur",
  "fields": {
   "condition": "Used"
  },
  "photo": 31355851
 },
 {
  "cat": "agriculture",
  "sub": "crops",
  "title": "Fresh potatoes, Okara farm, per 40kg",
  "price": 2800,
  "city": "okara",
  "fields": {
   "condition": "New"
  },
  "photo": 35596215
 },
 {
  "cat": "business-industrial",
  "sub": "machinery",
  "title": "Industrial sewing machine Juki",
  "price": 65000,
  "city": "sahiwal",
  "fields": {
   "condition": "Used"
  },
  "photo": 36883230
 },
 {
  "cat": "business-industrial",
  "sub": "shop-equipment",
  "title": "Glass display counter for shop, 6 feet",
  "price": 38000,
  "city": "okara",
  "fields": {
   "condition": "Used"
  },
  "photo": 7195588
 },
 {
  "cat": "business-industrial",
  "sub": "raw-material",
  "title": "Cotton yarn bundles, wholesale",
  "price": 45000,
  "city": "chichawatni",
  "fields": {
   "condition": "New"
  },
  "photo": 8931780
 },
 {
  "cat": "business-industrial",
  "sub": "wholesale",
  "title": "Wholesale rice bags, basmati, 25kg",
  "price": 7200,
  "city": "arifwala",
  "fields": {
   "condition": "New"
  },
  "photo": 21958120
 },
 {
  "cat": "other",
  "sub": "other-items",
  "title": "Generator 3.5 KVA, petrol + gas",
  "price": 95000,
  "city": "okara",
  "fields": {
   "condition": "Used"
  },
  "photo": 5693845
 },
 {
  "cat": "other",
  "sub": "other-items",
  "title": "Water cooler 40 litre, insulated, 2 pieces",
  "price": 9000,
  "city": "sahiwal",
  "fields": {
   "condition": "Used"
  },
  "photo": 33957225
 },
 {
  "cat": "other",
  "sub": "other-items",
  "title": "Pedestal fan, copper motor, 2 pieces",
  "price": 14000,
  "city": "pakpattan",
  "fields": {
   "condition": "Used"
  },
  "photo": 6000684
 },
 {
  "cat": "other",
  "sub": "other-items",
  "title": "Steel almirah, 2 doors with locker",
  "price": 28000,
  "city": "depalpur",
  "fields": {
   "condition": "Used"
  },
  "photo": 3773984
 },
 {
  "cat": "vehicles",
  "sub": "cars",
  "title": "Suzuki Cultus VXL 2019, family used",
  "price": 2650000,
  "city": "okara",
  "fields": {
   "condition": "Used",
   "make": "Suzuki",
   "model": "Cultus VXL",
   "year": 2019,
   "km_driven": 68000,
   "fuel": "Petrol",
   "registration_city": "Okara"
  },
  "photo": 20475072
 },
 {
  "cat": "vehicles",
  "sub": "motorcycles",
  "title": "Honda CD 70 2022, own name",
  "price": 145000,
  "city": "sahiwal",
  "fields": {
   "condition": "Used",
   "make": "Honda",
   "model": "CD 70",
   "year": 2022,
   "km_driven": 14000,
   "fuel": "Petrol",
   "registration_city": "Sahiwal"
  },
  "photo": 35211016
 },
 {
  "cat": "vehicles",
  "sub": "tractors",
  "title": "Massey Ferguson 385, 2016 model",
  "price": 2900000,
  "city": "depalpur",
  "fields": {
   "condition": "Used",
   "make": "Massey Ferguson",
   "model": "385",
   "year": 2016,
   "km_driven": 0,
   "fuel": "Diesel"
  },
  "photo": 32487575
 },
 {
  "cat": "vehicles",
  "sub": "rickshaws",
  "title": "Loader rickshaw 2021, ready to drive",
  "price": 420000,
  "city": "pakpattan",
  "fields": {
   "condition": "Used",
   "make": "Siwa",
   "model": "Loader",
   "year": 2021,
   "km_driven": 30000,
   "fuel": "Petrol"
  },
  "photo": 12280608
 },
 {
  "cat": "property-sale",
  "sub": "houses",
  "title": "5 marla double storey house, Model Town",
  "price": 14500000,
  "city": "okara",
  "fields": {
   "area_size": 5,
   "area_unit": "Marla",
   "bedrooms": 4,
   "bathrooms": 3,
   "furnished": false
  },
  "photo": 14930288
 },
 {
  "cat": "property-sale",
  "sub": "plots",
  "title": "10 marla residential plot, corner",
  "price": 6500000,
  "city": "sahiwal",
  "fields": {
   "area_size": 10,
   "area_unit": "Marla"
  },
  "photo": 15422584
 },
 {
  "cat": "property-sale",
  "sub": "agricultural-land",
  "title": "Agricultural land 8 acre with tube well",
  "price": 24000000,
  "city": "depalpur",
  "fields": {
   "area_size": 8,
   "area_unit": "Acre"
  },
  "photo": 35440931
 },
 {
  "cat": "property-sale",
  "sub": "shops",
  "title": "Shop on main bazaar, 200 sq ft",
  "price": 5500000,
  "city": "arifwala",
  "fields": {
   "area_size": 200,
   "area_unit": "Square feet"
  },
  "photo": 3989434
 },
 {
  "cat": "property-rent",
  "sub": "houses-rent",
  "title": "3 bed house for rent, near GT road",
  "price": 35000,
  "city": "okara",
  "fields": {
   "area_size": 7,
   "area_unit": "Marla",
   "bedrooms": 3,
   "bathrooms": 2,
   "furnished": false,
   "monthly_rent": 35000
  },
  "photo": 11350641
 },
 {
  "cat": "property-rent",
  "sub": "portions",
  "title": "Upper portion for rent, 2 rooms",
  "price": 18000,
  "city": "sahiwal",
  "fields": {
   "area_size": 5,
   "area_unit": "Marla",
   "bedrooms": 2,
   "bathrooms": 1,
   "monthly_rent": 18000
  },
  "photo": 8146330
 },
 {
  "cat": "property-rent",
  "sub": "shops-rent",
  "title": "Shop for rent in commercial market",
  "price": 25000,
  "city": "chichawatni",
  "fields": {
   "area_size": 150,
   "area_unit": "Square feet",
   "monthly_rent": 25000
  },
  "photo": 32367382
 },
 {
  "cat": "property-rent",
  "sub": "rooms",
  "title": "Furnished room for students, with wifi",
  "price": 9000,
  "city": "okara",
  "fields": {
   "area_size": 1,
   "area_unit": "Marla",
   "bedrooms": 1,
   "bathrooms": 1,
   "furnished": true,
   "monthly_rent": 9000
  },
  "photo": 35618218
 },
 {
  "cat": "jobs",
  "sub": "sales",
  "title": "Salesman needed for mobile shop",
  "price": 35000,
  "city": "okara",
  "fields": {
   "job_post_type": "Hiring",
   "job_type": "Full-time",
   "salary_from": 30000,
   "salary_to": 40000,
   "experience": "1 year"
  },
  "photo": 11297769
 },
 {
  "cat": "jobs",
  "sub": "teacher",
  "title": "Female teacher required for school",
  "price": 30000,
  "city": "sahiwal",
  "fields": {
   "job_post_type": "Hiring",
   "job_type": "Full-time",
   "salary_from": 25000,
   "salary_to": 35000,
   "experience": "BA / MA"
  },
  "photo": 256491
 },
 {
  "cat": "jobs",
  "sub": "driver",
  "title": "Driver needed, HTV licence",
  "price": 40000,
  "city": "pakpattan",
  "fields": {
   "job_post_type": "Hiring",
   "job_type": "Full-time",
   "salary_from": 35000,
   "salary_to": 45000,
   "experience": "3 years"
  },
  "photo": 11053643
 },
 {
  "cat": "jobs",
  "sub": "office",
  "title": "Computer operator required, part time",
  "price": 20000,
  "city": "renala-khurd",
  "fields": {
   "job_post_type": "Hiring",
   "job_type": "Part-time",
   "salary_from": 18000,
   "salary_to": 22000,
   "experience": "MS Office"
  },
  "photo": 6804612
 },
 {
  "cat": "services",
  "sub": "plumber",
  "title": "Plumber: pipe fitting, leakage, motor",
  "price": 1000,
  "city": "okara",
  "fields": {
   "experience_years": 8,
   "areas_served": "Okara city, Satghara Road",
   "timings": "9am - 8pm",
   "starting_rate": 1000
  },
  "photo": 5414384
 },
 {
  "cat": "services",
  "sub": "electrician",
  "title": "Electrician: wiring, UPS, solar setup",
  "price": 1500,
  "city": "sahiwal",
  "fields": {
   "experience_years": 10,
   "areas_served": "Sahiwal city",
   "timings": "9am - 9pm",
   "starting_rate": 1500
  },
  "photo": 38292956
 },
 {
  "cat": "services",
  "sub": "ac-mechanic",
  "title": "AC service, gas filling and repair",
  "price": 2500,
  "city": "okara",
  "fields": {
   "experience_years": 6,
   "areas_served": "Okara, Renala Khurd",
   "timings": "10am - 8pm",
   "starting_rate": 2500
  },
  "photo": 38788452
 },
 {
  "cat": "services",
  "sub": "tutor",
  "title": "Home tutor for Matric & FSc (Maths, Physics)",
  "price": 8000,
  "city": "pakpattan",
  "fields": {
   "experience_years": 5,
   "areas_served": "Pakpattan city",
   "timings": "4pm - 8pm",
   "starting_rate": 8000
  },
  "photo": 15483356
 },
 {
  "cat": "business",
  "sub": "restaurants",
  "title": "Desi food restaurant: karahi, BBQ, naan",
  "price": null,
  "city": "okara",
  "fields": {
   "timings": "12pm - 12am",
   "address": "Main GT Road, Okara"
  },
  "photo": 39378356
 },
 {
  "cat": "business",
  "sub": "pharmacies",
  "title": "Medical store, open late night",
  "price": null,
  "city": "sahiwal",
  "fields": {
   "timings": "8am - 2am",
   "address": "Hospital Road, Sahiwal"
  },
  "photo": 38666655
 },
 {
  "cat": "business",
  "sub": "showrooms",
  "title": "Furniture showroom: sofa, beds, dining",
  "price": null,
  "city": "depalpur",
  "fields": {
   "timings": "10am - 9pm",
   "address": "Main Bazaar, Depalpur"
  },
  "photo": 7535062
 },
 {
  "cat": "business",
  "sub": "workshops",
  "title": "Car workshop: mechanic, denting, painting",
  "price": null,
  "city": "pakpattan",
  "fields": {
   "timings": "9am - 7pm",
   "address": "Arifwala Road, Pakpattan"
  },
  "photo": 33814734
 }
];
