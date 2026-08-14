package com.raisetechsns.backend.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;

/**
 * Swagger UI・{@code /v3/api-docs}で公開するOpenAPI定義の基本情報を設定する。
 *
 * <p>Swagger UI・OpenAPI定義エンドポイント自体の有効/無効は
 * {@code springdoc.api-docs.enabled} / {@code springdoc.swagger-ui.enabled}
 * （{@code application.properties}）で制御し、開発環境のみ有効、本番相当の環境では無効化する。
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("RaiseTechSNS API")
                        .description("RaiseTechSNS（学習用SNS風Webアプリ）のバックエンドREST API仕様書")
                        .version("v1"))
                // 明示的に固定しないと、docs/openapi.yaml生成時（generateOpenApiDocsタスクは
                // 一時的にポート8081でアプリを起動する）に、実際の起動ポート8080ではなく
                // 8081がserversとして書き出されてしまうため
                .servers(List.of(new Server()
                        .url("http://localhost:8080")
                        .description("ローカル開発環境")))
                .components(new Components()
                        .addSecuritySchemes("cookieAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.COOKIE)
                                .name("access_token")
                                .description("ログイン時に発行されるhttpOnly Cookie（access_token）による認証")));
    }
}
