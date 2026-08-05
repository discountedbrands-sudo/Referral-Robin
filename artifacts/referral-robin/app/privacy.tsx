import { LegalPage, type LegalSection } from '@/components/LegalPage';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. Who we are',
    body:
      'Referral Robin is operated by a UK sole trader trading as Referral Robin, based in the United Kingdom. ' +
      'If you have questions about this policy or your data, contact us at discountedbrands@gmail.com.',
  },
  {
    heading: '2. Information we collect',
    body:
      'Account information — When you sign up, we collect your email address and authentication details via our ' +
      'authentication provider (Clerk). If you sign up using Google, we receive basic profile information (name, ' +
      'email) from Google.\n\n' +
      "Referral codes you submit — If you submit a referral code to the platform, we store the code text, which " +
      "brand/organisation it's for, and its status (active, reported, removed).\n\n" +
      'Usage data — We record how many times a code has been shown to other users (timesServed) and how many ' +
      "times it's been copied (timesCopied), along with timestamps, so we can operate the fair-rotation queue " +
      'system and detect misuse.\n\n' +
      'Device identifier — We generate a random, persistent device identifier stored locally on your device. ' +
      'This is used solely to enforce the 10-minute cooldown between code reveals per brand, and is not linked ' +
      "to your real-world identity beyond your account.\n\n" +
      'Payment information — If you purchase a premium subscription or code boost, payment is processed entirely ' +
      'by Google Play Billing. We do not receive or store your card details — Google handles this in accordance ' +
      'with their own privacy policy.',
  },
  {
    heading: '3. How we use your information',
    body:
      'To operate the referral code rotation and cooldown system fairly; to let you view and edit codes ' +
      "you've submitted, and see your usage statistics; to detect and remove dead, fraudulent, or abusive codes; " +
      'to manage premium subscriptions and weighted rotation; to display sponsored content, where applicable; ' +
      'to communicate with you about your account, if necessary.',
  },
  {
    heading: "4. What we don't do",
    body:
      'We do not currently sell your personal data to third parties. If this changes in the future, we will ' +
      'update this policy and, where required by law, seek your consent before doing so. We do not publicly ' +
      "display your submitted referral codes as a browsable list — codes are only ever shown one at a time " +
      "through the app's rotation system. We do not track you across other apps or websites.",
  },
  {
    heading: '5. Advertising',
    body:
      'Referral Robin may display sponsored placements from brands or businesses relevant to a given category. ' +
      'These are managed directly by us, not through third-party ad networks, unless stated otherwise in a ' +
      'future update to this policy.',
  },
  {
    heading: '6. Data sharing',
    body:
      'We may share limited information with: Clerk (our authentication provider), to manage sign-in and ' +
      'account security; Google Play, for billing and subscription management; law enforcement or regulators, ' +
      'only where legally required.',
  },
  {
    heading: '7. Data retention',
    body:
      'We retain your account and code data for as long as your account remains active. If you delete your ' +
      'account, we will remove your personal data within 30 days, except where retention is required for legal ' +
      'or fraud-prevention purposes.',
  },
  {
    heading: '8. Your rights',
    body:
      'If you are in the UK or EU, you have rights under GDPR/UK GDPR including the right to access, correct, ' +
      'or delete your personal data, and to object to certain processing. Contact us at ' +
      'discountedbrands@gmail.com to exercise these rights.',
  },
  {
    heading: "9. Children's privacy",
    body:
      'Referral Robin is not intended for use by children under 16. We do not knowingly collect data from ' +
      'children under this age.',
  },
  {
    heading: '10. Changes to this policy',
    body:
      'We may update this policy from time to time. Material changes will be reflected with an updated ' +
      '"Last updated" date at the top of this document.',
  },
  {
    heading: '11. Contact us',
    body: 'Questions about this policy or your data can be sent to: discountedbrands@gmail.com',
  },
];

export default function PrivacyPolicyScreen() {
  return <LegalPage title="Privacy Policy — Referral Robin" lastUpdated="August 3, 2026" sections={SECTIONS} />;
}
