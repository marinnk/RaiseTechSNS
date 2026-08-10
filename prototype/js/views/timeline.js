/**
 * views/timeline.js — S03 タイムライン画面
 * 「全体」「フォロー中」はハッシュのクエリ文字列（?scope=all|following）で切り替える。
 * 投稿の作成・いいね・編集・削除といった操作はすべて main.js の共通アクションハンドラが処理するため、
 * このビュー自身は表示のみに専念する。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;
  RTS.Views = RTS.Views || {};

  RTS.Views.Timeline = {
    render: function (params, query) {
      var currentUser = RTS.State.getCurrentUser();
      var scope = query.scope === "following" ? "following" : "all";
      var posts = RTS.State.getTimelinePosts({ scope: scope, viewerUserId: currentUser.id });

      var postsHtml;
      if (posts.length > 0) {
        postsHtml = posts
          .map(function (p) {
            return RTS.Components.PostCard.render(p, { linkToDetail: true });
          })
          .join("");
      } else {
        postsHtml =
          '<p class="empty-state">' +
          (scope === "following"
            ? "フォロー中の利用者の投稿はまだありません。気になる人をフォローしてみましょう。"
            : "まだ投稿がありません。最初の投稿をしてみましょう。") +
          "</p>";
      }

      return (
        RTS.Components.PostForm.renderCreateForm(currentUser) +
        '<div class="timeline-tabs">' +
        '<a class="timeline-tab' +
        (scope === "all" ? " active" : "") +
        '" href="#/timeline?scope=all">全体</a>' +
        '<a class="timeline-tab' +
        (scope === "following" ? " active" : "") +
        '" href="#/timeline?scope=following">フォロー中</a>' +
        "</div>" +
        '<div class="post-list">' +
        postsHtml +
        "</div>"
      );
    },
  };
})();
