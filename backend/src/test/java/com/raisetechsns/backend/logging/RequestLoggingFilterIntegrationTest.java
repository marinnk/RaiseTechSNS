package com.raisetechsns.backend.logging;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import com.raisetechsns.backend.support.AbstractIntegrationTest;

/**
 * {@link RequestLoggingFilter}が実際のSpring Securityフィルターチェーンより前段で動くことを
 * 検証する。{@link RequestLoggingFilterTest}はフィルター単体（モックの{@code FilterChain}）の
 * テストのため、{@link LoggingConfig}の{@code Ordered.HIGHEST_PRECEDENCE}指定が実際に
 * Spring Securityより前段で効いているかまでは検証できない。ここでは実際のセキュリティ設定ごと
 * 起動し、未認証アクセス（401）にも{@code X-Request-Id}が付与されることを確認する。
 */
@SpringBootTest
@AutoConfigureMockMvc
class RequestLoggingFilterIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void get_未認証アクセスの401レスポンスにもX_Request_Idヘッダーが付与される() throws Exception {
        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists(RequestLoggingFilter.REQUEST_ID_HEADER));
    }
}
