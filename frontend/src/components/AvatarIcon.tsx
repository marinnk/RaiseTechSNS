interface AvatarIconProps {
  avatarUrl: string | null;
}

// 名前・投稿フォーム等の横に添える小さな丸アイコン。画像が未設定ならプレースホルダーを表示する。
// 隣に表示名等のテキストが並ぶ使われ方が前提のため、画像自体はalt=""にして装飾扱いにする
// （スクリーンリーダーが名前と二重に読み上げないようにするため）。
export function AvatarIcon({ avatarUrl }: AvatarIconProps) {
  return avatarUrl ? (
    <img src={avatarUrl} alt="" className="avatar-icon-sm" />
  ) : (
    <span className="avatar-icon-sm avatar-icon-placeholder" aria-hidden="true" />
  );
}
