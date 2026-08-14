package com.raisetechsns.backend.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import com.raisetechsns.backend.support.AbstractIntegrationTest;

/**
 * デフォルト設定（開発環境相当、{@code SPRINGDOC_ENABLED}未設定）では
 * Swagger UI・OpenAPI定義エンドポイントが未認証で閲覧できることを確認する。
 * 本番相当の環境で無効化されることの確認は{@link OpenApiDocsDisabledTest}で行う。
 */
@SpringBootTest
@AutoConfigureMockMvc
class OpenApiDocsEnabledTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void openApi定義エンドポイントは未認証で200を返す() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("RaiseTechSNS API"));
    }

    @Test
    void swaggerUIは未認証で200を返す() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk());
    }
}
