# Supabase CORS Setup & Debugging Guide

## 1. What is CORS and why it matters?
CORS (Cross-Origin Resource Sharing) is a security feature implemented by web browsers to restrict web pages from making requests to a different domain than the one that served the web page.
When your React application (running on your domain or localhost) attempts to fetch data from your Supabase API (e.g., `htdiuxyyscaojuaoryvj.supabase.co`), the browser performs a CORS check. If Supabase is not configured to accept requests from your domain, the request will be blocked, and you'll see a "Failed to fetch" or "CORS Error".

## 2. Verifying CORS in Supabase Dashboard
To fix CORS issues, you need to ensure your application's URL is allowed by Supabase:
1. Log into your [Supabase Dashboard](https://app.supabase.com/).
2. Select your project.
3. Go to **Settings** (the gear icon on the left sidebar).
4. Click on **API** in the settings menu.
5. Scroll down to the **API Settings** section.
6. Locate the **Additional URL Configuration** or **CORS** section.
7. Ensure your frontend domain (e.g., `https://your-domain.com` or `http://localhost:3000`) is added to the allowed origins list. You can use `*` for development to allow all origins, but restrict it in production.

## 3. Common Error Messages & Solutions
- **"TypeError: Failed to fetch"**: This usually indicates a CORS block or that you are completely offline. Check the Network tab in DevTools; if the status is `(failed) net::ERR_FAILED`, it's likely a CORS issue.
- **"Network timeout"**: The server took too long to respond. This might happen if your local network is heavily restricted or if Supabase is experiencing downtime.
- **Solution**: Whitelist your exact preview or production URL in the Supabase Dashboard API settings.

## 4. How to Test CORS Using DevTools
1. Open your web application in Google Chrome or Firefox.
2. Press `F12` or right-click and select **Inspect** to open Developer Tools.
3. Go to the **Console** tab to look for explicit red CORS errors.
4. Go to the **Network** tab, filter by `Fetch/XHR`.
5. Try logging in or refreshing the page. Look for requests to your `.supabase.co` URL.
6. Click on the failed request and check the **Headers** tab. Look for the `Access-Control-Allow-Origin` header in the response. If it's missing or doesn't match your domain, CORS is misconfigured.