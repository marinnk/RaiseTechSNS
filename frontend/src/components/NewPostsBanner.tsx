interface NewPostsBannerProps {
  count: number;
  onClick: () => void;
}

/**
 * 他利用者の新着投稿をポーリングで検知した際に表示するフローティングバナー。
 * ブラウザ標準のalert等ではなく、画面のどこにスクロールしていても見えるよう
 * position: fixedで常に画面上部に表示する。クリックすると新着投稿が一覧の先頭に反映される
 * （実際の反映とスクロールはTimelineScreen側で行う）。
 */
export function NewPostsBanner({ count, onClick }: NewPostsBannerProps) {
  return (
    <button type="button" className="new-posts-banner" onClick={onClick}>
      ↑ {count}件の新しい投稿があります
    </button>
  );
}
