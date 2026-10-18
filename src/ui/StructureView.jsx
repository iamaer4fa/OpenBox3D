// 结构视图：盒型库 / 内尺寸 / 材质 / 工艺参数 / 线型编辑 + 中央刀版画布 + 右栏规格与校验
import React from 'react';
import { store, useStore } from '../state/store.js';
import { TPLS, MATS, CORRUGATED_MATS, corrugatedDigitsOf, corrugatedHeightOf, corrugatedMatOf } from '../dieline/templates.js';
import { geomOf } from '../dieline/geom.js';
import { reflowLayersToContainers } from '../design/containers.js';
import { SheetCanvas } from './SheetCanvas.jsx';
import { ST, Block, Toggle, ToggleRow, NumField, Note, KV, selectSt, btnSt } from './widgets.jsx';
import { Translate, translateText, useI18n } from '../i18n.jsx';

const setNum = (key, min, max) => e => {
  const raw = parseFloat(e.target.value);
  if (!isNaN(raw)) store.set(st => {
    const v = key === 'corrFactor' ? Math.floor(raw) : raw;
    const next = { ...st, [key]: Math.min(max, Math.max(min, v)) }, mat = store.mat();
    return { [key]: next[key], layers: reflowLayersToContainers(st.layers, geomOf(st, mat.t), geomOf(next, mat.t)) };
  });
};

