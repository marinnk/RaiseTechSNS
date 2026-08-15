package com.raisetechsns.backend.logging;

/**
 * MDC（{@link org.slf4j.MDC}）に設定するキー名を集約する。
 *
 * <p>ここでの変更は、{@code backend/src/main/resources/logback-spring.xml}の
 * パターンレイアウト（{@code %X{...}}）・{@code includeMdcKeyName}も必ず合わせて変更すること
 * （XML側からはこの定数を参照できず、キー名の不一致はビルドエラーにならず該当フィールドが
 * 静かにログから消えるだけになるため）。
 */
public final class MdcKeys {

    /** リクエスト相関ID。{@link RequestLoggingFilter}が全リクエストに設定する。 */
    public static final String REQUEST_ID = "requestId";

    /** ログイン中の利用者ID。{@code JwtAuthenticationFilter}が認証成功時に設定する。 */
    public static final String USER_ID = "userId";

    private MdcKeys() {
    }
}
