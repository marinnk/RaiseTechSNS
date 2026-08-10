/**
 * views/profile.js — S05 プロフィール画面
 * 自分のプロフィールなら編集ボタン、他人のプロフィールならフォロー／フォロー解除ボタンを表示する。
 * フォロー中／フォロワーの人数はクリックで一覧を開閉できる（F-6-3）。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;
  RTS.Views = RTS.Views || {};
  var esc = RTS.Utils.escapeHtml;

  function renderUserList(users) {
    if (users.length === 0) {
      return '<span class="form-hint">該当する利用者はいません。</span>';
    }
    return users
      .map(function (u) {
        return (
          '<a class="user-link" href="#/profile/' +
          u.id +
          '"><img class="avatar avatar-sm" src="' +
          esc(u.avatarUrl) +
          '" alt=""><span><span class="display-name">' +
          esc(u.displayName) +
          '</span> <span class="username">@' +
          esc(u.username) +
          "</span></span></a>"
        );
      })
      .join("");
  }

  RTS.Views.Profile = {
    render: function (params) {
      var userId = Number(params.id);
      var currentUser = RTS.State.getCurrentUser();
      var user = RTS.State.getUserById(userId);

      if (!user) {
        return (
          '<div class="back-link-bar"><a href="#/timeline">← タイムラインに戻る</a></div>' +
          '<p class="empty-state">ユーザーが見つかりませんでした。</p>'
        );
      }

      var isMine = currentUser.id === user.id;
      var counts = RTS.State.getFollowCounts(user.id);
      var isFollowing = !isMine && RTS.State.isFollowing(currentUser.id, user.id);
      var posts = RTS.State.getPostsByUser(user.id, currentUser.id);

      var actionBtnHtml = isMine
        ? '<a class="btn btn-outline" href="#/profile/edit">プロフィールを編集</a>'
        : '<button type="button" class="btn ' +
          (isFollowing ? "btn-outline" : "") +
          '" data-action="toggle-follow" data-user-id="' +
          user.id +
          '">' +
          (isFollowing ? "フォロー中" : "フォローする") +
          "</button>";

      var followingExpanded = !!RTS.UI.expandedFollowLists["following:" + user.id];
      var followerExpanded = !!RTS.UI.expandedFollowLists["followers:" + user.id];

      var followListsHtml = "";
      if (followingExpanded) {
        followListsHtml +=
          '<div class="follow-list-panel">' + renderUserList(RTS.State.getFollowingList(user.id)) + "</div>";
      }
      if (followerExpanded) {
        followListsHtml +=
          '<div class="follow-list-panel">' + renderUserList(RTS.State.getFollowerList(user.id)) + "</div>";
      }

      var postsHtml =
        posts.length > 0
          ? posts
              .map(function (p) {
                return RTS.Components.PostCard.render(p, { linkToDetail: true });
              })
              .join("")
          : '<p class="empty-state">まだ投稿がありません。</p>';

      return (
        '<div class="back-link-bar"><a href="#/timeline">← タイムラインに戻る</a></div>' +
        '<div class="profile-header">' +
        '<img class="avatar avatar-lg" src="' +
        esc(user.avatarUrl) +
        '" alt="' +
        esc(user.displayName) +
        'のアイコン">' +
        '<div class="profile-header-info">' +
        '<div class="profile-header-top">' +
        "<div>" +
        '<span class="display-name" style="font-size:18px">' +
        esc(user.displayName) +
        "</span><br>" +
        '<span class="username">@' +
        esc(user.username) +
        "</span>" +
        "</div>" +
        actionBtnHtml +
        "</div>" +
        '<p class="profile-bio' +
        (user.bio ? "" : " profile-empty-bio") +
        '">' +
        (user.bio ? esc(user.bio).replace(/\n/g, "<br>") : "自己紹介はまだ設定されていません。") +
        "</p>" +
        '<div class="follow-counts">' +
        '<button type="button" class="follow-count-btn" data-action="toggle-follow-list" data-user-id="' +
        user.id +
        '" data-type="following"><strong>' +
        counts.followingCount +
        "</strong> フォロー中</button>" +
        '<button type="button" class="follow-count-btn" data-action="toggle-follow-list" data-user-id="' +
        user.id +
        '" data-type="followers"><strong>' +
        counts.followerCount +
        "</strong> フォロワー</button>" +
        "</div>" +
        followListsHtml +
        "</div>" +
        "</div>" +
        '<div class="section-title">' +
        esc(user.displayName) +
        "の投稿</div>" +
        postsHtml
      );
    },
  };
})();
