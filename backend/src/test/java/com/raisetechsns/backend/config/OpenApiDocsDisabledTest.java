package com.raisetechsns.backend.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 本番相当の環境（{@code springdoc.api-docs.enabled} / {@code springdoc.swagger-ui.enabled}が
 * false、実運用では{@code SPRINGDOC_ENABLED=false}）では、Swagger UI・OpenAPI定義エンドポイントが
 * 無効化されアクセスできなくなることを確認する。
 */
@SpringBootTest(properties = {
        "springdoc.api-docs.enabled=false",
        "springdoc.swagger-ui.enabled=false"
})
@AutoConfigureMockMvc
class OpenApiDocsDisabledTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void openApi定義エンドポイントは404になる() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isNotFound());
    }

    @Test
    void swaggerUIは404になる() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isNotFound());
    }
}
