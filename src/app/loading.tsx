export default function Loading() {
  return (
    <main className="route-state" aria-busy="true" aria-live="polite">
      <div className="route-state__mark" aria-hidden="true" />
      <p>ワークスペースを準備しています…</p>
    </main>
  );
}
