const css = `
#ulu-price{
  font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;
  color:#3f3f3f; line-height:1.6; background:#f5f5f5;
}
#ulu-price *{margin:0;padding:0;box-sizing:border-box}
#ulu-price{
    --navy:#3f3f3f;
    --gold:#1f1f1f;
    --bg:#f5f5f5;
    --card:#ffffff;
    --band:#e8e8e8;
    --accent:#c9962e;
    --accent-light:#ffcf82;
  }
#ulu-price .wrap{max-width:520px;margin:0 auto;padding:0 18px 80px}
#ulu-price .up-header{
    background:#fff;color:var(--navy);
    text-align:center;padding:38px 20px 28px;
    border-bottom:3px solid var(--accent-light);
  }
#ulu-price .up-header .brand{font-size:13px;letter-spacing:.25em;font-weight:700;color:var(--accent);margin-bottom:10px}
#ulu-price .up-header h1{
    font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;font-weight:700;
    font-size:26px;letter-spacing:.03em;line-height:1.5;
  }
#ulu-price .up-header h1 .gold{color:var(--accent)}
#ulu-price .up-header p{font-size:14px;margin-top:10px;opacity:.9}
#ulu-price .up-section{padding-top:44px}
#ulu-price .sec-tag{
    display:inline-block;background:var(--navy);color:#fff;
    font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;font-weight:700;font-size:15px;
    padding:5px 16px 5px 14px;
    clip-path:polygon(0 0,100% 0,88% 100%,0 100%);
    margin-bottom:10px;letter-spacing:.08em;
  }
#ulu-price h2{
    font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;font-weight:700;
    font-size:24px;letter-spacing:.02em;margin-bottom:6px;
  }
#ulu-price h2 .gold{color:var(--accent)}
#ulu-price .lead{font-size:14px;font-weight:700;margin-bottom:18px}
#ulu-price .gold{color:var(--accent)}
#ulu-price .card{
    background:var(--card);border-radius:14px;
    box-shadow:0 2px 12px rgba(26,43,74,.08);
    padding:20px;
  }
#ulu-price table{width:100%;border-collapse:collapse;font-size:16px}
#ulu-price th{background:var(--navy);color:#fff;font-weight:700;padding:10px 6px;border:1px solid var(--navy)}
#ulu-price td{padding:13px 6px;text-align:center;border:1px solid var(--navy);
     font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;font-weight:700}
#ulu-price .note{
    background:var(--band);border-radius:8px;
    padding:10px 14px;font-size:12.5px;font-weight:500;margin-top:14px;
  }
#ulu-price .features{display:grid;grid-template-columns:1fr 1fr;gap:12px}
#ulu-price .feature{
    background:var(--card);border-radius:12px;
    box-shadow:0 2px 10px rgba(26,43,74,.08);
    padding:18px 10px;text-align:center;
  }
#ulu-price .feature .circle{
    width:64px;height:64px;border-radius:50%;background:var(--navy);
    margin:0 auto 10px;display:flex;align-items:center;justify-content:center;
  }
#ulu-price .feature p{font-weight:700;font-size:13.5px}
#ulu-price .cmp{display:flex;flex-direction:column;gap:10px}
#ulu-price .cmp-row{
    background:var(--card);border-radius:12px;
    box-shadow:0 2px 10px rgba(26,43,74,.08);
    padding:14px 18px;
    display:flex;align-items:center;gap:12px;
  }
#ulu-price .cmp-row .time{
    font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;font-weight:700;font-size:18px;
    min-width:52px;
  }
#ulu-price .cmp-row .prices{flex:1}
#ulu-price .cmp-row .from{font-size:14px;font-weight:500;text-decoration:line-through;opacity:.55}
#ulu-price .cmp-row .to{
    font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;font-weight:700;font-size:24px;color:var(--accent);
  }
#ulu-price .cmp-row .to small{font-size:14px}
#ulu-price .cmp-row .student{font-size:12px;font-weight:500;display:block;margin-top:2px}
#ulu-price .cmp-row .student b{color:var(--accent)}
#ulu-price .plans{display:flex;flex-direction:column;gap:14px}
#ulu-price .plan{
    background:var(--card);border-radius:14px;border:1.5px solid #dcdcdc;
    padding:18px;position:relative;
  }
#ulu-price .plan.reco{border:2.5px solid var(--accent)}
#ulu-price .badge{
    position:absolute;top:-13px;left:16px;
    background:var(--accent);color:#fff;font-weight:700;font-size:12px;
    padding:3px 14px;border-radius:999px;
  }
#ulu-price .badge.navy{background:var(--navy)}
#ulu-price .plan .top{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:4px}
#ulu-price .plan .freq{font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;font-weight:700;font-size:19px}
#ulu-price .plan .freq small{font-size:13px;font-weight:700}
#ulu-price .plan .amount{font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;font-weight:700;font-size:26px;white-space:nowrap}
#ulu-price .plan .amount small{font-size:14px}
#ulu-price .plan.reco .amount, #ulu-price .plan.reco .freq{color:var(--accent)}
#ulu-price .plan .desc{font-size:13px;font-weight:700;margin-top:6px;border-top:1px solid #e5e5e5;padding-top:8px}
#ulu-price .plan .per{font-size:12px;font-weight:700;margin-top:4px;opacity:.75}
#ulu-price .plan .amount.gold{color:var(--accent)}
#ulu-price .cta-band{
    background:#fff3dd;border-radius:10px;text-align:center;
    padding:12px;font-size:15px;font-weight:700;margin-top:16px;
    font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;
  }
#ulu-price .cta-band .gold{color:var(--accent)}
#ulu-price .cta-sub{text-align:center;font-size:13px;font-weight:700;margin-top:8px}
#ulu-price .up-nav{
    display:flex;gap:8px;overflow-x:auto;
    padding:14px 18px;max-width:520px;margin:0 auto;
    -webkit-overflow-scrolling:touch;
  }
#ulu-price .up-nav a{
    flex-shrink:0;text-decoration:none;color:var(--navy);
    background:var(--card);border:1.5px solid var(--navy);
    border-radius:999px;padding:6px 14px;font-size:12.5px;font-weight:700;
  }
#ulu-price .up-footer{
    background:var(--navy);color:#fff;text-align:center;
    padding:30px 20px;margin-top:60px;font-size:13px;line-height:2;
  }
#ulu-price .up-footer .name{font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;font-weight:700;font-size:16px;letter-spacing:.1em}
#ulu-price .up-footer a{color:var(--accent-light);text-decoration:none;font-weight:700}
#ulu-price .tel-btn{
    display:block;background:var(--accent);color:#fff;text-decoration:none;
    text-align:center;font-weight:700;font-size:17px;
    border-radius:999px;padding:14px;margin:18px auto 0;max-width:320px;
    font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;letter-spacing:.05em;
  }
#ulu-price .guide{display:flex;gap:12px;margin-top:20px}
#ulu-price .guide-card{
  flex:1;background:#fff;border-radius:12px;
  box-shadow:0 2px 10px rgba(63,63,63,.08);
  padding:16px 12px;text-align:center;
  border-top:3px solid var(--accent-light);
}
#ulu-price .guide-card .g-type{font-size:13px;font-weight:700;opacity:.75}
#ulu-price .guide-card .g-arrow{font-size:12px;margin:2px 0}
#ulu-price .guide-card .g-reco{
  font-family:'游ゴシック','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;
  font-weight:700;font-size:17px;color:var(--accent);
}
#ulu-price .guide-card .g-why{font-size:11.5px;font-weight:500;margin-top:4px;opacity:.7}
#ulu-price .reco-pill{
  display:inline-block;background:var(--accent);color:#fff;
  font-size:12px;font-weight:700;border-radius:999px;
  padding:3px 12px;margin-left:8px;vertical-align:middle;
}
#ulu-price table td.gold{color:var(--accent)}
#ulu-price .up-section p .gold{color:var(--accent)}
`;

