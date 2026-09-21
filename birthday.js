/* ============================================================
   HAPPY BIRTHDAY — a birthday film in four acts
   Vanilla canvas 2D for the tree + GSAP for the orchestration.

   ACT 1  a real recurve bow with a Cupid's arrow nocked — you
          DRAW the string down and RELEASE to fire (pointer drag,
          or keyboard). A softly beating heart waits above as the
          target.
   ACT 2  the arrow flies up and strikes the heart; the heart
          jolts, falls, and bursts into a flood of rose that
          swallows the frame (no cross-fade).
   ACT 3  a kinetic wish hinges up out of that colour, glyph by
          glyph, under cinema bars and a slow camera push.
   ACT 4  a gold light blooms, and the tree grows into one heart
          of lit blossoms with the hand-lettered wish.

   A GSAP master timeline runs the shot + Acts 2–3; at its end it
   starts the canvas tree (Act 4), which owns its own rAF and
   plays once, then holds — living, never looping.
   ============================================================ */

import gsap from 'gsap';

/* the pen-stroke plugin: a `drawn` 0..1 property for the underline */
gsap.registerPlugin({
  name: 'drawn',
  init(target, value) {
    const len = target.getTotalLength();
    target.style.strokeDasharray = len;
    this.target = target; this.len = len; this.value = value;
  },
  render(ratio, data) {
    data.target.style.strokeDashoffset = data.len * (1 - data.value * ratio);
  },
});

/* ============================================================
   GIFT_DATA — Single source of truth for all customizable film content.
   ============================================================ */
const defaultGiftData = {
  recipientName: "Elena",
  themeId: "paper", // "paper" | "glass"
  theme: {
    primaryColor: "#d4235c",
    accentColor: "#e8a23d",
    rose: "#d4235c",
    roseLift: "#e83a72",
    roseDeep: "#9c0f42",
    roseMid: "#c41f52",
    wine: "#6e0a31",
    gold1: "#f5b838",
    gold2: "#e8a23d"
  },
  scenes: {
    scene1_act1: {
      eyebrow: "a little something, for you",
      hint: "pull & release",
      kineticLine1: "Happy Birthday",
      kineticSubtext: "to someone worth celebrating",
      closingEyebrow: "and… make it count",
      closingHero: "Happy Birthday",
      closingSubtext: "here’s to a year that blooms",
      wishEyebrow: "and… make it count",
      wishHero: "Happy Birthday",
      wishSub: "here’s to a year that blooms",
      kEyebrow: "make a wish…",
      kSub: "to someone worth celebrating"
    },
    scene2_giftBox: {
      badge: "Special Delivery",
      eyebrow: "Special Delivery",
      title: "A surprise awaits you...",
      subtitleTop: "A surprise awaits you...",
      subtitle: "crafted with love, just for you",
      cardTitle: "Unwrapped with Love",
      cardText: "Every moment with you is a gift to cherish. May this year bring endless smiles, sweet surprises, and warm happiness!",
      boxColor: null
    },
    scene3_pinLock: {
      pin: "1234",
      instruction: "enter the code to unlock it",
      hint: "hint: our favourite number"
    },
    scene4_curtain: {
      badge: "Special Surprise",
      curtainColor: null
    },
    scene5_cakeCountdown: {
      birthDate: "2006-01-01T00:00:00Z",
      badge: "Milestone Moment",
      headline: "Happy Birthday, Beautiful 🎂",
      title: "Happy Birthday, Beautiful 🎂",
      subtitle: "The world has been sweeter since you arrived ♥",
      wishLine: "make a wish…",
      wishTitle: "Make a wish… 🌠",
      wishSub: "May all your sweetest dreams take flight",
      cakeColor: null
    },
    scene6_wallOfUs: {
      eyebrow: "a few frames from the reel",
      photos: [null, null, null, null, null, null],
      captions: [
        "the trip we almost didn't survive",
        "3am phone calls about nothing",
        "that one inside joke, still funny",
        "dancing in the kitchen out of tune",
        "the sunset we wished would freeze in time",
        "laughing until our stomachs hurt"
      ],
      headline: "So Many Moments",
      subtext: "and this is just the highlight reel."
    },
    scene7_memoryReel: {
      clips: [null, null, null, null, null],
      captions: [
        "the year we became inseparable",
        "every ridiculous plan that somehow worked out",
        "places that only make sense with you",
        "the quiet moments that meant the most",
        "every chapter better than the last"
      ],
      headline: "Frame by Frame",
      subtext: "you're in almost all of my favorites."
    },
    scene8_balloonPop: {
      headline: "Pop the Wishes 🎈",
      subtitle: "Tap each balloon to reveal a little wish",
      closing: "wishes released 🎈",
      messages: [
        "May your smiles be endless! 😊",
        "Wishing you all the success! 🌟",
        "Stay as amazing as you are! 💙",
        "Dream big and fly high! 🚀",
        "Health and happiness always! 🍀",
        "Lots and lots of love! ❤️"
      ]
    },
    scene9_letter: {
      eyebrow: "a note for you",
      message: "Dear troublemaker,\n\nThank you for every ridiculous memory and the ones we haven't made yet.\n\nHappy Birthday. I mean it."
    },
    scene10_fireworks: {
      headline: "Here's To You",
      subtext: "may this year be loud, lucky, and full of ridiculous stories we'll tell for years."
    },
    scene11_finalToast: {
      eyebrow: "and so, once more —",
      heroLine: "Happy Birthday, {recipientName}",
      subtext: "here’s to another year of us being a little bit unstoppable together."
    }
  },
  music: {
    trackType: "default", // "default" | "custom"
    customTrackUrl: null,
    startSeconds: 27
  },
  photos: [null, null, null, null, null, null]
};

function deepMergeGiftData(target, source) {
  if (!source || typeof source !== 'object') return target;
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMergeGiftData(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      output[key] = source[key];
    }
  }
  return output;
}

window.GIFT_DATA = deepMergeGiftData(defaultGiftData, window.GIFT_DATA || {});

const $ = (id) => document.getElementById(id);

function splitWord(el){
  if (!el) return [];
  const chars = [...el.textContent];
  el.textContent = '';
  return chars.map((c) => {
    const s = document.createElement('span');
    s.className = 'hl__ch';
    s.textContent = c === ' ' ? ' ' : c;
    el.appendChild(s);
    return s;
  });
}
let line1Chars = [];
let line2Chars = [];
let kChars = [];

function rebuildKineticChars(line1Str, line2Str){
  const el1 = $('wLine1');
  const el2 = $('wLine2');
  if (el1 && typeof line1Str === 'string') el1.textContent = line1Str;
  if (el2 && typeof line2Str === 'string') el2.textContent = line2Str;
  if (el1) line1Chars = splitWord(el1);
  if (el2) line2Chars = splitWord(el2);
  kChars = [...line1Chars, ...line2Chars];
}

function applyGiftDataTheme(theme, explicitThemeId) {
  const urlParams = new URLSearchParams(window.location.search);
  const exp = urlParams.get('experience');
  const urlTheme = urlParams.get('theme');
  const detectedThemeId = explicitThemeId 
    || (window.GIFT_DATA && window.GIFT_DATA.themeId) 
    || (exp === 'birthday-film-glass' || urlTheme === 'glass' ? 'glass' : 'paper');

  const currentThemeId = detectedThemeId === 'glass' ? 'glass' : 'paper';
  if (window.GIFT_DATA) window.GIFT_DATA.themeId = currentThemeId;

  document.documentElement.setAttribute('data-theme', currentThemeId);
  if (document.body) {
    document.body.classList.remove('theme-paper', 'theme-glass');
    document.body.classList.add('theme-' + currentThemeId);
  }

  if (!theme) return;
  const root = document.documentElement.style;
  const rose = theme.primaryColor || theme.rose || '#d4235c';
  const gold = theme.accentColor || theme.gold2 || (currentThemeId === 'glass' ? '#f3b749' : '#e8a23d');

  root.setProperty('--rose', rose);
  root.setProperty('--rose-lift', theme.roseLift || adjustColorLightness(rose, 25));
  root.setProperty('--rose-deep', theme.roseDeep || adjustColorLightness(rose, -35));
  root.setProperty('--rose-mid', theme.roseMid || adjustColorLightness(rose, -15));
  root.setProperty('--gold-1', theme.gold1 || (currentThemeId === 'glass' ? '#fce18b' : '#f5b838'));
  root.setProperty('--gold-2', gold);
  if (theme.wine) root.setProperty('--wine', theme.wine);

  if (typeof buildScene === 'function' && W > 0 && H > 0) {
    buildScene();
  }

  const s2BoxColor = window.GIFT_DATA?.scenes?.scene2_giftBox?.boxColor;
  if (s2BoxColor) {
    updateScene2BoxColor(s2BoxColor);
  }
  const s4CurtainColor = window.GIFT_DATA?.scenes?.scene4_curtain?.curtainColor;
  if (s4CurtainColor) {
    updateScene4CurtainColor(s4CurtainColor);
  }
  const s5CakeColor = window.GIFT_DATA?.scenes?.scene5_cakeCountdown?.cakeColor;
  if (s5CakeColor) {
    updateScene5CakeColor(s5CakeColor);
  }
}

