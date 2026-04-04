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

const TermsScreen: React.FC = () => {
  return (
    <LegalDocumentScreen title="Terms of Service">
      <LegalParagraph>
        Effective date: {LEGAL_EFFECTIVE_DATE}{'\n'}Last updated: {LEGAL_LAST_UPDATED}{'\n'}Version: {LEGAL_VERSION}
      </LegalParagraph>

      <LegalSection heading="Eligibility and accounts">
        <LegalBullet>You must be old enough to form a binding agreement in your region.</LegalBullet>
        <LegalBullet>You are responsible for activity on your account and your sign-in email.</LegalBullet>
        <LegalBullet>Keep your profile info accurate and do not impersonate others.</LegalBullet>
      </LegalSection>

      <LegalSection heading="What the service does">
        <LegalParagraph>
          Zenlit lets users discover nearby people, share posts, and send direct messages. Nearby
          discovery depends on foreground location access.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="User content and behavior">
        <LegalBullet>
          You keep ownership of content you submit (posts, images, profile content, messages).
        </LegalBullet>
        <LegalBullet>
          You grant Zenlit permission to host, process, and display that content to operate the app.
        </LegalBullet>
        <LegalBullet>
          Do not post illegal content, spam, harassment, threats, hate content, or privacy-invasive
          material.
        </LegalBullet>
        <LegalBullet>
          Do not abuse messaging, scrape users, reverse engineer, or interfere with app operations.
        </LegalBullet>
      </LegalSection>

      <LegalSection heading="Location expectations">
        <LegalParagraph>
          Nearby visibility relies on your location while using the app. You can disable visibility
          at any time; doing so removes active location presence used for nearby matching.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="Reporting and blocking">
        <LegalBullet>
          You can report users or content that violates these terms. Reports are reviewed by our
          team and may result in account suspension or content removal.
        </LegalBullet>
        <LegalBullet>
          You can block users to prevent them from contacting you or appearing in your feed and
          radar.
        </LegalBullet>
      </LegalSection>

      <LegalSection heading="Enforcement and termination">
        <LegalParagraph>
          We may limit, suspend, or terminate accounts that violate these terms, harm other users,
          or create legal/security risk, based on user reports or our own review.
        </LegalParagraph>
        <LegalParagraph>
          You may stop using Zenlit at any time and delete your account from the app or at:
        </LegalParagraph>
        <LegalLink href={LEGAL_URLS.accountDeletion}>{LEGAL_URLS.accountDeletion}</LegalLink>
      </LegalSection>

      <LegalSection heading="Disclaimers and liability limits">
        <LegalParagraph>
          Zenlit is provided "as is" without warranties of uninterrupted availability or error-free
          operation. To the fullest extent allowed by law, Zenlit is not liable for indirect,
          incidental, special, consequential, or punitive damages arising from use of the service.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="Changes to these terms">
        <LegalParagraph>
          We may update these terms. Material updates will be reflected by the Last Updated date on
          this page.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="Contact">
        <LegalParagraph>Questions: {SUPPORT_EMAIL}</LegalParagraph>
        <LegalParagraph>Privacy Policy:</LegalParagraph>
        <LegalLink href={LEGAL_URLS.privacy}>{LEGAL_URLS.privacy}</LegalLink>
      </LegalSection>
    </LegalDocumentScreen>
  );
};

export default TermsScreen;
