# TikTok Cookies Directory

This directory stores TikTok cookies for different accounts.

## How to Add Cookies

1. **Export cookies from your browser:**
   - Install a cookie export extension (e.g., "EditThisCookie" or "Cookie-Editor")
   - Log into TikTok in your browser
   - Export cookies in Netscape format
   - Save only TikTok-related cookies

2. **Save the cookies file:**
   - Name it something descriptive: `account1.txt`, `main_account.txt`, etc.
   - Place it in this `backend/cookies/` directory

3. **Create a profile:**
   - Go to the "Profiles" tab in the app
   - Click "Add Profile"
   - Enter the profile name and cookies filename
   - Optionally add a proxy if needed

## File Format

Cookies should be in Netscape format (one cookie per line):
```
.tiktok.com	TRUE	/	TRUE	1234567890	cookie_name	cookie_value
```

## Example Files

- `account1.txt` - Your main TikTok account
- `account2.txt` - Your second TikTok account
- `business_account.txt` - Your business TikTok account

## Security Notes

- **DO NOT** commit these files to Git (they're in `.gitignore`)
- Keep these files secure - they grant access to your TikTok accounts
- Rotate cookies periodically for security

