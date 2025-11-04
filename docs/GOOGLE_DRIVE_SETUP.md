# Google Drive Integration Setup Guide

This guide provides step-by-step instructions for developers to set up Google Drive API access for the BlockWise application. This is necessary for the note-syncing feature.

## Prerequisites

- A Google Account.
- Access to the Google Cloud Console.

## Step 1: Create a Google Cloud Project

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Click the project dropdown in the top navigation bar and click **New Project**.
3.  Give your project a name (e.g., "BlockWise Sync") and click **Create**.

## Step 2: Enable the Google Drive API

1.  Make sure your new project is selected in the project dropdown.
2.  In the navigation menu (☰), go to **APIs & Services > Library**.
3.  Search for "Google Drive API" and select it from the results.
4.  Click the **Enable** button.

## Step 3: Configure the OAuth Consent Screen

This screen is what users will see when they are asked to grant your application access to their Google Drive.

1.  In the navigation menu, go to **APIs & Services > OAuth consent screen**.
2.  Choose the **External** user type and click **Create**.
3.  **App Information**:
    -   **App name**: `BlockWise`
    -   **User support email**: Select your email address.
    -   **App logo**: (Optional) You can add a logo.
4.  **Developer contact information**: Enter your email address and click **Save and Continue**.
5.  **Scopes**:
    -   Click **Add or Remove Scopes**.
    -   In the filter, search for and add the following scopes:
        -   `https://www.googleapis.com/auth/userinfo.email`
        -   `https://www.googleapis.com/auth/userinfo.profile`
        -   `openid`
        -   `https://www.googleapis.com/auth/drive.appdata`
        -   `https://www.googleapis.com/auth/drive.file`
    -   Click **Update**, then click **Save and Continue**.
6.  **Test Users**:
    -   Click **Add Users**.
    -   Add the Google account(s) you will be using for testing. This is crucial while the app is in "Testing" mode.
    -   Click **Add**, then click **Save and Continue**.
7.  Review the summary and click **Back to Dashboard**.

## Step 4: Create OAuth 2.0 Client ID Credentials

1.  In the navigation menu, go to **APIs & Services > Credentials**.
2.  Click **+ Create Credentials** and select **OAuth client ID**.
3.  **Application type**: Select **Web application**.
4.  **Name**: You can leave the default or name it "BlockWise Web Client".
5.  **Authorized JavaScript origins**:
    -   Click **+ Add URI**.
    -   Enter `http://localhost:3000` (or your local development port).
6.  **Authorized redirect URIs**:
    -   Click **+ Add URI**.
    -   Enter `http://localhost:3000/api/auth/callback/google`.
7.  Click **Create**.
8.  A dialog will appear with your **Client ID** and **Client Secret**. Copy these values.

## Step 5: Add Credentials to Your Environment File

1.  In the root of your project, find or create a `.env` file.
2.  Add the credentials you just copied, along with a secret for NextAuth.

    ```env
    # Google Drive OAuth
    GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_FROM_GOOGLE_CLOUD"
    GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET_FROM_GOOGLE_CLOUD"

    # NextAuth.js Configuration
    NEXTAUTH_URL="http://localhost:3000"
    NEXTAUTH_SECRET="GENERATE_A_RANDOM_SECRET_HERE"
    ```

    > **Security Note**: To generate a strong `NEXTAUTH_SECRET`, you can run the following command in your terminal: `openssl rand -base64 32`

## Done!

You have now configured the Google Drive API. When you run the application and navigate to the Settings page, the "Connect Google Drive" button should now correctly initiate the OAuth flow. Remember to log in with one of the "Test Users" you configured.
