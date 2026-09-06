// PROJECT DEADZONE arsenal research tooltip v0.3

ItemEvents.tooltip(event => {
  event.addAdvanced('tacz:modern_kinetic_gun', (stack, advanced, text) => {
    let gunId = 'unknown:unknown'
    try { if (stack.nbt && stack.nbt.GunId) gunId = String(stack.nbt.GunId).toLowerCase() } catch (ignored) {}
    text.add(Text.of('PDZ製造研究区分: 武器系統で判定').gold())
    text.add(Text.of('S0 拳銃・SMG → S1 AR・SG → S2 SR・支援火器 → S3 試験兵器').gray())
    text.add(Text.of('入手済みの銃は取得経路・ストーリー段階を問わず射撃可能').green())
    text.add(Text.of('手に持って /deadzonearsenal status で詳細確認').darkGray())
  })
})
