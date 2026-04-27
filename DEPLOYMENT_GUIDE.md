# Deployment Guide: RetailChainUI to Monster.ASP (IIS)

This guide covers deploying both your ASP.NET backend and Vue.js frontend to a single IIS server on Monster.ASP.

## Prerequisites

- FTP/SFTP access to your Monster.ASP hosting account
- IIS already set up on the server
- .NET Runtime installed on the server
- Node.js installed locally (for building the frontend)

---

## Part 1: Prepare Your Environment

### 1.1 Update Backend Configuration

Update your ASP.NET backend `appsettings.json` for production:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "your-production-database-connection-string"
  }
}
```

### 1.2 Update Frontend API Endpoint

In `src/services/api.js`, change the baseURL for production:

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'https://yourdomain.com/api',
})

// ... rest of code
```

Create a `.env.production` file in your project root:

```
VITE_API_URL=https://yourdomain.com/api
```

---

## Part 2: Build the Frontend

### 2.1 Build Vue for Production

Run this command in your Vue project directory:

```bash
npm run build
```

This creates a `dist/` folder with optimized, production-ready files.

### 2.2 Verify Build Output

Check that the `dist/` folder contains:

- `index.html`
- `assets/` folder with JS and CSS files

---

## Part 3: Prepare Deployment Files

### 3.1 Publish ASP.NET Backend

In Visual Studio or via CLI, publish your backend:

```bash
dotnet publish -c Release -o ./publish
```

### 3.2 Copy Frontend to Backend

Copy the Vue `dist/` folder contents into your ASP.NET backend's `wwwroot/` folder:

```
YourBackend/
├── wwwroot/
│   ├── index.html          (from dist/)
│   ├── assets/             (from dist/assets/)
│   ├── public/             (from dist/public/)
│   └── ...
├── bin/
├── obj/
└── ...
```

**Why?** This allows IIS to serve both the frontend and backend API from the same origin.

### 3.3 Configure Fallback to index.html

Create a `web.config` file in your `wwwroot/` folder (or root of backend):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/api/" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

This ensures Vue Router routes fall back to `index.html` instead of returning 404s.

---

## Part 4: Upload to Monster.ASP via FTP/SFTP

### 4.1 Connect to FTP

Use an FTP client (FileZilla, WinSCP, or web-based FTP):

- **Host:** Your Monster.ASP FTP host
- **Username:** Your FTP username
- **Password:** Your FTP password

### 4.2 Upload Backend

Upload the contents of your `publish/` folder to the hosting server's public directory (usually `public_html/` or similar).

### 4.3 Verify Upload

Ensure these folders/files are uploaded:

- `wwwroot/` (contains frontend build + API files)
- `bin/`
- `appsettings.json`
- `web.config`
- Any other required files

---

## Part 5: Configure IIS on Monster.ASP

### 5.1 Access IIS Control Panel

Log into Monster.ASP's control panel (cPanel, Plesk, or IIS Manager):

1. Navigate to **IIS Manager** or **Application Settings**
2. Find your website/application

### 5.2 Set Application Pool

- Ensure the Application Pool is set to **.NET CLR Version** matching your backend (.NET 6, 7, or 8)
- Set **Managed Pipeline Mode** to `Integrated`

### 5.3 Configure Bindings

- **Protocol:** https:// (recommended)
- **Domain:** yourdomain.com
- **Port:** 443 (HTTPS) or 80 (HTTP)

### 5.4 Test the Application

1. Navigate to `https://yourdomain.com` in a browser
2. You should see your login page
3. Test the login form to ensure it connects to the backend API

---

## Part 6: Troubleshooting

### Frontend Shows But API Calls Fail

**Problem:** Vue loads but login/API requests fail

**Solution:** Check CORS is enabled in your ASP.NET backend:

```csharp
// In Program.cs or Startup.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

app.UseCors("AllowAll");
```

### 404 Errors on Page Refresh

**Problem:** Refreshing the page shows 404

**Solution:** Ensure `web.config` with the SPA rewrite rule is in place (see Part 3.3)

### IIS Returns 500 Error

**Problem:** Backend crashes on startup

**Possible causes:**

- Database connection string is wrong
- .NET Runtime version mismatch
- Missing dependencies

**Solution:** Check IIS logs at `%SystemDrive%\inetpub\logs\LogFiles\`

### SSL Certificate Issues

If using HTTPS, ensure you have an valid SSL certificate. Monster.ASP usually provides free SSL via Let's Encrypt.

---

## Part 7: Environment Variables for Production

Update your backend configuration for production database:

### 7.1 For ASP.NET

In `appsettings.Production.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=your-db-server;Database=prod_db;User Id=sa;Password=your_password;"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Error"
    }
  }
}
```

---

## Part 8: Post-Deployment Checklist

- [ ] Frontend loads at `https://yourdomain.com`
- [ ] Login page displays correctly
- [ ] API calls connect to backend
- [ ] Login/authentication works
- [ ] Database operations work (create, read, update)
- [ ] HTTPS is working
- [ ] Error logs are being captured
- [ ] Backups are scheduled

---

## Quick Reference: Deployment Commands

```bash
# Build frontend
npm run build

# Publish backend
dotnet publish -c Release -o ./publish

# Copy frontend to backend
xcopy dist\* publish\wwwroot\ /E /Y
```

---

## Support

For Monster.ASP-specific issues, contact their support team or check your hosting account's help documentation.
