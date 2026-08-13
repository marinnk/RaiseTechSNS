import type { PostImage } from '../types/post';

interface PostImageGridProps {
  images: PostImage[];
}

// タイムライン・投稿詳細で投稿に添付された画像を表示する読み取り専用グリッド。
// プロトタイプ（prototype/js/components/postCard.js）の.post-images/.post-images.count-Nを踏襲し、
// 1枚のときは大きく、2枚以上のときは並べて表示する。
export function PostImageGrid({ images }: PostImageGridProps) {
  if (images.length === 0) return null;

  return (
    <div className={`post-images count-${images.length}`}>
      {images.map((image) => (
        <img key={image.id} src={image.imageUrl} alt="投稿画像" />
      ))}
    </div>
  );
}
