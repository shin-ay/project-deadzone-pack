Solas PDZ Lighting 0.1.0 / PROJECT DEADZONE

このパッケージはPDZ独自の照明マッピングと適用ツールです。
Solas本体・その改変済みソース・完成した改変ZIPは配布していません。
Solas Shader V3.7bの作者はSeptoniousです。
公式: https://modrinth.com/shader/solas-shader
ソース: https://github.com/Septonious/Solas-Shader
規約: https://github.com/Septonious/Solas-Shader/blob/main/LICENSE
公式配布された本体を各自のPCで読み込み、個人用の改変版を生成します。
生成されたZIPは再配布せず、フレンドにもPackwizとこのPDZパッチを案内してください。

使い方（Windows）
1. いつものPackwiz更新を完了する。公式Solas V3.7bとこのパッチが取得される。
2. 初回はゲームを閉じ、Minecraftフォルダー内の
   pdz_tools/shader_lighting/Apply-Solas-PDZ.cmd を実行する。
3. シェーダー一覧で Solas PDZ Lighting 0.1.0.zip を選ぶ。
Prismの標準Packwiz起動前コマンドは、この実行時に更新＋パッチ適用のラッパーへ設定される。
以後は起動前にPackwiz更新とPDZ版の再生成を行う。失敗時はゲーム起動を中止してエラーを表示する。
独自の起動前コマンドがある場合は上書きせず保持するので、更新後に手動適用してください。
CurseForgeの作業用プロファイルは、パッチ更新後に同じcmdを再実行してください。
設定ファイルの変更前バックアップは各プロファイルの .pdz_stage_backups/solas_lighting/ 以下。
元のSolasは残す。元版のSolas個人設定がある場合は初回だけPDZ版へ継承する。
他のシェーダーを選択している場合、その選択は勝手に変更しない。

内容
対応MODの通常の設置照明を、Solasのランタンと同じ輝度基準でボクセル照明へ登録する。
電球色・白色・ネオン等の色は別に扱い、ランタン自体の設定や全体の明るさは変更しない。
lit/on/active/powered/level等の点灯条件がある照明は状態を限定し、消灯状態を新規発光対象にしない。
明るい発光面だけにPBR自己発光を補助し、暗い支柱の発光を抑える。
植物、支柱、接続部、未確認のDecocraftアニメーション部品等は除外。手持ちライト/独自BlockEntity描画は別の対応になる。
ゲーム本来のブロック光量・湧き判定・電力・サーバーMODは変更しない。
画像比較・ゲーム内での色/明るさ/影と、全Irisプログラムの実描画確認は別途必要。

適用対象の詳細は lighting-map.json。点灯条件は導入済みJARのblockstatesから検査。
このツールは固定した公式V3.7bのSHA256を確認し、異なる版や改変済み本体へは適用しない。
更新時に対応版名が変わった場合も、Solas/PDZ版を選んでいた利用者だけ新しい版へ移す。
