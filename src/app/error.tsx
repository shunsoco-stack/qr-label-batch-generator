"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="route-state">
      <p className="eyebrow">Something went wrong</p>
      <h1>ワークスペースを表示できませんでした</h1>
      <p>入力データはサーバーへ送信されていません。再読み込みしてやり直せます。</p>
      <button className="button button--primary" type="button" onClick={reset}>
        再読み込み
      </button>
    </main>
  );
}
