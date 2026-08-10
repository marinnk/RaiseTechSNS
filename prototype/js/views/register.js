/**
 * views/register.js — S02 新規登録画面
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;
  RTS.Views = RTS.Views || {};
  var esc = RTS.Utils.escapeHtml;

  var _error = null;

  RTS.Views.Register = {
    render: function () {
      var errorHtml = _error ? '<div class="form-error">' + esc(_error) + "</div>" : "";
      return (
        '<div class="centered-page">' +
        '<h1 class="auth-title">新規登録</h1>' +
        errorHtml +
        '<form data-action="register-submit">' +
        '<div class="form-field"><label for="register-username">ユーザー名</label>' +
        '<input type="text" id="register-username" name="username" autocomplete="username" required></div>' +
        '<div class="form-field"><label for="register-email">メールアドレス</label>' +
        '<input type="email" id="register-email" name="email" autocomplete="email" required></div>' +
        '<div class="form-field"><label for="register-password">パスワード</label>' +
        '<input type="password" id="register-password" name="password" autocomplete="new-password" required></div>' +
        '<button type="submit" class="btn btn-block">登録する</button>' +
        "</form>" +
        '<p class="auth-switch"><a href="#/login">ログイン画面に戻る</a></p>' +
        "</div>"
      );
    },

    handleEvent: function (type, action, target, event) {
      if (type === "submit" && action === "register-submit") {
        event.preventDefault();
        var form = target;
        var username = form.querySelector("#register-username").value;
        var email = form.querySelector("#register-email").value;
        var password = form.querySelector("#register-password").value;
        var result = RTS.State.register({ username: username, email: email, password: password });
        if (result.ok) {
          _error = null;
          RTS.Router.navigate("#/timeline");
        } else {
          _error = result.error;
          RTS.Router.rerenderView();
        }
      }
    },
  };
})();
