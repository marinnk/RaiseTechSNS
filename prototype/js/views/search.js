/**
 * views/search.js — S07 ユーザー検索画面
 * ユーザー名・表示名の部分一致で検索する（UC09）。未入力のまま検索は実行しない。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;
  RTS.Views = RTS.Views || {};
  var esc = RTS.Utils.escapeHtml;

  RTS.Views.Search = {
    render: function () {
      var keyword = RTS.UI.searchKeyword || "";
      var hasSearched = !!RTS.UI.searchHasSearched;
      var results = RTS.UI.searchResults || [];

      var resultsHtml = "";
      if (hasSearched) {
        if (results.length === 0) {
          resultsHtml = '<p class="empty-state">該当する利用者が見つかりませんでした。</p>';
        } else {
          resultsHtml = results
            .map(function (u) {
              return (
                '<a class="search-result-item" href="#/profile/' +
                u.id +
                '">' +
                '<span class="user-link search-result-item-left">' +
                '<img class="avatar avatar-md" src="' +
                esc(u.avatarUrl) +
                '" alt="">' +
                "<span>" +
                '<span class="display-name">' +
                esc(u.displayName) +
                '</span> <span class="username">@' +
                esc(u.username) +
                "</span>" +
                (u.bio ? '<div class="search-result-bio">' + esc(u.bio) + "</div>" : "") +
                "</span>" +
                "</span>" +
                "</a>"
              );
            })
            .join("");
        }
      }

      return (
        '<div class="back-link-bar"><a href="#/timeline">← タイムラインに戻る</a></div>' +
        '<form class="search-form" data-action="search-submit">' +
        '<input type="text" name="keyword" placeholder="ユーザー名・表示名で検索" value="' +
        esc(keyword) +
        '">' +
        '<button type="submit" class="btn">検索</button>' +
        "</form>" +
        '<div class="search-results">' +
        resultsHtml +
        "</div>"
      );
    },

    handleEvent: function (type, action, target, event) {
      if (type === "submit" && action === "search-submit") {
        event.preventDefault();
        var form = target;
        var keyword = form.querySelector('input[name="keyword"]').value;
        RTS.UI.searchKeyword = keyword;
        RTS.UI.searchHasSearched = true;
        RTS.UI.searchResults = RTS.State.searchUsers(keyword);
        RTS.Router.rerenderView();
      }
    },
  };
})();
