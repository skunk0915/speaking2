# URLから練習文章を生成する機能の追加 & セキュア情報の.env移行計画

練習モードに、指定したURLのウェブページからテキスト情報を抽出して、設定された文字数で英会話の最初の文章を自動生成するモード（`url`モード）を追加します。
また、セキュア情報とAIモデル名を `.env` に定義するルールに基づき、環境変数への移行を行います。

## User Review Required

> [!WARNING]
> **外部URL取得における制限事項について**
> サーバーサイド（PHP）から指定のURLを取得する際、以下の理由でテキストの抽出に失敗する場合があります。
> - 対象サイトがスクレイピング防止対策（CloudflareやBotブロックなど）を導入している場合。
> - JavaScriptで動的にコンテンツを描画するSPA（Single Page Application）構成のサイトの場合（PHPの単純なHTML取得では本文が空になります）。
>
> 対策として、URL取得失敗時には明確なエラーメッセージ（「URLからコンテンツを取得できませんでした」など）をユーザーに表示するよう実装します。この挙動で問題ないかご確認ください。

## Open Questions

> [!IMPORTANT]
> - URLモードでの文章生成について、既存の「状況を指定」モードのように10件のバリエーションを提示して選択させる形式にしますか？それとも「内容を指定」のように直接1つの会話文を生成して開始する形式にしますか？
>   - **提案（推奨）**：URLの文章という特定のテキストに基づいて会話を始めるため、直接1つの会話文を生成して即座にロールプレイを開始する形がシンプルで適していると考えます。本計画はこの方針で記載しています。

## Proposed Changes

### 1. 環境設定の .env 移行

#### [NEW] [.env](file:///C:/Users/OW/pj/speaking2/.env)
`config.php` に定義されているデータベースパスワードや各種APIキー、AIモデル名を `.env` に移動します。`.env` はすでに `.gitignore` でGit管理から除外されています。

```env
DB_HOST=mysql80.mizy.sakura.ne.jp
DB_NAME=mizy_speaking2
DB_USER=mizy_speaking2
DB_PASS=8rjcp4ck
GEMINI_API_KEY=AIzaSyD_pdJe8pfXX5oP84N3j4TR5L1Ri55Ufvs
GOOGLE_TTS_API_KEY=AIzaSyAbPWuTHFDc9WhTYDIAGWUETq1kGNTrODc
GEMINI_MODEL=gemini-3-flash-preview
```

#### [MODIFY] [config.php](file:///C:/Users/OW/pj/speaking2/config.php)
`.env` ファイルを読み込む簡易的なロード関数を実装し、各定数（`DB_PASS` や `GEMINI_API_KEY`、`GEMINI_MODEL` など）を `getenv()` 経由で定義するように書き換えます。

---

### 2. UI（フロントエンド）の修正

#### [MODIFY] [index.php](file:///C:/Users/OW/pj/speaking2/index.php)
- 初期入力画面のテンプレート (`tmpl-initial-input`) の `mode-tabs` に「URLから作成」タブ (`data-mode="url"`) を追加します。
- `section-url` を追加し、URLを入力するための `input` または `textarea` を配置します。

#### [MODIFY] [css/style.scss](file:///C:/Users/OW/pj/speaking2/css/style.scss)
- 新しく追加されるURL入力セクション用のスタイルを追加します。
- 既存 of `textarea` スタイルと調和するよう、プレースホルダーやフォーカス時のデザイン（ニューモーフィズムスタイル）を適用します。
- CSSにコンパイルして `css/style.css` を更新します。

#### [MODIFY] [js/app.js](file:///C:/Users/OW/pj/speaking2/js/app.js)
- 初期画面での「URLから作成」タブ切り替えロジックを追加します。
- URL入力欄のバリデーション（簡易的なURL形式チェック）を追加し、「会話を生成する」ボタンの活性/非活性を制御します。
- 「会話を生成する」ボタンが押された際、`inputMode = 'url'` として `generateText` 関数を呼び出し、`api/generate_text.php` へURLを送信します。
- `inputMode === 'url'` の場合は、状況選択フロー（`startSituationOptionsFlow`）を経由せず、直接APIを呼び出すように制御します。

---

### 3. バックエンドAPIの修正

#### [MODIFY] [api/generate_text.php](file:///C:/Users/OW/pj/speaking2/api/generate_text.php)
- 指定されたURLのコンテンツを `curl` で取得し、HTMLからプレーンテキスト（本文）を抽出するヘルパー関数 `fetchUrlText($url)` を実装します。
- `$input['input_mode'] === 'url'` の場合、受け取った `japanese_input`（URL）から上記関数でテキストを抽出し、Gemini API用のプロンプトを構築します。
- プロンプトには「抽出したテキスト情報をベースにし、そのトピックやシーンで会話を開始する」よう指示し、文字数指定 `$length` も反映させます。

---

### 4. ドキュメントの更新

#### [MODIFY] [README.md](file:///C:/Users/OW/pj/speaking2/README.md)
- 新たに追加された「URLから作成」モードの使い方と特徴をREADMEに追記します。

---

## Verification Plan

### Automated Tests
- ローカル環境でPHPサーバーを実行し、外部URLからテキストを抽出してGemini APIに投げる処理が正常に稼働するかを確認します。
- ユニットテスト等は現在用意されていないため、PHPの構文エラーチェック（`php -l`）を行い、シンタックスエラーがないことを確認します。

### Manual Verification
- 初期画面に「URLから作成」タブが表示され、URLを入力したときにのみ生成ボタンが活性化することを確認します。
- テスト用のURL（例: 公開されているニュース記事のURLなど）を入力し、設定スライダーで指定した文字数（20文字や100文字など）に合った会話が正しく生成されるかを確認します。
- 不正なURLや接続できないURLを入力した際に、ユーザーに分かりやすいエラーがアラート等で表示されることを確認します。
- `.env` 移行後もデータベース接続やGemini APIの呼び出しが正常に行えることを確認します。
