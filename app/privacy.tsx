import React from 'react';

import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
  LEGAL_URLS,
  LEGAL_VERSION,
  SUPPORT_EMAIL,
} from '../src/constants/legal';
import LegalDocumentScreen, {
  LegalBullet,
  LegalLink,
  LegalParagraph,
  LegalSection,
} from '../src/components/legal/LegalDocumentScreen';

const PrivacyScreen: React.FC = () => {
  return (
    <LegalDocumentScreen title="Privacy Policy">
      <LegalParagraph>
        Effective date: {LEGAL_EFFECTIVE_DATE}{'\n'}Last updated: {LEGAL_LAST_UPDATED}{'\n'}Version: {LEGAL_VERSION}
      </LegalParagraph>

      <LegalSection heading="What Zenlit is">
        <LegalParagraph>
          Zenlit helps people discover nearby users, share posts, and exchange direct messages. This
          policy explains what data we collect and how we use it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="Data we collect">
        <LegalBullet>Account data: your email address for passwordless sign-in (OTP).</LegalBullet>
        <LegalBullet>
          Profile data: display name, username, date of birth, gender, bio, profile photo, banner,
          and optional social handles.
        </LegalBullet>
        <LegalBullet>
          Location data: foreground location (latitude/longitude), including a less precise rounded
          coordinate used to find nearby users when you enable Radar visibility.
        </LegalBullet>
        <LegalBullet>
          Messaging data: message content, sender/receiver IDs, timestamps, delivery/read status.
        </LegalBullet>
        <LegalBullet>
          User content: posts, uploaded post images, and related timestamps.
        </LegalBullet>
        <LegalBullet>
          Notification data: Expo push token, notification settings, and muted-conversation
          preferences.
        </LegalBullet>
        <LegalBullet>
          Support/feedback data: feedback text you submit in the app.
        </LegalBullet>
        <LegalBullet>
          Moderation data: reports you submit (reason, description) and your block list.
        </LegalBullet>
      </LegalSection>

      <LegalSection heading="How we use data">
        <LegalBullet>Authenticate your account and keep you signed in.</LegalBullet>
        <LegalBullet>Show your profile and content to other users inside Zenlit.</LegalBullet>
        <LegalBullet>Find and display nearby users and nearby posts.</LegalBullet>
        <LegalBullet>Deliver direct messages and message notifications.</LegalBullet>
        <LegalBullet>Store your uploaded media and show it in-app.</LegalBullet>
        <LegalBullet>Operate account deletion and security workflows.</LegalBullet>
        <LegalBullet>Enable user safety through reporting and blocking features.</LegalBullet>
      </LegalSection>

      <LegalSection heading="Location details">
        <LegalParagraph>
          Zenlit shows an in-app explanation before requesting foreground location permission. We only
          request location while the app is in use to power Radar visibility and nearby discovery.
          If you decline, you can still use the rest of the app with limited Radar functionality.
          We store both precise coordinates and rounded coordinates; rounded coordinates are used
          for nearby matching logic.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="Where data is stored">
        <LegalParagraph>
          Zenlit uses Supabase for authentication, database storage, serverless functions, and file
          storage. Uploaded profile and post images are stored in Supabase storage buckets.
        </LegalParagraph>
        <LegalParagraph>
          Push notifications use Expo Notifications (Expo push token handling and delivery routing).
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="Sharing">
        <LegalParagraph>
          We share data with service providers that run Zenlit infrastructure (such as Supabase and
          Expo). We do not sell personal data.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="Retention">
        <LegalParagraph>
          We keep account and app data while your account is active. If you delete your account, we
          trigger deletion workflows to remove profile, posts, messages, location entries, and
          related records, subject to short operational backup windows.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="Your controls">
        <LegalBullet>You can edit profile fields and social links inside the app.</LegalBullet>
        <LegalBullet>You can disable visibility and clear active location presence.</LegalBullet>
        <LegalBullet>You can manage notification preferences in Notification Settings.</LegalBullet>
        <LegalBullet>You can report users or content and block users from their profile or in messages.</LegalBullet>
        <LegalBullet>
          You can delete your account in-app from the Profile menu under Delete Account, or via the
          public deletion page:
        </LegalBullet>
        <LegalLink href={LEGAL_URLS.accountDeletion}>{LEGAL_URLS.accountDeletion}</LegalLink>
      </LegalSection>

      <LegalSection heading="Contact">
        <LegalParagraph>Questions or privacy requests: {SUPPORT_EMAIL}</LegalParagraph>
        <LegalParagraph>Terms of Service: </LegalParagraph>
        <LegalLink href={LEGAL_URLS.terms}>{LEGAL_URLS.terms}</LegalLink>
      </LegalSection>
    </LegalDocumentScreen>
  );
};

export default PrivacyScreen;
