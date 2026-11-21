-- English versions of the first 5 blog posts (only added if the slug is not there yet).
insert into blog_posts (slug, locale, title, excerpt, body, category_id, author_id, faq, seo_title, seo_description, focus_keyword, status, published_at, reading_minutes)
select v.slug, 'en', v.title, v.excerpt, v.body,
       (select id from blog_categories where slug = v.cat),
       (select id from authors order by id limit 1),
       v.faq::jsonb, v.title, v.excerpt, v.kw, 'published', now() - (v.n || ' hours')::interval, v.mins
from (values
(1, 'how-to-post-an-ad-on-apna-okara', 'buying-selling', 'How to post an ad on Apna Okara: step by step', 'Selling something in Okara, Sahiwal or Pakpattan? Post your ad in 2 minutes. Here is how.', 'post an ad', 3,
$md$
An old phone, a motorcycle, furniture or a house for rent: on **Apna Okara** you reach buyers in your own area. No login and no long forms.

## How to post an ad

1. Tap **"Post Ad"** at the top of the site.
2. Choose your **category**, for example Mobiles, Vehicles, Property or Mawaishi.
3. Write a clear **title**, like "Honda CD 70, 2021 model, Okara number".
4. Add the **price** and details: condition, model, how much it was used.
5. Add **photos**. Clear photos taken in daylight work best.
6. Choose your **city** and add your **phone number**.
7. Choose how long the ad should run and pay with JazzCash, Easypaisa, NayaPay or bank transfer.

After payment, our team checks the ad and puts it live once it is approved. You get a **reference number** (like AO-10001) to find your ad later.

## Tips to sell faster

- Write an **honest price**. A very high price makes people move on.
- Add **at least 3 photos**: front, back, and any fault too.
- **Answer calls** and reply on WhatsApp quickly.
- Make your ad **Featured** so it shows at the top.

## Sold it?

Open **"My Ads"** and mark it as sold, so people stop calling.
$md$,
'[{"q":"Do I need an account to post an ad?","a":"No. Your phone number is enough."},{"q":"When does my ad go live?","a":"After the payment is checked, our team approves it, usually within a few hours."}]'),

(2, 'how-to-avoid-online-buying-and-selling-scams', 'safety', 'How to avoid scams when buying and selling online: 8 tips', 'Advance payments, fake screenshots and "I will send it by courier". The common scams and how to avoid them.', 'online scams', 4,
$md$
Buying and selling online is easy, and a little care can save you from a big loss. Always remember these 8 points.

## 1. Do not send money in advance

Never pay before you have seen the item, however much the seller rushes you.

## 2. Meet face to face

Meet in a **public place** in daylight, such as a market or outside a bank. Take someone with you.

## 3. Watch out for fake screenshots

If you are selling, do not trust a screenshot alone. **Open your JazzCash or Easypaisa app** and check that the money has really arrived.

## 4. "I am abroad, I will send it by courier"

This is the most common scam. Do not deal with anyone who refuses to meet.

## 5. Check the phone's IMEI

When buying a used phone, dial **\*8484#** or use the PTA website to check that the IMEI is registered.

## 6. Check vehicle papers

For a motorcycle or car, check the **registration, tax and original papers**, and match the chassis number.

## 7. Never share an OTP or code

If anyone asks for a **code** you received on your phone, it is a scam. Apna Okara never asks you for a code.

## 8. Report suspicious ads

Every ad has a **"Report"** button. If someone looks like a scammer, report it and our team checks it quickly.
$md$,
'[{"q":"What should I do if I am scammed?","a":"Report the ad, message us on WhatsApp, and if needed file a complaint with FIA Cyber Crime."}]'),

(3, 'checklist-before-buying-a-used-motorcycle', 'vehicles', 'Buying a used motorcycle? Check these 10 things first', 'Thinking of buying a used bike in Okara or Sahiwal? This checklist will save you from a bad deal.', 'used motorcycle', 4,
$md$
A used motorcycle can be a good, cheap deal, as long as you check it properly. Here is our checklist:

## Papers

1. The **registration book** is original and in the seller's name, or the transfer papers are complete.
2. Match the **chassis and engine numbers** with the papers.
3. Check until when the **token tax** is paid.

## Engine and test ride

4. Start it with a **cold engine**. Starting on the first kick or self-start is a good sign.
5. Look at the **smoke**. Blue or black smoke can mean engine work is needed.
6. **Take a test ride**: gears change smoothly, the clutch does not slip, the brakes work well.

## Body and parts

7. Check the **tyres** and **chain set**. Replacing them adds to the cost.
8. Look at the **frame** for welding or bends, which can be a sign of an accident.
9. Check the **lights, horn and indicators**.

## Price

10. Look at **other ads for the same model** on Apna Okara to get an idea of a fair price.

> Tip: if you do not know engines, take a mechanic you trust. A small fee can save you thousands.
$md$,
'[{"q":"Do I need to transfer the bike to my name?","a":"Yes. Transfer it to your name so there are no problems later."}]'),

(4, 'guide-to-buying-a-qurbani-animal', 'mawaishi', 'A simple guide to buying a Qurbani animal', 'Goat, cow or bull: how to spot a healthy animal, and how to look from home before the mandi rush.', 'Qurbani animal', 4,
$md$
Okara, Sahiwal and Pakpattan are well known for livestock. Keep these points in mind when buying a Qurbani animal.

## Mind the age

The animal must be old enough for Qurbani. Ask a **scholar** in your area about the age rules. Age is usually judged by looking at the **teeth**.

## Signs of a healthy animal

- **Eyes** are clean and bright, with no watering.
- The **nose** is moist and clean.
- The animal is **active** and walks easily, without limping.
- It **eats** its fodder well.
- There is no fault in the **ears, horns or tail** that would stop it being used for Qurbani.

## Look online before the mandi

Close to Eid, mandis get crowded and prices go up. In the **Mawaishi** category on Apna Okara you can see animals from sellers near you, with photos, and then go and check them yourself.

## For sellers

If you are selling, add a full photo of the animal **in daylight**, and always write its **weight, age and breed**. These ads sell faster.

> Always see the animal yourself before buying, and think carefully before paying any advance.
$md$,
'[{"q":"Can I buy an animal from home?","a":"You can look at ads and talk to the seller, but always go and see the animal yourself before you buy."}]'),

(5, 'bring-your-skills-and-business-online', 'jobs-services', 'Workers and shopkeepers: how to bring your work online', 'Plumber, electrician, tutor or shop: list your work on Apna Okara for a one-time fee and get new customers.', 'business online', 3,
$md$
Today, people look on their phones first, even to find a plumber, an electrician, a tutor or a good shop. If your work is not online, these customers never reach you.

## Why list on Apna Okara?

- **Customers from your area**: people in Okara, Sahiwal and Pakpattan.
- **Direct calls and WhatsApp**: customers tap a button and talk to you, with no commission in between.
- **Reviews**: customers can review good work, which builds trust with new people.
- **Verified badge**: after your papers are checked, your listing can show a ✓ badge.

## Pay only once

| Listing | Fee |
|---|---|
| Worker / service (plumber, electrician, tutor, etc.) | Rs 1,000, one time |
| Business (shop, clinic, restaurant, etc.) | Rs 2,000, one time |

No monthly or yearly fee.

## How to make a good listing

1. **A clear title**, like "Experienced electrician, Renala Khurd".
2. **Photos of your work**: the front of your shop, or work you have done.
3. Write your **hours and the areas** you cover.
4. **Answer calls quickly**. That is the best marketing.

Tap **"Post Ad"** and choose the "Services" or "Business" category.
$md$,
'[{"q":"Do I pay every year?","a":"No. Rs 1,000 for workers and Rs 2,000 for businesses, only once."}]')
) as v(n, slug, cat, title, excerpt, kw, mins, body, faq)
where not exists (select 1 from blog_posts b where b.slug = v.slug);
