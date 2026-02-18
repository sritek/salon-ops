/**
 * Home Page - Redirects to today page or login
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to today page (middleware will handle auth check)
  redirect('/today');
}
