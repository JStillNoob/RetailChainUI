# Cloudinary Setup Guide for Vue.js

This guide explains how to set up Cloudinary so that users can upload their profile pictures or logos directly from the frontend using Vue.js.

## 1. Create a Cloudinary Account
1. Go to [Cloudinary](https://cloudinary.com/) and sign up for a free account.
2. Once logged in, navigate to your **Dashboard**.
3. Note down your **Cloud Name**. You'll need this in your Vue application.

## 2. Enable Unsigned Uploads
By default, Cloudinary requires a backend server with a secret key to sign upload requests for security. However, you can enable "unsigned uploads" to allow direct uploads from the frontend (the browser).

1. Go to **Settings** (the gear icon) > **Upload**.
2. Scroll down to the **Upload presets** section.
3. Click **Add upload preset**.
4. Set the **Signing Mode** to **Unsigned**.
5. Give your preset a name (e.g., `retailchain_avatars`).
6. Click **Save**.

## 3. Uploading from Vue.js (How it works in the app)
The application will make a `POST` request directly to the Cloudinary REST API:

```javascript
const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'YOUR_UNSIGNED_UPLOAD_PRESET'); // e.g. retailchain_avatars

  const cloudName = 'YOUR_CLOUD_NAME';
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  return data.secure_url; // This is the image URL to save to your database
}
```

## 4. Setting up your Environment Variables
In your Vue project, create a `.env` file at the root (or add to your existing one), and define your Cloudinary parameters:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=retailchain_avatars
```

Make sure to replace `your_cloud_name` and `retailchain_avatars` with your actual setup details. The "Account Settings" modal we built will read these `.env` variables to perform the uploads!
