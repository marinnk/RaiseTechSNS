/**
 * router.js
 * location.hash に応じて #app-header / #app の中身を差し替えるだけの、簡易ハッシュルーター。
 * ページ全体はリロードされないため、状態（RTS.State）を保持したまま画面遷移できる。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;

  // 完全一致（/profile/edit 等）を先に、パラメータ付き（/profile/:id 等）を後に置く。
  // matchRouteは配列の先頭から順に判定するため、この順序が重要。
  var routes = [
    { path: "/login", view: "Login", auth: false },
    { path: "/register", view: "Register", auth: false },
    { path: "/timeline", view: "Timeline", auth: true },
    { path: "/profile/edit", view: "ProfileEdit", auth: true },
    { path: "/profile/:id", view: "Profile", auth: true },
    { path: "/post/:id", view: "PostDetail", auth: true },
    { path: "/search", view: "Search", auth: true },
  ];

  var currentView = null;
  var currentParams = {};
  var currentQuery = {};

  function parseHash() {
    var raw = (location.hash || "").replace(/^#/, "");
    var qIndex = raw.indexOf("?");
    var path = qIndex === -1 ? raw : raw.slice(0, qIndex);
    var queryString = qIndex === -1 ? "" : raw.slice(qIndex + 1);
    var query = {};
    queryString
      .split("&")
      .filter(Boolean)
      .forEach(function (pair) {
        var idx = pair.indexOf("=");
        var k = idx === -1 ? pair : pair.slice(0, idx);
        var v = idx === -1 ? "" : pair.slice(idx + 1);
        query[decodeURIComponent(k)] = decodeURIComponent(v);
      });
    return { path: path, query: query };
  }

  function matchRoute(path) {
    var pathSegments = path.split("/").filter(Boolean);
    for (var i = 0; i < routes.length; i++) {
      var route = routes[i];
      var routeSegments = route.path.split("/").filter(Boolean);
      if (routeSegments.length !== pathSegments.length) continue;
      var params = {};
      var matched = true;
      for (var j = 0; j < routeSegments.length; j++) {
        var rs = routeSegments[j];
        var ps = pathSegments[j];
        if (rs.charAt(0) === ":") {
          params[rs.slice(1)] = decodeURIComponent(ps);
        } else if (rs !== ps) {
          matched = false;
          break;
        }
      }
      if (matched) return { route: route, params: params };
    }
    return null;
  }

  function renderHeader() {
    var currentUser = RTS.State.getCurrentUser();
    document.getElementById("app-header").innerHTML = RTS.Components.Header.render(currentUser);
  }

  function renderView() {
    var container = document.getElementById("app");
    container.innerHTML = currentView.render(currentParams, currentQuery);
    if (currentView.afterRender) currentView.afterRender(container);
    window.scrollTo(0, 0);
  }

  function handleRouteChange() {
    var parsed = parseHash();
    var path = parsed.path;
    var currentUser = RTS.State.getCurrentUser();

    if (!path || path === "/") {
      path = currentUser ? "/timeline" : "/login";
    }

    var match = matchRoute(path);
    if (!match) {
      location.hash = "#" + (currentUser ? "/timeline" : "/login");
      return;
    }

    var route = match.route;
    if (route.auth && !currentUser) {
      location.hash = "#/login";
      return;
    }
    if (!route.auth && currentUser) {
      // ログイン中はログイン・新規登録画面を表示しない
      location.hash = "#/timeline";
      return;
    }

    // 実際の画面遷移なので、編集中フラグ等の一時UI状態はリセットする
    RTS.UI.editingPostId = null;
    RTS.UI.expandedFollowLists = {};
    RTS.Draft.content = {};
    RTS.Draft.images = {};

    currentView = RTS.Views[route.view];
    currentParams = match.params;
    currentQuery = parsed.query;

    renderHeader();
    renderView();
  }

  RTS.Router = {
    init: function () {
      window.addEventListener("hashchange", handleRouteChange);
      handleRouteChange();
    },

    navigate: function (hash) {
      location.hash = hash;
    },

    /**
     * ハッシュ（=ルート）は変えず、現在のビューだけを再描画する。
     * いいね・コメント投稿・編集モード切替など、同一画面内での状態変化に使う。
     */
    rerenderView: function () {
      renderView();
    },

    /**
     * ログイン・ログアウト直後などヘッダーの表示だけ更新したい場合に使う。
     */
    rerenderHeader: function () {
      renderHeader();
    },

    /**
     * 現在アクティブなビューモジュールを返す（main.jsのイベント委譲用）。
     */
    getCurrentView: function () {
      return currentView;
    },
  };
})();
