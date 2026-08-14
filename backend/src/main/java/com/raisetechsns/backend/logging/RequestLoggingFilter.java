package com.raisetechsns.backend.logging;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 全リクエストにリクエストID（{@code requestId}）を発行し、MDC経由で以降のすべてのログ行に
 * 乗せる。あわせてリクエスト完了時に1行のアクセスログ（メソッド・パス・ステータス・所要時間）を出す。
 *
 * <p>{@link com.raisetechsns.backend.config.SecurityConfig}のフィルターチェーンには含めず、
 * {@link LoggingConfig}で{@code Ordered.HIGHEST_PRECEDENCE}として登録することで、
 * Spring Securityより前段で全リクエスト（認証エラー等セキュリティ層で完結するレスポンスを含む）を
 * 包む。詳細はdocs/monitoring-design.mdを参照。
 *
 * <p>クライアントから送られてきた{@code X-Request-Id}等は信頼せず、必ずサーバー側で生成する
 * （将来リバースプロキシ配下に置く際に見直す）。
 *
 * <p>{@link LoggingConfig}でこのフィルターはREQUEST・ERRORの2種類のディスパッチに対して登録し、
 * {@link #shouldNotFilterErrorDispatch()}もfalseにしている。Spring Securityのフィルターチェーンは
 * デフォルトで全種類のディスパッチ（ERRORを含む）で動くため、そこに合わせないと、Tomcatが例外発生時に
 * 行う内部的なエラーページへの転送（ERRORディスパッチ）でこのフィルターだけが素通りされ、
 * その転送中に下流（{@code JwtAuthenticationFilter}）がMDCへ設定した{@code userId}を
 * クリアできないまま、スレッドプール再利用時に次の無関係なリクエストのログへ漏れてしまう。
 * 非同期コントローラー（{@code @Async}・{@code DeferredResult}等）は本プロジェクトに存在しないため、
 * ASYNCディスパッチへの対応は今回のスコープに含めていない（追加する際は要検討）。
 */
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger LOG = LoggerFactory.getLogger(RequestLoggingFilter.class);

    /**
     * レスポンスヘッダー名。{@link com.raisetechsns.backend.config.SecurityConfig}のCORS設定で
     * フロントエンド（別オリジン）からも読めるよう{@code exposedHeaders}に指定するため、
     * このクラスの外からも参照できるようpublicにしている。
     */
    public static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = UUID.randomUUID().toString();
        long startNanos = System.nanoTime();
        try {
            MDC.put(MdcKeys.REQUEST_ID, requestId);
            response.setHeader(REQUEST_ID_HEADER, requestId);
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = (System.nanoTime() - startNanos) / 1_000_000;
            LOG.info("request completed method={} path={} status={} durationMs={}",
                    request.getMethod(), request.getRequestURI(), response.getStatus(), durationMs);
            // このフィルターがリクエスト全体を包むため、ここでMDCを一括でクリアする。
            // JwtAuthenticationFilter等、下流でMDCに積んだキー（userId等）もまとめて消える
            MDC.clear();
        }
    }

    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        // デフォルト（true）だとERRORディスパッチ時にdoFilterInternalが呼ばれず、
        // クラスコメントに書いたMDCクリア漏れが防げないため、falseにして必ず実行させる
        return false;
    }
}
