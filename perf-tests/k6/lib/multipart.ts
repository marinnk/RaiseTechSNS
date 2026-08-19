export interface MultipartFormData {
  body: string;
  headers: { 'Content-Type': string };
}

/**
 * `POST /api/posts` はテキストのみの投稿でも`multipart/form-data`必須で、
 * `data`パートにJSON形式の`CreatePostRequest`を積む必要がある
 * （backend/src/test/java/.../PostControllerTest.java の
 * `MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE, ...)` を参照）。
 *
 * k6の組み込みmultipart機能（オブジェクトをbodyに渡す方式）は各パートに
 * Content-Typeを明示できないため、ここではmultipartボディを手組みする。
 * 画像添付（`images`パート）は対象外とし、テキストのみの投稿作成負荷に絞る
 * （S3/MinIOの可用性に依存させないための割り切り。詳細はperf-tests/README.md参照）。
 */
export function buildJsonOnlyMultipart(fieldName: string, jsonValue: unknown): MultipartFormData {
  const boundary = `----k6boundary${Date.now()}${Math.floor(Math.random() * 1e9)}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(jsonValue)}\r\n` +
    `--${boundary}--\r\n`;

  return {
    body,
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
  };
}