const html = `
<div id="ulu-price">

<div class="up-header">
  <p class="brand">ULU整骨院 / ULU GYM</p>
  <h1>整体×トレーニングで<br>根本から<span class="gold">変える</span></h1>
  <p>その日の状態に合わせて、整体とトレーニングを最適化します。</p>
</div>

<div class="up-nav">
  <a href="#price">都度払い</a>
  <a href="#charge">チャージ式</a>
  <a href="#point">ポイント</a>
  <a href="#monthly">月額プラン</a>
  <a href="#student">学割</a>
</div>

<div class="wrap">

  <div class="up-section">
    <div class="features">
      <div class="feature">
        <div class="circle">
          <svg width="36" height="36" viewBox="0 0 76 76" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M28 62 C22 46 24 34 32 26 a10 10 0 1 1 14 0 c8 8 10 20 4 36"/>
            <path d="M38 30 v22" stroke="#d5d5d5" stroke-dasharray="4 5"/>
          </svg>
        </div>
        <p>痛み・不調改善</p>
      </div>
      <div class="feature">
        <div class="circle">
          <svg width="36" height="36" viewBox="0 0 76 76" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="44" cy="14" r="6"/>
            <path d="M44 20 L40 40 L24 58 M40 40 L56 56 M44 22 L60 12"/>
          </svg>
        </div>
        <p>動ける身体づくり</p>
      </div>
      <div class="feature">
        <div class="circle">
          <svg width="36" height="36" viewBox="0 0 76 76" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="46" cy="16" r="6"/>
            <path d="M46 22 L38 38 L28 56 M38 38 L54 50 M44 26 L60 30"/>
            <path d="M12 30 h10 M10 40 h8" stroke="#d5d5d5"/>
          </svg>
        </div>
        <p>パフォーマンス向上</p>
      </div>
      <div class="feature">
        <div class="circle">
          <svg width="36" height="36" viewBox="0 0 76 76" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M38 8 L62 16 v18 c0 16 -10 28 -24 34 C24 62 14 50 14 34 V16 Z"/>
            <path d="M28 38 l8 8 14 -16" stroke="#d5d5d5"/>
          </svg>
        </div>
        <p>再発予防メンテナンス</p>
      </div>
    </div>
    <div class="note">※効果には個人差があります。継続的なケアとトレーニングが効果的です。</div>
    <div class="guide">
      <div class="guide-card">
        <p class="g-type">整体で通うなら</p>
        <p class="g-arrow">▼</p>
        <p class="g-reco">チャージ式</p>
        <p class="g-why">症状に合わせて自分のペースで。いつでも10%OFF</p>
      </div>
      <div class="guide-card">
        <p class="g-type">トレーニングで通うなら</p>
        <p class="g-arrow">▼</p>
        <p class="g-reco">月額プラン</p>
        <p class="g-why">決まったペースで習慣化。月4回が人気</p>
      </div>
    </div>
  </div>

  <div class="up-section" id="price">
    <span class="sec-tag">01</span>
    <h2>料金一覧<span class="gold">(都度払い)</span></h2>
    <div class="card">
      <table>
        <tr><th style="width:26%">時間</th><th>一般</th><th>学生</th></tr>
        <tr><td>30分</td><td>¥6,600</td><td>¥5,500</td></tr>
        <tr><td>60分</td><td>¥11,000</td><td>¥9,900</td></tr>
        <tr><td>90分</td><td>¥15,400</td><td>¥14,300</td></tr>
      </table>
      <p style="font-size:12.5px;font-weight:700;margin-top:12px;text-align:center;line-height:1.8">
        整体(30分)/ 自律神経整体(60分)/ プレミア(90分)<br>
        トレーニングは30分・60分・90分から選べます
      </p>
    </div>
    <div class="note">※ すべて税込価格です</div>
  </div>

  <div class="up-section" id="charge">
    <span class="sec-tag">02</span>
    <h2><span class="gold">チャージ式</span>について<span class="reco-pill">整体の方におすすめ</span></h2>
    <p class="lead">回数の縛りなし。自分のペースで通って、いつでも10%OFF</p>
    <div class="cmp">
      <div class="cmp-row">
        <span class="time">30分</span>
        <div class="prices">
          <span class="from">¥6,600</span> →
          <span class="to">¥5,940</span>
          <span class="student">学生 ¥5,500 → <b class="gold">¥4,950</b></span>
        </div>
      </div>
      <div class="cmp-row">
        <span class="time">60分</span>
        <div class="prices">
          <span class="from">¥11,000</span> →
          <span class="to">¥9,900</span>
          <span class="student">学生 ¥9,900 → <b class="gold">¥8,910</b></span>
        </div>
      </div>
      <div class="cmp-row">
        <span class="time">90分</span>
        <div class="prices">
          <span class="from">¥15,400</span> →
          <span class="to">¥13,860</span>
          <span class="student">学生 ¥14,300 → <b class="gold">¥12,870</b></span>
        </div>
      </div>
    </div>
  </div>

  <div class="up-section" id="point">
    <span class="sec-tag">03</span>
    <h2>チャージ額と<span class="gold">ポイント</span></h2>
    <div class="card" style="padding:0;overflow:hidden">
      <table style="font-size:14.5px">
        <tr><th>チャージ額</th><th>付与</th><th>使用可能</th></tr>
        <tr><td>30,000円</td><td>+2,000pt</td><td class="gold">32,000pt</td></tr>
        <tr><td>50,000円</td><td>+5,000pt</td><td class="gold">55,000pt</td></tr>
        <tr><td>100,000円</td><td>+11,300pt</td><td class="gold">111,300pt</td></tr>
        <tr><td>200,000円</td><td>+23,000pt</td><td class="gold">223,000pt</td></tr>
        <tr><td>300,000円</td><td>+35,500pt</td><td class="gold">335,500pt</td></tr>
        <tr><td>500,000円</td><td>+62,400pt</td><td class="gold">563,400pt</td></tr>
      </table>
    </div>
    <p style="text-align:center;font-size:14px;font-weight:700;margin-top:12px">
      例)50,000円チャージ → <span class="gold">60分コース5回分+おつり</span>
    </p>
    <div class="note">※ ポイントはご家族と一緒にお使いいただけます(有効期限2ヶ月)</div>
  </div>

  <div class="up-section" id="monthly">
    <span class="sec-tag">04</span>
    <h2>あなたに合う<span class="gold">通い方</span><span class="reco-pill">トレーニングの方におすすめ</span></h2>
    <div class="plans" style="margin-top:20px">
      <div class="plan">
        <div class="top"><span class="freq">月2回<small>(60分)</small></span><span class="amount">¥19,800<small>/月</small></span></div>
        <p class="desc">月イチでは物足りない方の定番</p>
        <p class="per">1回あたり ¥9,900</p>
      </div>
      <div class="plan reco">
        <span class="badge">★ 推奨プラン</span>
        <div class="top"><span class="freq">月4回<small>(60分)</small></span><span class="amount">¥37,400<small>/月</small></span></div>
        <p class="desc">週1ペースで、身体が変わる実感を</p>
        <p class="per">1回あたり ¥9,350</p>
      </div>
      <div class="plan">
        <div class="top"><span class="freq">月8回<small>(60分)</small></span><span class="amount">¥70,400<small>/月</small></span></div>
        <p class="desc">週2ペースで最短で結果を出す</p>
        <p class="per">1回あたり ¥8,800</p>
      </div>
      <div class="plan">
        <span class="badge navy">ライトプラン</span>
        <div class="top"><span class="freq">月4回<small>(30分)</small></span><span class="amount">¥22,400<small>/月</small></span></div>
        <p class="desc">仕事帰りに30分だけ。続けやすさ重視</p>
        <p class="per">1回あたり ¥5,600</p>
      </div>
    </div>
    <div class="cta-band">ほとんどの方は <span class="gold">月4回</span> からスタートしています</div>
    <p class="cta-sub">月1回(60分)¥10,400/月もあり</p>
  </div>

  <div class="up-section" id="student">
    <span class="sec-tag">05</span>
    <h2><span class="gold">学割</span>プラン</h2>
    <p class="lead">部活もケガも、本気の学生を応援します。</p>
    <div class="plans">
      <div class="plan">
        <div class="top"><span class="freq">月1回</span><span class="amount gold">¥9,400<small>/月</small></span></div>
        <p class="per">1回あたり ¥9,400</p>
      </div>
      <div class="plan">
        <div class="top"><span class="freq">月2回</span><span class="amount gold">¥17,820<small>/月</small></span></div>
        <p class="per">1回あたり ¥8,910</p>
      </div>
      <div class="plan">
        <div class="top"><span class="freq">月4回</span><span class="amount gold">¥33,660<small>/月</small></span></div>
        <p class="per">1回あたり ¥8,415</p>
      </div>
      <div class="plan">
        <div class="top"><span class="freq">月8回</span><span class="amount gold">¥63,360<small>/月</small></span></div>
        <p class="per">1回あたり ¥7,920</p>
      </div>
    </div>
    <div class="note"><b>学生証のご提示だけでOK</b><br>※ 学割はケア&amp;トレーニングプラン(60分)に適用されます</div>
  </div>

</div>

<div class="up-footer">
  <p class="name">ULU整骨院 ULU GYM</p>
  <p>〒670-0081 兵庫県姫路市田寺東2丁目43-27</p>
  <p style="margin-top:14px"><a href="https://ulu-gym-seikotsu.com">ulu-gym-seikotsu.com</a></p>
</div>

</div>
`;

export default function PricePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