function hexToRgb(hex) {
  if (!hex) return { r: 212, g: 35, b: 92 };
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  if (isNaN(num)) return { r: 212, g: 35, b: 92 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

function adjustColorLightness(hex, percent) {
  const rgb = hexToRgb(hex);
  const factor = percent / 100;
  if (factor > 0) {
    return rgbToHex(
      rgb.r + (255 - rgb.r) * factor,
      rgb.g + (255 - rgb.g) * factor,
      rgb.b + (255 - rgb.b) * factor
    );
  } else {
    return rgbToHex(
      rgb.r * (1 + factor),
      rgb.g * (1 + factor),
      rgb.b * (1 + factor)
    );
  }
}

function updateScene2BoxColor(customHex) {
  const isGlass = document.documentElement.getAttribute('data-theme') === 'glass' || (window.GIFT_DATA && window.GIFT_DATA.themeId === 'glass');
  const base = customHex || (isGlass ? '#d4235c' : '#d81e57');
  const light = adjustColorLightness(base, 24);
  const dark = adjustColorLightness(base, -28);
  const deepDark = adjustColorLightness(base, -48);
  const strokeDark = adjustColorLightness(base, -55);

  // 1. Update boxFaceLeft (preview.html)
  const boxFaceLeft = $('boxFaceLeft');
  if (boxFaceLeft) {
    const stops = boxFaceLeft.querySelectorAll('stop');
    if (stops.length >= 3) {
      stops[0].setAttribute('stop-color', light);
      stops[1].setAttribute('stop-color', base);
      stops[2].setAttribute('stop-color', dark);
    }
  }

  // 2. Update boxFaceRight (preview.html)
  const boxFaceRight = $('boxFaceRight');
  if (boxFaceRight) {
    const stops = boxFaceRight.querySelectorAll('stop');
    if (stops.length >= 3) {
      stops[0].setAttribute('stop-color', base);
      stops[1].setAttribute('stop-color', dark);
      stops[2].setAttribute('stop-color', deepDark);
    }
  }

  // 3. Update boxGrad (gift.html)
  const boxGrad = $('boxGrad');
  if (boxGrad) {
    const stops = boxGrad.querySelectorAll('stop');
    if (stops.length >= 3) {
      stops[0].setAttribute('stop-color', light);
      stops[1].setAttribute('stop-color', base);
      stops[2].setAttribute('stop-color', dark);
    }
  }

  // 4. Update lidGrad (gift.html)
  const lidGrad = $('lidGrad');
  if (lidGrad) {
    const stops = lidGrad.querySelectorAll('stop');
    if (stops.length >= 3) {
      stops[0].setAttribute('stop-color', adjustColorLightness(base, 32));
      stops[1].setAttribute('stop-color', adjustColorLightness(base, 8));
      stops[2].setAttribute('stop-color', dark);
    }
  }

  // 5. Update SVG strokes & CSS custom property
  const sc2El = document.getElementById('scene2');
  if (sc2El) {
    sc2El.style.setProperty('--box-color', base);
    sc2El.style.setProperty('--box-color-light', light);
    sc2El.style.setProperty('--box-color-dark', dark);
    sc2El.querySelectorAll('.gift-svg rect[stroke]').forEach(el => {
      el.setAttribute('stroke', strokeDark);
    });
  }
}

function updateScene4CurtainColor(customHex) {
  const isGlass = document.documentElement.getAttribute('data-theme') === 'glass' || (window.GIFT_DATA && window.GIFT_DATA.themeId === 'glass');
  const base = customHex || (isGlass ? '#3b051b' : '#6e0a31');
  const wine = adjustColorLightness(base, -20);
  const deep = adjustColorLightness(base, -10);
  const bright = adjustColorLightness(base, 15);

  const sc4El = document.getElementById('scene4');
  if (sc4El) {
    sc4El.style.setProperty('--curtain-color', bright);
    sc4El.style.setProperty('--curtain-color-deep', deep);
    sc4El.style.setProperty('--curtain-color-wine', wine);
  }
}

function updateScene5CakeColor(customHex) {
  const isGlass = document.documentElement.getAttribute('data-theme') === 'glass' || (window.GIFT_DATA && window.GIFT_DATA.themeId === 'glass');
  const base = customHex || (isGlass ? '#d4235c' : '#e85987');
  const top0 = adjustColorLightness(base, 25);
  const top1 = base;
  const top2 = adjustColorLightness(base, -15);
  const drip = adjustColorLightness(base, 25);
  const bot0 = adjustColorLightness(base, -5);
  const bot1 = adjustColorLightness(base, -25);
  const bot2 = adjustColorLightness(base, -40);

  const sc5El = document.getElementById('scene5');
  if (sc5El) {
    sc5El.style.setProperty('--cake-top-0', top0);
    sc5El.style.setProperty('--cake-top-1', top1);
    sc5El.style.setProperty('--cake-top-2', top2);
    sc5El.style.setProperty('--cake-drip', drip);
    sc5El.style.setProperty('--cake-bot-0', bot0);
    sc5El.style.setProperty('--cake-bot-1', bot1);
    sc5El.style.setProperty('--cake-bot-2', bot2);
  }
}

function populateStaticContent(data) {
  const gd = data || window.GIFT_DATA;
  if (!gd) return;

  const sc = gd.scenes || {};

  // --- Scene 1 ---
  const s1 = sc.scene1_act1 || {};
  const recName = gd.recipientName || (gd.content && gd.content.recipientName) || 'Elena';

  const elEyebrow = $('eyebrow');
  if (elEyebrow && s1.eyebrow !== undefined) elEyebrow.textContent = s1.eyebrow;

  const elHint = $('hint');
  if (elHint && s1.hint !== undefined) elHint.textContent = s1.hint;

  const elKEyebrow = $('kEyebrow');
  if (elKEyebrow && (s1.kEyebrow !== undefined || s1.kineticEyebrow !== undefined)) {
    elKEyebrow.textContent = s1.kineticEyebrow !== undefined ? s1.kineticEyebrow : s1.kEyebrow;
  }

  const kineticLine = s1.kineticLine1 !== undefined ? s1.kineticLine1 : (s1.kineticHeadline !== undefined ? s1.kineticHeadline : (s1.wishHero !== undefined ? s1.wishHero : 'Happy Birthday'));
  if (kineticLine !== undefined) {
    const parts = String(kineticLine).trim().split(/\s+/);
    const line1Text = parts[0] || '';
    const line2Text = parts.slice(1).join(' ') || '';
    rebuildKineticChars(line1Text, line2Text);
  }

  const elKSub = $('kSub');
  if (elKSub && (s1.kineticSubtext !== undefined || s1.kSub !== undefined)) {
    elKSub.textContent = s1.kineticSubtext !== undefined ? s1.kineticSubtext : s1.kSub;
  }

  const elWEyebrow = $('wEyebrow');
  if (elWEyebrow && (s1.closingEyebrow !== undefined || s1.wishEyebrow !== undefined)) {
    elWEyebrow.textContent = s1.closingEyebrow !== undefined ? s1.closingEyebrow : s1.wishEyebrow;
  }

  const elWHero = $('wHero');
  if (elWHero && (s1.closingHero !== undefined || s1.wishHero !== undefined)) {
    const rawHero = s1.closingHero !== undefined ? s1.closingHero : s1.wishHero;
    elWHero.textContent = String(rawHero).replace(/\{recipientName\}/gi, recName);
  }

  const elWSub = $('wSub');
  if (elWSub && (s1.closingSubtext !== undefined || s1.wishSub !== undefined)) {
    elWSub.textContent = s1.closingSubtext !== undefined ? s1.closingSubtext : s1.wishSub;
  }

  // --- Scene 2 ---
  const s2 = sc.scene2_giftBox || {};
  const gBadge = document.querySelector('#scene2 .gift-badge'); if (gBadge && (s2.badge || s2.eyebrow)) gBadge.textContent = s2.badge || s2.eyebrow;
  const gTitle = document.querySelector('#scene2 .gift-title'); if (gTitle && (s2.title || s2.subtitleTop)) gTitle.textContent = s2.title || s2.subtitleTop;
  const gSub = document.querySelector('#scene2 .gift-subtitle'); if (gSub && s2.subtitle) gSub.textContent = s2.subtitle;
  const gCardTitle = document.querySelector('#scene2 .gift-card-title'); if (gCardTitle && s2.cardTitle) gCardTitle.textContent = s2.cardTitle;
  const gCardText = document.querySelector('#scene2 .gift-card-text'); if (gCardText && s2.cardText) gCardText.textContent = s2.cardText;
  if (s2.boxColor) {
    updateScene2BoxColor(s2.boxColor);
  }

  // --- Scene 3 ---
  const s3 = sc.scene3_pinLock || {};
  if (s3.pin) CORRECT_PIN = String(s3.pin);
  const pInstruction = $('pinInstruction'); if (pInstruction && s3.instruction) pInstruction.textContent = s3.instruction;
  const pPill = $('pinStatusPill'); if (pPill && s3.hint) pPill.textContent = s3.hint;

  // --- Scene 4 ---
  const s4 = sc.scene4_curtain || {};
  if (s4.curtainColor) {
    updateScene4CurtainColor(s4.curtainColor);
  }

  // --- Scene 5 ---
  const s5 = sc.scene5_cakeCountdown || {};
  if (s5.birthDate) BIRTHDATE_STR = s5.birthDate;
  const cBadge = document.querySelector('#scene5 .cake-badge'); if (cBadge && s5.badge) cBadge.textContent = s5.badge;
  const cTitle = document.querySelector('#scene5 .cake-title'); if (cTitle && (s5.headline || s5.title)) cTitle.textContent = s5.headline || s5.title;
  const cSub = document.querySelector('#scene5 .cake-subtitle'); if (cSub && s5.subtitle) cSub.textContent = s5.subtitle;
  const cWishTitle = document.querySelector('#scene5 .cake-wish-title'); if (cWishTitle && (s5.wishTitle || s5.wishLine)) cWishTitle.textContent = s5.wishTitle || s5.wishLine;
  const cWishSub = document.querySelector('#scene5 .cake-wish-sub'); if (cWishSub && s5.wishSub) cWishSub.textContent = s5.wishSub;
  if (s5.cakeColor) {
    updateScene5CakeColor(s5.cakeColor);
  }

  // --- Scene 6 ---
  const s6 = sc.scene6_wallOfUs || {};
  const memEyebrow = $('memoryEyebrow'); if (memEyebrow && s6.eyebrow) memEyebrow.textContent = s6.eyebrow;
  if (Array.isArray(s6.captions)) {
    s6.captions.forEach((cap, i) => {
      const frame = $(`mFrame${i}`);
      if (frame) {
        const capEl = frame.querySelector('.frame-caption');
        if (capEl) capEl.textContent = cap;
      }
    });
  }
  const memTitle = document.querySelector('#scene6 .memory-closing-title'); if (memTitle && s6.headline) memTitle.textContent = s6.headline;
  const memSub = document.querySelector('#scene6 .memory-closing-sub'); if (memSub && s6.subtext) memSub.textContent = s6.subtext;

  // Update Photos in Scene 6 if available
  const s6Photos = (s6 && Array.isArray(s6.photos)) ? s6.photos : (Array.isArray(gd.photos) ? gd.photos : null);
  if (s6Photos) {
    s6Photos.forEach((photoUrl, i) => {
      const frame = $(`mFrame${i}`);
      if (frame) {
        const photoEl = frame.querySelector('.frame-photo');
        if (photoEl) {
          let existingImg = photoEl.querySelector('.user-photo-img');
          if (photoUrl) {
            if (!existingImg) {
              existingImg = document.createElement('img');
              existingImg.className = 'user-photo-img';
              existingImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;border-radius:inherit;';
              photoEl.appendChild(existingImg);
            }
            existingImg.src = photoUrl;
            const icon = photoEl.querySelector('.photo-icon');
            if (icon) icon.style.opacity = '0';
          } else if (existingImg) {
            existingImg.remove();
            const icon = photoEl.querySelector('.photo-icon');
            if (icon) icon.style.opacity = '1';
          }
        }
      }
    });
  }

  // --- Scene 7 ---
  const s7 = sc.scene7_memoryReel || {};
  if (Array.isArray(s7.captions)) {
    s7.captions.forEach((cap, i) => {
      const frame = $(`fFrame${i}`);
      if (frame) {
        const capEl = frame.querySelector('.frame-caption');
        if (capEl) capEl.textContent = cap;
      }
    });
  }
  const fTitle = document.querySelector('#scene7 .film-headline-title'); if (fTitle && s7.headline) fTitle.textContent = s7.headline;
  const fSub = document.querySelector('#scene7 .film-headline-sub'); if (fSub && s7.subtext) fSub.textContent = s7.subtext;

  // Update Video Clips in Scene 7 if available
  const s7Clips = (s7 && Array.isArray(s7.clips)) ? s7.clips : (Array.isArray(gd.clips) ? gd.clips : null);
  if (s7Clips) {
    s7Clips.forEach((clipUrl, i) => {
      const frame = $(`fFrame${i}`);
      if (frame) {
        const cellEl = frame.querySelector('.frame-celluloid');
        if (cellEl) {
          let existingVideo = cellEl.querySelector('.user-clip-video');
          if (clipUrl) {
            if (!existingVideo) {
              existingVideo = document.createElement('video');
              existingVideo.className = 'user-clip-video';
              existingVideo.setAttribute('autoplay', '');
              existingVideo.setAttribute('muted', '');
              existingVideo.setAttribute('loop', '');
              existingVideo.setAttribute('playsinline', '');
              existingVideo.muted = true;
              existingVideo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;border-radius:inherit;';
              cellEl.appendChild(existingVideo);
            }
            if (existingVideo.src !== clipUrl) {
              existingVideo.src = clipUrl;
              existingVideo.play().catch(() => {});
            }
            const icon = cellEl.querySelector('.frame-icon');
            if (icon) icon.style.opacity = '0';
          } else if (existingVideo) {
            existingVideo.remove();
            const icon = cellEl.querySelector('.frame-icon');
            if (icon) icon.style.opacity = '1';
          }
        }
      }
    });
  }

  // --- Scene 8 ---
  const s8 = sc.scene8_balloonPop || sc.scene8_constellation || {};
  const bTitle = $('balloonTitle'); if (bTitle && s8.headline) bTitle.textContent = s8.headline;
  const bSub = $('balloonSubtitle'); if (bSub && s8.subtitle) bSub.textContent = s8.subtitle;
  const bClosing = $('balloonClosingText'); if (bClosing && s8.closing) bClosing.textContent = s8.closing;

  // --- Scene 9 ---
  const s9 = sc.scene9_letter || {};
  const lEyebrow = document.querySelector('#scene9 .letter-eyebrow'); if (lEyebrow && s9.eyebrow) lEyebrow.textContent = s9.eyebrow;
  if (s9.message) {
    LETTER_TEXT = s9.message;
    const tw = $('typewriterText');
    if (tw && tw.innerHTML) tw.innerHTML = s9.message.replace(/\n/g, '<br>');
  }

  // --- Scene 10 ---
  const s10 = sc.scene10_fireworks || {};
  const fwTitle = document.querySelector('#scene10 .fireworks-title'); if (fwTitle && s10.headline) fwTitle.textContent = s10.headline;
  const fwSub = document.querySelector('#scene10 .fireworks-sub'); if (fwSub && s10.subtext) fwSub.textContent = s10.subtext;

  // --- Scene 11 ---
  const s11 = sc.scene11_finalToast || {};
  const tEyebrow = $('toastEyebrow'); if (tEyebrow && s11.eyebrow) tEyebrow.textContent = s11.eyebrow;
  const tHero = $('toastHero');
  if (tHero) {
    const rawHero = s11.heroLine || "Happy Birthday, {recipientName}";
    const recName = gd.recipientName || "Elena";
    tHero.textContent = rawHero.replace(/\{recipientName\}/gi, recName);
  }
  const tSub = $('toastSub'); if (tSub && s11.subtext) tSub.textContent = s11.subtext;

  // --- Dynamic Music Sync ---
  if (gd.music) {
    const m = gd.music;
    const startSec = typeof m.startSeconds === 'number' ? m.startSeconds : 27;
    if (typeof AUDIO_CONFIG !== 'undefined') {
      AUDIO_CONFIG.startTime = startSec;
      AUDIO_CONFIG.loopStartTime = startSec;
    }
    const bg = $('bgMusic');
    if (bg) {
      const targetSrc = (m.trackType === 'custom' && m.customTrackUrl) ? m.customTrackUrl : 'assets/bg-music.mp3';
      const currentSrc = bg.getAttribute('src') || '';
      if (targetSrc && currentSrc !== targetSrc && !currentSrc.endsWith(targetSrc)) {
        const wasPlaying = !bg.paused;
        bg.src = targetSrc;
        bg.currentTime = startSec;
        if (wasPlaying) {
          bg.play().catch(() => {});
        }
      }
    }
  }
}

const canvas = $('tree');
const ctx    = canvas.getContext('2d');
const wishEl = $('wish');

const hero       = $('hero');
const eyebrow    = $('eyebrow');
const hint       = $('hint');
const motes      = $('motes');
const target     = $('target');
const targetHeart= $('targetHeart');
const heartGlow  = target.querySelector('.heart__glow');
const aim        = $('aim');

const archery = $('archery');
const bow     = $('bow');
const arrow   = $('arrow');
const strL    = $('strL');
const strR    = $('strR');
const serving = $('serving');

const flood   = $('flood');
const field   = $('field');
const camera  = $('camera');
const fgrid   = $('fgrid');
const kEyebrow= $('kEyebrow');
const kSub    = $('kSub');
const barTop  = $('barTop');
const barBot  = $('barBot');
const uline   = $('uline').querySelector('.uline__path');
const bloom   = $('bloom');
const replay  = $('replay');
const nextScene1 = $('nextScene1');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isRecord     = new URLSearchParams(location.search).has('record');

/* --- cue log for the recorder: the page stays muted, but it timestamps every
   beat the film crosses, and the offline sound synth fires foley at those exact
   times so the audio can never drift from the picture. --- */
if (isRecord) window.bdayCues = [];
let recT0 = 0;
function cue(name){ if (isRecord && recT0) window.bdayCues.push({ cue: name, t: (performance.now() - recT0) / 1000 }); }

/* ============================================================
   MATH HELPERS
   ============================================================ */
const rand  = (a, b) => a + Math.random() * (b - a);
const pick  = (a)    => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp  = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack  = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function shade(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/* ============================================================
   TREE ENGINE (Act 4) — canvas
   ============================================================ */
const BLOSSOM = [
  { c0: '#ffe1ec', c1: '#ff80aa' },
  { c0: '#ffd0e0', c1: '#f4577f' },
  { c0: '#ffc4d2', c1: '#e23b67' },
  { c0: '#ffd9c4', c1: '#ff8a5b' },
  { c0: '#ffeec2', c1: '#f6b13e' },
  { c0: '#ffd2e6', c1: '#e84d9a' },
];

/* timeline (seconds, relative to the tree's own start) — brisk */
const T = {
  trunkStart: 0.10,
  branchSpan: 1.80,
  bloomT0:    1.25,
  bloomSpan:  2.00,
  petalT0:    2.45,
  noteStart:  0.45,
  done:       4.60,
};

const SS = 168;

function heartShape(c, x, top, w, h){
  c.beginPath();
  c.moveTo(x, top + h * 0.28);
  c.bezierCurveTo(x, top, x - w * 0.5, top, x - w * 0.5, top + h * 0.28);
  c.bezierCurveTo(x - w * 0.5, top + h * 0.60, x - w * 0.16, top + h * 0.80, x, top + h);
  c.bezierCurveTo(x + w * 0.16, top + h * 0.80, x + w * 0.5, top + h * 0.60, x + w * 0.5, top + h * 0.28);
  c.bezierCurveTo(x + w * 0.5, top, x, top, x, top + h * 0.28);
  c.closePath();
}

function makeBlossom({ c0, c1 }, soft){
  const cv = document.createElement('canvas'); cv.width = cv.height = SS;
  const c = cv.getContext('2d');
  const w = SS * 0.62, h = SS * 0.58, x = SS / 2, top = SS * 0.17;

  c.save();
  c.shadowColor = 'rgba(150,38,72,0.32)';
  c.shadowBlur = SS * 0.085; c.shadowOffsetY = SS * 0.05;
  c.fillStyle = c1; heartShape(c, x, top, w, h); c.fill();
  c.restore();

  const g = c.createRadialGradient(x - w * 0.20, top + h * 0.20, h * 0.04, x, top + h * 0.42, h * 0.92);
  g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, shade(c1, -26));
  heartShape(c, x, top, w, h); c.fillStyle = g; c.fill();

  c.save(); heartShape(c, x, top, w, h); c.clip();
  const g2 = c.createLinearGradient(0, top, 0, top + h);
  g2.addColorStop(0, 'rgba(255,255,255,0)');
  g2.addColorStop(0.65, 'rgba(110,16,46,0)');
  g2.addColorStop(1, 'rgba(110,16,46,0.26)');
  c.fillStyle = g2; c.fillRect(0, 0, SS, SS);
  c.globalAlpha = 0.55; c.fillStyle = '#ffffff';
  c.beginPath(); c.ellipse(x - w * 0.15, top + h * 0.24, w * 0.17, h * 0.11, -0.5, 0, Math.PI * 2); c.fill();
  c.restore();

  if (!soft) return cv;

  const cv2 = document.createElement('canvas'); cv2.width = cv2.height = SS;
  const c2 = cv2.getContext('2d');
  c2.filter = 'blur(2.6px)'; c2.drawImage(cv, 0, 0); c2.filter = 'none';
  c2.globalCompositeOperation = 'source-atop';
  c2.globalAlpha = 0.42; c2.fillStyle = '#fff3ea'; c2.fillRect(0, 0, SS, SS);
  return cv2;
}

function makeBokeh(rgb){
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, `rgba(${rgb},0.9)`); g.addColorStop(0.45, `rgba(${rgb},0.22)`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(0, 0, S, S);
  return cv;
}

function makeSparkle(){
  const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d'); const m = S / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.25, 'rgba(255,236,200,0.5)'); g.addColorStop(1, 'rgba(255,236,200,0)');
  c.fillStyle = g; c.beginPath(); c.arc(m, m, m, 0, 6.2832); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.translate(m, m);
  for (let k = 0; k < 2; k++){
    c.beginPath();
    c.moveTo(0, -m); c.quadraticCurveTo(0, 0, m, 0); c.quadraticCurveTo(0, 0, 0, m); c.quadraticCurveTo(0, 0, -m, 0); c.quadraticCurveTo(0, 0, 0, -m);
    c.fill(); c.rotate(Math.PI / 4); c.scale(0.5, 0.5);
  }
  return cv;
}

let SPR = { crisp: [], soft: [] }, BOKEH = [], SPARKLE = null;
function buildSprites(){
  SPR = { crisp: BLOSSOM.map((b) => makeBlossom(b, false)), soft: BLOSSOM.map((b) => makeBlossom(b, true)) };
  BOKEH = [makeBokeh('255,224,188'), makeBokeh('255,196,214'), makeBokeh('255,238,210')];
  SPARKLE = makeSparkle();
}

function drawSprite(sprite, x, y, size, rot, alpha){
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, -size * 0.5, -size * 0.47, size, size);
  ctx.restore();
}

let heartPoly = null;
function buildHeartPoly(){
  const raw = []; let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (let i = 0; i <= 160; i++){
    const t = (i / 160) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    raw.push([x, y]);
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2, hw = (maxX - minX) / 2, hh = (maxY - minY) / 2;
  heartPoly = raw.map(([x, y]) => [(x - midX) / hw, (y - midY) / hh]);
}
function pointInPoly(x, y){
  let inside = false; const p = heartPoly;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++){
    const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

let W = 0, H = 0, dpr = 1;
let cx = 0, cy = 0, rx = 0, ry = 0, groundY = 0;
let branches = [], hearts = [], petals = [], rested = [], orbs = [], floaters = [], twinkles = [];
let bgGrad = null, glowGrad = null, groundGrad = null;

const quad = (b, t) => { const m = 1 - t, a = m * m, k = 2 * m * t, d = t * t; return { x: a * b.x1 + k * b.cx + d * b.x2, y: a * b.y1 + k * b.cy + d * b.y2 }; };

function barkGrad(x1, y1, x2, y2, depth){
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, `hsl(348 26% ${26 + depth * 3}%)`);
  g.addColorStop(1, `hsl(346 24% ${40 + depth * 5}%)`);
  return g;
}

function buildScene(){
  branches = []; hearts = []; petals = []; rested = []; twinkles = []; orbs = []; floaters = [];
  buildHeartPoly();

  const wide = W / H > 1.2;
  cx = W * (wide ? 0.57 : 0.5);
  cy = H * (wide ? 0.37 : 0.38);
  ry = Math.min(H * (wide ? 0.33 : 0.33), W * 0.34);
  rx = ry * 1.16;
  groundY = H * 0.93;

  const isGlass = (document.documentElement.getAttribute('data-theme') === 'glass') || (window.GIFT_DATA && window.GIFT_DATA.themeId === 'glass');

  bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  if (isGlass) {
    bgGrad.addColorStop(0, '#150921');     // Deep midnight amethyst (--paper-0)
    bgGrad.addColorStop(0.45, '#0d0417');  // Rich plum shadow (--paper-1)
    bgGrad.addColorStop(0.80, '#090311');
    bgGrad.addColorStop(1, '#06020c');     // Obsidian void (--paper-2)

    glowGrad = ctx.createRadialGradient(cx, cy, ry * 0.1, cx, cy, ry * 1.55);
    glowGrad.addColorStop(0, 'rgba(212, 35, 92, 0.38)'); // Luminous electric rose glow
    glowGrad.addColorStop(0.5, 'rgba(138, 43, 226, 0.16)'); // Ambient violet
    glowGrad.addColorStop(1, 'rgba(21, 9, 33, 0)');

    groundGrad = ctx.createRadialGradient(cx, H * 1.02, ry * 0.2, cx, H * 1.02, ry * 1.6);
    groundGrad.addColorStop(0, 'rgba(243, 183, 73, 0.22)'); // Warm amber floor glow
    groundGrad.addColorStop(1, 'rgba(6, 2, 12, 0)');
  } else {
    bgGrad.addColorStop(0, '#fff3e9');
    bgGrad.addColorStop(0.46, '#ffe7d6');
    bgGrad.addColorStop(0.78, '#fcd9c4');
    bgGrad.addColorStop(1, '#f3c4b5');

    glowGrad = ctx.createRadialGradient(cx, cy, ry * 0.1, cx, cy, ry * 1.55);
    glowGrad.addColorStop(0, 'rgba(255,219,170,0.6)');
    glowGrad.addColorStop(0.5, 'rgba(255,170,150,0.2)');
    glowGrad.addColorStop(1, 'rgba(255,170,150,0)');

    groundGrad = ctx.createRadialGradient(cx, H * 1.02, ry * 0.2, cx, H * 1.02, ry * 1.6);
    groundGrad.addColorStop(0, 'rgba(255,205,165,0.5)');
    groundGrad.addColorStop(1, 'rgba(255,205,165,0)');
  }

  for (let i = 0; i < 11; i++){
    orbs.push({ x: rand(0, W), y: rand(0, H), r: rand(W * 0.05, W * 0.17), vy: rand(-6, -16), drift: rand(-0.3, 0.3), phase: rand(0, 6.28), alpha: rand(0.05, 0.13), sprite: pick(BOKEH) });
  }

  const FN = wide ? 18 : 15;
  for (let i = 0; i < FN; i++){
    const depth = Math.random();
    floaters.push({
      x: rand(0, W), y: rand(-H * 0.1, H * 1.1), depth,
      idx: (Math.random() * BLOSSOM.length) | 0,
      box: lerp(Math.min(W, H) * 0.025, Math.min(W, H) * 0.075, depth),
      vy: lerp(7, 20, depth), sway: rand(8, 22), phase: rand(0, 6.28),
      rot: rand(-0.4, 0.4), vrot: rand(-0.5, 0.5),
      baseA: lerp(0.16, 0.5, depth), soft: depth < 0.45,
    });
  }

  const baseX = cx, baseY = H * 1.0;
  const trunkTopY = cy + ry * 0.62;
  const trunkW = Math.max(9, W * 0.024);
  const limbLen = ry * 0.6;
  const insidePx = (x, y, m = 0.9) => pointInPoly((x - cx) / (rx * m), (cy - y) / (ry * m));

  function addBranch(x, y, ang, len, w0, depth, t0){
    let ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, clipped = false;
    if (!insidePx(ex, ey)){
      let lo = 0, hi = 1;
      for (let k = 0; k < 12; k++){ const mid = (lo + hi) / 2; (insidePx(x + Math.cos(ang) * len * mid, y + Math.sin(ang) * len * mid) ? lo = mid : hi = mid); }
      ex = x + Math.cos(ang) * len * lo; ey = y + Math.sin(ang) * len * lo; clipped = true;
    }
    const mx = (x + ex) / 2, my = (y + ey) / 2, perp = ang + Math.PI / 2, bend = rand(-1, 1) * len * 0.12, w1 = w0 * 0.66;
    branches.push({ x1: x, y1: y, cx: mx + Math.cos(perp) * bend, cy: my + Math.sin(perp) * bend, x2: ex, y2: ey, w0, w1, t0, dur: Math.max(0.14, 0.32 - depth * 0.03), depth, grad: barkGrad(x, y, ex, ey, depth) });
    return { ex, ey, w1, clipped };
  }
  function grow(x, y, ang, len, w, depth, t0){
    const r = addBranch(x, y, ang, len, w, depth, t0);
    if (r.clipped || depth >= 6 || len < ry * 0.06) return;
    const childT0 = t0 + (0.32 - depth * 0.03) * 0.6;
    const n = Math.random() < 0.55 ? 2 : 3;
    for (let i = 0; i < n; i++){
      const spread = 0.6 * (i - (n - 1) / 2) + rand(-0.22, 0.22), lift = -0.06 + rand(-0.05, 0.05);
      grow(r.ex, r.ey, ang + spread + lift, len * rand(0.74, 0.84), r.w1, depth + 1, childT0 + i * 0.03);
    }
  }
  addBranch(baseX, baseY, -Math.PI / 2, baseY - trunkTopY, trunkW, 0, T.trunkStart);
  branches[0].dur = 0.55;
  const limbT0 = T.trunkStart + 0.36, L = 3;
  for (let i = 0; i < L; i++){
    const ang = -Math.PI / 2 + 0.62 * (i - (L - 1) / 2) + rand(-0.12, 0.12);
    grow(baseX, trunkTopY, ang, limbLen, trunkW * 0.7, 1, limbT0 + i * 0.05);
  }
  const maxT0 = branches.reduce((m, b) => Math.max(m, b.t0 + b.dur), 0);
  const sc = (T.branchSpan - T.trunkStart) / (maxT0 - T.trunkStart);
  for (const b of branches) b.t0 = T.trunkStart + (b.t0 - T.trunkStart) * sc;

  const COUNT = Math.round(clamp(rx * ry / 56, 250, 440));
  const baseBox = clamp(Math.min(W, H) * 0.115, 30, 74);
  let guard = 0;
  while (hearts.length < COUNT && guard < COUNT * 50){
    guard++;
    const u = rand(-1.06, 1.06), v = rand(-1.06, 1.06);
    if (!pointInPoly(u, v)) continue;
    const x = cx + u * rx, y = cy - v * ry;
    const d = clamp01(Math.hypot(u, v + 1) / 2.4);
    const t0 = T.bloomT0 + d * (T.bloomSpan * 0.82) + rand(0, T.bloomSpan * 0.18);
    const soft = Math.random() < 0.42;
    hearts.push({ x, y, idx: (Math.random() * BLOSSOM.length) | 0, soft, box: baseBox * (soft ? rand(0.6, 0.85) : rand(0.78, 1.12)), rot: rand(-0.55, 0.55), sway: rand(0, 6.28), t0 });
  }
  hearts.sort((a, b) => (a.soft === b.soft ? a.y - b.y : a.soft ? -1 : 1));
}

function drawBackground(){
  ctx.globalAlpha = 1;
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1; ctx.fillStyle = groundGrad; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawGodRays(t, intensity){
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ox = cx, oy = cy - ry * 0.35, R = Math.hypot(W, H) * 1.1;
  const rays = 9, sweep = Math.sin(t * 0.07) * 0.18;
  const isGlass = (document.documentElement.getAttribute('data-theme') === 'glass') || (window.GIFT_DATA && window.GIFT_DATA.themeId === 'glass');
  for (let i = 0; i < rays; i++){
    const a = -Math.PI / 2 + sweep + (i - (rays - 1) / 2) * 0.2;
    const hw = 0.035 + 0.02 * (0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.7));
    const a1 = a - hw, a2 = a + hw;
    const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * R, oy + Math.sin(a) * R);
    if (isGlass) {
      g.addColorStop(0, `rgba(243,183,73,${0.08 * intensity})`);
      g.addColorStop(0.5, `rgba(212,35,92,${0.04 * intensity})`);
      g.addColorStop(1, 'rgba(212,35,92,0)');
    } else {
      g.addColorStop(0, `rgba(255,232,190,${0.10 * intensity})`);
      g.addColorStop(0.5, `rgba(255,214,170,${0.05 * intensity})`);
      g.addColorStop(1, 'rgba(255,214,170,0)');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(a1) * R, oy + Math.sin(a1) * R);
    ctx.lineTo(ox + Math.cos(a2) * R, oy + Math.sin(a2) * R);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawGlow(t){
  const gi = clamp01((t - T.bloomT0) / (T.bloomSpan * 0.9));
  if (gi <= 0) return;
  ctx.save(); ctx.globalAlpha = gi; ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glowGrad; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawBokeh(t, dt){
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const o of orbs){
    o.y += o.vy * dt; o.x += Math.sin(t * 0.3 + o.phase) * o.drift;
    if (o.y < -o.r){ o.y = H + o.r; o.x = rand(0, W); }
    ctx.globalAlpha = o.alpha;
    ctx.drawImage(o.sprite, o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
  }
  ctx.restore();
}

function drawFloaters(t, dt, front){
  const appear = clamp01((t - 0.2) / 1.4);
  if (appear <= 0) return;
  for (const f of floaters){
    if ((f.depth >= 0.6) !== front) continue;
    f.y -= f.vy * dt;
    f.x += Math.sin(t * 0.5 + f.phase) * f.sway * dt;
    f.rot += f.vrot * dt;
    if (f.y < -f.box){ f.y = H + f.box; f.x = rand(0, W); }
    drawSprite((f.soft ? SPR.soft : SPR.crisp)[f.idx], f.x, f.y, f.box, f.rot, f.baseA * appear);
  }
}

function drawBranches(t){
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const b of branches){
    const f = clamp01((t - b.t0) / b.dur);
    if (f <= 0) continue;
    const e = easeOutCubic(f);
    ctx.strokeStyle = b.grad;
    const steps = 12, last = Math.max(1, Math.ceil(steps * e));
    let prev = quad(b, 0);
    for (let i = 1; i <= last; i++){
      const tt = Math.min(e, i / steps), p = quad(b, tt);
      ctx.lineWidth = lerp(b.w0, b.w1, tt);
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      prev = p;
    }
  }
}

function drawHearts(t){
  const breathe = 1 + Math.sin(t * 0.8) * 0.012;
  for (const h of hearts){
    const p = clamp01((t - h.t0) / 0.6);
    if (p <= 0) continue;
    const scale = Math.max(0, easeOutBack(p));
    let alpha = clamp01(p * 1.7); if (h.soft) alpha *= 0.8;
    const settled = clamp01((t - h.t0 - 0.6) / 0.7);
    const sway = settled * Math.sin(t * 1.5 + h.sway) * (h.box * 0.05);
    const rise = (1 - easeOutCubic(p)) * h.box * 0.45;
    const hx = cx + (h.x - cx) * breathe + sway;
    const hy = cy + (h.y - cy) * breathe - rise;
    drawSprite((h.soft ? SPR.soft : SPR.crisp)[h.idx], hx, hy, h.box * scale, h.rot + sway * 0.012, alpha);
  }
}

function updateTwinkles(t, dt){
  const active = t > T.bloomT0 + T.bloomSpan * 0.45;
  if (active && twinkles.length < 9 && Math.random() < 0.5){
    const h = hearts[(Math.random() * hearts.length) | 0];
    if (h) twinkles.push({ x: h.x, y: h.y, size: rand(0.6, 1.3) * (Math.min(W, H) * 0.05), age: 0, life: rand(0.7, 1.2), rot: rand(0, 6.28) });
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = twinkles.length - 1; i >= 0; i--){
    const s = twinkles[i]; s.age += dt;
    const k = s.age / s.life;
    if (k >= 1){ twinkles.splice(i, 1); continue; }
    const a = Math.sin(k * Math.PI);
    drawSprite(SPARKLE, s.x, s.y, s.size * (0.6 + 0.4 * a), s.rot + k * 1.2, a);
  }
  ctx.restore();
}

function spawnPetal(){
  const h = hearts[(Math.random() * hearts.length) | 0];
  if (!h) return;
  petals.push({ x: h.x + rand(-8, 8), y: h.y + rand(-8, 8), vy: rand(14, 30), vx: rand(-8, 8), sway: rand(0.6, 1.4), phase: rand(0, 6.28), box: h.box * rand(0.34, 0.6), idx: h.idx, rot: rand(0, 6.28), vrot: rand(-1.4, 1.4), age: 0, land: groundY + rand(-6, H * 0.05) });
}
function drawPetals(t, dt){
  for (let i = petals.length - 1; i >= 0; i--){
    const p = petals[i]; p.age += dt; p.vy += 8 * dt;
    p.x += (p.vx + Math.sin(t * p.sway + p.phase) * 16) * dt;
    p.y += p.vy * dt; p.rot += p.vrot * dt;
    if (p.y >= p.land){
      rested.push({ x: clamp(p.x, 6, W - 6), y: p.land, box: p.box, idx: p.idx, rot: p.rot, a: rand(0.7, 0.95) });
      if (rested.length > 90) rested.shift();
      petals.splice(i, 1); continue;
    }
    const a = p.age < 0.3 ? p.age / 0.3 : 1;
    drawSprite(SPR.crisp[p.idx], p.x, p.y, p.box, p.rot, a);
  }
}
function drawRested(){
  for (const r of rested) drawSprite(SPR.crisp[r.idx], r.x, r.y, r.box, r.rot, r.a);
}

function showWish(on){ wishEl.classList.toggle('is-in', on); }

/* the tree's own rAF: plays once from treeStart(), then holds, living */
let treeStartT = 0, treeLastT = 0, treeRAF = 0, lastPetal = 0, replayArmed = false;
window.bdayDone = false;

function treeFrame(now){
  if (!treeStartT){ treeStartT = now; treeLastT = now; }
  const t  = (now - treeStartT) / 1000;
  const dt = Math.min(0.05, (now - treeLastT) / 1000); treeLastT = now;

  const rays = clamp01((t - T.bloomT0) / T.bloomSpan);

  drawBackground();
  drawGodRays(t, rays);
  drawGlow(t);
  drawBokeh(t, dt);
  drawFloaters(t, dt, false);
  drawBranches(t);
  drawHearts(t);
  updateTwinkles(t, dt);
  if (t > T.petalT0 && now - lastPetal > 150){ spawnPetal(); spawnPetal(); lastPetal = now; }
  drawPetals(t, dt);
  drawRested();
  drawFloaters(t, dt, true);

  showWish(t >= T.noteStart);

  if (!window.bdayDone && t >= T.done) window.bdayDone = true;
  if (!replayArmed && t >= T.done + 1.0){ replayArmed = true; armReplay(); }

  treeRAF = requestAnimationFrame(treeFrame);
}

function showTreeCanvas(){
  if (canvas){
    canvas.classList.remove('is-hidden');
    canvas.removeAttribute('aria-hidden');
    canvas.style.display = 'block';
    canvas.style.opacity = '1';
  }
}

function hideTreeCanvas(){
  treeStop();
  if (canvas){
    canvas.classList.add('is-hidden');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.display = 'none';
  }
}

function treeStart(){
  showTreeCanvas();
  treeStartT = 0; treeLastT = 0; lastPetal = 0; replayArmed = false; window.bdayDone = false;
  cue('grow');
  buildScene();
  if (!treeRAF) treeRAF = requestAnimationFrame(treeFrame);
}
function treeStop(){
  if (treeRAF){ cancelAnimationFrame(treeRAF); treeRAF = 0; }
  if (ctx && canvas){
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function drawFinal(){
  showTreeCanvas();
  buildScene();
  drawBackground(); drawGodRays(0, 1); drawGlow(T.done); drawBokeh(0, 0); drawFloaters(99, 0, false);
  drawBranches(99); drawHearts(99);
  for (let i = 0; i < 40; i++){ const h = hearts[(Math.random() * hearts.length) | 0]; if (h) rested.push({ x: clamp(h.x + rand(-W * 0.3, W * 0.3), 6, W - 6), y: groundY + rand(-6, H * 0.05), box: h.box * 0.5, idx: h.idx, rot: rand(0, 6.28), a: 0.85 }); }
  drawRested(); drawFloaters(99, 0, true);
  showWish(true);
  window.bdayDone = true;
}

/* ============================================================
   ACTS 1–3 (GSAP) — the bow, the shot, the wish
   ============================================================ */

/* Initialize per-glyph kinetic headline spans */
if (!line1Chars.length && !line2Chars.length) {
  rebuildKineticChars();
}

/* drifting light motes behind the scene */
function buildMotes(){
  stopMotes();
  motes.innerHTML = '';
  for (let i = 0; i < 12; i++){
    const m = document.createElement('span');
    m.className = 'mote';
    const s = rand(4, 12);
    m.style.width = m.style.height = `${s}px`;
    m.style.left = `${rand(4, 96)}%`;
    m.style.top  = `${rand(10, 96)}%`;
    motes.appendChild(m);
    gsap.set(m, { opacity: rand(0.25, 0.7) });
    gsap.to(m, { y: -rand(40, 140), x: rand(-30, 30), duration: rand(7, 14), repeat: -1, yoyo: true, ease: 'sine.inOut', delay: -rand(0, 8) });
    gsap.to(m, { opacity: rand(0.1, 0.5), duration: rand(2.5, 5), repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }
}

function stopMotes(){
  if (motes){
    const children = motes.querySelectorAll('.mote');
    children.forEach(m => gsap.killTweensOf(m));
    motes.innerHTML = '';
  }
}

/* --- bow geometry (measured; re-measured on resize) -------------------------
   The rig lives lower-left and is rotated so its local "up" axis points at the
   heart; the shot therefore travels on a diagonal. The draw + arrow math all
   live in the rig's LOCAL space (offset geometry is transform-independent, so
   rotation never corrupts it); only the aim ANGLE and the flight DISTANCE come
   from screen measurements. */
const tip = $('tip');
let svgScale = 1, arrowBaseX = 0, arrowBaseY = 0, maxDraw = 120, curDraw = 0;
let pullUX = 0, pullUY = 1;                               // screen unit: string pull-back
const REST_NOCK = 96;                                    // string nock, in bow viewBox units
const nockProxy = { val: REST_NOCK };

function applyNock(){
  const y = nockProxy.val;
  strL.setAttribute('y2', y); strR.setAttribute('y2', y); serving.setAttribute('cy', y);
}

function refreshRig(){
  if (!archery || !bow || !serving || !arrow) return;
  // Ensure W and H have valid non-zero dimensions
  if (!W || !H || W === 0 || H === 0) {
    W = (canvas && canvas.clientWidth) || window.innerWidth || document.documentElement.clientWidth || 375;
    H = (canvas && canvas.clientHeight) || window.innerHeight || document.documentElement.clientHeight || 667;
  }
  // the grip is anchored here, and the heart sits at its layout centre (33% down,
  // centred) — using the layout point, not a live rect, keeps the aim steady even
  // while the heart is scaling in.
  const gripX = W * 0.24, gripY = H * 0.76;
  const heartX = W * 0.5, heartY = H * 0.33;
  // rotation so local "up" (0,-1) maps to the grip→heart direction
  const aimRad = Math.atan2(heartX - gripX, gripY - heartY);
  pullUX = -Math.sin(aimRad); pullUY = Math.cos(aimRad);  // opposite of aim = pull-back

  // #bow / #arrow are SVG — no offset* — so measure rects in the rig's LOCAL
  // frame: neutralise the rig transform first (getBBox-style, sync, no paint).
  nockProxy.val = REST_NOCK; applyNock();
  gsap.set(archery, { rotation: 0, scale: 1, x: 0, y: 0 });
  archery.style.left = '0px'; archery.style.top = '0px';
  gsap.set(arrow, { x: 0, y: 0 });
  const aR = archery.getBoundingClientRect();
  const bR = bow.getBoundingClientRect();
  const sR = serving.getBoundingClientRect();
  const rR = arrow.getBoundingClientRect();
  svgScale = (bR.width > 0) ? (bR.width / 460) : 1;
  const gripLX = (bR.left - aR.left) + 0.5 * (bR.width || 120);
  const gripLY = (bR.top  - aR.top ) + (240 / 300) * (bR.height || 80);   // grip ~y240 in viewBox
  const nockLX = (sR.left - aR.left) + 0.5 * (sR.width || 10);
  const nockLY = (sR.top  - aR.top ) + 0.5 * (sR.height || 10);
  arrowBaseX = nockLX - ((rR.left - aR.left) + 0.5 * (rR.width || 20));
  arrowBaseY = nockLY - ((rR.top  - aR.top ) + (205 / 220) * (rR.height || 60));

  // anchor the grip at (gripX,gripY) and rotate the rig around it
  archery.style.left = (gripX - gripLX) + 'px';
  archery.style.top  = (gripY - gripLY) + 'px';
  gsap.set(archery, { transformOrigin: `${gripLX}px ${gripLY}px`, rotation: aimRad * 180 / Math.PI });
  gsap.set(arrow, { x: arrowBaseX, y: arrowBaseY });
  maxDraw = Math.min((bR.height || 80) * 0.72, H * 0.16, 132);
  curDraw = 0;
}

function setDraw(d){
  curDraw = clamp(d, 0, maxDraw);
  gsap.set(arrow, { x: arrowBaseX, y: arrowBaseY + curDraw });   // local +Y = pull back
  nockProxy.val = REST_NOCK + curDraw / svgScale; applyNock();
  gsap.set(aim, { opacity: 0.55 * (curDraw / maxDraw) });
}

/* the target heart's beat — gentle, alive; killed the instant we fire */
let beatTL = null;
function startBeat(){
  gsap.set(targetHeart, { scale: 1 });
  gsap.set(heartGlow, { scale: 1, opacity: 0.7 });
  beatTL = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });
  beatTL.to(targetHeart, { scale: 1.07, duration: 0.13, ease: 'power2.out' }, 0)
        .to(heartGlow,   { scale: 1.15, opacity: 0.9, duration: 0.13, ease: 'power2.out' }, 0)
        .to(targetHeart, { scale: 1.0, duration: 0.2, ease: 'power2.in' }, 0.13)
        .to(targetHeart, { scale: 1.05, duration: 0.12, ease: 'power2.out' }, 0.3)
        .to(targetHeart, { scale: 1.0, duration: 0.5, ease: 'power2.inOut' }, 0.42)
        .to(heartGlow,   { scale: 1.0, opacity: 0.7, duration: 0.7, ease: 'power2.inOut' }, 0.3);
}
function stopBeat(){ if (beatTL){ beatTL.kill(); beatTL = null; } gsap.set(targetHeart, { scale: 1 }); }

/* a little burst of hearts + sparks where the arrow strikes */
function miniHeartSVG(fill){
  return `<svg viewBox="0 0 24 22" width="100%" height="100%"><path d="M12 20C5.5 15 1.5 11.4 1.5 6.9 1.5 3.6 4 1.5 7 1.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.5 2.1 5.5 5.4C23.5 11.4 19.5 15 12 20Z" fill="${fill}"/></svg>`;
}
function burstHearts(){
  const r = target.getBoundingClientRect();
  const hr = hero.getBoundingClientRect();
  const ox = r.left - hr.left + r.width / 2;
  const oy = r.top - hr.top + r.height * 0.42;
  const cols = ['#ff6f97', '#ffb14e', '#ff8fae', '#ffd36a', '#e23b67'];
  const frag = document.createDocumentFragment();
  const nodes = [];
  for (let i = 0; i < 12; i++){
    const heart = i < 8;
    const el = document.createElement('span');
    el.className = 'burst';
    const s = heart ? rand(12, 22) : rand(4, 8);
    el.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;pointer-events:none;z-index:4;`;
    if (heart) el.innerHTML = miniHeartSVG(pick(cols));
    else { el.style.borderRadius = '50%'; el.style.background = 'radial-gradient(circle,#fff,rgba(255,210,150,0) 70%)'; }
    frag.appendChild(el); nodes.push({ el, heart });
  }
  hero.appendChild(frag);
  nodes.forEach(({ el, heart }) => {
    const ang = rand(-Math.PI, 0);                       // fan upward + out
    const dist = rand(heart ? 70 : 40, heart ? 190 : 120);
    gsap.to(el, {
      x: Math.cos(ang) * dist, y: Math.sin(ang) * dist - rand(10, 50),
      rotation: rand(-120, 120), scale: heart ? rand(0.7, 1.2) : rand(0.4, 1),
      duration: rand(0.7, 1.15), ease: 'power2.out',
    });
    gsap.to(el, { opacity: 0, duration: 0.5, delay: rand(0.35, 0.6), ease: 'power1.in', onComplete: () => el.remove() });
  });
}

/* --- the shot + Acts 2–3 timeline ------------------------------------------ */
function shotGeom(){
  // flight distance = straight-line from the arrow tip to the heart (measured on
  // screen, rotation-aware). Moving the arrow that far along its local "up" axis
  // — which is aimed at the heart — lands the tip dead-centre on it.
  const tipR = tip.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();
  const tipX = tipR.left + tipR.width / 2, tipY = tipR.top + tipR.height / 2;
  const tcx = tRect.left + tRect.width / 2, tcy = tRect.top + tRect.height / 2;
  const flightDist = Math.hypot(tcx - tipX, tcy - tipY);
  const fallPx = Math.min(H * 0.26, H - tcy - tRect.height * 0.4);
  const impactX = tcx, impactY = tcy + fallPx;
  const distC = Math.hypot(Math.max(impactX, W - impactX), Math.max(impactY, H - impactY));
  const reach = Math.hypot(W / 2, H / 2);
  return {
    arrowStartY: arrowBaseY + curDraw,
    arrowFlyY:   arrowBaseY + curDraw - flightDist,       // local -Y = toward the heart
    drawnNock:   REST_NOCK + curDraw / svgScale,
    fallPx, fx: impactX - W / 2, fy: impactY - H / 2,
    floodScale: (distC * 1.12) / 70, bloomScale: (reach * 1.2) / 30,
  };
}

let filmTL = null;
function buildFilm(m){
  const t = gsap.timeline({
    paused: true,
    onComplete: () => {
      gsap.set(field, { autoAlpha: 0 });
      treeStart();
      // fade promptly so the growing tree is revealed with no white hold
      gsap.to(bloom, { autoAlpha: 0, duration: 1.15, ease: 'power2.out' });
    },
  });

  // reset (t=0)
  t.set(target, { y: 0, scaleX: 1, scaleY: 1, opacity: 1 })
   .set(arrow, { opacity: 1, x: arrowBaseX, y: m.arrowStartY, scaleY: 1 })
   .set([flood, bloom], { autoAlpha: 0, scale: 0.001, x: 0, y: 0 })
   .set(flood, { x: m.fx, y: m.fy })
   .set(field, { autoAlpha: 0 })
   .set('.blob', { opacity: 0 })
   .set(camera, { scale: 1, yPercent: 0 })
   .set(fgrid, { xPercent: 0, yPercent: 0 })
   .set(barTop, { yPercent: -100 })
   .set(barBot, { yPercent: 100 })
   .set(kEyebrow, { opacity: 0, y: 12 })
   .set(kSub, { opacity: 0, y: 12 })
   .set(kChars, { transformPerspective: 620, transformOrigin: '50% 100%', yPercent: 135, rotationX: -82 })
   .set(uline, { drawn: 0 });

  // --- the shot: string snaps (twang), arrow flies up into the heart --------
  t.fromTo(nockProxy, { val: m.drawnNock }, { val: REST_NOCK, duration: 0.5, ease: 'elastic.out(1,0.34)', onUpdate: applyNock }, 0)
   .to(arrow, { y: m.arrowFlyY, duration: 0.26, ease: 'power2.in' }, 0)
   .to(arrow, { scaleY: 1.16, duration: 0.14, ease: 'power2.in' }, 0)
   .to(arrow, { scaleY: 1.0, duration: 0.1, ease: 'power1.out' }, 0.16)
   .to(aim, { opacity: 0, duration: 0.18 }, 0)
   .to([eyebrow, hint], { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0);

  // --- the strike: the arrow embeds, the heart recoils, then holds pierced --
  t.add(burstHearts, 0.26)
   // recoil along the arrow's line (up + right), springing back
   .to(target, { x: 7, y: -9, duration: 0.06, ease: 'power2.out' }, 0.26)
   .to(target, { x: 0, y: 0, duration: 0.32, ease: 'power2.out' }, 0.32)
   .to(target, { scale: 1.14, duration: 0.06, ease: 'power2.out' }, 0.26)
   .to(target, { scale: 1.0, duration: 0.26, ease: 'power2.inOut' }, 0.32)
   // the arrow shudders in the wound, holds embedded so the hit reads, then sinks in
   .to(arrow, { rotation: '+=4', duration: 0.05, yoyo: true, repeat: 4, ease: 'sine.inOut' }, 0.27)
   .set(arrow, { rotation: 0 }, 0.52)
   .to(arrow, { opacity: 0, duration: 0.16, ease: 'power1.out' }, 0.56);

  // --- the fall + the burst / flood -----------------------------------------
  t.to(target, { y: m.fallPx, scaleX: 0.84, scaleY: 1.3, duration: 0.34, ease: 'power1.in' }, 0.64)
   .to(target, { scaleX: 1.4, scaleY: 0.6, duration: 0.07, ease: 'power2.out' }, 0.98)
   .set(flood, { autoAlpha: 1 }, 1.00)
   .fromTo(flood, { scale: 0.02 }, { scale: m.floodScale, duration: 0.34, ease: 'power2.in' }, 1.00)
   .to(target, { opacity: 0, duration: 0.12, ease: 'power1.out' }, 1.06);

  // seam: the field is the same rose as the flood
  t.set(field, { autoAlpha: 1 }, 1.32)
   .set(hero, { autoAlpha: 0 }, 1.33)
   .to('.blob', { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.34)
   .set(flood, { autoAlpha: 0 }, 1.36);

  // --- the camera push -------------------------------------------------------
  // duration matched to when the bloom covers (3.98) — a longer push used to
  // keep the timeline (and a white bloom) alive after the tree should already
  // be growing, which read as dead time before the tree appeared.
  t.fromTo(camera, { scale: 1.0, yPercent: 0 }, { scale: 1.07, yPercent: -1.3, duration: 2.6, ease: 'none' }, 1.38)
   .fromTo(fgrid, { xPercent: 0, yPercent: 0 }, { xPercent: -1.5, yPercent: -1.0, duration: 2.6, ease: 'none' }, 1.38);

  // beat markers for the recorder's soundtrack (no-ops off ?record)
  t.call(cue, ['hit'], 0.26)
   .call(cue, ['flood'], 1.00)
   .call(cue, ['wish'], 1.68)
   .call(cue, ['wish2'], 2.06)
   .call(cue, ['bloom'], 3.42);

  // cinema bars ease into a letterbox
  t.to(barTop, { yPercent: 0, duration: 0.6, ease: 'power2.out' }, 1.5)
   .to(barBot, { yPercent: 0, duration: 0.6, ease: 'power2.out' }, 1.5);

  // --- the kinetic wish ------------------------------------------------------
  t.to(kEyebrow, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 1.54)
   .to(line1Chars, { yPercent: 0, rotationX: 0, duration: 0.55, ease: 'power3.out', stagger: 0.033 }, 1.68)
   .to(line2Chars, { yPercent: 0, rotationX: 0, duration: 0.55, ease: 'power3.out', stagger: 0.033 }, 2.06)
   .to(uline, { drawn: 1, duration: 0.45, ease: 'power2.inOut' }, 2.54)
   .to(kSub, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 2.74);

  // --- the handoff bloom -----------------------------------------------------
  t.to(barTop, { yPercent: -100, duration: 0.5, ease: 'power2.in' }, 3.32)
   .to(barBot, { yPercent: 100, duration: 0.5, ease: 'power2.in' }, 3.32)
   .set(bloom, { autoAlpha: 1 }, 3.42)
   .fromTo(bloom, { scale: 0.02 }, { scale: m.bloomScale, duration: 0.58, ease: 'power2.in' }, 3.42);

  return t;
}

/* --- draw / release interaction -------------------------------------------- */
let played = false, drawing = false, startPX = 0, startPY = 0, startDraw = 0;

function fire(){
  if (played) return;
  played = true;
  drawing = false;
  stopBeat();
  cue('release'); cue('whoosh');
  filmTL = buildFilm(shotGeom());
  filmTL.play(0);
}

function springBack(){
  const from = curDraw;
  gsap.to({ d: from }, { d: 0, duration: 0.55, ease: 'elastic.out(1,0.4)', onUpdate() { setDraw(this.targets()[0].d); } });
}

function autoFire(){
  if (played) return;
  recT0 = performance.now(); cue('draw');       // t=0 of the soundtrack
  gsap.to({ d: curDraw }, {
    d: maxDraw * 0.94, duration: 0.62, ease: 'power2.inOut',
    onUpdate() { setDraw(this.targets()[0].d); },
    onComplete: () => gsap.delayedCall(0.16, fire),
  });
}

archery.addEventListener('pointerdown', (e) => {
  if (played) return;
  drawing = true;
  try { archery.setPointerCapture(e.pointerId); } catch (_) {}
  startPX = e.clientX; startPY = e.clientY; startDraw = curDraw;
  e.preventDefault();
});
archery.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  // project the drag onto the pull-back axis, so dragging back along the aim
  // (down + away from the heart) draws the string — on any shot angle.
  const proj = (e.clientX - startPX) * pullUX + (e.clientY - startPY) * pullUY;
  setDraw(startDraw + proj);
});
function endDraw(){
  if (!drawing) return;
  drawing = false;
  if (curDraw > maxDraw * 0.26) fire(); else springBack();
}
archery.addEventListener('pointerup', endDraw);
archery.addEventListener('pointercancel', endDraw);
archery.addEventListener('keydown', (e) => {
  if (played) return;
  if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); autoFire(); }
});

/* boot Act 1: reveal the target + bow + hint, then start the beat */
function enter(){
  gsap.set(hero, { autoAlpha: 1 });
  refreshRig();
  setDraw(0);
  gsap.set([eyebrow, hint], { opacity: 0, y: 14 });
  gsap.set(target, { opacity: 0, y: 10, scaleX: 0.9, scaleY: 0.9 });
  gsap.set(archery, { opacity: 0, scale: 0.85 });        // scale from the grip; keeps rotation
  gsap.set(heartGlow, { opacity: 0, scale: 1 });
  gsap.set(arrow, { opacity: 1 });

  const tl = gsap.timeline({ onComplete: startBeat });
  tl.to(target,   { opacity: 1, y: 0, scaleX: 1, scaleY: 1, duration: 0.8, ease: 'power3.out' }, 0.1)
    .to(heartGlow,{ opacity: 0.7, duration: 0.8, ease: 'power2.out' }, 0.2)
    .to(archery,  { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }, 0.28)
    .to(eyebrow,  { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.4)
    .to(hint,     { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.7);
}

function armReplay(){
  if (nextScene1){
    nextScene1.hidden = false;
    requestAnimationFrame(() => nextScene1.classList.add('is-shown'));
  }
}

/* back to Act 1, ready to be drawn again — comprehensively resets all scenes */
function resetAll(){
  currentSceneNum = 1;
  sceneEntryTime = Date.now();
  sceneTransitioning = false;

  // 1. Reset Scene 11
  if (scene11){
    scene11.classList.remove('is-active');
    scene11.setAttribute('aria-hidden', 'true');
  }
  if (typeof resetScene11 === 'function'){
    resetScene11();
  }

  // 2. Reset Scene 10
  if (scene10){
    scene10.classList.remove('is-active');
    scene10.setAttribute('aria-hidden', 'true');
  }
  if (typeof resetScene10 === 'function'){
    resetScene10();
  }

  // 3. Reset Scene 9
  if (scene9){
    scene9.classList.remove('is-active');
    scene9.setAttribute('aria-hidden', 'true');
  }
  if (typeof resetScene9 === 'function'){
    resetScene9();
  }

  // 4. Reset Scene 8
  if (scene8){
    scene8.classList.remove('is-active');
    scene8.setAttribute('aria-hidden', 'true');
  }
  if (typeof resetBalloonScene === 'function'){
    resetBalloonScene();
  }

  // 5. Reset Scene 7
  if (scene7){
    scene7.classList.remove('is-active');
    scene7.setAttribute('aria-hidden', 'true');
  }
  if (typeof resetScene7 === 'function'){
    resetScene7();
  }

  // 6. Reset Scene 6
  if (scene6){
    scene6.classList.remove('is-active');
    scene6.setAttribute('aria-hidden', 'true');
  }
  if (typeof resetScene6 === 'function'){
    resetScene6();
  }

  // 7. Reset Scene 5
  if (scene5){
    scene5.classList.remove('is-active', 'candles-out');
    scene5.setAttribute('aria-hidden', 'true');
    stopMic();
    if (statsInterval){
      clearInterval(statsInterval);
      statsInterval = 0;
    }
  }
  if (typeof relightCake === 'function'){
    relightCake();
  }

  // 8. Reset Scene 4
  if (scene4){
    scene4.classList.remove('is-active', 'curtains-open');
    scene4.setAttribute('aria-hidden', 'true');
  }
  if (typeof closeCurtains === 'function'){
    closeCurtains();
  }

  // 9. Reset Scene 3
  if (scene3){
    scene3.classList.remove('is-active', 'pin-unlocked');
    scene3.setAttribute('aria-hidden', 'true');
    stopClock();
  }
  if (typeof resetPinScene === 'function'){
    resetPinScene();
  }

  // 10. Reset Scene 2
  giftOpened = false;
  if (scene2){
    scene2.classList.remove('is-active', 'gift-open');
    scene2.setAttribute('aria-hidden', 'true');
  }
  if (nextScene2){
    nextScene2.classList.remove('is-shown');
    nextScene2.hidden = true;
  }

  // 11. Reset Act 1
  stopMotes();
  if (!reduceMotion) buildMotes();
  treeStop();
  showTreeCanvas();
  showWish(false);
  if (canvas) canvas.style.opacity = '1';
  if (wishEl) wishEl.style.opacity = '1';
  window.bdayDone = false;
  replayArmed = false;
  if (replay){
    replay.classList.remove('is-shown', 'has-next');
    replay.hidden = true;
  }
  if (nextScene1){
    nextScene1.classList.remove('is-shown');
    nextScene1.hidden = true;
  }
  if (filmTL){ filmTL.pause(0); }
  gsap.set([flood, bloom], { autoAlpha: 0 });
  gsap.set(field, { autoAlpha: 0 });
  gsap.set(arrow, { opacity: 1, scaleY: 1 });
  played = false;
  enter();
}

/* ============================================================
   SIZING + BOOT
   ============================================================ */
function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = (canvas && canvas.clientWidth) || window.innerWidth || document.documentElement.clientWidth || 375;
  H = (canvas && canvas.clientHeight) || window.innerHeight || document.documentElement.clientHeight || 667;
  if (canvas) {
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  buildSprites();
  buildScene();
  if (reduceMotion){ drawFinal(); return; }
  if (played && filmTL){
    const at = filmTL.time(); const active = filmTL.isActive();
    filmTL = buildFilm(shotGeom());
    filmTL.pause(at);
    if (active) filmTL.play(at);
  } else {
    refreshRig(); setDraw(0);
  }
}
let resizeRAF = 0;
window.addEventListener('resize', () => { if (resizeRAF) return; resizeRAF = requestAnimationFrame(() => { resizeRAF = 0; resize(); }); });

resize();

if (reduceMotion){
  drawFinal();
} else {
  buildMotes();
  document.fonts && document.fonts.ready.then(() => { refreshRig(); setDraw(0); });
  enter();
  if (replay) replay.addEventListener('click', resetAll);
}

/* ============================================================
   RECORDING HOOK — the rig draws + fires after its pre-roll
   ============================================================ */
if (isRecord){
  window.bdayAPI = {
    start(){ autoFire(); },
    replay(){ resetAll(); },
  };
}

/* ============================================================
   SCENE 2 — SURPRISE GIFT BOX CONTROLLER
   ============================================================ */
const scene2        = $('scene2');
const giftBoxWrap   = $('giftBoxWrap');
const giftBurst     = $('giftBurst');
const nextScene2    = $('nextScene2');
let giftOpened      = false;

function triggerGiftConfetti(){
  if (!giftBurst) return;
  giftBurst.innerHTML = '';
  const colors = ['#ffd700', '#ff69b4', '#ff1493', '#ffa07a', '#ffffff', '#e83a72', '#ffcf6a'];
  const count = 36;
  for (let i = 0; i < count; i++){
    const p = document.createElement('span');
    p.className = 'gift-particle';
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const distance = 60 + Math.random() * 110;
    const size = 5 + Math.random() * 7;
    const color = colors[i % colors.length];
    const isHeart = i % 5 === 0;

    p.style.left = '50%';
    p.style.top = '48%';
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.position = 'absolute';
    p.style.pointerEvents = 'none';

    if (isHeart){
      p.textContent = '♥';
      p.style.color = '#ff3366';
      p.style.fontSize = '16px';
      p.style.lineHeight = '1';
    } else {
      p.style.background = color;
      p.style.borderRadius = i % 2 === 0 ? '50%' : '2px';
    }

    giftBurst.appendChild(p);

    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 50;
    const rot = (Math.random() - 0.5) * 720;

    gsap.fromTo(p,
      { x: 0, y: 0, scale: 0.2, opacity: 1 },
      {
        x: tx,
        y: ty + 35,
        rotation: rot,
        scale: 1,
        opacity: 0,
        duration: 1.3 + Math.random() * 0.8,
        ease: 'power2.out',
        onComplete: () => p.remove()
      }
    );
  }
}

function openGiftBox(){
  if (giftOpened || !scene2) return;
  giftOpened = true;
  scene2.classList.add('gift-open');

  if (!reduceMotion){
    triggerGiftConfetti();
  }

  // Fade in Scene 2's Next button once the card animates up
  const delay = reduceMotion ? 100 : 1100;
  setTimeout(() => {
    if (nextScene2){
      nextScene2.hidden = false;
      requestAnimationFrame(() => nextScene2.classList.add('is-shown'));
    }
  }, delay);
}

if (giftBoxWrap){
  giftBoxWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      openGiftBox();
    }
  });
}
if (scene2){
  scene2.addEventListener('click', () => {
    if (!giftOpened){
      openGiftBox();
    } else {
      goToScene(3);
    }
  });
}
if (nextScene2){
  nextScene2.addEventListener('click', (e) => {
    e.stopPropagation();
    goToScene(3);
  });
}

/* ============================================================
   SCENE 3 — SECRET PIN KEEPSAKE CARD CONTROLLER
   ============================================================ */
// Plain JS variable for the 4-digit PIN (can be updated dynamically via GIFT_DATA)
let CORRECT_PIN = (window.GIFT_DATA && window.GIFT_DATA.scenes && window.GIFT_DATA.scenes.scene3_pinLock && window.GIFT_DATA.scenes.scene3_pinLock.pin) || '1234';

const scene3            = $('scene3');
const pinCard           = $('pinCard');
const pinClock          = $('pinClock');
const pinDotsWrap       = $('pinDots');
const pinDots           = pinDotsWrap ? pinDotsWrap.querySelectorAll('.pin-dot') : [];
const pinStatusPill     = $('pinStatusPill');
const pinInstruction    = $('pinInstruction');
const pinInputArea      = $('pinInputArea');
const pinKeypad         = $('pinKeypad');

let enteredPin  = '';
let pinLocked   = true;
let isVerifying = false;
let clockTimer  = 0;

/* --- Web Audio Synthesizer (Fails silently if blocked) --- */
let audioCtx = null;
function getAudioCtx(){
  if (!audioCtx){
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    } catch(e){}
  }
  if (audioCtx && audioCtx.state === 'suspended'){
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq, type, duration, gainLevel = 0.08){
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch(e){}
}

function playKeyClickSound(){
  playTone(587.33, 'sine', 0.06, 0.07); // D5
}

function playDeleteSound(){
  playTone(440, 'sine', 0.05, 0.06); // A4
}

function playErrorBuzzSound(){
  duckMusic(500);
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(175, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch(e){}
}

function playSuccessChime(){
  duckMusic(1100);
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.09, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } catch(e){}
      }, idx * 110);
    });
  } catch(e){}
}

/* --- Live Clock --- */
function updateClock(){
  if (!pinClock) return;
  const now = new Date();
  pinClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function startClock(){
  updateClock();
  if (!clockTimer){
    clockTimer = setInterval(updateClock, 1000);
  }
}

function stopClock(){
  if (clockTimer){
    clearInterval(clockTimer);
    clockTimer = 0;
  }
}

/* --- PIN UI Updating --- */
function updatePinDots(){
  pinDots.forEach((dot, idx) => {
    if (idx < enteredPin.length){
      dot.classList.add('is-filled');
    } else {
      dot.classList.remove('is-filled');
    }
  });
}

function handleDigitInput(digit){
  if (!pinLocked || isVerifying || enteredPin.length >= 4) return;
  playKeyClickSound();
  enteredPin += digit;
  updatePinDots();

  if (enteredPin.length === 4){
    verifyEnteredPin();
  }
}

function handleDeleteDigit(){
  if (!pinLocked || isVerifying || enteredPin.length === 0) return;
  playDeleteSound();
  enteredPin = enteredPin.slice(0, -1);
  updatePinDots();
}

function verifyEnteredPin(){
  isVerifying = true;
  if (enteredPin === CORRECT_PIN){
    // Correct PIN!
    playSuccessChime();
    pinLocked = false;
    if (pinCard) pinCard.classList.add('is-unlocked');
    if (pinInstruction) pinInstruction.textContent = 'unlocked with love ♥';
    
    setTimeout(() => {
      goToScene(4);
      isVerifying = false;
    }, reduceMotion ? 50 : 700);

  } else {
    // Wrong PIN
    playErrorBuzzSound();
    if (pinDotsWrap) pinDotsWrap.classList.add('is-error');
    if (pinStatusPill) {
      pinStatusPill.className = 'pin-status-pill pin-error';
      pinStatusPill.textContent = 'Incorrect PIN. Try again.';
    }

    setTimeout(() => {
      enteredPin = '';
      updatePinDots();
      if (pinDotsWrap) pinDotsWrap.classList.remove('is-error');
      if (pinStatusPill) {
        pinStatusPill.className = 'pin-status-pill pin-hint';
        pinStatusPill.textContent = 'hint: our favourite number';
      }
      isVerifying = false;
    }, 600);
  }
}

function resetPinScene(){
  enteredPin = '';
  pinLocked = true;
  isVerifying = false;
  if (pinCard) pinCard.classList.remove('is-unlocked');
  const s3 = (window.GIFT_DATA && window.GIFT_DATA.scenes && window.GIFT_DATA.scenes.scene3_pinLock) || {};
  if (pinInstruction) pinInstruction.textContent = s3.instruction || 'enter the code to unlock it';
  if (pinStatusPill){
    pinStatusPill.className = 'pin-status-pill pin-hint';
    pinStatusPill.textContent = s3.hint || 'hint: our favourite number';
  }
  updatePinDots();
}

function playScene3(){
  if (!scene3) return;
  hideTreeCanvas();
  resetPinScene();
  scene3.classList.add('is-active');
  scene3.setAttribute('aria-hidden', 'false');
  startClock();

  if (reduceMotion){
    if (pinCard) gsap.set(pinCard, { opacity: 1, y: 0, scale: 1 });
    return;
  }

  if (pinCard){
    gsap.fromTo(pinCard,
      { opacity: 0, y: 20, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power2.out', delay: 0.15 }
    );
  }
}

/* Keypad Clicks */
if (pinKeypad){
  pinKeypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.keypad-btn');
    if (!btn) return;
    const key = btn.dataset.key;
    const action = btn.dataset.action;
    if (key !== undefined){
      handleDigitInput(key);
    } else if (action === 'delete'){
      handleDeleteDigit();
    }
  });
}

/* Physical Keyboard */
window.addEventListener('keydown', (e) => {
  if (!scene3 || !scene3.classList.contains('is-active') || !pinLocked) return;
  if (e.key >= '0' && e.key <= '9'){
    handleDigitInput(e.key);
  } else if (e.key === 'Backspace' || e.key === 'Delete'){
    handleDeleteDigit();
  }
});

if (scene3){
  scene3.addEventListener('click', (e) => {
    if (e.target && e.target.closest && e.target.closest('.keypad-btn')) {
      return;
    }
  });
}

/* ============================================================
   SCENE 4 — THEATRICAL CURTAIN REVEAL CONTROLLER
   ============================================================ */
const scene4          = $('scene4');
const openCurtainsBtn = $('openCurtainsBtn');

function openCurtains(){
  if (!scene4 || scene4.classList.contains('curtains-open')) return;
  scene4.classList.add('curtains-open');

  // Curtain-open motion acts as direct entry transition into Scene 5 (Cake & Countdown)
  const delay = reduceMotion ? 100 : 1600;
  setTimeout(() => {
    goToScene(5);
  }, delay);
}

function closeCurtains(){
  if (!scene4) return;
  scene4.classList.remove('curtains-open');
}

if (openCurtainsBtn){
  openCurtainsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openCurtains();
  });
}
if (scene4){
  scene4.addEventListener('click', () => {
    const isCurtainsOpen = scene4.classList.contains('curtains-open');
    if (!isCurtainsOpen){
      openCurtains();
    }
  });
}

/* ============================================================
   SCENE 5 — BIRTHDAY CAKE & LIFETIME COUNTDOWN CONTROLLER
   ============================================================ */
// Birthdate configuration (defaults to 20 years ago or from GIFT_DATA)
let BIRTHDATE_STR = (window.GIFT_DATA && window.GIFT_DATA.scenes && window.GIFT_DATA.scenes.scene5_cakeCountdown && window.GIFT_DATA.scenes.scene5_cakeCountdown.birthDate) || '2006-01-01T00:00:00Z';

const scene5          = $('scene5');
const statYears       = $('statYears');
const statDays        = $('statDays');
const statHours       = $('statHours');
const statMinutes     = $('statMinutes');
const cakeWrap        = $('cakeWrap');
const candleDigit0    = $('candleDigit0');
const candleDigit1    = $('candleDigit1');
const cakePromptUI    = $('cakePromptUI');
const cakeSuccessUI   = $('cakeSuccessUI');
const cakeRelightBtn  = $('cakeRelightBtn');
const cakeMicBtn      = $('cakeMicBtn');
const cakeMicLabel    = $('cakeMicLabel');
const nextScene5      = $('nextScene5');
const cakeConfettiWrap= $('cakeConfettiWrap');

let cakeBlown = false;
let statsInterval = 0;
let micActive = false;
let micStream = null;
let micAudioCtx = null;
let micAnalyser = null;
let micAnimId = 0;

function calculateLifetimeStats(){
  const birthdate = new Date(BIRTHDATE_STR);
  const now = new Date();

  let years = now.getFullYear() - birthdate.getFullYear();
  const m = now.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthdate.getDate())) {
    years--;
  }

  const elapsedMs = Math.max(0, now.getTime() - birthdate.getTime());
  const days    = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const hours   = Math.floor(elapsedMs / (1000 * 60 * 60));
  const minutes = Math.floor(elapsedMs / (1000 * 60));

  const fmt = (n) => new Intl.NumberFormat().format(n);

  if (statYears)   statYears.textContent   = fmt(years);
  if (statDays)    statDays.textContent    = fmt(days);
  if (statHours)   statHours.textContent   = fmt(hours);
  if (statMinutes) statMinutes.textContent = fmt(minutes);

  // Set candle digits to age (e.g. 20 -> '2' and '0')
  const ageStr = Math.max(0, years).toString().padStart(2, '0');
  if (candleDigit0) candleDigit0.textContent = ageStr[ageStr.length - 2] || '2';
  if (candleDigit1) candleDigit1.textContent = ageStr[ageStr.length - 1] || '0';
}

function triggerCakeConfetti(){
  if (!cakeConfettiWrap) return;
  cakeConfettiWrap.innerHTML = '';

  const colors = ['#ffcf6a', '#e8a23d', '#d4235c', '#ff5f86', '#fff3ea', '#a80f43'];
  const shapes = ['circle', 'square', 'heart', 'star'];
  const count = reduceMotion ? 15 : 60;

  for (let i = 0; i < count; i++){
    const p = document.createElement('div');
    p.className = 'cake-confetti-p';

    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = Math.floor(Math.random() * 8) + 8; // 8 - 15px

    if (shape === 'heart'){
      p.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    } else if (shape === 'star'){
      p.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
    } else {
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.background = color;
      p.style.borderRadius = shape === 'circle' ? '50%' : '2px';
    }

    p.style.left = '50%';
    p.style.top = '50%';
    cakeConfettiWrap.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 220;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 40;
    const rot = (Math.random() - 0.5) * 720;
    const duration = 1.4 + Math.random() * 1.0;

    gsap.fromTo(p,
      { x: 0, y: 0, scale: 0.1, opacity: 1 },
      {
        x: tx,
        y: ty + 40,
        rotation: rot,
        scale: 1,
        opacity: 0,
        duration: duration,
        ease: 'power2.out',
        onComplete: () => p.remove()
      }
    );
  }
}

function stopMic(){
  if (micAnimId) {
    cancelAnimationFrame(micAnimId);
    micAnimId = 0;
  }
  if (micStream){
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }
  if (micAudioCtx){
    try { micAudioCtx.close(); } catch(e) {}
    micAudioCtx = null;
  }
  micAnalyser = null;
  micActive = false;
  if (cakeMicBtn) cakeMicBtn.classList.remove('is-active');
  if (cakeMicLabel) cakeMicLabel.textContent = 'Blow with your breath';
}

async function startMic(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStream = stream;
    micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    micAnalyser = micAudioCtx.createAnalyser();

    const source = micAudioCtx.createMediaStreamSource(stream);
    source.connect(micAnalyser);
    micAnalyser.fftSize = 256;

    const bufferLength = micAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    micActive = true;
    if (cakeMicBtn) cakeMicBtn.classList.add('is-active');
    if (cakeMicLabel) cakeMicLabel.textContent = 'Listening for breath...';

    function checkVolume(){
      if (!micAnalyser || cakeBlown) return;
      micAnalyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < 20; i++){
        sum += dataArray[i];
      }
      const avg = sum / 20;

      if (avg > 115 && !cakeBlown){
        blowCandles();
      } else {
        micAnimId = requestAnimationFrame(checkVolume);
      }
    }

    checkVolume();
  } catch (err){
    console.warn('Microphone access not granted or supported. Tap to blow is active.', err);
    if (cakeMicLabel) cakeMicLabel.textContent = 'Tap cake to blow';
    setTimeout(() => {
      if (cakeMicLabel) cakeMicLabel.textContent = 'Blow with your breath';
    }, 2000);
    stopMic();
  }
}

function blowCandles(){
  if (cakeBlown) return;
  cakeBlown = true;
  stopMic();

  if (cakeWrap){
    cakeWrap.classList.add('is-blown');
  }

  // Trigger celebratory confetti burst
  triggerCakeConfetti();

  // Hide prompt UI, reveal wish success UI
  if (cakePromptUI){
    cakePromptUI.style.opacity = '0';
    cakePromptUI.style.pointerEvents = 'none';
  }

  const delay = reduceMotion ? 100 : 900;
  setTimeout(() => {
    if (cakePromptUI) cakePromptUI.hidden = true;
    if (cakeSuccessUI){
      cakeSuccessUI.hidden = false;
    }
    if (nextScene5){
      nextScene5.hidden = false;
      requestAnimationFrame(() => nextScene5.classList.add('is-shown'));
    }
  }, delay);
}

function relightCake(){
  cakeBlown = false;
  if (cakeWrap){
    cakeWrap.classList.remove('is-blown');
  }
  if (cakeSuccessUI){
    cakeSuccessUI.hidden = true;
  }
  if (cakePromptUI){
    cakePromptUI.hidden = false;
    cakePromptUI.style.opacity = '1';
    cakePromptUI.style.pointerEvents = 'auto';
  }
  if (nextScene5){
    nextScene5.classList.remove('is-shown');
    nextScene5.hidden = true;
  }
}

function playScene5(){
  hideTreeCanvas();
  calculateLifetimeStats();
  if (statsInterval) clearInterval(statsInterval);
  statsInterval = setInterval(calculateLifetimeStats, 60000);

  // Reset blown state for fresh viewing if needed
  relightCake();

  const cakeCard = document.querySelector('.cake-card');
  if (reduceMotion){
    if (cakeCard) gsap.set(cakeCard, { opacity: 1, y: 0, scale: 1 });
    return;
  }

  if (cakeCard){
    gsap.fromTo(cakeCard,
      { opacity: 0, y: 22, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power2.out', delay: 0.15 }
    );
  }
}

// Event Listeners for Scene 5
if (cakeWrap){
  cakeWrap.addEventListener('click', () => {
    if (!cakeBlown) blowCandles();
  });
  cakeWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      if (!cakeBlown) blowCandles();
    }
  });
}

if (cakeMicBtn){
  cakeMicBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (micActive) {
      stopMic();
    } else {
      startMic();
    }
  });
}

if (cakeRelightBtn){
  cakeRelightBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    relightCake();
  });
}

if (scene5){
  scene5.addEventListener('click', (e) => {
    if (e.target && e.target.closest && e.target.closest('#cakeMicBtn, #cakeRelightBtn')) {
      return;
    }
    if (!cakeBlown){
      blowCandles();
    } else {
      goToScene(6);
    }
  });
}
if (nextScene5){
  nextScene5.addEventListener('click', (e) => {
    e.stopPropagation();
    goToScene(6);
  });
}

/* ============================================================
   SCENE 6 — THE MEMORY WALL CONTROLLER
   ============================================================ */
const scene6           = $('scene6');
const memoryWipe       = $('memoryWipe');
const memoryEyebrow    = $('memoryEyebrow');
const memoryBoardWrap  = $('memoryBoardWrap');
const memoryBoard      = $('memoryBoard');
const memoryTwineSvg   = $('memoryTwineSvg');
const memoryTwinePath  = $('memoryTwinePath');
const memoryClosing    = $('memoryClosing');
const nextScene6       = $('nextScene6');
const memoryFrames     = memoryBoard ? Array.from(memoryBoard.querySelectorAll('.memory-frame')) : [];
let scene6Timeline     = null;

function resetScene6(){
  if (scene6Timeline){
    scene6Timeline.kill();
    scene6Timeline = null;
  }
  memoryFrames.forEach(f => {
    f.classList.remove('has-ambient');
    const tilt = parseFloat(f.dataset.tilt || 0);
    gsap.set(f, { opacity: 0, x: 0, y: 0, rotation: tilt, scale: 1 });
  });
  if (memoryWipe) gsap.set(memoryWipe, { opacity: 0 });
  if (memoryEyebrow) gsap.set(memoryEyebrow, { opacity: 0, y: -12 });
  if (memoryTwinePath) {
    memoryTwinePath.removeAttribute('d');
    memoryTwinePath.style.strokeDasharray = 'none';
    memoryTwinePath.style.strokeDashoffset = '0';
  }
  if (memoryClosing){
    const inner = memoryClosing.querySelector('.memory-closing-inner');
    if (inner) gsap.set(inner, { opacity: 0, rotateX: -80, y: 20 });
  }
  if (nextScene6){
    nextScene6.classList.remove('is-shown');
    nextScene6.hidden = true;
  }
}

function updateTwinePath(){
  if (!memoryTwineSvg || !memoryTwinePath || !memoryBoardWrap) return 0;
  const svgRect = memoryTwineSvg.getBoundingClientRect();
  if (svgRect.width === 0 || svgRect.height === 0) return 0;

  // Connecting order through the 6 frames (snaking top-left -> top-right -> mid-right -> mid-left -> bottom-left -> bottom-right)
  const sequence = [0, 1, 3, 2, 4, 5];
  const points = [];

  sequence.forEach(idx => {
    const frame = memoryFrames[idx];
    if (!frame) return;
    const pin = frame.querySelector('.frame-pin');
    if (!pin) return;
    const pinRect = pin.getBoundingClientRect();
    const px = pinRect.left + pinRect.width / 2 - svgRect.left;
    const py = pinRect.top + pinRect.height / 2 - svgRect.top;
    points.push({ x: px, y: py });
  });

  if (points.length < 2) return 0;

  // Build catenary curve with natural gentle droop between pins
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++){
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const droop = Math.min(26, Math.max(10, dist * 0.08));
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2 + droop;
    d += ` Q ${cx.toFixed(1)},${cy.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  memoryTwinePath.setAttribute('d', d);
  try {
    return memoryTwinePath.getTotalLength();
  } catch (e) {
    return 0;
  }
}

function activateAmbientSway(){
  if (reduceMotion) return;
  memoryFrames.forEach(f => {
    const tilt = f.dataset.tilt || '0';
    f.style.setProperty('--base-tilt', `${tilt}deg`);
    f.classList.add('has-ambient');
  });
}

function revealClosingHeadline(){
  const inner = memoryClosing ? memoryClosing.querySelector('.memory-closing-inner') : null;
  if (!inner) return;

  if (reduceMotion){
    inner.style.opacity = '1';
    inner.style.transform = 'none';
    if (nextScene6){
      nextScene6.hidden = false;
      nextScene6.classList.add('is-shown');
    }
    return;
  }

  gsap.fromTo(inner,
    { opacity: 0, rotateX: -80, y: 20 },
    {
      opacity: 1,
      rotateX: 0,
      y: 0,
      duration: 0.9,
      ease: 'back.out(1.4)',
      onComplete: () => {
        if (nextScene6){
          nextScene6.hidden = false;
          requestAnimationFrame(() => nextScene6.classList.add('is-shown'));
        }
        activateAmbientSway();
      }
    }
  );
}

function playScene6(){
  if (!scene6) return;
  hideTreeCanvas();
  resetScene6();

  // Initialize frame base tilts and hide initial ambient motion
  memoryFrames.forEach(f => {
    const tilt = f.dataset.tilt || '0';
    f.style.setProperty('--base-tilt', `${tilt}deg`);
    f.classList.remove('has-ambient');
  });

  if (reduceMotion){
    if (memoryEyebrow) gsap.set(memoryEyebrow, { opacity: 1, y: 0 });
    memoryFrames.forEach(f => {
      const tilt = parseFloat(f.dataset.tilt || 0);
      gsap.set(f, { opacity: 1, x: 0, y: 0, rotation: tilt, scale: 1 });
    });
    updateTwinePath();
    if (memoryTwinePath) {
      memoryTwinePath.style.strokeDasharray = 'none';
      memoryTwinePath.style.strokeDashoffset = '0';
    }
    revealClosingHeadline();
    return;
  }

  // Master timeline for Scene 6
  scene6Timeline = gsap.timeline();
  const tl = scene6Timeline;

  // 1. Soft Light Wipe Transition entering Scene 6
  if (memoryWipe){
    tl.fromTo(memoryWipe,
      { opacity: 0, scale: 1.08 },
      { opacity: 0.92, scale: 1.0, duration: 0.55, ease: 'power1.inOut' }
    )
    .to(memoryWipe, {
      opacity: 0,
      scale: 0.96,
      duration: 0.65,
      ease: 'power2.out',
      delay: 0.05
    });
  }

  // 2. Eyebrow reveals softly
  if (memoryEyebrow){
    tl.fromTo(memoryEyebrow,
      { opacity: 0, y: -12 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
      '-=0.35'
    );
  }

  // 3. Off-screen flight coordinates for each frame
  const origins = [
    { x: -window.innerWidth * 0.7, y: -250, r: -35 },
    { x: window.innerWidth * 0.7, y: -200, r: 35 },
    { x: -window.innerWidth * 0.8, y: 80, r: -25 },
    { x: window.innerWidth * 0.8, y: 120, r: 35 },
    { x: -window.innerWidth * 0.6, y: 350, r: -20 },
    { x: window.innerWidth * 0.6, y: 400, r: 25 }
  ];

  // 4. Frames fly in one by one and settle with overshoot
  memoryFrames.forEach((frame, i) => {
    const origin = origins[i] || { x: 0, y: -300, r: 0 };
    const tilt = parseFloat(frame.dataset.tilt || 0);

    tl.fromTo(frame,
      {
        opacity: 0,
        x: origin.x,
        y: origin.y,
        rotation: origin.r,
        scale: 0.65
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        rotation: tilt,
        scale: 1,
        duration: 0.75,
        ease: 'back.out(1.5)'
      },
      `-=${i === 0 ? 0.2 : 0.45}`
    );
  });

  // 5. Draw connecting twine stroke-by-stroke across settled pins
  tl.call(() => {
    const length = updateTwinePath();
    if (length && length > 0){
      memoryTwinePath.style.strokeDasharray = length;
      memoryTwinePath.style.strokeDashoffset = length;
      gsap.to(memoryTwinePath, {
        strokeDashoffset: 0,
        duration: 1.8,
        ease: 'power2.inOut',
        onComplete: revealClosingHeadline
      });
    } else {
      revealClosingHeadline();
    }
  });
}

// Window resize listener to keep twine aligned if dimensions change
let twineResizeRAF = 0;
window.addEventListener('resize', () => {
  if (twineResizeRAF) return;
  twineResizeRAF = requestAnimationFrame(() => {
    twineResizeRAF = 0;
    if (scene6 && scene6.classList.contains('is-active')){
      const len = updateTwinePath();
      if (len && memoryTwinePath){
        memoryTwinePath.style.strokeDasharray = 'none';
        memoryTwinePath.style.strokeDashoffset = '0';
      }
    }
  });
});

if (scene6){
  scene6.addEventListener('click', () => {
    if (nextScene6 && nextScene6.classList.contains('is-shown')){
      goToScene(7);
    } else {
      revealClosingHeadline();
    }
  });
}
if (nextScene6){
  nextScene6.addEventListener('click', (e) => {
    e.stopPropagation();
    goToScene(7);
  });
}

/* ============================================================
   MASTER SCENE ORCHESTRATOR
   Chain: Act 1 -> Scene 2 (Gift Box) -> Scene 3 (PIN Lock) -> Scene 4 (Curtains) -> Scene 5 (Cake) -> Scene 6 (Memory Wall) -> Scene 7 (Confetti Cannon)
   ============================================================ */
let currentSceneNum = 1;
let sceneTransitioning = false;
let sceneEntryTime = Date.now();

function deactivateAllScenesExcept(targetScene){
  // Scene 1 / Act 1
  if (targetScene !== 1){
    stopMotes();
    treeStop();
    showWish(false);
    hideTreeCanvas();
    if (replay){
      replay.classList.remove('is-shown', 'has-next');
      replay.hidden = true;
    }
    if (nextScene1){
      nextScene1.classList.remove('is-shown');
      nextScene1.hidden = true;
    }
  }

  // Scene 2
  if (targetScene !== 2){
    giftOpened = false;
    if (scene2){
      scene2.classList.remove('is-active', 'gift-open');
      scene2.setAttribute('aria-hidden', 'true');
    }
    if (nextScene2){
      nextScene2.classList.remove('is-shown');
      nextScene2.hidden = true;
    }
  }

  // Scene 3
  if (targetScene !== 3){
    if (scene3){
      scene3.classList.remove('is-active', 'pin-unlocked');
      scene3.setAttribute('aria-hidden', 'true');
    }
    stopClock();
    resetPinScene();
  }

  // Scene 4
  if (targetScene !== 4){
    if (scene4){
      scene4.classList.remove('is-active', 'curtains-open');
      scene4.setAttribute('aria-hidden', 'true');
    }
    closeCurtains();
  }

  // Scene 5
  if (targetScene !== 5){
    if (scene5){
      scene5.classList.remove('is-active', 'candles-out');
      scene5.setAttribute('aria-hidden', 'true');
    }
    stopMic();
    if (statsInterval){
      clearInterval(statsInterval);
      statsInterval = 0;
    }
    if (nextScene5){
      nextScene5.classList.remove('is-shown');
      nextScene5.hidden = true;
    }
    relightCake();
  }

  // Scene 6
  if (targetScene !== 6){
    if (scene6){
      scene6.classList.remove('is-active');
      scene6.setAttribute('aria-hidden', 'true');
    }
    resetScene6();
  }

  // Scene 7
  if (targetScene !== 7){
    if (scene7){
      scene7.classList.remove('is-active');
      scene7.setAttribute('aria-hidden', 'true');
    }
    resetScene7();
  }

  // Scene 8
  if (targetScene !== 8){
    if (scene8){
      scene8.classList.remove('is-active');
      scene8.setAttribute('aria-hidden', 'true');
    }
    resetBalloonScene();
  }

  // Scene 9
  if (targetScene !== 9){
    if (scene9){
      scene9.classList.remove('is-active');
      scene9.setAttribute('aria-hidden', 'true');
    }
    resetScene9();
  }

  // Scene 10
  if (targetScene !== 10){
    if (scene10){
      scene10.classList.remove('is-active');
      scene10.setAttribute('aria-hidden', 'true');
    }
    resetScene10();
  }

  // Scene 11
  if (targetScene !== 11){
    if (scene11){
      scene11.classList.remove('is-active');
      scene11.setAttribute('aria-hidden', 'true');
    }
    resetScene11();
  }
}

function goToScene(sceneNum, force = false){
  if (sceneTransitioning && !force) return;

  sceneTransitioning = true;
  currentSceneNum = sceneNum;
  sceneEntryTime = Date.now();
  const guardTime = reduceMotion ? 100 : 800;
  setTimeout(() => { sceneTransitioning = false; }, guardTime);

  // Toggle night-mode on music button
  if (musicToggleBtn){
    const nightScenes = [7, 10];
    musicToggleBtn.classList.toggle('night-mode', nightScenes.includes(sceneNum));
  }

  // Deactivate and clean all other scenes
  deactivateAllScenesExcept(sceneNum);

  if (sceneNum === 1){
    resetAll();
  } else if (sceneNum === 2){
    if (scene2){
      scene2.classList.add('is-active');
      scene2.setAttribute('aria-hidden', 'false');

      if (!reduceMotion){
        if (giftHeader){
          gsap.fromTo(giftHeader,
            { opacity: 0, y: -18 },
            { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out', delay: 0.1 }
          );
        }
        if (giftBoxWrap){
          gsap.fromTo(giftBoxWrap,
            { opacity: 0, scale: 0.92, y: 22 },
            { opacity: 1, scale: 1, y: 0, duration: 1.0, ease: 'power2.out', delay: 0.2 }
          );
        }
      }
    }
  } else if (sceneNum === 3){
    playScene3();
  } else if (sceneNum === 4){
    if (scene4){
      scene4.classList.add('is-active');
      scene4.setAttribute('aria-hidden', 'false');
      closeCurtains();
      if (reduceMotion){
        openCurtains();
      }
    }
  } else if (sceneNum === 5){
    if (scene5){
      scene5.classList.add('is-active');
      scene5.setAttribute('aria-hidden', 'false');
      playScene5();
    }
  } else if (sceneNum === 6){
    if (scene6){
      scene6.classList.add('is-active');
      scene6.setAttribute('aria-hidden', 'false');
      playScene6();
    }
  } else if (sceneNum === 7){
    if (scene7){
      scene7.classList.add('is-active');
      scene7.setAttribute('aria-hidden', 'false');
      playScene7();
    }
  } else if (sceneNum === 8){
    if (scene8){
      scene8.classList.add('is-active');
      scene8.setAttribute('aria-hidden', 'false');
      playScene8();
    }
  } else if (sceneNum === 9){
    if (scene9){
      scene9.classList.add('is-active');
      scene9.setAttribute('aria-hidden', 'false');
      playScene9();
    }
  } else if (sceneNum === 10){
    if (scene10){
      scene10.classList.add('is-active');
      scene10.setAttribute('aria-hidden', 'false');
      playScene10();
    }
  } else if (sceneNum === 11){
    if (scene11){
      scene11.classList.add('is-active');
      scene11.setAttribute('aria-hidden', 'false');
      playScene11();
    }
  }
}

function handleGlobalTap(e){
  if (sceneTransitioning) return;

  // Ignore interactions on specific controls
  if (e && e.target && e.target.closest){
    if (e.target.closest('#replay, #btnReplayAll, .keypad-btn, #cakeMicBtn, #cakeRelightBtn, #musicToggleBtn')) {
      return;
    }
  }

  // Prevent accidental tap immediately upon entering a scene (within 400ms)
  if (Date.now() - sceneEntryTime < 400) return;

  if (currentSceneNum === 1){
    // Act 1: If tree is blooming / wish shown / replay armed, tap anywhere goes to Scene 2
    if (replayArmed || window.bdayDone || (nextScene1 && nextScene1.classList.contains('is-shown'))){
      goToScene(2);
    }
  } else if (currentSceneNum === 2){
    if (!giftOpened){
      openGiftBox();
    } else {
      goToScene(3);
    }
  } else if (currentSceneNum === 3){
    return;
  } else if (currentSceneNum === 4){
    const isCurtainsOpen = scene4 && scene4.classList.contains('curtains-open');
    if (!isCurtainsOpen){
      openCurtains();
    } else {
      goToScene(5);
    }
  } else if (currentSceneNum === 5){
    if (!cakeBlown){
      blowCandles();
    } else {
      goToScene(6);
    }
  } else if (currentSceneNum === 6){
    if (nextScene6 && nextScene6.classList.contains('is-shown')){
      goToScene(7);
    } else {
      revealClosingHeadline();
    }
  } else if (currentSceneNum === 7){
    if (nextScene7 && nextScene7.classList.contains('is-shown')){
      goToScene(8);
    } else {
      revealClimaxHeadline();
    }
  } else if (currentSceneNum === 8){
    const closingBlock = $('balloonClosingBlock');
    if (closingBlock && !closingBlock.hidden){
      goToScene(9);
    }
  } else if (currentSceneNum === 9){
    handleScene9Tap(e);
  } else if (currentSceneNum === 10){
    if (fwSettled || (nextScene10 && nextScene10.classList.contains('is-shown'))){
      goToScene(11);
    }
  } else if (currentSceneNum === 11){
    // Permanent resting state — no tap-anywhere advance
    return;
  }
}

// Global window tap and keydown listeners for "tap anywhere to next"
window.addEventListener('pointerup', (e) => {
  if (currentSceneNum === 1){
    if (e && e.target && e.target.closest && e.target.closest('#archery')) return;
    if (replayArmed || window.bdayDone || (nextScene1 && nextScene1.classList.contains('is-shown'))){
      goToScene(2);
    }
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight'){
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (currentSceneNum === 3 && pinLocked) return;
    handleGlobalTap(e);
  }
});

/* ============================================================
   SCENE 7 — VINTAGE FILM-STRIP CONTROLLER
   ============================================================ */
const scene7              = $('scene7');
const projectorFlash      = $('projectorFlash');
const filmViewport        = $('filmViewport');
const filmStrip           = $('filmStrip');
const filmFramesWrap      = $('filmFrames');
const filmFrames          = filmFramesWrap ? Array.from(filmFramesWrap.querySelectorAll('.film-frame')) : [];
const filmClimaxHeadline  = $('filmClimaxHeadline');
const nextScene7          = $('nextScene7');

let filmScrollTween = null;
let filmAmbientTween = null;

function pauseScene7Videos(){
  if (!scene7) return;
  const videos = scene7.querySelectorAll('.user-clip-video');
  videos.forEach(v => {
    try { v.pause(); } catch(e){}
  });
}

function playScene7Videos(){
  if (!scene7) return;
  const videos = scene7.querySelectorAll('.user-clip-video');
  videos.forEach(v => {
    try {
      v.muted = true;
      v.play().catch(() => {});
    } catch(e){}
  });
}

function resetScene7(){
  if (filmScrollTween) { filmScrollTween.kill(); filmScrollTween = null; }
  if (filmAmbientTween) { filmAmbientTween.kill(); filmAmbientTween = null; }
  pauseScene7Videos();
  if (filmClimaxHeadline){
    filmClimaxHeadline.classList.remove('is-burned-in');
  }
  if (projectorFlash){
    gsap.set(projectorFlash, { opacity: 0 });
  }
  if (filmStrip){
    gsap.set(filmStrip, { y: 60 });
  }
  filmFrames.forEach(f => f.classList.remove('is-focused'));
  if (nextScene7){
    nextScene7.classList.remove('is-shown');
    nextScene7.hidden = true;
  }
}

function triggerProjectorFlicker(onDone){
  if (!projectorFlash || reduceMotion){
    if (onDone) onDone();
    return;
  }
  // Authentic 24fps cinema projector lamp warmup & shutter flicker (1.20s total)
  const tl = gsap.timeline({ onComplete: onDone });
  tl.set(projectorFlash, { opacity: 0 })
    .to(projectorFlash, { opacity: 0.85, duration: 0.20, ease: 'power2.inOut' })
    .to(projectorFlash, { opacity: 0.15, duration: 0.16 })
    .to(projectorFlash, { opacity: 0.70, duration: 0.18 })
    .to(projectorFlash, { opacity: 0.10, duration: 0.14 })
    .to(projectorFlash, { opacity: 0.40, duration: 0.16 })
    .to(projectorFlash, { opacity: 0, duration: 0.36, ease: 'power2.out' });
}

function checkFrameFocus(){
  if (!filmViewport) return;
  const vpRect = filmViewport.getBoundingClientRect();
  const vpCenter = vpRect.top + vpRect.height / 2;
  const tolerance = vpRect.height * 0.24;

  filmFrames.forEach(f => {
    const fRect = f.getBoundingClientRect();
    const fCenter = fRect.top + fRect.height / 2;
    const dist = Math.abs(fCenter - vpCenter);
    if (dist < tolerance){
      f.classList.add('is-focused');
    } else {
      f.classList.remove('is-focused');
    }
  });
}

function revealClimaxHeadline(){
  if (!filmClimaxHeadline) return;

  if (reduceMotion){
    filmClimaxHeadline.classList.add('is-burned-in');
    if (nextScene7){
      nextScene7.hidden = false;
      nextScene7.classList.add('is-shown');
    }
    return;
  }

  filmClimaxHeadline.classList.add('is-burned-in');

  setTimeout(() => {
    if (nextScene7){
      nextScene7.hidden = false;
      requestAnimationFrame(() => nextScene7.classList.add('is-shown'));
    }
    startAmbientFilmDrift();
  }, 1000);
}

function startAmbientFilmDrift(){
  if (reduceMotion || !filmStrip) return;
  filmAmbientTween = gsap.to(filmStrip, {
    y: '+=14',
    duration: 3.4,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });
}

function playScene7(){
  if (!scene7) return;
  hideTreeCanvas();
  resetScene7();
  playScene7Videos();

  if (reduceMotion){
    const f4 = $('fFrame4');
    if (f4 && filmViewport && filmStrip){
      const targetY = -(f4.offsetTop - (filmViewport.offsetHeight / 2 - f4.offsetHeight / 2));
      gsap.set(filmStrip, { y: targetY });
      f4.classList.add('is-focused');
    }
    revealClimaxHeadline();
    return;
  }

  gsap.set(filmStrip, { y: 60 });

  triggerProjectorFlicker(() => {
    const f4 = $('fFrame4');
    if (!f4 || !filmViewport || !filmStrip) {
      revealClimaxHeadline();
      return;
    }

    const targetY = -(f4.offsetTop - (filmViewport.offsetHeight / 2 - f4.offsetHeight / 2));

    filmScrollTween = gsap.to(filmStrip, {
      y: targetY,
      duration: 6.0,
      ease: 'power1.inOut',
      onUpdate: checkFrameFocus,
      onComplete: () => {
        f4.classList.add('is-focused');
        revealClimaxHeadline();
      }
    });
  });
}

if (scene7){
  scene7.addEventListener('click', () => {
    if (nextScene7 && nextScene7.classList.contains('is-shown')){
      goToScene(8);
    } else {
      revealClimaxHeadline();
    }
  });
}
if (nextScene7){
  nextScene7.addEventListener('click', (e) => {
    e.stopPropagation();
    goToScene(8);
  });
}

/* ============================================================
   SCENE 8 — BALLOON POP (POP THE WISHES) CONTROLLER
   ============================================================ */
const scene8               = $('scene8');
const balloonToastMsg      = $('balloonToastMsg');
const balloonsGrid         = $('balloonsGrid');
const balloonCounterText   = $('balloonCounterText');
const balloonClosingBlock  = $('balloonClosingBlock');
const nextScene8           = $('nextScene8') || $('btnNextToScene9');
const balloonResetBtn      = $('balloonResetBtn');

let balloonToastTimer = null;
let balloonsPoppedCount = 0;

function getBalloonPalette() {
  const isGlass = document.documentElement.getAttribute('data-theme') === 'glass' || (window.GIFT_DATA && window.GIFT_DATA.themeId === 'glass');
  if (isGlass) {
    return [
      '#e03368', // Rose lift
      '#f5b838', // Gold 1
      '#d4235c', // Rose
      '#841940', // Wine
      '#fce18b', // Light gold
      '#ff7597'  // Pink highlight
    ];
  }
  return [
    '#e85987', // Rose lift
    '#f5b838', // Gold 1
    '#d4235c', // Rose
    '#6e0a31', // Wine
    '#e8a23d', // Gold 2
    '#f472b6'  // Warm petal
  ];
}

function showBalloonToast(msg) {
  const toast = $('balloonToastMsg');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');

  if (balloonToastTimer) clearTimeout(balloonToastTimer);
  balloonToastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function createBurstParticles(container, color) {
  if (reduceMotion) return;
  const particleCount = 8;
  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.className = 'balloon-particle';
    p.style.backgroundColor = color;
    p.style.left = '50%';
    p.style.top = '40%';

    const angle = (i * (360 / particleCount)) * (Math.PI / 180);
    const distance = 35 + Math.random() * 25;
    p.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
    p.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);

    container.appendChild(p);
    setTimeout(() => p.remove(), 650);
  }
}

function resetBalloonScene() {
  if (balloonToastTimer) {
    clearTimeout(balloonToastTimer);
    balloonToastTimer = null;
  }
  const toast = $('balloonToastMsg');
  if (toast) toast.classList.remove('show');

  const closingBlock = $('balloonClosingBlock');
  if (closingBlock) {
    closingBlock.hidden = true;
  }
  balloonsPoppedCount = 0;
  const counterText = $('balloonCounterText');
  if (counterText) counterText.textContent = 'Popped 0/6';
}

function renderBalloons() {
  const grid = $('balloonsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  resetBalloonScene();

  const gd = window.GIFT_DATA || {};
  const s8 = gd.scenes?.scene8_balloonPop || gd.scenes?.scene8_constellation || {};
  const defaultMessages = [
    "May your smiles be endless! 😊",
    "Wishing you all the success! 🌟",
    "Stay as amazing as you are! 💙",
    "Dream big and fly high! 🚀",
    "Health and happiness always! 🍀",
    "Lots and lots of love! ❤️"
  ];
  const messages = (Array.isArray(s8.messages) && s8.messages.length === 6)
    ? s8.messages
    : (Array.isArray(s8.captions) && s8.captions.length === 6 ? s8.captions : defaultMessages);

  const palette = getBalloonPalette();

  messages.forEach((msg, index) => {
    const slot = document.createElement('div');
    slot.className = 'balloon-slot';

    const color = palette[index % palette.length];

    const balloon = document.createElement('div');
    balloon.className = 'balloon';
    balloon.style.backgroundColor = color;
    balloon.style.animationDelay = (index * 0.42) + 's';
    balloon.setAttribute('role', 'button');
    balloon.setAttribute('tabindex', '0');
    balloon.setAttribute('aria-label', `Pop balloon ${index + 1}`);

    balloon.innerHTML = `
      <div class="balloon-glare" aria-hidden="true"></div>
      <div class="balloon-knot" style="background-color: ${color}" aria-hidden="true"></div>
      <div class="balloon-string" aria-hidden="true"></div>
    `;

    const handlePop = (e) => {
      if (e) e.stopPropagation();
      if (balloon.classList.contains('popping') || balloon.style.display === 'none') return;
      popBalloon(balloon, slot, msg, color, messages.length);
    };

    balloon.addEventListener('click', handlePop);
    balloon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlePop(e);
      }
    });

    slot.appendChild(balloon);
    grid.appendChild(slot);
  });
}

function popBalloon(balloonEl, slotEl, message, color, totalCount) {

  if (reduceMotion) {
    balloonEl.style.display = 'none';
  } else {
    balloonEl.classList.add('popping');
    createBurstParticles(slotEl, color);
    setTimeout(() => {
      balloonEl.style.display = 'none';
    }, 170);
  }

  showBalloonToast(message);

  balloonsPoppedCount++;
  const counterText = $('balloonCounterText');
  if (counterText) counterText.textContent = `Popped ${balloonsPoppedCount}/${totalCount}`;

  if (balloonsPoppedCount >= totalCount) {
    const closingBlock = $('balloonClosingBlock');
    if (closingBlock) {
      setTimeout(() => {
        closingBlock.hidden = false;
        const btnNext = $('nextScene8') || $('btnNextToScene9');
        if (btnNext) {
          btnNext.classList.add('is-shown');
        }
      }, reduceMotion ? 100 : 450);
    }
  }
}

function playScene8() {
  if (!scene8) return;
  hideTreeCanvas();
  renderBalloons();
}

// Event Listeners for Scene 8 Action buttons and Tap-Anywhere to Continue
function attachScene8Listeners() {
  const resetBtn = $('balloonResetBtn');
  if (resetBtn && !resetBtn._hasScene8Listener) {
    resetBtn._hasScene8Listener = true;
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderBalloons();
    });
  }

  const btnNext = $('nextScene8') || $('btnNextToScene9');
  if (btnNext && !btnNext._hasScene8Listener) {
    btnNext._hasScene8Listener = true;
    btnNext.addEventListener('click', (e) => {
      e.stopPropagation();
      goToScene(9);
    });
  }

  const s8 = $('scene8');
  if (s8 && !s8._hasScene8TapListener) {
    s8._hasScene8TapListener = true;
    s8.addEventListener('click', (e) => {
      // Do not advance if user clicked the reset button, an active balloon, or its slot
      if (e && e.target && e.target.closest && e.target.closest('#balloonResetBtn, .balloon, .balloon-slot')) {
        return;
      }
      const closingBlock = $('balloonClosingBlock');
      if (closingBlock && !closingBlock.hidden) {
        goToScene(9);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', attachScene8Listeners);
attachScene8Listeners();

/* ============================================================
   SCENE 9 — ENVELOPE & TYPEWRITER LETTER CONTROLLER
   ============================================================ */
const scene9             = $('scene9');
const letterVeil         = $('letterVeil');
const envelopeWrapper    = $('envelopeWrapper');
const envelope           = $('envelope');
const envelopeFlap       = $('envelopeFlap');
const envelopeHeart      = $('envelopeHeart');
const envelopeHint       = $('envelopeHint');
const letterContainer    = $('letterContainer');
const letterCardScroll   = $('letterCardScroll');
const typewriterText     = $('typewriterText');
const nextScene9         = $('nextScene9');

let LETTER_TEXT =
  (window.GIFT_DATA && window.GIFT_DATA.scenes && window.GIFT_DATA.scenes.scene9_letter && window.GIFT_DATA.scenes.scene9_letter.message) ||
  "Dear troublemaker,\n\nThank you for every ridiculous memory and the ones we haven't made yet.\n\nHappy Birthday. I mean it.";

let typeWriterStarted    = false;
let typeWriterTimeoutId  = null;
let letterTimeline       = null;
let letterOpened         = false;
let envelopeOpeningTime  = 0;

function resetScene9(){
  if (typeWriterTimeoutId){
    clearTimeout(typeWriterTimeoutId);
    typeWriterTimeoutId = null;
  }
  if (letterTimeline){
    letterTimeline.kill();
    letterTimeline = null;
  }
  typeWriterStarted = false;
  letterOpened = false;
  envelopeOpeningTime = 0;

  // Reset envelope
  if (envelopeWrapper){
    envelopeWrapper.classList.remove('is-hidden');
    gsap.set(envelopeWrapper, { clearProps: 'all' });
  }
  if (envelopeFlap){
    gsap.set(envelopeFlap, { clearProps: 'all' });
  }
  if (envelopeHeart){
    gsap.set(envelopeHeart, { clearProps: 'all' });
  }

  // Reset letter card container & text
  if (letterContainer){
    letterContainer.classList.add('is-hidden');
    letterContainer.classList.remove('is-breathing');
    gsap.set(letterContainer, { clearProps: 'all' });
  }
  if (typewriterText){
    typewriterText.innerHTML = '';
  }
  if (letterCardScroll){
    letterCardScroll.scrollTop = 0;
  }

  // Reset cursor if exists
  const existingCursor = scene9 ? scene9.querySelector('.typewriter-cursor') : null;
  if (existingCursor){
    existingCursor.remove();
  }

  // Reset next button
  if (nextScene9){
    nextScene9.classList.remove('is-shown');
    nextScene9.hidden = true;
  }
}

function startTypewriter(){
  if (!typewriterText) return;
  typewriterText.innerHTML = '';
  const text = LETTER_TEXT;
  const speed = 36; // ms per character (readable 30-45ms)
  let i = 0;

  // Insert blinking cursor
  const existingCursor = scene9 ? scene9.querySelector('.typewriter-cursor') : null;
  if (existingCursor) existingCursor.remove();

  const cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  typewriterText.parentNode.appendChild(cursor);

  function type(){
    if (i < text.length){
      const char = text.charAt(i);
      if (char === '\n'){
        typewriterText.innerHTML += '<br>';
      } else {
        typewriterText.innerHTML += char;
      }
      i++;

      // Auto-scroll the letter container downward so growing text stays in view
      if (letterCardScroll){
        letterCardScroll.scrollTop = letterCardScroll.scrollHeight;
      }

      typeWriterTimeoutId = setTimeout(type, speed);
    } else {
      // Typing finished
      if (cursor && cursor.parentNode){
        cursor.remove();
      }
      typeWriterStarted = false; // unlock interaction

      // Start continuous ambient breathing shadow
      if (letterContainer){
        letterContainer.classList.add('is-breathing');
      }

      // Pop / fade in shared Next pill button
      if (nextScene9 && scene9 && scene9.classList.contains('is-active')){
        nextScene9.hidden = false;
        requestAnimationFrame(() => nextScene9.classList.add('is-shown'));
      }
    }
  }

  typeWriterTimeoutId = setTimeout(type, 200);
}

function openEnvelope(){
  // Guard: while typing or opening transition is in progress, ignore taps
  if (letterOpened || typeWriterStarted) return;
  letterOpened = true;
  envelopeOpeningTime = Date.now();
  typeWriterStarted = true;

  if (reduceMotion){
    if (envelopeWrapper){
      envelopeWrapper.classList.add('is-hidden');
    }
    if (letterContainer){
      letterContainer.classList.remove('is-hidden');
      letterContainer.classList.add('is-breathing');
    }
    if (typewriterText){
      typewriterText.innerHTML = LETTER_TEXT.replace(/\n/g, '<br>');
    }
    if (nextScene9){
      nextScene9.hidden = false;
      nextScene9.classList.add('is-shown');
    }
    typeWriterStarted = false;
    return;
  }

  letterTimeline = gsap.timeline();
  const tl = letterTimeline;

  // 1. Flap opens slightly and heart flares
  if (envelopeFlap){
    tl.to(envelopeFlap, {
      rotateX: 140,
      duration: 0.35,
      ease: 'power2.inOut'
    }, 0);
  }
  if (envelopeHeart){
    tl.to(envelopeHeart, {
      scale: 1.35,
      opacity: 0.9,
      duration: 0.25,
      ease: 'power2.out'
    }, 0.05);
  }

  // 2. Envelope lifts and dissolves away
  if (envelopeWrapper){
    tl.to(envelopeWrapper, {
      opacity: 0,
      y: -24,
      scale: 0.92,
      duration: 0.45,
      ease: 'power2.inOut',
      onComplete: () => {
        envelopeWrapper.classList.add('is-hidden');
      }
    }, 0.2);
  }

  // 3. Letter card glides and fades into view
  if (letterContainer){
    tl.add(() => {
      letterContainer.classList.remove('is-hidden');
    }, 0.5);

    tl.fromTo(letterContainer,
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power2.out',
        onComplete: () => {
          startTypewriter();
        }
      },
      0.5
    );
  }
}

function completeLetterImmediately(){
  if (typeWriterTimeoutId){
    clearTimeout(typeWriterTimeoutId);
    typeWriterTimeoutId = null;
  }
  if (letterTimeline){
    letterTimeline.progress(1);
  }
  if (envelopeWrapper){
    envelopeWrapper.classList.add('is-hidden');
  }
  if (letterContainer){
    letterContainer.classList.remove('is-hidden');
    letterContainer.classList.add('is-breathing');
    gsap.set(letterContainer, { opacity: 1, y: 0, scale: 1 });
  }
  if (typewriterText){
    typewriterText.innerHTML = LETTER_TEXT.replace(/\n/g, '<br>');
  }
  if (letterCardScroll){
    letterCardScroll.scrollTop = letterCardScroll.scrollHeight;
  }
  const cursor = scene9 ? scene9.querySelector('.typewriter-cursor') : null;
  if (cursor && cursor.parentNode){
    cursor.remove();
  }
  typeWriterStarted = false;
  if (nextScene9){
    nextScene9.hidden = false;
    requestAnimationFrame(() => nextScene9.classList.add('is-shown'));
  }
}

function handleScene9Tap(e){
  if (sceneTransitioning) return;
  if (!scene9 || !scene9.classList.contains('is-active')) return;

  if (!letterOpened){
    openEnvelope();
    return;
  }

  // If envelope just opened in the last 400ms, ignore accidental rapid double-tap
  if (Date.now() - envelopeOpeningTime < 400) return;

  // If next hint is already shown (letter finished), advance to Scene 10
  if (nextScene9 && nextScene9.classList.contains('is-shown')){
    goToScene(10);
    return;
  }

  // Otherwise, fast-forward typing immediately and reveal next hint
  completeLetterImmediately();
}

function playScene9(){
  if (!scene9) return;
  hideTreeCanvas();
  resetScene9();

  if (reduceMotion){
    if (letterVeil){
      gsap.set(letterVeil, { opacity: 0 });
    }
    return;
  }

  // Warm parchment dissolve transition from Scene 8
  if (letterVeil){
    gsap.fromTo(letterVeil,
      { opacity: 0.95, scale: 1 },
      { opacity: 0, scale: 1.04, duration: 1.30, ease: 'power2.out' }
    );
  }
}

// User tap-to-open interaction on envelope
if (envelope){
  envelope.addEventListener('click', (e) => {
    e.stopPropagation();
    handleScene9Tap(e);
  });
  envelope.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      handleScene9Tap(e);
    }
  });
}
if (envelopeHint){
  envelopeHint.addEventListener('click', (e) => {
    e.stopPropagation();
    handleScene9Tap(e);
  });
}

if (scene9){
  scene9.addEventListener('click', handleScene9Tap);
}

if (nextScene9){
  nextScene9.addEventListener('click', (e) => {
    e.stopPropagation();
    goToScene(10);
  });
}

if (nextScene1){
  nextScene1.addEventListener('click', (e) => {
    e.stopPropagation();
    goToScene(2);
  });
}

// Global exposure for testing or debugging
window.openGiftBox   = openGiftBox;
window.playScene3    = playScene3;
window.openCurtains  = openCurtains;
window.closeCurtains = closeCurtains;

/* ============================================================
   SCENE 10 — FIREWORKS FINALE CONTROLLER (DIWALI SKY DISPLAY)
   ============================================================ */
const scene10              = $('scene10');
const fireworksVeil        = $('fireworksVeil');
const fireworksCanvas      = $('fireworksCanvas');
const fireworksClosing     = $('fireworksClosing');
const fireworksClosingInner= $('fireworksClosingInner');
const nextScene10          = $('nextScene10');

const ctx10 = fireworksCanvas ? fireworksCanvas.getContext('2d') : null;
let fwW = 0, fwH = 0, fwDpr = 1;
let fwRafId = 0;
let fwRockets = [];
let fwParticles = [];
let fwSparkles = [];
let fwFlashes = [];
let fwHeartParticles = [];
let fwSettled = false;
let fwShowTimeouts = [];
let fwAmbientTimeout = 0;

const FW_PALETTE = {
  rose:     '#d4235c', // var(--rose)
  roseLift: '#ff5f86', // var(--rose-lift)
  gold1:    '#ffcf6a', // var(--gold-1)
  gold2:    '#e8a23d', // var(--gold-2)
  cream:    '#fff8ee',
  white:    '#ffffff'
};

function resizeFireworks(){
  if (!fireworksCanvas || !ctx10) return;
  fwW = window.innerWidth || 360;
  fwH = window.innerHeight || 640;
  fwDpr = Math.min(window.devicePixelRatio || 1, 2);
  fireworksCanvas.width = fwW * fwDpr;
  fireworksCanvas.height = fwH * fwDpr;
  fireworksCanvas.style.width = `${fwW}px`;
  fireworksCanvas.style.height = `${fwH}px`;
  ctx10.setTransform(fwDpr, 0, 0, fwDpr, 0, 0);
}

// Parametric heart formula established in Act 1:
// x = 16 * sin^3(t)
// y = -(13 * cos(t) - 5 * cos(2t) - 2 * cos(3t) - cos(4t))
function getHeartCoord(t, centerX, centerY, scale){
  const hx = 16 * Math.pow(Math.sin(t), 3);
  const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return {
    x: centerX + hx * scale,
    y: centerY + hy * scale
  };
}

function spawnSparkle(x, y, color, size, duration){
  fwSparkles.push({
    x: x + (Math.random() - 0.5) * 6,
    y: y + (Math.random() - 0.5) * 6,
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 0.5) * 1.2 + 0.4,
    color,
    size: size || (1.2 + Math.random() * 2.2),
    alpha: 1,
    decay: 1 / (duration || 26)
  });
}

function triggerSkyFlash(x, y, color){
  fwFlashes.push({
    x,
    y,
    radius: Math.max(fwW, fwH) * 0.82,
    color: color || 'rgba(255, 207, 106, 0.32)',
    alpha: 0.52,
    decay: 0.05
  });
}

function launchFireworkRocket(targetX, targetY, colors, isFinale, isWillow){
  if (!ctx10) return;
  const startX = fwW * (0.35 + Math.random() * 0.3);
  const startY = fwH + 10;
  const dx = targetX - startX;
  const dy = targetY - startY;
  const distance = Math.hypot(dx, dy);
  const speed = isFinale ? 14 : 12.5;
  const duration = Math.max(25, distance / speed);

  fwRockets.push({
    x: startX,
    y: startY,
    prevX: startX,
    prevY: startY,
    startX,
    startY,
    targetX,
    targetY,
    colors,
    isFinale: !!isFinale,
    isWillow: !!isWillow,
    progress: 0,
    step: 1 / duration,
    trailColor: isFinale ? FW_PALETTE.gold1 : (colors[0] || FW_PALETTE.gold1)
  });
}

function explodeDiwaliShell(rocket){
  const x = rocket.targetX;
  const y = rocket.targetY;
  const isFinale = rocket.isFinale;
  const isWillow = rocket.isWillow;

  if (isFinale){
    // Climax Grand Golden Diwali Shell: Fills the entire sky then settles into the golden heart
    triggerSkyFlash(x, y, 'rgba(255, 220, 140, 0.45)');

    const TOTAL_HEART = 180;
    const heartScale = Math.min(fwW * 0.46, fwH * 0.28) / 16;
    const heartCenterY = fwH * 0.30;

    for (let i = 0; i < TOTAL_HEART; i++){
      const t = (i / TOTAL_HEART) * Math.PI * 2;
      const targetPos = getHeartCoord(t, fwW * 0.5, heartCenterY, heartScale);
      const jitterX = (Math.random() - 0.5) * 6;
      const jitterY = (Math.random() - 0.5) * 6;

      const angle = Math.random() * Math.PI * 2;
      // High initial Diwali velocity spreading across the entire screen
      const speed = 4.0 + Math.random() * 11.5;
      const color = i % 3 === 0 ? FW_PALETTE.gold1 : (i % 3 === 1 ? FW_PALETTE.gold2 : FW_PALETTE.cream);

      fwHeartParticles.push({
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        targetX: targetPos.x + jitterX,
        targetY: targetPos.y + jitterY,
        color,
        size: 2.4 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        isSettled: false,
        coalesceProgress: 0,
        alpha: 1
      });
    }

    // Outer glittering golden cloud for screen-filling majesty
    for (let j = 0; j < 90; j++){
      const a = Math.random() * Math.PI * 2;
      const spd = 6.0 + Math.random() * 14.0;
      fwParticles.push({
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: Math.random() < 0.65 ? FW_PALETTE.gold1 : FW_PALETTE.roseLift,
        size: 2.2 + Math.random() * 2.4,
        alpha: 1,
        drag: 0.97,
        gravity: 0.055,
        decay: 0.012 + Math.random() * 0.014,
        isWillow: true
      });
    }

    triggerClosingFinale();
    return;
  }

  // Giant Diwali Shell (Peony, Chrysanthemum, or Kamuro Willow)
  const count = isWillow ? 210 : 175;
  const colors = rocket.colors || [FW_PALETTE.roseLift, FW_PALETTE.gold1];
  const flashColor = isWillow ? 'rgba(255, 207, 106, 0.38)' : 'rgba(255, 95, 134, 0.34)';
  triggerSkyFlash(x, y, flashColor);

  for (let i = 0; i < count; i++){
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    // Multi-tier layered speeds creating deep spherical shells spanning the whole screen
    const tier = Math.random();
    const speed = tier < 0.3
      ? (3.5 + Math.random() * 4.5)
      : tier < 0.75
      ? (8.0 + Math.random() * 5.5)
      : (13.0 + Math.random() * 4.5);

    const color = colors[i % colors.length];

    fwParticles.push({
      x,
      y,
      prevX: x,
      prevY: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: isWillow ? (2.0 + Math.random() * 2.2) : (2.4 + Math.random() * 2.4),
      alpha: 1,
      drag: isWillow ? 0.978 : 0.970,
      gravity: isWillow ? 0.048 : 0.055,
      decay: isWillow ? (0.007 + Math.random() * 0.008) : (0.012 + Math.random() * 0.014),
      isWillow: !!isWillow
    });
  }

  // Large center spark burst
  for (let s = 0; s < 40; s++){
    spawnSparkle(x, y, FW_PALETTE.cream, 3.0, 35);
  }
}

function triggerClosingFinale(){
  if (fwSettled) return;
  fwSettled = true;

  // Reveal closing headline with 3D hinge animation after heart particles coalesce
  setTimeout(() => {
    if (!scene10 || !scene10.classList.contains('is-active')) return;

    if (fireworksClosingInner){
      gsap.fromTo(fireworksClosingInner,
        { opacity: 0, rotateX: -80, y: 20 },
        { opacity: 1, rotateX: 0, y: 0, duration: 1.05, ease: 'back.out(1.3)' }
      );
    }

    // Fade in shared Next pill
    setTimeout(() => {
      if (nextScene10 && scene10 && scene10.classList.contains('is-active')){
        nextScene10.hidden = false;
        requestAnimationFrame(() => nextScene10.classList.add('is-shown'));
      }
    }, 450);

    // Continue celebratory Diwali background sky shots
    scheduleAmbientFirework();
  }, 1300);
}

function scheduleAmbientFirework(){
  if (!scene10 || !scene10.classList.contains('is-active')) return;
  clearTimeout(fwAmbientTimeout);

  fwAmbientTimeout = setTimeout(() => {
    if (!scene10 || !scene10.classList.contains('is-active') || reduceMotion) return;

    const sideLeft = Math.random() < 0.5;
    const targetX = fwW * (sideLeft ? (0.16 + Math.random() * 0.22) : (0.62 + Math.random() * 0.22));
    const targetY = fwH * (0.18 + Math.random() * 0.24);
    const isWillow = Math.random() < 0.55;
    const colors = isWillow
      ? [FW_PALETTE.gold1, FW_PALETTE.gold2]
      : (Math.random() < 0.5 ? [FW_PALETTE.roseLift, FW_PALETTE.gold1] : [FW_PALETTE.rose, FW_PALETTE.gold2]);

    launchFireworkRocket(targetX, targetY, colors, false, isWillow);

    scheduleAmbientFirework();
  }, 3200 + Math.random() * 2200);
}

// Full automated Diwali Fireworks Choreography: explodes immediately on scene load!
function startDiwaliShow(){
  fwShowTimeouts.forEach(t => clearTimeout(t));
  fwShowTimeouts = [];

  const queue = (fn, delay) => {
    const id = setTimeout(() => {
      if (scene10 && scene10.classList.contains('is-active') && !reduceMotion){
        fn();
      }
    }, delay);
    fwShowTimeouts.push(id);
  };

  // Wave 1: Immediate dual aerial burst illuminating left and right sky
  queue(() => {
    launchFireworkRocket(fwW * 0.28, fwH * 0.26, [FW_PALETTE.roseLift, FW_PALETTE.gold1], false, false);
  }, 180);

  queue(() => {
    launchFireworkRocket(fwW * 0.72, fwH * 0.22, [FW_PALETTE.rose, FW_PALETTE.gold2], false, false);
  }, 650);

  // Wave 2: Twin Golden Kamuro (Willows) filling the sky with cascading gold rain
  queue(() => {
    launchFireworkRocket(fwW * 0.38, fwH * 0.20, [FW_PALETTE.gold1, FW_PALETTE.gold2], false, true);
    launchFireworkRocket(fwW * 0.62, fwH * 0.18, [FW_PALETTE.gold1, FW_PALETTE.cream], false, true);
  }, 1500);

  // Wave 3: Grand Triple Diwali Barrage spanning the entire screen width
  queue(() => {
    launchFireworkRocket(fwW * 0.20, fwH * 0.28, [FW_PALETTE.roseLift, FW_PALETTE.gold1], false, false);
    launchFireworkRocket(fwW * 0.50, fwH * 0.16, [FW_PALETTE.gold1, FW_PALETTE.rose], false, true);
    launchFireworkRocket(fwW * 0.80, fwH * 0.26, [FW_PALETTE.rose, FW_PALETTE.gold2], false, false);
  }, 2650);

  // Wave 4: Grand Finale Climax Firework that coalesces into the golden heart
  queue(() => {
    launchFireworkRocket(fwW * 0.50, fwH * 0.28, [FW_PALETTE.gold1, FW_PALETTE.gold2], true, false);
  }, 3950);
}

function renderFireworksFrame(){
  if (!ctx10) return;
  ctx10.clearRect(0, 0, fwW, fwH);

  // 1. Screen Flashes (Atmospheric sky illumination on detonation)
  for (let f = fwFlashes.length - 1; f >= 0; f--){
    const fl = fwFlashes[f];
    fl.alpha -= fl.decay;
    if (fl.alpha <= 0){
      fwFlashes.splice(f, 1);
      continue;
    }
    const grad = ctx10.createRadialGradient(fl.x, fl.y, 10, fl.x, fl.y, fl.radius);
    grad.addColorStop(0, fl.color.replace(/[\d\.]+\)$/, `${fl.alpha})`));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx10.save();
    ctx10.fillStyle = grad;
    ctx10.fillRect(0, 0, fwW, fwH);
    ctx10.restore();
  }

  // 2. Rockets in Flight (Blazing whistling trails)
  for (let i = fwRockets.length - 1; i >= 0; i--){
    const r = fwRockets[i];
    r.progress += r.step;
    r.prevX = r.x;
    r.prevY = r.y;

    const t = Math.min(1, r.progress);
    const easeT = 1 - Math.pow(1 - t, 2.2);
    r.x = r.startX + (r.targetX - r.startX) * easeT;
    r.y = r.startY + (r.targetY - r.startY) * easeT;

    // Golden sparks shed by ascending rocket
    spawnSparkle(r.x, r.y, r.trailColor, 2.2, 18);

    // Glowing blazing head (concentric glow passes without GPU blur stall)
    ctx10.save();
    ctx10.beginPath();
    ctx10.moveTo(r.prevX, r.prevY);
    ctx10.lineTo(r.x, r.y);
    ctx10.strokeStyle = r.trailColor;
    ctx10.lineCap = 'round';

    // Outer glow stroke
    ctx10.lineWidth = (r.isFinale ? 5.5 : 4.0) * 2.2;
    ctx10.globalAlpha = 0.35;
    ctx10.stroke();

    // Core stroke
    ctx10.lineWidth = r.isFinale ? 5.5 : 4.0;
    ctx10.globalAlpha = 1.0;
    ctx10.stroke();

    ctx10.beginPath();
    ctx10.arc(r.x, r.y, r.isFinale ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx10.fillStyle = FW_PALETTE.white;
    ctx10.fill();
    ctx10.restore();

    if (r.progress >= 1){
      explodeDiwaliShell(r);
      fwRockets.splice(i, 1);
    }
  }

  // 3. Screen-filling Burst Particles with Glowing Streak Tails
  for (let i = fwParticles.length - 1; i >= 0; i--){
    const p = fwParticles[i];
    p.prevX = p.x;
    p.prevY = p.y;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.vy += p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;

    // Shedding micro-glitter as it flies
    if (p.isWillow && Math.random() < 0.45 && p.alpha > 0.25){
      spawnSparkle(p.x, p.y, FW_PALETTE.cream, 1.8, 24);
    } else if (Math.random() < 0.22 && p.alpha > 0.35){
      spawnSparkle(p.x, p.y, p.color, 1.5, 18);
    }

    if (p.alpha <= 0){
      fwParticles.splice(i, 1);
      continue;
    }

    ctx10.save();
    const baseWidth = p.size * (0.8 + p.alpha * 0.5);

    // Blazing streak tail with concentric dual-pass (halo + core)
    ctx10.beginPath();
    ctx10.moveTo(p.prevX, p.prevY);
    ctx10.lineTo(p.x, p.y);
    ctx10.strokeStyle = p.color;
    ctx10.lineCap = 'round';

    // Outer halo
    ctx10.lineWidth = baseWidth * 2.4;
    ctx10.globalAlpha = Math.max(0, p.alpha * 0.28);
    ctx10.stroke();

    // Inner core streak
    ctx10.lineWidth = baseWidth;
    ctx10.globalAlpha = Math.max(0, p.alpha);
    ctx10.stroke();

    // Bright spark head
    ctx10.beginPath();
    ctx10.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
    ctx10.fillStyle = FW_PALETTE.white;
    ctx10.fill();
    ctx10.restore();
  }

  // 4. Micro Sparkles (Twinkling star embers)
  for (let i = fwSparkles.length - 1; i >= 0; i--){
    const s = fwSparkles[i];
    s.x += s.vx;
    s.y += s.vy;
    s.alpha -= s.decay;

    if (s.alpha <= 0){
      fwSparkles.splice(i, 1);
      continue;
    }

    ctx10.save();
    ctx10.globalAlpha = Math.max(0, s.alpha);
    ctx10.fillStyle = s.color;
    ctx10.beginPath();
    ctx10.arc(s.x, s.y, s.size * s.alpha, 0, Math.PI * 2);
    ctx10.fill();
    ctx10.restore();
  }

  // 5. Finale Heart Particles (Coalescence and Shimmering)
  if (fwHeartParticles.length > 0){
    const now = performance.now() * 0.003;

    // Soft warm gold radial bloom behind the settled heart
    if (fwSettled){
      const heartCenterY = fwH * 0.30;
      const bloomRadius = Math.min(fwW * 0.48, fwH * 0.30);
      const grad = ctx10.createRadialGradient(fwW * 0.5, heartCenterY, 5, fwW * 0.5, heartCenterY, bloomRadius);
      grad.addColorStop(0, 'rgba(255, 207, 106, 0.28)');
      grad.addColorStop(0.5, 'rgba(212, 35, 92, 0.14)');
      grad.addColorStop(1, 'rgba(36, 10, 22, 0)');
      ctx10.save();
      ctx10.fillStyle = grad;
      ctx10.beginPath();
      ctx10.arc(fwW * 0.5, heartCenterY, bloomRadius, 0, Math.PI * 2);
      ctx10.fill();
      ctx10.restore();
    }

    for (let i = 0; i < fwHeartParticles.length; i++){
      const hp = fwHeartParticles[i];

      if (!hp.isSettled){
        hp.coalesceProgress = Math.min(1, hp.coalesceProgress + 0.02);
        // Initial grand dispersion across screen
        if (hp.coalesceProgress < 0.28){
          hp.prevX = hp.x;
          hp.prevY = hp.y;
          hp.x += hp.vx;
          hp.y += hp.vy;
          hp.vx *= 0.96;
          hp.vy *= 0.96;
        } else {
          // Inward pull towards target heart point
          const pull = (hp.coalesceProgress - 0.28) / 0.72;
          const easePull = pull * pull * (3 - 2 * pull);
          hp.prevX = hp.x;
          hp.prevY = hp.y;
          hp.x += (hp.targetX - hp.x) * (0.05 + easePull * 0.09);
          hp.y += (hp.targetY - hp.y) * (0.05 + easePull * 0.09);

          if (Math.hypot(hp.targetX - hp.x, hp.targetY - hp.y) < 2.0 && hp.coalesceProgress >= 0.94){
            hp.isSettled = true;
            hp.x = hp.targetX;
            hp.y = hp.targetY;
          }
        }
      } else {
        // Settled heart shimmer: breathing celestial starlight
        const shimmerOffset = Math.sin(now * 2 + hp.phase) * 1.3;
        hp.currentX = hp.targetX + Math.cos(hp.phase) * shimmerOffset;
        hp.currentY = hp.targetY + Math.sin(hp.phase) * shimmerOffset;
        hp.currentAlpha = 0.82 + Math.sin(now * 3 + hp.phase) * 0.18;
      }

      const drawX = hp.isSettled ? hp.currentX : hp.x;
      const drawY = hp.isSettled ? hp.currentY : hp.y;
      const drawAlpha = hp.isSettled ? hp.currentAlpha : 1;

      ctx10.save();

      if (!hp.isSettled && hp.prevX !== undefined){
        ctx10.beginPath();
        ctx10.moveTo(hp.prevX, hp.prevY);
        ctx10.lineTo(drawX, drawY);
        ctx10.strokeStyle = hp.color;
        ctx10.lineWidth = hp.size;
        ctx10.lineCap = 'round';
        ctx10.globalAlpha = drawAlpha;
        ctx10.stroke();
      }

      ctx10.fillStyle = hp.color;
      // Outer soft glow halo
      ctx10.globalAlpha = drawAlpha * (hp.isSettled ? 0.35 : 0.25);
      ctx10.beginPath();
      ctx10.arc(drawX, drawY, hp.size * (hp.isSettled ? 2.2 : 1.8), 0, Math.PI * 2);
      ctx10.fill();

      // Core particle
      ctx10.globalAlpha = drawAlpha;
      ctx10.beginPath();
      ctx10.arc(drawX, drawY, hp.size, 0, Math.PI * 2);
      ctx10.fill();
      ctx10.restore();
    }
  }

  fwRafId = requestAnimationFrame(renderFireworksFrame);
}

function resetScene10(){
  if (fwRafId){
    cancelAnimationFrame(fwRafId);
    fwRafId = 0;
  }
  clearTimeout(fwAmbientTimeout);
  fwShowTimeouts.forEach(t => clearTimeout(t));
  fwShowTimeouts = [];

  fwRockets = [];
  fwParticles = [];
  fwSparkles = [];
  fwFlashes = [];
  fwHeartParticles = [];
  fwSettled = false;

  if (ctx10 && fwW && fwH){
    ctx10.clearRect(0, 0, fwW, fwH);
  }

  if (fireworksClosingInner){
    gsap.set(fireworksClosingInner, { opacity: 0, rotateX: -80, y: 20 });
  }
  if (nextScene10){
    nextScene10.classList.remove('is-shown');
    nextScene10.hidden = true;
  }
}

function playScene10(){
  if (!scene10) return;
  hideTreeCanvas();
  resetScene10();
  resizeFireworks();

  // 1. Themed transition: warm page-of-light dissolving into night sky
  if (fireworksVeil){
    if (reduceMotion){
      gsap.set(fireworksVeil, { opacity: 0 });
    } else {
      gsap.fromTo(fireworksVeil,
        { opacity: 1, scale: 1 },
        { opacity: 0, scale: 1.06, duration: 1.25, ease: 'power2.out' }
      );
    }
  }

  // 2. Reduced-motion branch: render settled finale immediately
  if (reduceMotion){
    const TOTAL_HEART = 180;
    const heartScale = Math.min(fwW * 0.46, fwH * 0.28) / 16;
    const heartCenterY = fwH * 0.30;
    for (let i = 0; i < TOTAL_HEART; i++){
      const t = (i / TOTAL_HEART) * Math.PI * 2;
      const targetPos = getHeartCoord(t, fwW * 0.5, heartCenterY, heartScale);
      const color = i % 3 === 0 ? FW_PALETTE.gold1 : (i % 3 === 1 ? FW_PALETTE.gold2 : FW_PALETTE.cream);
      fwHeartParticles.push({
        targetX: targetPos.x,
        targetY: targetPos.y,
        currentX: targetPos.x,
        currentY: targetPos.y,
        color,
        size: 2.6,
        phase: Math.random() * Math.PI * 2,
        isSettled: true,
        currentAlpha: 0.9
      });
    }
    fwSettled = true;
    renderFireworksFrame();

    if (fireworksClosingInner){
      gsap.set(fireworksClosingInner, { opacity: 1, rotateX: 0, y: 0 });
    }
    if (nextScene10){
      nextScene10.hidden = false;
      nextScene10.classList.add('is-shown');
    }
    return;
  }

  // 3. Normal mode: start render loop & start the grand Diwali show automatically!
  renderFireworksFrame();
  startDiwaliShow();
}

// Optional interactive tap: clicking/tapping anywhere launches an extra screen-filling Diwali shell!
if (scene10){
  scene10.addEventListener('click', (e) => {
    if (fwSettled || (nextScene10 && nextScene10.classList.contains('is-shown'))){
      goToScene(11);
      return;
    }
    const targetX = e.clientX || fwW * 0.5;
    const targetY = e.clientY || fwH * 0.3;
    const isWillow = Math.random() < 0.5;
    const colors = isWillow
      ? [FW_PALETTE.gold1, FW_PALETTE.gold2]
      : (Math.random() < 0.5 ? [FW_PALETTE.roseLift, FW_PALETTE.gold1] : [FW_PALETTE.rose, FW_PALETTE.gold2]);
    launchFireworkRocket(targetX, targetY, colors, false, isWillow);
  });
}

if (nextScene10){
  nextScene10.addEventListener('click', (e) => {
    e.stopPropagation();
    goToScene(11);
  });
}

let fwResizeRAF = 0;
window.addEventListener('resize', () => {
  if (fwResizeRAF) return;
  fwResizeRAF = requestAnimationFrame(() => {
    fwResizeRAF = 0;
    if (scene10 && scene10.classList.contains('is-active')){
      resizeFireworks();
    }
  });
});

/* ============================================================
   SCENE 11 — THE FINAL TOAST CONTROLLER (CLOSING SCENE)
   ============================================================ */
const scene11              = $('scene11');
const toastVeil            = $('toastVeil');
const toastStage           = $('toastStage');
const glassLeft            = $('glassLeft');
const glassRight           = $('glassRight');
const clinkBurst           = $('clinkBurst');
const toastLightWash       = $('toastLightWash');
const toastWish            = $('toastWish');
const toastEyebrow         = $('toastEyebrow');
const toastHeroWrap        = $('toastHeroWrap');
const toastHero            = $('toastHero');
const toastRule            = $('toastRule');
const toastSub             = $('toastSub');
const btnReplayAll         = $('btnReplayAll');
const toastParticles       = $('toastParticles');

let toastTimeline          = null;
let toastParticlesActive   = false;

function startToastParticles(){
  if (!toastParticles || toastParticlesActive || reduceMotion) return;
  toastParticlesActive = true;

  const PETAL_TEMPLATES = [
    // 1. Blossom Petal
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 C7 7, 5 13, 12 22 C19 13, 17 7, 12 2 Z" fill="currentColor"/></svg>',
    // 2. Mini Heart
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>',
    // 3. Gold sparkle
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/></svg>'
  ];

  const COLORS = [
    '#e85a83', // Rose lift
    '#c41f52', // Deep rose
    '#ffd074', // Gold 1
    '#e8a23d', // Gold 2
    '#f59e0b', // Amber
    '#ffb8c6'  // Soft pink
  ];

  function spawnFallingPetal(isInitial){
    if (!toastParticles || !toastParticlesActive) return;

    const el = document.createElement('div');
    el.className = 'toast-petal';
    const tmpl = PETAL_TEMPLATES[Math.floor(Math.random() * PETAL_TEMPLATES.length)];
    el.innerHTML = tmpl;
    el.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const size = 12 + Math.random() * 12; // 12px - 24px
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;

    const winW = window.innerWidth || 360;
    const winH = window.innerHeight || 640;
    const startX = Math.random() * winW;
    const startY = isInitial ? Math.random() * winH : -30;
    const endY = winH + 40;

    const duration = 10 + Math.random() * 8; // 10s - 18s gentle descent
    const lifeDuration = isInitial ? duration * ((endY - startY) / (endY + 30)) : duration;
    const swayAmount = 25 + Math.random() * 45;
    const swayDuration = 2.5 + Math.random() * 2.5;
    const targetRot = (180 + Math.random() * 360) * (Math.random() < 0.5 ? 1 : -1);
    const maxOp = 0.55 + Math.random() * 0.35;

    gsap.set(el, {
      x: startX,
      y: startY,
      opacity: 0,
      scale: 0.4 + Math.random() * 0.6,
      rotation: Math.random() * 360
    });

    toastParticles.appendChild(el);

    const tl = gsap.timeline({
      onComplete: () => {
        el.remove();
        if (toastParticlesActive && !reduceMotion){
          spawnFallingPetal(false);
        }
      }
    });

    // Fade in then drift down
    tl.to(el, { opacity: maxOp, duration: 1.2, ease: 'power1.out' }, 0)
      .to(el, { y: endY, rotation: targetRot, duration: lifeDuration, ease: 'none' }, 0)
      .to(el, {
        x: `+=${(Math.random() < 0.5 ? 1 : -1) * swayAmount}`,
        duration: swayDuration,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      }, 0);
  }

  // Pre-spawn 14 falling petals
  for (let i = 0; i < 14; i++){
    spawnFallingPetal(true);
  }
}

function resetScene11(){
  if (toastTimeline){
    toastTimeline.kill();
    toastTimeline = null;
  }
  toastParticlesActive = false;
  if (toastParticles){
    toastParticles.innerHTML = '';
  }

  // Reset glasses
  if (glassLeft){
    gsap.set(glassLeft, { clearProps: 'all' });
  }
  if (glassRight){
    gsap.set(glassRight, { clearProps: 'all' });
  }
  if (clinkBurst){
    gsap.set(clinkBurst, { clearProps: 'all' });
  }
  if (toastLightWash){
    gsap.set(toastLightWash, { clearProps: 'all' });
  }

  // Reset text
  if (toastEyebrow){
    gsap.set(toastEyebrow, { clearProps: 'all' });
  }
  if (toastHero){
    gsap.set(toastHero, { clearProps: 'all' });
  }
  if (toastHeroWrap){
    gsap.set(toastHeroWrap, { clearProps: 'all' });
  }
  if (toastRule){
    gsap.set(toastRule, { clearProps: 'all' });
  }
  if (toastSub){
    gsap.set(toastSub, { clearProps: 'all' });
  }

  // Reset replay button
  if (btnReplayAll){
    btnReplayAll.classList.remove('is-shown');
  }
}

function playScene11(){
  if (!scene11) return;
  hideTreeCanvas();
  resetScene11();

  if (reduceMotion){
    if (toastVeil) gsap.set(toastVeil, { opacity: 0 });
    if (glassLeft) gsap.set(glassLeft, { opacity: 1, x: 0, rotation: 12 });
    if (glassRight) gsap.set(glassRight, { opacity: 1, x: 0, rotation: -12 });
    if (toastEyebrow) gsap.set(toastEyebrow, { opacity: 1, y: 0, filter: 'blur(0px)' });
    if (toastHero) gsap.set(toastHero, { clipPath: 'inset(0 -10% -28% -10%)', opacity: 1 });
    if (toastRule) gsap.set(toastRule, { opacity: 1, y: 0, scaleX: 1 });
    if (toastSub) gsap.set(toastSub, { opacity: 1, y: 0, filter: 'blur(0px)' });
    if (btnReplayAll){
      btnReplayAll.classList.add('is-shown');
    }
    return;
  }

  // Master timeline for Scene 11
  toastTimeline = gsap.timeline();
  const tl = toastTimeline;

  // 1. Warm daylight dawn transition veil fading out from night
  if (toastVeil){
    tl.fromTo(toastVeil,
      { opacity: 0.95 },
      { opacity: 0, duration: 1.25, ease: 'power2.out' },
      0
    );
  }

  // 2. Glasses glide inward from left and right
  if (glassLeft && glassRight){
    tl.fromTo(glassLeft,
      { x: -140, rotation: -20, opacity: 0 },
      { x: 0, rotation: 14, opacity: 1, duration: 0.95, ease: 'power2.out' },
      0.35
    );
    tl.fromTo(glassRight,
      { x: 140, rotation: 20, opacity: 0 },
      { x: 0, rotation: -14, opacity: 1, duration: 0.95, ease: 'power2.out' },
      0.35
    );

    // Clink moment (at t = 1.25s): tiny bounce together
    tl.to(glassLeft, {
      x: 6, rotation: 16, duration: 0.12, ease: 'power2.in',
      yoyo: true, repeat: 1
    }, 1.25);
    tl.to(glassRight, {
      x: -6, rotation: -16, duration: 0.12, ease: 'power2.in',
      yoyo: true, repeat: 1
    }, 1.25);
  }

  // 3. Contact Spark Burst & Light Wash at t = 1.28s
  if (clinkBurst){
    tl.fromTo(clinkBurst,
      { scale: 0, opacity: 0 },
      { scale: 1.4, opacity: 1, duration: 0.22, ease: 'back.out(2)' },
      1.28
    )
    .to(clinkBurst, {
      scale: 1.8, opacity: 0, duration: 0.35, ease: 'power2.out'
    }, 1.50);
  }

  if (toastLightWash){
    tl.fromTo(toastLightWash,
      { opacity: 0 },
      { opacity: 0.7, duration: 0.18, ease: 'power1.out' },
      1.28
    )
    .to(toastLightWash, {
      opacity: 0, duration: 0.8, ease: 'power2.out'
    }, 1.46);
  }

  // 4. Reveal the Closing Wish Block (echo of Act 1)
  // Eyebrow line: "and so, once more —"
  if (toastEyebrow){
    tl.to(toastEyebrow, {
      opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out'
    }, 1.8);
  }

  // Hero line: "Happy Birthday, [Best Friend's Name]" with write-in clipPath
  if (toastHero){
    tl.fromTo(toastHero,
      { clipPath: 'inset(0 100% -28% -10%)' },
      { clipPath: 'inset(0 -10% -28% -10%)', duration: 1.3, ease: 'power3.inOut' },
      2.1
    );
  }

  // Underline rule
  if (toastRule){
    tl.to(toastRule, {
      opacity: 1, y: 0, scaleX: 1, duration: 0.8, ease: 'power2.out'
    }, 3.0);
  }

  // Subtext: "here's to another year of us being a little bit unstoppable together."
  if (toastSub){
    tl.to(toastSub, {
      opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out'
    }, 3.3);
  }

  // 5. Permanent Resting State: Falling Petals/Confetti start
  tl.add(() => {
    startToastParticles();
  }, 3.8);

  // 6. "Replay from the Start" pill fades in
  if (btnReplayAll){
    tl.add(() => {
      btnReplayAll.classList.add('is-shown');
    }, 4.2);
  }
}

// User tap interaction on "Replay from the Start" button
if (btnReplayAll){
  btnReplayAll.addEventListener('click', (e) => {
    e.stopPropagation();
    resetAll();
  });
}

/* ============================================================
   GLOBAL AMBIENT PARTICLES (Shared across all scenes)
   ============================================================ */
const ambientContainer = $('ambientParticles');

const GLYPH_SVG_TEMPLATES = [
  // 1. Heart
  '<svg class="particle-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>',
  // 2. Sparkle
  '<svg class="particle-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/></svg>',
  // 3. Blossom Petal
  '<svg class="particle-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 C7 7, 5 13, 12 22 C19 13, 17 7, 12 2 Z" fill="currentColor"/></svg>'
];

const GLYPH_COLORS = [
  'var(--rose-lift)',
  'var(--gold-1)',
  'var(--gold-2)',
  'var(--rose)'
];

const DOT_COLORS = [
  'var(--gold-1)',
  'var(--gold-2)'
];

function startAmbientParticles(){
  if (!ambientContainer || reduceMotion) return;

  const isMobile = (window.innerWidth || 360) < 600;
  const TOTAL_PARTICLES = isMobile ? 10 : 20; // 10 on mobile, 20 on desktop

  function spawnParticle(isInitial){
    if (!ambientContainer) return;
    const el = document.createElement('div');
    el.className = 'g-particle';

    const isGlyph = Math.random() < 0.52; // roughly 50/50 split

    if (isGlyph){
      el.classList.add('g-particle--glyph');
      const tmpl = GLYPH_SVG_TEMPLATES[Math.floor(Math.random() * GLYPH_SVG_TEMPLATES.length)];
      el.innerHTML = tmpl;
      el.style.color = GLYPH_COLORS[Math.floor(Math.random() * GLYPH_COLORS.length)];
      const size = 11 + Math.random() * 6; // 11px - 17px
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
    } else {
      el.classList.add('g-particle--dot');
      el.style.color = DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)];
      const size = 3 + Math.random() * 3.5; // 3px - 6.5px
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
    }

    ambientContainer.appendChild(el);

    const winW = window.innerWidth || 360;
    const winH = window.innerHeight || 640;
    const startX = Math.random() * winW;
    // If initial spawn, distribute across viewport height so it's active immediately
    const startY = isInitial
      ? Math.random() * winH
      : winH + 15 + Math.random() * 35;

    const duration = 12 + Math.random() * 10; // 12s - 22s slow drift
    const swayAmount = 25 + Math.random() * 40;
    const swayDuration = 3 + Math.random() * 3;
    const maxOpacity = isGlyph ? 0.45 + Math.random() * 0.35 : 0.6 + Math.random() * 0.35;
    const rotation = (180 + Math.random() * 360) * (Math.random() < 0.5 ? 1 : -1);

    // Initial positioning
    gsap.set(el, {
      x: startX,
      y: startY,
      opacity: 0,
      scale: isGlyph ? 0.6 : 0,
      rotation: 0
    });

    const lifeDuration = isInitial ? duration * (startY / winH) : duration;

    // Animate lifecycle
    const tl = gsap.timeline({
      onComplete: () => {
        el.remove();
        if (!reduceMotion && ambientContainer){
          spawnParticle(false);
        }
      }
    });

    // Vertical drift
    tl.to(el, {
      y: -50,
      duration: lifeDuration,
      ease: 'none'
    }, 0);

    // Horizontal sinusoidal sway
    tl.to(el, {
      x: `+=${(Math.random() < 0.5 ? 1 : -1) * swayAmount}`,
      duration: swayDuration,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    }, 0);

    // Rotation (for glyphs)
    if (isGlyph){
      tl.to(el, {
        rotation: rotation,
        duration: lifeDuration,
        ease: 'none'
      }, 0);
    }

    // Fade / Scale in and out
    const fadeInTime = Math.min(2.5, Math.max(0.6, lifeDuration * 0.2));
    const fadeOutTime = Math.min(3.0, Math.max(0.8, lifeDuration * 0.25));

    tl.to(el, {
      opacity: maxOpacity,
      scale: 1,
      duration: fadeInTime,
      ease: 'power1.out'
    }, 0);

    tl.to(el, {
      opacity: 0,
      scale: isGlyph ? 0.8 : 0,
      duration: fadeOutTime,
      ease: 'power1.in'
    }, Math.max(fadeInTime, lifeDuration - fadeOutTime));
  }

  // Pre-seed particles across viewport
  for (let i = 0; i < TOTAL_PARTICLES; i++){
    spawnParticle(true);
  }
}

// Start once on script load
startAmbientParticles();

/* ============================================================
   GLOBAL BACKGROUND MUSIC CONTROLLER
   - Single shared audio element running across all 11 scenes
   - Starts at 0:27 on first user interaction
   - Loops continuously back to 0:27 (not 0:00)
   - Persistent mute/unmute toggle in bottom-left corner
   - Smooth ducking during scenes with sound effects
   - Fails silently if blocked or file missing
   ============================================================ */
const AUDIO_CONFIG = {
  src: 'assets/bg-music.mp3',
  startTime: 27,
  loopStartTime: 27,
  defaultVolume: 0.45,
  duckVolume: 0.18
};

const bgMusic        = $('bgMusic');
const musicToggleBtn = $('musicToggleBtn');

let musicStarted = false;
let isMuted      = false;
let duckTimeout  = 0;

function initAndPlayMusic(){
  if (!bgMusic || musicStarted) return;
  musicStarted = true;

  bgMusic.volume = AUDIO_CONFIG.defaultVolume;
  bgMusic.muted = isMuted;

  // Set start time to 27s
  try {
    if (bgMusic.readyState >= 1) { // HAVE_METADATA or higher
      bgMusic.currentTime = AUDIO_CONFIG.startTime;
    } else {
      bgMusic.addEventListener('loadedmetadata', () => {
        bgMusic.currentTime = AUDIO_CONFIG.startTime;
      }, { once: true });
    }
  } catch(e){}

  const playPromise = bgMusic.play();
  if (playPromise !== undefined){
    playPromise.then(() => {
      if (musicToggleBtn && !isMuted){
        musicToggleBtn.classList.add('is-playing');
      }
    }).catch(() => {
      // Fail silently if browser blocks or file not ready yet
      musicStarted = false;
    });
  }
}

// Continuous loop back to 27 seconds (not 0:00)
if (bgMusic){
  bgMusic.addEventListener('timeupdate', () => {
    // If playback approaches within 0.25s of the end, seamlessly loop back to loopStartTime (27s)
    if (bgMusic.duration && bgMusic.currentTime >= bgMusic.duration - 0.25){
      bgMusic.currentTime = AUDIO_CONFIG.loopStartTime;
      if (!bgMusic.paused){
        bgMusic.play().catch(() => {});
      }
    }
  });

  bgMusic.addEventListener('ended', () => {
    bgMusic.currentTime = AUDIO_CONFIG.loopStartTime;
    bgMusic.play().catch(() => {});
  });

  bgMusic.addEventListener('play', () => {
    if (musicToggleBtn && !isMuted){
      musicToggleBtn.classList.add('is-playing');
    }
  });

  bgMusic.addEventListener('pause', () => {
    if (musicToggleBtn){
      musicToggleBtn.classList.remove('is-playing');
    }
  });
}

// First interaction trigger across the entire film (one-time)
function handleFirstMusicInteraction(){
  window.removeEventListener('pointerdown', handleFirstMusicInteraction);
  window.removeEventListener('keydown', handleFirstMusicInteraction);
  initAndPlayMusic();
}

window.addEventListener('pointerdown', handleFirstMusicInteraction, { passive: true });
window.addEventListener('keydown', handleFirstMusicInteraction, { passive: true });

// Toggle Mute / Unmute
function toggleMusicMute(e){
  if (e){
    e.stopPropagation();
  }

  // If music hasn't started yet, clicking the toggle should initiate playback
  if (!musicStarted){
    initAndPlayMusic();
    return;
  }

  isMuted = !isMuted;
  if (bgMusic){
    bgMusic.muted = isMuted;
    // Also if unmuting while paused, resume playback
    if (!isMuted && bgMusic.paused){
      bgMusic.play().catch(() => {});
    }
  }

  if (musicToggleBtn){
    musicToggleBtn.classList.toggle('is-muted', isMuted);
    musicToggleBtn.classList.toggle('is-playing', !isMuted && bgMusic && !bgMusic.paused);
    musicToggleBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
    musicToggleBtn.setAttribute('aria-label', isMuted ? 'Unmute background music' : 'Mute background music');
  }
}

if (musicToggleBtn){
  musicToggleBtn.addEventListener('click', toggleMusicMute);
}

// Gentle ducking during sound effects
function duckMusic(durationMs = 900, duckLevel = AUDIO_CONFIG.duckVolume){
  if (!bgMusic || isMuted || bgMusic.paused) return;
  clearTimeout(duckTimeout);
  gsap.to(bgMusic, {
    volume: duckLevel,
    duration: 0.2,
    ease: 'power1.out',
    onComplete: () => {
      duckTimeout = setTimeout(() => {
        if (!isMuted && bgMusic && !bgMusic.paused){
          gsap.to(bgMusic, {
            volume: AUDIO_CONFIG.defaultVolume,
            duration: 0.45,
            ease: 'power1.in'
          });
        }
      }, durationMs);
    }
  });
}

// Dynamic update helper for editor live preview
function updateGiftData(newData, targetScene){
  if (!newData) return;
  window.GIFT_DATA = newData;
  applyGiftDataTheme(newData.theme, newData.themeId);
  populateStaticContent(newData);
  if (targetScene && typeof goToScene === 'function'){
    goToScene(targetScene);
  }
}

// Initial populate on load
if (window.GIFT_DATA){
  applyGiftDataTheme(window.GIFT_DATA.theme, window.GIFT_DATA.themeId);
  populateStaticContent(window.GIFT_DATA);
}

// Listen to postMessage from parent iframe (Editor)
window.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.type === 'GIFT_DATA_UPDATE' || event.data.type === 'UPDATE_GIFT_DATA'){
    updateGiftData(event.data.giftData, event.data.targetScene);
  } else if (event.data.type === 'GOTO_SCENE'){
    if (typeof goToScene === 'function'){
      goToScene(event.data.sceneNum, true);
    }
  }
});