export function StructureView() {
  const { locale } = useI18n();
  const s = useStore();
  const m = store.mat();
  const g = geomOf(s, m.t);
  const fmt = v => Math.round(v * 10) / 10;
  const t = m.t;
  const sw = g.sbb[2] - g.sbb[0], sh = g.sbb[3] - g.sbb[1];
  const tkNow = Math.min(16, s.W * 0.55);
  const corrugatedBox = s.tpl === 'rsc' || s.tpl === 'hsc';
  const corrOffsets = corrugatedDigitsOf(s.corrFactor);
  const corrWidths = corrOffsets.map((offset, i) => (i % 2 === 0 ? s.L : s.W) + offset);
  const specTpl = {
    rsc: [{ k: '板宽序列', v: corrWidths.map(fmt).join('·') }, { k: '楞型补偿', v: 'H +' + corrugatedHeightOf(s.matId, s.tpl) + ' mm' }, { k: '纸板因子', v: String(s.corrFactor).padStart(4, '0') }, { k: '摇盖深度', v: s.flap + ' mm' }],
    hsc: [{ k: '板宽序列', v: corrWidths.map(fmt).join('·') }, { k: '楞型补偿', v: 'H +' + corrugatedHeightOf(s.matId, s.tpl) + ' mm' }, { k: '纸板因子', v: String(s.corrFactor).padStart(4, '0') }, { k: '摇盖深度', v: s.flap + ' mm' }],
    rte: [{ k: '板宽序列', v: fmt(s.W + t) + '·' + fmt(s.L + t) + '·' + fmt(s.W + t) + '·' + fmt(s.L + 2 * t) }, { k: '盖深 / 插舌', v: fmt(s.W + t) + ' / ' + fmt(tkNow) }],
    ste: [{ k: '板宽序列', v: fmt(s.W + t) + '·' + fmt(s.L + t) + '·' + fmt(s.W + t) + '·' + fmt(s.L + 2 * t) }, { k: '盖深 / 插舌', v: fmt(s.W + t) + ' / ' + fmt(tkNow) }],
    mailer: [{ k: '侧墙宽', v: fmt(s.H + t) }, { k: '插舌深', v: fmt(Math.min(s.H * 0.7, 28)) }],
    lidbase: [{ k: '盖内放量', v: '+1.0 mm/边' }, { k: '盖高', v: fmt(Math.max(14, s.H * 0.45)) }],
    drawer: [{ k: '套筒放量', v: '+2~4 × t' }, { k: '筒深', v: fmt(s.L + 2) }],
    cyl: [{ k: '直径 D', v: fmt(s.L) + ' mm' }, { k: '分段', v: '24 × ' + fmt(Math.PI * s.L / 24) + ' mm' }],
    hex: [{ k: '边长', v: fmt(s.W) + ' mm' }, { k: '外接圆径', v: fmt(2 * s.W / (2 * Math.sin(Math.PI / 6))) + ' mm' }]
  };
  const specRows = [
    { k: '展开尺寸', v: fmt(sw) + ' × ' + fmt(sh) },
    { k: '含出血', v: fmt(sw + 2 * s.bleed) + ' × ' + fmt(sh + 2 * s.bleed) },
    { k: '纸厚 t', v: t + ' mm' }
  ].concat(specTpl[s.tpl] || []);
  const checks = locale === 'en'
    ? ['Outer contour is closed', 'No self-intersections / isolated segments', 'Minimum blade clearance ≥ 1.5 mm', 'Creases connect panels on both sides', `Bleed ≥ ${m.bleed} mm (${translateText(m.note, locale)})`]
    : ['外轮廓闭合', '无自交 / 孤立线段', '最小刀距 ≥ 1.5 mm', '压痕两侧均有连接面', '出血 ≥ ' + m.bleed + ' mm（' + m.note + '）'];
  const compNote = locale === 'en'
    ? corrugatedBox ? `Panel widths L/W/L/W + ${String(s.corrFactor).padStart(4, '0')} mm offsets; body height H+${corrugatedHeightOf(s.matId, s.tpl)} mm; ${s.tpl === 'rsc' ? 'flaps at both ends' : 'one end open'}`
      : s.tpl === 'rte' || s.tpl === 'ste' ? 'Current: W+t · L+t · W+t · L+2t, height H+t'
      : s.tpl === 'mailer' ? `Current: flute thickness t=${t}, side wall H+t, lid width W+3t`
        : s.tpl === 'cyl' ? 'Current: diameter D=L, 24 tube segments, 24-sided lids'
          : s.tpl === 'hex' ? 'Current: side length W, hexagonal tube with hexagonal lids'
            : 'Current: lid/sleeve clearance +1 mm per side'
    : corrugatedBox ? '当前：L/W/L/W 按纸板因子逐面补偿；' + (s.tpl === 'rsc' ? '两端摇盖' : '单端摇盖、另一端开口') + '，摇盖深度 ' + s.flap + 'mm'
      : s.tpl === 'rte' || s.tpl === 'ste' ? '当前：W+t · L+t · W+t · L+2t，高度 H+t' : s.tpl === 'mailer' ? '当前：楞厚 t=' + t + '，侧墙 H+t，盖宽 W+3t' : s.tpl === 'cyl' ? '当前：直径 D=L，筒身 24 段卷合，盖为 24 边形' : s.tpl === 'hex' ? '当前：边长 W，六棱筒，盖为正六边形' : '当前：盖/套筒按 +1mm/边 放量';
  const editOn = s.editMode;
  const typeOvrCount = Object.keys(s.typeOvr).length;
  const selSegOk = editOn && s.selSeg != null && g.segs[s.selSeg];
  const curSegT = selSegOk ? g.segs[s.selSeg].t : '';

  return (<Translate>
    <div style={{ width: 246, flex: 'none', background: '#faf7f0', borderRight: '1px solid #ded5c4', overflowY: 'auto' }}>
      <Block>
        <ST>盒型库</ST>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {TPLS.map(b => (
            <div key={b.id} onClick={() => store.set(st => {
              const enteringSlotted = (b.id === 'rsc' || b.id === 'hsc') && st.tpl !== 'rsc' && st.tpl !== 'hsc';
              const mat = b.id === 'rsc' || b.id === 'hsc' ? corrugatedMatOf(st.matId) : store.mat();
              const next = { ...st, tpl: b.id, matId: mat.id, bleed: enteringSlotted ? mat.bleed : st.bleed, corrFactor: enteringSlotted ? mat.corrFactor : st.corrFactor, ovr: {}, typeOvr: {} };
              return { tpl: b.id, matId: mat.id, bleed: next.bleed, corrFactor: next.corrFactor, ovr: {}, typeOvr: {}, selSeg: null, fitNonce: st.fitNonce + 1, layers: reflowLayersToContainers(st.layers, geomOf(st, store.mat().t), geomOf(next, mat.t)) };
            })}
              style={{ cursor: 'pointer', border: '1px solid ' + (s.tpl === b.id ? '#9a5b1f' : '#e2dac9'), background: s.tpl === b.id ? '#f7efe2' : '#fff', borderRadius: 6, padding: '7px 9px' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 700, color: s.tpl === b.id ? '#9a5b1f' : '#a59a85' }}>{b.code}</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 1 }}>{b.name}</div>
              <div style={{ fontSize: 10, color: '#8a8071' }}>{b.sub}</div>
            </div>
          ))}
        </div>
      </Block>
      <Block>
        <ST>内尺寸 · mm</ST>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
          <NumField label="长 L" value={s.L} onChange={setNum('L', 20, 600)} />
          <NumField label="宽 W" value={s.W} onChange={setNum('W', 15, 600)} />
          <NumField label="高 H" value={s.H} onChange={setNum('H', 15, 600)} />
        </div>
      </Block>
      <Block>
        <ST>材质</ST>
        <select value={s.matId} onChange={e => {
          const nm = MATS.find(x => x.id === e.target.value);
          if (!nm) return;
          store.set(st => {
            const om = MATS.find(x => x.id === st.matId) || MATS[0];
            const next = { ...st, matId: nm.id, bleed: nm.bleed, corrFactor: (st.tpl === 'rsc' || st.tpl === 'hsc') ? nm.corrFactor : st.corrFactor };
            return { matId: nm.id, bleed: nm.bleed, corrFactor: next.corrFactor, layers: reflowLayersToContainers(st.layers, geomOf(st, om.t), geomOf(next, nm.t)) };
          });
        }} style={selectSt}>
          {(corrugatedBox ? CORRUGATED_MATS : MATS).map(mm => <option key={mm.id} value={mm.id}>{mm.name}</option>)}
        </select>
        <div style={{ fontSize: 11, color: '#8a8071', marginTop: 7 }}>厚度 t = <b style={{ color: '#9a5b1f', fontFamily: "'JetBrains Mono',monospace" }}>{t} mm</b> · {m.note}</div>
      </Block>
      <Block>
        <ST>工艺参数</ST>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          <NumField label="出血 mm" value={s.bleed} onChange={setNum('bleed', 0, 10)} />
          <NumField label="糊口 mm" value={s.glue} onChange={setNum('glue', 8, 30)} />
        </div>
        {corrugatedBox && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 8 }}>
          <NumField label="纸板因子" value={s.corrFactor} step={1} onChange={setNum('corrFactor', 0, 9999)} />
          <NumField label="摇盖深度 mm" value={s.flap} step={1} onChange={setNum('flap', 1, 600)} />
        </div>}
      </Block>
      <Block>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ST style={{ marginBottom: 0 }}>线型编辑</ST>
          <Toggle on={s.editMode} onClick={() => store.set(st => ({ editMode: !st.editMode, selSeg: null }))} />
        </div>
        {editOn && (<>
          <div style={{ fontSize: 11, color: '#8a8071', marginTop: 8, lineHeight: 1.6 }}>{locale === 'en' ? 'Select a segment to switch between cut and crease. Modified line types: ' : '点击线段后可切换为切线或压痕。已修改线型 '}<b style={{ color: '#9a5b1f' }}>{typeOvrCount}</b>{locale === 'en' ? '' : ' 处。'}</div>
          {selSegOk && (
            <div style={{ marginTop: 9, background: '#f0ebe0', border: '1px solid #e2dac9', borderRadius: 6, padding: '9px 11px' }}>
              <div style={{ fontSize: 11, color: '#6d6557', marginBottom: 7 }}>选中线段 · 当前：{curSegT === 'cut' ? '切线' : '压痕'}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => store.set(st => ({ typeOvr: { ...st.typeOvr, [st.selSeg]: 'cut' } }))} style={{ ...btnSt, flex: 1, background: curSegT === 'cut' ? '#C8102E' : '#fff', color: curSegT === 'cut' ? '#fff' : '#5c554a' }}>切线</button>
                <button onClick={() => store.set(st => ({ typeOvr: { ...st.typeOvr, [st.selSeg]: 'crease' } }))} style={{ ...btnSt, flex: 1, background: curSegT === 'crease' ? '#2E7D46' : '#fff', color: curSegT === 'crease' ? '#fff' : '#5c554a' }}>压痕</button>
              </div>
            </div>
          )}
          <button onClick={() => store.set({ typeOvr: {}, selSeg: null })} style={{ ...btnSt, marginTop: 9, width: '100%', padding: '7px 0', color: '#5c554a' }}>重置线型编辑</button>
        </>)}
      </Block>
      <div style={{ padding: 14 }}>
        <Note><b style={{ color: '#211d18' }}>{locale === 'en' ? 'Board Thickness Compensation' : '纸厚补偿'}</b>　{locale === 'en' ? 'Manufacturing dimensions = inner dimensions + n × t' : '制造尺寸 = 内尺寸 + n × t'}<br />{compNote}</Note>
      </div>
    </div>

    <SheetCanvas view="structure" g={g} />

    <div style={{ width: 258, flex: 'none', background: '#faf7f0', borderLeft: '1px solid #ded5c4', overflowY: 'auto' }}>
      <Block><ST>制造尺寸（已补偿）</ST>{specRows.map(r => <KV key={r.k} k={r.k} v={r.v} />)}</Block>
      <Block>
        <ST>刀模统计</ST>
        <KV k="切线" v={locale === 'en' ? fmt(g.cutLen / 1000) + ' m · ' + g.cutN + ' segments' : fmt(g.cutLen / 1000) + ' m · ' + g.cutN + ' 段'} />
        <KV k="压痕" v={locale === 'en' ? fmt(g.creaseLen / 1000) + ' m · ' + g.creaseN + ' segments' : fmt(g.creaseLen / 1000) + ' m · ' + g.creaseN + ' 段'} />
      </Block>
      <Block>
        <ST>显示</ST>
        {[['bleed', '出血带'], ['safe', '安全区'], ['dims', '尺寸标注'], ['labels', '面板名称']].map(x => (
          <ToggleRow key={x[0]} label={x[1]} on={s.show[x[0]]} onClick={() => store.set(st => ({ show: { ...st.show, [x[0]]: !st.show[x[0]] } }))} />
        ))}
      </Block>
      <div style={{ padding: 14 }}>
        <ST>校验</ST>
        {checks.map(c => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12, color: '#3d3830' }}>
            <div style={{ width: 6, height: 6, borderRadius: 99, background: '#3f9e5f', flex: 'none' }} />{c}
          </div>
        ))}
      </div>
    </div>
  </Translate>);
}
