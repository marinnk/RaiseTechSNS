/**
 * utils.js
 * 汎用ヘルパー関数群。RTS名前空間の起点（最初に読み込まれる）。
 * ESモジュールは使わず、window.RTS にぶら下げるクラシックスクリプト方式。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;

  // ---- 画面をまたいで共有される、永続化しない一時UI状態 -----------------
  // Draft: 入力途中のフォーム内容（投稿本文・選択画像など）。
  //        いいね等の無関係な操作で画面が再描画されても入力中の内容が消えないように、
  //        フォームのDOMではなくここに退避しておく。
  // UI:    「今どの投稿を編集中か」等の一時的な画面状態。ルート（ハッシュ）が変わったらリセットする。
  RTS.Draft = { content: {}, images: {} };
  RTS.UI = { editingPostId: null, expandedFollowLists: {} };

  RTS.Utils = {
    /**
     * ユーザー入力をHTMLに埋め込む前に必ず通す。XSS的な崩れを防ぐ。
     */
    escapeHtml: function (value) {
      if (value === null || value === undefined) return "";
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    /**
     * ISO日時文字列を "2026-08-10 09:00" のような表示用文字列に整形する。
     */
    formatDateTime: function (isoString) {
      var d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      var pad = function (n) {
        return String(n).padStart(2, "0");
      };
      return (
        d.getFullYear() +
        "-" +
        pad(d.getMonth() + 1) +
        "-" +
        pad(d.getDate()) +
        " " +
        pad(d.getHours()) +
        ":" +
        pad(d.getMinutes())
      );
    },

    nowIso: function () {
      return new Date().toISOString();
    },

    /**
     * 配列中の既存idの最大値+1を返す（新規id採番用）。
     */
    nextId: function (array) {
      var max = 0;
      (array || []).forEach(function (item) {
        if (item.id > max) max = item.id;
      });
      return max + 1;
    },

    /**
     * 文字列から0-359の色相を決定論的に算出する（同じ文字列なら常に同じ色）。
     */
    hashToHue: function (str) {
      var hash = 0;
      var s = String(str || "");
      for (var i = 0; i < s.length; i++) {
        hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
      }
      return hash % 360;
    },

    /**
     * アイコン画像のプレースホルダーをSVGのdata URIとして生成する。
     * 画像アセットを一切用意しなくてもアバターが表示できるようにするための工夫。
     */
    generateAvatarDataUri: function (seedString, displayLabel, size) {
      size = size || 64;
      var hue = RTS.Utils.hashToHue(seedString);
      var bg = "hsl(" + hue + ", 55%, 45%)";
      var label = RTS.Utils.escapeHtml((displayLabel || seedString || "?").charAt(0).toUpperCase());
      var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' +
        size +
        '" height="' +
        size +
        '" viewBox="0 0 ' +
        size +
        " " +
        size +
        '">' +
        '<rect width="100%" height="100%" rx="' +
        size / 2 +
        '" fill="' +
        bg +
        '"/>' +
        '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" ' +
        'font-family="sans-serif" font-size="' +
        size * 0.5 +
        '" fill="#ffffff">' +
        label +
        "</text>" +
        "</svg>";
      return "data:image/svg+xml," + encodeURIComponent(svg);
    },

    /**
     * シード投稿用の色付きプレースホルダー画像をSVGのdata URIとして生成する。
     */
    generatePlaceholderImageDataUri: function (seedString, label, width, height) {
      width = width || 400;
      height = height || 300;
      var hue = RTS.Utils.hashToHue(seedString);
      var bg = "hsl(" + hue + ", 45%, 60%)";
      var fg = "hsl(" + hue + ", 45%, 25%)";
      var text = RTS.Utils.escapeHtml(label || "");
      var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' +
        width +
        '" height="' +
        height +
        '" viewBox="0 0 ' +
        width +
        " " +
        height +
        '">' +
        '<rect width="100%" height="100%" fill="' +
        bg +
        '"/>' +
        '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" ' +
        'font-family="sans-serif" font-size="' +
        Math.round(height * 0.12) +
        '" fill="' +
        fg +
        '">' +
        text +
        "</text>" +
        "</svg>";
      return "data:image/svg+xml," + encodeURIComponent(svg);
    },

    /**
     * 選択された画像ファイルを、長辺を縮小したJPEGのdata URLに変換する。
     * localStorageの容量に収まる程度までサイズを抑えるための処理。
     * 戻り値はPromise<string>。
     */
    readFileAsResizedDataUrl: function (file, maxDimension, quality) {
      maxDimension = maxDimension || 800;
      quality = quality || 0.7;
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function () {
          reject(new Error("ファイルの読み込みに失敗しました"));
        };
        reader.onload = function () {
          var img = new Image();
          img.onerror = function () {
            reject(new Error("画像として読み込めませんでした"));
          };
          img.onload = function () {
            var scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
            var w = Math.max(1, Math.round(img.width * scale));
            var h = Math.max(1, Math.round(img.height * scale));
            var canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", quality));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    },

    /**
     * 文字数（サロゲートペアや絵文字は簡易的にコードポイント単位で数える）。
     */
    countChars: function (str) {
      return Array.from(String(str || "")).length;
    },

    /**
     * 投稿本文・コメント・自己紹介など、複数箇所で使う文字数カウンター表示のHTML片。
     * data-role="char-counter" data-draft-key="..." で、対応するテキストエリアの
     * data-draft-key と紐付ける（main.jsのinputハンドラが直接DOM更新するための目印）。
     */
    charCounterHtml: function (draftKey, text, maxLength) {
      var count = RTS.Utils.countChars(text);
      var over = count > maxLength;
      return (
        '<div class="char-counter' +
        (over ? " over-limit" : "") +
        '" data-role="char-counter" data-draft-key="' +
        draftKey +
        '">' +
        count +
        "/" +
        maxLength +
        "</div>"
      );
    },
  };
})();
