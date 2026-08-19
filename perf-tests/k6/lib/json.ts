/**
 * レスポンスボディをJSONとしてパースする。失敗しても例外を投げない。
 *
 * k6は`check()`のコールバックや`export default function`本体で例外が投げられると、
 * その場でイテレーションを打ち切ってしまう（後続のコードは実行されない）。もし
 * `sleep()`より前でJSON.parseが例外を投げると、意図した待機が発生しないまま次の
 * イテレーションに突入し、VUが待機なしでリクエストを送り続ける暴走状態になる
 * （実際にload実行時に発生し、3分間で本来の想定を遥かに超えるリクエストが
 * 送られる事故があった）。ステータスが200以外・ボディが不正なJSONの場合は
 * undefinedを返すだけにして、この事故を防ぐ。
 */
export function safeJsonParse<T>(body: string | ArrayBuffer | null): T | undefined {
  if (typeof body !== 'string' || body.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    return undefined;
  }
}
