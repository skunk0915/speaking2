# マルチエージェント（teamwork_preview）用タスクプロンプト

## 目的
英会話練習と回答表示において、添削結果および履歴内に表示されるヒント表示（`.correction-hint-display`）について、ユーザーが実際に選択した返事例と、それ以外の（選ばなかった）返事例を別々に分けて表示するように修正してください。

## 変更対象ファイル
- `js/app.js`
- `css/style.scss`（およびビルド後の `css/style.css`）

## 具体的な実装方針

### 1. `js/app.js` におけるデータ構造と状態管理の変更
- **ヒントクリック時のデータ保存 (`Line 1374` 付近)**
  - 現在はクリック時に `usedSampleAnswers = [...currentSampleAnswers]` と単なる配列を退避していますが、クリックされた項目のテキスト（`jaText`）と一致するものを `selected: true`、それ以外を `selected: false` としたオブジェクトの配列にマッピングして保存するように変更してください。
  - 例: `usedSampleAnswers = currentSampleAnswers.map(ans => ({ ja: ans.ja, en: ans.en, selected: (ans.ja === jaText) }))` （文字列/オブジェクトの違いを考慮すること）

- **添削表示時のレンダリング (`getCorrection` 内 `Line 1996` 付近)**
  - `usedSampleAnswers` に `selected` 情報が含まれている場合、以下のようにグルーピングして描画してください。
    - **選んだ返事例**: `selected: true` の要素を表示するグループ。ラベルは「選んだ返事例:」とする。
    - **その他の返事例**: `selected: false` の要素を表示するグループ。ラベルは「その他の返事例:」とする。
  - 過去の履歴など `selected` プロパティが存在しない古いデータについては、従来どおり「使用したヒント:」として一括で表示するフォールバックロジックを入れてください。

- **履歴ロード時のレンダリング (`renderHistory` 内 `Line 2863` 付近)**
  - `getCorrection` 内と同様に、`h.used_hints` の中に `selected` プロパティがあるかチェックし、グループを分けてレンダリングしてください。

### 2. `css/style.scss` におけるスタイリングの修正
- `.correction-hint-display` 内に、グループを表現するコンテナ（`.hint-group` などのクラス）を考慮したレイアウト（`gap` の設定など）を追加してください。
- 「選んだ返事例」のラベル（`.selected-group .label`）を目立たせ、「選んだ返事例」のカード（`.selected-item`）にはプレミアムな背景グラデーションやボーダー（例: `$primary-color` に基づく薄いハイライトなど）を適用してください。
- ユーザーがクリック可能と誤認しないよう、引き続き `.correction-hint-item` に `pointer-events: none` および `cursor: default` を設定し、ホバー・クリック効果を無効化してください。

### 3. ビルドと動作検証
- Sassのコンパイル（Sassファイルのビルド）を実行し、`css/style.css` を正常に更新してください。
- 実際にヒントをクリックして回答を入力・送信し、添削結果および履歴表示で「選んだ返事例」と「その他の返事例」が美しくスタイリングされて分かれているか、ブラウザで動作確認を行ってください。

## ワークフローの順守
- 開発作業は main ブランチへ直接コミットせず、Git管理ワークフロー（feature/ブランチ作成など）を前提として手順を進めてください。
- 開発の進捗に合わせて `PROGRESS.md` をリアルタイムで更新してください。
