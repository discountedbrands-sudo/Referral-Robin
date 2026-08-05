import { LegalPage, type LegalSection } from '@/components/LegalPage';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. What Referral Robin is',
    body:
      'Referral Robin is a platform that lets users submit and receive referral codes for third-party ' +
      'companies (banks, insurers, gyms, and similar services) on a fair, rotating basis. We are not ' +
      'affiliated with, endorsed by, or acting on behalf of any of the companies whose referral codes appear ' +
      'on the Service, unless explicitly stated.',
  },
  {
    heading: '2. Eligibility',
    body:
      'You must be at least 16 years old to use Referral Robin. By using the Service, you confirm you meet ' +
      'this requirement.',
  },
  {
    heading: '3. Your account',
    body:
      "You're responsible for keeping your account credentials secure and for all activity under your " +
      'account. You must provide accurate information when signing up and submitting referral codes.',
  },
  {
    heading: '4. Acceptable use',
    body:
      'When using Referral Robin, you agree not to:\n\n' +
      "• Submit fake, scraped, expired, or codes you don't have the right to share\n" +
      '• Attempt to bypass the cooldown system, queue rotation, or any other fairness mechanism (e.g. through ' +
      'multiple accounts, automated tools, or device spoofing)\n' +
      '• Use the Service to harass, spam, or defraud other users or third-party companies\n' +
      '• Scrape, copy, or redistribute referral codes displayed on the Service in bulk\n' +
      '• Interfere with the normal operation of the Service, including through attempts to access it via ' +
      'unauthorised technical means\n\n' +
      'We may suspend or terminate accounts that violate these rules, at our discretion.',
  },
  {
    heading: '5. Referral codes and third-party programs',
    body:
      'Codes submitted to Referral Robin belong to and reflect the referral programs of third-party companies, ' +
      'not us. We do not guarantee:\n\n' +
      '• That any code is valid, active, or will result in any reward\n' +
      '• The terms, amount, or availability of any third-party referral program\n' +
      "• That a company's referral scheme won't change, pause, or end without notice\n\n" +
      "If a code doesn't work, you can report it through the Service, but we're not responsible for " +
      "compensating you for a reward you didn't receive from a third party.",
  },
  {
    heading: '6. Premium features and payments',
    body:
      'Where we offer premium subscriptions or code-boosting features, payment is processed through Google ' +
      "Play Billing. Refunds, where applicable, are handled per Google Play's own policies, not directly by us.",
  },
  {
    heading: '7. Our role and disclaimers',
    body:
      'Referral Robin is provided "as is." We do our best to keep the Service running fairly and accurately, ' +
      "but we don't guarantee it will be uninterrupted, error-free, or available at all times. We are not a " +
      'financial advisor, and nothing on the Service constitutes financial, legal, or professional advice — ' +
      'particularly for codes relating to financial products, insurance, or medical/weight-loss services.',
  },
  {
    heading: '8. Limitation of liability',
    body:
      'To the fullest extent permitted by law, we are not liable for any indirect, incidental, or ' +
      'consequential damages arising from your use of the Service, including lost referral rewards, ' +
      'third-party program changes, or account suspension.',
  },
  {
    heading: '9. Termination',
    body:
      'You may stop using the Service and delete your account at any time. We may suspend or terminate your ' +
      'access if you breach these Terms, engage in fraudulent activity, or misuse the Service.',
  },
  {
    heading: '10. Changes to these Terms',
    body:
      'We may update these Terms from time to time. Continued use of the Service after changes take effect ' +
      'means you accept the updated Terms.',
  },
  {
    heading: '11. Governing law',
    body: 'These Terms are governed by the laws of England and Wales.',
  },
  {
    heading: '12. Contact us',
    body: 'Questions about these Terms can be sent to: discountedbrands@gmail.com',
  },
];

export default function TermsOfServiceScreen() {
  return <LegalPage title="Terms of Service — Referral Robin" lastUpdated="August 5, 2026" sections={SECTIONS} />;
}
