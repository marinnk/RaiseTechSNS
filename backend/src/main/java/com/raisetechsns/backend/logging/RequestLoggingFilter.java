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
 */
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger LOG = LoggerFactory.getLogger(RequestLoggingFilter.class);

    static final String REQUEST_ID_MDC_KEY = "requestId";
    static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = UUID.randomUUID().toString();
        long startNanos = System.nanoTime();
        try {
            MDC.put(REQUEST_ID_MDC_KEY, requestId);
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
}
