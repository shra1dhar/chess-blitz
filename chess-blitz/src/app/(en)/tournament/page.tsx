// ==============================================
// Chess Blitz - Tournament Page Redirect
// Redirects to /en/tournament for localized routing
// ==============================================

import { redirect } from 'next/navigation';

export default function TournamentPage() {
  redirect('/en/tournament');
}
