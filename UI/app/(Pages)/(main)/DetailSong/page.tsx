import { redirect } from 'next/navigation';
export default async function Page({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const { track } = await searchParams;
  redirect(track && /^[1-9]\d*$/.test(track) ? `/songs/${track}` : '/Home');
}
