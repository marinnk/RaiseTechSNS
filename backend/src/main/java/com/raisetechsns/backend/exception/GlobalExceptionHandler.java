package com.raisetechsns.backend.exception;

import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * どのコントローラーで例外が発生しても、レスポンスの形（ProblemDetail）を統一するための受け皿。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail handleResponseStatusException(ResponseStatusException ex) {
        return ProblemDetail.forStatusAndDetail(ex.getStatusCode(), ex.getReason());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationException(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
    }

    /**
     * アップロードファイルが{@code spring.servlet.multipart.max-file-size}を超えた場合にSpring MVCが
     * 投げる例外。{@link ResponseStatusException}ではないため、このハンドラーが無いと
     * {@link #handleUnexpectedException}に落ちて500になってしまう。
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "uploaded file is too large");
    }

    /**
     * {@code Content-Type}が{@code @RequestMapping}の{@code consumes}と合わない場合にSpring MVCが
     * 投げる例外（例：投稿の作成・編集はmultipart/form-data専用だが、application/jsonで送られた場合）。
     * {@link ResponseStatusException}ではないため、このハンドラーが無いと
     * {@link #handleUnexpectedException}に落ちて415ではなく500になってしまう。
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ProblemDetail handleUnsupportedMediaType(HttpMediaTypeNotSupportedException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported content type");
    }

    /**
     * 対応するハンドラー・静的リソースが見つからない場合にSpring MVCが投げる例外
     * （例：Swagger UI・OpenAPI定義エンドポイントを{@code springdoc.*.enabled=false}で無効化した状態で
     * {@code /v3/api-docs}等にアクセスした場合）。{@link ResponseStatusException}ではないため、
     * このハンドラーが無いと{@link #handleUnexpectedException}に落ちて404ではなく500になってしまう。
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ProblemDetail handleNoResourceFoundException(NoResourceFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "resource not found");
    }

    /**
     * リクエストボディが不正なJSON（構文エラー・型不一致等でデシリアライズできない）場合に
     * Spring MVCが投げる例外。{@link ResponseStatusException}ではないため、このハンドラーが
     * 無いと{@link #handleUnexpectedException}に落ちて400ではなく500になってしまう。
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "malformed request body");
    }

    /**
     * パス変数・クエリパラメータが宣言された型（{@code Long}等）に変換できない場合
     * （例：{@code /api/users/abc}）にSpring MVCが投げる例外。{@link ResponseStatusException}
     * ではないため、このハンドラーが無いと{@link #handleUnexpectedException}に落ちて
     * 400ではなく500になってしまう。
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleMethodArgumentTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                ex.getName() + ": invalid value");
    }

    /**
     * 必須のクエリパラメータが指定されていない場合にSpring MVCが投げる例外。
     * {@link ResponseStatusException}ではないため、このハンドラーが無いと
     * {@link #handleUnexpectedException}に落ちて400ではなく500になってしまう。
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ProblemDetail handleMissingServletRequestParameter(MissingServletRequestParameterException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                ex.getParameterName() + ": required parameter is missing");
    }

    /**
     * multipart/form-dataリクエストで必須のパート（{@code data}・{@code file}等）が
     * 含まれていない場合にSpring MVCが投げる例外。{@link ResponseStatusException}ではないため、
     * このハンドラーが無いと{@link #handleUnexpectedException}に落ちて400ではなく500になってしまう。
     */
    @ExceptionHandler(MissingServletRequestPartException.class)
    public ProblemDetail handleMissingServletRequestPart(MissingServletRequestPartException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                ex.getRequestPartName() + ": required part is missing");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpectedException(Exception ex) {
        LOG.error("unexpected error occurred", ex);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "unexpected error occurred");
    }
}
