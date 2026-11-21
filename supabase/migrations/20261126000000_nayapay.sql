-- NayaPay as a payment method (same as JazzCash / Easypaisa: account title + number)
alter type payment_method add value if not exists 'nayapay' after 'easypaisa';
