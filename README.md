# Nicole Beauty Parlour

A responsive, installable web app for discovering Nicole Beauty Parlour's hairstyles, checking the supplied price guide, saving favourites and preparing booking requests.

## Run

Serve this folder over HTTP, for example `python3 -m http.server 8000`, and open the page in a browser. The service worker and install prompt require HTTPS (or localhost). No build is needed.

## How it works and limitations

- Booking requests are saved **only in the browser on the current device**. They are not confirmed appointments and do not check real availability. The user must send the pre-filled WhatsApp message and wait for the salon to confirm.
- Messages open WhatsApp to +267 72 517 904 (the number on the supplied price list, with Botswana country code). The user must press send in WhatsApp. This app does not provide an in-app chat inbox.
- Saved favourites, uploaded hairstyle photos, promotion ideas and booking requests are stored in browser localStorage. They are not shared across devices or users and can be erased with browser data. Do not use this as a production customer database. Photos are limited to 2 MB and browser storage quotas apply.
- Promotion ideas are not publicly published or paid advertisements. They can be shared with the salon through WhatsApp. Added styles appear only on the current device.
- Prices come from the supplied image and must be confirmed with the salon. The price estimate applies only to the listed braid types.
- This is a progressive web app, not a finished Android or iOS store package. Google Play/App Store release needs native packaging, developer accounts, app signing, privacy policies, testing and store review. Production multi-user bookings, messaging, advertisement publishing and administration need a secure backend, authentication, access controls and appropriate privacy practices.
