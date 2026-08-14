package com.raisetechsns.backend.logging;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * {@link RequestLoggingFilter}をサーブレットフィルターとして登録する。
 *
 * <p>{@link RequestLoggingFilter}には{@code @Component}を付けず、ここで明示的に
 * {@link FilterRegistrationBean}を使って{@code Ordered.HIGHEST_PRECEDENCE}を指定している。
 * {@code @Component}を付けてSpring Bootの自動登録に任せると、デフォルトの登録順序
 * （{@code Ordered.LOWEST_PRECEDENCE}）はSpring Securityのフィルターチェーン（{@code order=-100}）
 * より後になってしまい、認証エラー（401）等セキュリティ層で完結するレスポンスにリクエストIDが
 * 乗らなくなる。
 */
@Configuration
public class LoggingConfig {

    @Bean
    public FilterRegistrationBean<RequestLoggingFilter> requestLoggingFilter() {
        FilterRegistrationBean<RequestLoggingFilter> registration =
                new FilterRegistrationBean<>(new RequestLoggingFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}
