/**
 * seed.js
 * デモ用の初期データ。basic-design.mdのER図（users/posts/post_images/comments/likes/follows）を
 * そのままJSオブジェクトとして模倣している。
 *
 * フォロー関係やいいねの状態をあえて非対称・不均一にしており、
 * ユーザーを切り替えながら「全体／フォロー中タブの違い」「いいね済み／未済みの見た目の違い」
 * 「自分／他人の投稿での編集削除ボタンの出し分け」等をそのまま触って確認できるようにしている。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;

  var SCHEMA_VERSION = 1;

  // 全シードユーザー共通のデモ用パスワード（ログイン画面にヒントとして表示する）
  var DEMO_PASSWORD = "password123";

  function avatar(seed, label) {
    return RTS.Utils.generateAvatarDataUri(seed, label, 96);
  }

  function img(seed, label) {
    return RTS.Utils.generatePlaceholderImageDataUri(seed, label, 400, 300);
  }

  RTS.Seed = {
    DEMO_PASSWORD: DEMO_PASSWORD,
    SCHEMA_VERSION: SCHEMA_VERSION,

    /**
     * 呼び出すたびに独立した新しいデータを返す（内部で使い回さず、都度生成する）。
     */
    createSeedData: function () {
      var users = [
        {
          id: 1,
          username: "yamada_taro",
          email: "yamada@example.com",
          _mockPassword: DEMO_PASSWORD,
          displayName: "山田太郎",
          bio: "しがないエンジニア見習い。コーヒーとネコが好きです。",
          avatarUrl: avatar("yamada_taro", "山"),
          createdAt: "2026-07-01T09:00:00.000Z",
          updatedAt: "2026-07-01T09:00:00.000Z",
        },
        {
          id: 2,
          username: "suzuki_hanako",
          email: "suzuki@example.com",
          _mockPassword: DEMO_PASSWORD,
          displayName: "鈴木花子",
          bio: "デザイン勉強中🎨 週末は写真を撮ってます。",
          avatarUrl: avatar("suzuki_hanako", "鈴"),
          createdAt: "2026-07-02T09:00:00.000Z",
          updatedAt: "2026-07-02T09:00:00.000Z",
        },
        {
          id: 3,
          username: "tanaka_ichiro",
          email: "tanaka@example.com",
          _mockPassword: DEMO_PASSWORD,
          displayName: "田中一郎",
          bio: "フロントエンド勉強中。React / TypeScriptに挑戦中です。",
          avatarUrl: avatar("tanaka_ichiro", "田"),
          createdAt: "2026-07-03T09:00:00.000Z",
          updatedAt: "2026-07-03T09:00:00.000Z",
        },
        {
          id: 4,
          username: "sato_yui",
          email: "sato@example.com",
          _mockPassword: DEMO_PASSWORD,
          displayName: "佐藤結衣",
          bio: "バックエンド勉強中。Java / Spring Bootに挑戦中です。",
          avatarUrl: avatar("sato_yui", "佐"),
          createdAt: "2026-07-04T09:00:00.000Z",
          updatedAt: "2026-07-04T09:00:00.000Z",
        },
        {
          id: 5,
          username: "ito_kenji",
          email: "ito@example.com",
          _mockPassword: DEMO_PASSWORD,
          displayName: "伊藤健二",
          bio: "",
          avatarUrl: avatar("ito_kenji", "伊"),
          createdAt: "2026-07-05T09:00:00.000Z",
          updatedAt: "2026-07-05T09:00:00.000Z",
        },
      ];

      var posts = [
        {
          id: 101,
          userId: 1,
          content: "今日から新しいプロジェクトが始動！要件定義からしっかりやっていくぞ💪",
          createdAt: "2026-08-10T09:00:00.000Z",
          updatedAt: "2026-08-10T09:00:00.000Z",
        },
        {
          id: 102,
          userId: 2,
          content: "休日は近くの公園で写真を撮ってきました📷 秋の気配を感じます。",
          createdAt: "2026-08-09T18:30:00.000Z",
          updatedAt: "2026-08-09T18:30:00.000Z",
        },
        {
          id: 103,
          userId: 3,
          content: "Reactのカスタムフックについて勉強中。ロジックの分離が思ったより奥が深い…",
          createdAt: "2026-08-09T15:10:00.000Z",
          updatedAt: "2026-08-09T15:10:00.000Z",
        },
        {
          id: 104,
          userId: 1,
          content: "お昼ごはんは近所のラーメン屋さん。最近ハマってます🍜",
          createdAt: "2026-08-09T12:20:00.000Z",
          updatedAt: "2026-08-09T12:20:00.000Z",
        },
        {
          id: 105,
          userId: 4,
          content: "Spring Bootの認証周り、JWTの仕組みを図に描いて整理しました。理解が深まった気がする。",
          createdAt: "2026-08-08T21:05:00.000Z",
          updatedAt: "2026-08-08T21:05:00.000Z",
        },
        {
          id: 106,
          userId: 2,
          content: "デザインカンプ、ようやく完成！次はコーディングフェーズです。",
          createdAt: "2026-08-08T14:45:00.000Z",
          updatedAt: "2026-08-08T14:45:00.000Z",
        },
        {
          id: 107,
          userId: 5,
          content: "初投稿です。よろしくお願いします！",
          createdAt: "2026-08-08T10:00:00.000Z",
          updatedAt: "2026-08-08T10:00:00.000Z",
        },
        {
          id: 108,
          userId: 3,
          content: "TypeScriptの型パズル、解けると気持ちいい。",
          createdAt: "2026-08-07T20:15:00.000Z",
          updatedAt: "2026-08-07T20:15:00.000Z",
        },
        {
          id: 109,
          userId: 1,
          content: "ネコが膝の上で寝てしまい身動きが取れません…このまま在宅勤務します🐈",
          createdAt: "2026-08-07T13:40:00.000Z",
          updatedAt: "2026-08-07T13:40:00.000Z",
        },
        {
          id: 110,
          userId: 4,
          content: "データベース設計のER図、Mermaid記法だとレビューしやすくていいですね。",
          createdAt: "2026-08-06T11:25:00.000Z",
          updatedAt: "2026-08-06T11:25:00.000Z",
        },
      ];

      var postImages = [
        { id: 201, postId: 102, url: img("102-0", "公園1"), order: 0 },
        { id: 202, postId: 102, url: img("102-1", "公園2"), order: 1 },
        { id: 203, postId: 104, url: img("104-0", "ラーメン"), order: 0 },
        { id: 204, postId: 106, url: img("106-0", "デザイン1"), order: 0 },
        { id: 205, postId: 106, url: img("106-1", "デザイン2"), order: 1 },
        { id: 206, postId: 106, url: img("106-2", "デザイン3"), order: 2 },
        { id: 207, postId: 106, url: img("106-3", "デザイン4"), order: 3 },
        { id: 208, postId: 109, url: img("109-0", "ネコ"), order: 0 },
      ];

      var comments = [
        {
          id: 301,
          postId: 101,
          userId: 2,
          content: "頑張ってください！応援してます😊",
          createdAt: "2026-08-10T09:10:00.000Z",
        },
        {
          id: 302,
          postId: 101,
          userId: 3,
          content: "要件定義、大事ですよね。",
          createdAt: "2026-08-10T09:20:00.000Z",
        },
        {
          id: 303,
          postId: 102,
          userId: 1,
          content: "いい写真ですね〜どこの公園ですか？",
          createdAt: "2026-08-09T19:00:00.000Z",
        },
        {
          id: 304,
          postId: 106,
          userId: 4,
          content: "配色センスが素敵です！",
          createdAt: "2026-08-08T15:00:00.000Z",
        },
        {
          id: 305,
          postId: 105,
          userId: 1,
          content: "JWTの図、今度見せてください！",
          createdAt: "2026-08-08T21:30:00.000Z",
        },
      ];

      var likes = [
        { id: 401, postId: 101, userId: 2, createdAt: "2026-08-10T09:05:00.000Z" },
        { id: 402, postId: 101, userId: 4, createdAt: "2026-08-10T09:06:00.000Z" },
        { id: 403, postId: 102, userId: 1, createdAt: "2026-08-09T18:40:00.000Z" },
        { id: 404, postId: 102, userId: 3, createdAt: "2026-08-09T18:45:00.000Z" },
        { id: 405, postId: 102, userId: 4, createdAt: "2026-08-09T18:50:00.000Z" },
        { id: 406, postId: 104, userId: 2, createdAt: "2026-08-09T12:30:00.000Z" },
        { id: 407, postId: 106, userId: 1, createdAt: "2026-08-08T15:00:00.000Z" },
        { id: 408, postId: 106, userId: 2, createdAt: "2026-08-08T15:01:00.000Z" },
        { id: 409, postId: 106, userId: 3, createdAt: "2026-08-08T15:02:00.000Z" },
        { id: 410, postId: 106, userId: 4, createdAt: "2026-08-08T15:03:00.000Z" },
        { id: 411, postId: 106, userId: 5, createdAt: "2026-08-08T15:04:00.000Z" },
        { id: 412, postId: 109, userId: 2, createdAt: "2026-08-07T13:50:00.000Z" },
        { id: 413, postId: 109, userId: 3, createdAt: "2026-08-07T13:55:00.000Z" },
      ];

      var follows = [
        // 山田(1) は 鈴木(2)・田中(3) をフォロー
        { id: 501, followerId: 1, followeeId: 2, createdAt: "2026-07-10T00:00:00.000Z" },
        { id: 502, followerId: 1, followeeId: 3, createdAt: "2026-07-11T00:00:00.000Z" },
        // 鈴木(2) は 山田(1)・佐藤(4) をフォロー
        { id: 503, followerId: 2, followeeId: 1, createdAt: "2026-07-12T00:00:00.000Z" },
        { id: 504, followerId: 2, followeeId: 4, createdAt: "2026-07-13T00:00:00.000Z" },
        // 田中(3) は 山田(1) をフォロー
        { id: 505, followerId: 3, followeeId: 1, createdAt: "2026-07-14T00:00:00.000Z" },
        // 佐藤(4) は 山田(1)・鈴木(2) をフォロー
        { id: 506, followerId: 4, followeeId: 1, createdAt: "2026-07-15T00:00:00.000Z" },
        { id: 507, followerId: 4, followeeId: 2, createdAt: "2026-07-16T00:00:00.000Z" },
        // 伊藤(5) は誰もフォローしておらず、誰にもフォローされていない（空状態確認用）
      ];

      return {
        schemaVersion: SCHEMA_VERSION,
        users: users,
        posts: posts,
        postImages: postImages,
        comments: comments,
        likes: likes,
        follows: follows,
      };
    },
  };
})();
