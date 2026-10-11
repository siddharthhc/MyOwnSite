FAVICON = browser tab + Google + Vercel side icon
================================================
Earth/globe icon aata hai jab site pe valid favicon nahi milta.

APNI PHOTO LAGANE KE LIYE (important):
1. Apni clear square face photo lo (best 512x512 PNG)
2. Usse YE files REPLACE karo (same names):

   assets/images/avatar.png          ← main (About + Google/share)
   assets/images/favicon-32.png      ← tab small
   assets/images/favicon-192.png     ← PWA / high-res
   favicon.png                       ← site root (32x32)
   favicon.ico                       ← site root (browsers default request)

3. Vercel pe dobara Deploy / Redeploy
4. Browser me hard refresh: Ctrl+Shift+R (cache clear)
5. Google ko naya icon dikhne me kabhi-kabhi 2–7 din lagte hain

Abhi placeholder cyan "S" icon hai — photo daalte hi earth logo hat jayega.
