import EntityDetail from '@/app/features/song/components/EntityDetail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; return <EntityDetail id={id} kind="playlists" />;
}
