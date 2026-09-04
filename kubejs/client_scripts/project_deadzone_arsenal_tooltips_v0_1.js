// PROJECT DEADZONE arsenal authorization tooltip v0.2

ItemEvents.tooltip(event => {
  event.addAdvanced('tacz:modern_kinetic_gun', (stack, advanced, text) => {
    let gunId = 'unknown:unknown'
    try { if (stack.nbt && stack.nbt.GunId) gunId = String(stack.nbt.GunId).toLowerCase() } catch (ignored) {}
    text.add(Text.of('PDZ戦術承認: 武器系統で判定').gold())
    text.add(Text.of('S0 拳銃・SMG → S1 AR・SG → S2 SR・支援火器 → S3 試験兵器').gray())
    text.add(Text.of('手に持って /deadzonearsenal status で確認').darkGray())
  })
})
