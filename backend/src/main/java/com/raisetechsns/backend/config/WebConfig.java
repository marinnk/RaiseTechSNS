package com.raisetechsns.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spring MVCレベルのCORS設定。
 *
 * <p>Spring Securityが有効な現在、{@code /api/**} へのリクエストは実際には
 * {@link SecurityConfig#corsConfigurationSource()} のCORS設定（Security Filter Chain内）が先に適用される。
 * このクラスの設定は、Security Filter Chainを経由しないハンドラー（将来追加され得るもの）向けの保険として残す。
 * 2箇所の設定がずれないよう、変更時は両方を揃えること。
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // allowCredentials(true)と組み合わせてワイルドカードを使うため、厳密一致のみの
        // allowedOrigins ではなく allowedOriginPatterns を使う（SecurityConfigと揃える）
        registry.addMapping("/api/**")
                .allowedOriginPatterns("http://localhost:5173", "https://*.cloudfront.net")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                .allowCredentials(true);
    }
}
