// ==============================================
// Chess Blitz - Privacy Policy Redirect
// Redirects localized routes to English-only privacy page
// ==============================================

import { redirect } from 'next/navigation';

export default function LocalizedPrivacyPage() {
  redirect('/privacy');
}
