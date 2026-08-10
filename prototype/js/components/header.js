/**
 * components/header.js
 * 全画面共通のヘッダー。ログイン中のみ表示する（ログイン・新規登録画面では非表示）。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;
  RTS.Components = RTS.Components || {};

  RTS.Components.Header = {
    render: function (currentUser) {
      if (!currentUser) return "";
      var esc = RTS.Utils.escapeHtml;
      return (
        '<div class="header-bar">' +
        '<a class="header-logo" href="#/timeline">RaiseTechSNS</a>' +
        '<nav class="header-nav">' +
        '<a href="#/search">検索</a>' +
        '<a href="#/profile/' +
        currentUser.id +
        '">' +
        '<img class="avatar avatar-sm" src="' +
        esc(currentUser.avatarUrl) +
        '" alt="' +
        esc(currentUser.displayName) +
        'のアイコン">' +
        "</a>" +
        '<button type="button" data-action="logout">ログアウト</button>' +
        '<button type="button" class="demo-reset" data-action="reset-demo">デモデータをリセット</button>' +
        "</nav>" +
        "</div>"
      );
    },
  };
})();
