# Adds five random conversation lines to each Survivor Camp staff member.
# Easy NPC selects one entry from DialogDataSet[0].Texts whenever the dialog opens.

# Minato / JOB coordinator
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,limit=1] DialogData.DialogDataSet[0].Texts set value [{Text:"役割は肩書きじゃない。仲間が次に何を期待できるか、その約束だ。"},{Text:"迷うなら、今の装備ではなく生き残りたい状況からJOBを選ぶといい。"},{Text:"一人で万能になる必要はない。足りない部分を仲間に任せるのも技術だ。"},{Text:"スキルを伸ばしたら、数字だけでなく戦い方がどう変わったか確かめてくれ。"},{Text:"出発前に担当を確認しよう。混乱は弾切れより早く部隊を壊す。"}]

# Rei / radio operator
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,limit=1] DialogData.DialogDataSet[0].Texts set value [{Text:"……107.3、今日も同じ救難信号が三回。自動送信か、生存者かはまだ不明。"},{Text:"北東から短い軍用通信。PMCの符号に似ている。近づくなら慎重に。"},{Text:"無線は声だけじゃない。間隔、雑音、途切れ方にも送信者の状況が出る。"},{Text:"外で中継器を見つけたら壊さないで。位置を控えて私に知らせて。"},{Text:"静かに。今、誰かがこちらの周波数を探っている。"}]

# Hank / Buddy recruiter
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1] DialogData.DialogDataSet[0].Texts set value [{Text:"背中を預ける相手は、射撃の腕だけで決めるな。帰る判断ができる奴を選べ。"},{Text:"Buddyには命令だけじゃなく状況を伝えろ。理由が分かれば動きも変わる。"},{Text:"一人で行くなら軽く、二人なら役割を分けろ。それだけで生存率は違う。"},{Text:"雇用するなら隣のRecruit Tableを使え。同行できるBuddyは一人までだ。"},{Text:"募集名簿は更新済みだ。相性まで保証はしないが、腕は俺が見ている。"}]

# Maya / food and water
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_food,limit=1] DialogData.DialogDataSet[0].Texts set value [{Text:"空腹で持ち帰った物資を、その場で全部食べないこと。明日の分も必要よ。"},{Text:"水は見た目が透明でも信用しないで。封がある物を優先して持ち帰って。"},{Text:"棚が埋まっていると、みんな少しだけ未来を信じられるの。"},{Text:"缶詰を見つけたら日付より膨らみを確認。膨らんだ缶は触らないで。"},{Text:"食料の価値は味じゃない。安全に持ち運べて、必要な時に食べられることよ。"}]

# Shiori / medical
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_medical,limit=1] DialogData.DialogDataSet[0].Texts set value [{Text:"小さな傷ほど帰還後に見せてください。感染は勇敢さを評価しません。"},{Text:"鎮痛剤で動けても、治ったわけではありません。そこを間違えないで。"},{Text:"止血、呼吸、搬送。その順番を覚えておけば、誰かを救えるかもしれません。"},{Text:"医療品は希少です。でも助けを求めるのが遅れた命は、もっと取り戻せません。"},{Text:"衛生兵がいるなら守ってください。衛生兵は部隊全員の残り時間です。"}]

# Goro / tools and parts
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,limit=1] DialogData.DialogDataSet[0].Texts set value [{Text:"異音を無視するな。機械は壊れる前から何度も文句を言ってる。"},{Text:"車両部品は重い。使い道と回収手段を決めてから持ち上げろ。"},{Text:"新品より、規格が分かって直せる中古品の方が役に立つこともある。"},{Text:"銅線、ボルト、工具。地味な物ほど拠点が大きくなると足りなくなる。"},{Text:"直せない物でも捨てるな。別の機械を直す部品にはなる。"}]

tellraw @a[distance=..64] {"text":"[PROJECT DEADZONE] キャンプ職員のランダム会話を更新しました","color":"aqua"}