// Notify parent iframe that preview is loaded and ready
if (window.parent && window.parent !== window){
  try {
    window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
  } catch (err){}
}

// Global exposure for testing or debugging
window.openGiftBox            = openGiftBox;
window.playScene3             = playScene3;
window.resetPinScene          = resetPinScene;
window.openCurtains           = openCurtains;
window.closeCurtains          = closeCurtains;
window.playScene5             = playScene5;
window.blowCandles            = blowCandles;
window.relightCake            = relightCake;
window.playScene6             = playScene6;
window.resetScene6            = resetScene6;
window.playScene7             = playScene7;
window.resetScene7            = resetScene7;
window.pauseScene7Videos      = pauseScene7Videos;
window.playScene7Videos       = playScene7Videos;
window.playScene8             = playScene8;
window.resetBalloonScene       = resetBalloonScene;
window.renderBalloons          = renderBalloons;
window.playScene9             = playScene9;
window.resetScene9            = resetScene9;
window.playScene10            = playScene10;
window.resetScene10           = resetScene10;
window.playScene11            = playScene11;
window.resetScene11           = resetScene11;
window.resetAll               = resetAll;
window.deactivateAllScenesExcept = deactivateAllScenesExcept;
window.openEnvelope           = openEnvelope;
window.startAmbientParticles  = startAmbientParticles;
window.goToScene              = goToScene;
window.hideTreeCanvas         = hideTreeCanvas;
window.showTreeCanvas         = showTreeCanvas;
window.bgMusic                = bgMusic;
window.toggleMusicMute        = toggleMusicMute;
window.duckMusic              = duckMusic;
window.updateGiftData         = updateGiftData;
window.applyGiftDataTheme     = applyGiftDataTheme;
window.populateStaticContent  = populateStaticContent;
window.refreshRig             = refreshRig;
window.resize                 = resize;
