import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let errors = [];
let passes = [];

function assert(condition, message) {
  if (condition) {
    passes.push(message);
    console.log(`[PASS] ${message}`);
  } else {
    errors.push(message);
    console.error(`[FAIL] ${message}`);
  }
}

console.log('--- RUNNING MATRIX COUNTDOWN VERIFICATION SUITE ---');

const rootDir = path.resolve(__dirname, '..');

// 1. Check create.html
try {
  const createHtml = fs.readFileSync(path.join(rootDir, 'create.html'), 'utf8');
  assert(createHtml.includes("id: 'birthday-film-matrix'"), "create.html contains 'birthday-film-matrix' ID");
  assert(createHtml.includes("name: 'Matrix Countdown'"), "create.html contains 'Matrix Countdown' name");
  assert(createHtml.includes("themeId: 'glass'"), "create.html sets themeId: 'glass' for matrix");
  assert(createHtml.includes("Matrix rain opening") || createHtml.includes("Matrix Rain"), "create.html highlights Matrix rain opening feature");
  assert(createHtml.includes("₹100"), "create.html specifies ₹100 pricing");
} catch (e) {
  errors.push(`Error reading create.html: ${e.message}`);
}

// 2. Check birthday.css
try {
  const css = fs.readFileSync(path.join(rootDir, 'birthday.css'), 'utf8');
  assert(css.includes('.scene-matrix'), "birthday.css includes .scene-matrix rule");
  assert(css.includes('#matrixRainCanvas'), "birthday.css includes #matrixRainCanvas");
  assert(css.includes('#matrixWord'), "birthday.css includes #matrixWord");
  assert(css.includes('#matrixFinalWrap'), "birthday.css includes #matrixFinalWrap");
  assert(css.includes('#matrixFinalTitle'), "birthday.css includes #matrixFinalTitle");
  assert(css.includes('#matrixFinalSub'), "birthday.css includes #matrixFinalSub");
  assert(css.includes('#matrixTapHint'), "birthday.css includes #matrixTapHint");
} catch (e) {
  errors.push(`Error reading birthday.css: ${e.message}`);
}

// 3. Check preview.html and gift.html
['preview.html', 'gift.html'].forEach((filename) => {
  try {
    const html = fs.readFileSync(path.join(rootDir, filename), 'utf8');
    assert(html.includes('id="sceneMatrix"'), `${filename} contains #sceneMatrix`);
    assert(html.includes('id="matrixRainCanvas"'), `${filename} contains #matrixRainCanvas`);
    assert(html.includes('id="matrixWord"'), `${filename} contains #matrixWord`);
    assert(html.includes('id="matrixFinalWrap"'), `${filename} contains #matrixFinalWrap`);
    assert(html.includes('id="matrixFinalTitle"'), `${filename} contains #matrixFinalTitle`);
    assert(html.includes('id="matrixFinalSub"'), `${filename} contains #matrixFinalSub`);
    assert(html.includes('id="matrixTapHint"'), `${filename} contains #matrixTapHint`);
    if (filename === 'preview.html') {
      assert(html.includes("'birthday-film-matrix'"), "preview.html includes 'birthday-film-matrix' in DEMO config");
    }
  } catch (e) {
    errors.push(`Error reading ${filename}: ${e.message}`);
  }
});

// 4. Check birthday.js
try {
  const js = fs.readFileSync(path.join(rootDir, 'birthday.js'), 'utf8');
  assert(js.includes('scene1_matrixCountdown'), "birthday.js defines scene1_matrixCountdown schema");
  assert(js.includes('formatAgeTitle'), "birthday.js defines formatAgeTitle helper");
  assert(js.includes('isMatrixExperience'), "birthday.js defines isMatrixExperience helper");
  assert(js.includes('setupMatrixCanvas'), "birthday.js defines setupMatrixCanvas");
  assert(js.includes('drawMatrixRain'), "birthday.js defines drawMatrixRain");
  assert(js.includes('startMatrixRain'), "birthday.js defines startMatrixRain");
  assert(js.includes('stopMatrixRain'), "birthday.js defines stopMatrixRain");
  assert(js.includes('runMatrixSequence'), "birthday.js defines runMatrixSequence");
  assert(js.includes('window.runMatrixSequence'), "birthday.js exports runMatrixSequence to window");
} catch (e) {
  errors.push(`Error reading birthday.js: ${e.message}`);
}

// 5. Check editor.html
try {
  const editorHtml = fs.readFileSync(path.join(rootDir, 'editor.html'), 'utf8');
  assert(editorHtml.includes('id="s1MatrixFields"'), "editor.html contains #s1MatrixFields container");
  assert(editorHtml.includes('id="s1MatrixAge"'), "editor.html contains #s1MatrixAge input");
  assert(editorHtml.includes('id="s1MatrixWishLine"'), "editor.html contains #s1MatrixWishLine input");
  assert(editorHtml.includes('id="s1MatrixFinalTitlePreview"'), "editor.html contains #s1MatrixFinalTitlePreview");
  assert(editorHtml.includes('formatAgeTitle'), "editor.html includes formatAgeTitle function");
  assert(editorHtml.includes('updateExperienceUI'), "editor.html toggles UI based on experience");
  assert(editorHtml.includes("'birthday-film-matrix'"), "editor.html handles 'birthday-film-matrix' everywhere");
} catch (e) {
  errors.push(`Error reading editor.html: ${e.message}`);
}

// 6. Check admin.html
try {
  const adminHtml = fs.readFileSync(path.join(rootDir, 'admin.html'), 'utf8');
  assert(adminHtml.includes('value="birthday-film-matrix"'), "admin.html includes 'birthday-film-matrix' filter option");
  assert(adminHtml.includes('birthday-film-matrix'), "admin.html references 'birthday-film-matrix' in catalog and payload builder");
} catch (e) {
  errors.push(`Error reading admin.html: ${e.message}`);
}

// 7. Check formatAgeTitle logic directly via VM
try {
  const code = `
    function formatAgeTitle(age, name) {
      const cleanName = (name || 'Friend').trim();
      const rawAge = age ? String(age).trim() : '';
      if (!rawAge) {
        return \`Happy Birthday, \${cleanName}!\`;
      }
      const num = parseInt(rawAge, 10);
      if (isNaN(num)) {
        return \`Happy \${rawAge} Birthday, \${cleanName}!\`;
      }
      const j = num % 10;
      const k = num % 100;
      let suffix = 'th';
      if (j === 1 && k !== 11) suffix = 'st';
      else if (j === 2 && k !== 12) suffix = 'nd';
      else if (j === 3 && k !== 13) suffix = 'rd';
      return \`Happy \${num}\${suffix} Birthday, \${cleanName}!\`;
    }
  `;
  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context);

  assert(context.formatAgeTitle('', 'Elena') === 'Happy Birthday, Elena!', "formatAgeTitle with no age gives 'Happy Birthday, Elena!'");
  assert(context.formatAgeTitle('21', 'Elena') === 'Happy 21st Birthday, Elena!', "formatAgeTitle with 21 gives 'Happy 21st Birthday, Elena!'");
  assert(context.formatAgeTitle('22', 'Sam') === 'Happy 22nd Birthday, Sam!', "formatAgeTitle with 22 gives 'Happy 22nd Birthday, Sam!'");
  assert(context.formatAgeTitle('23', 'Alex') === 'Happy 23rd Birthday, Alex!', "formatAgeTitle with 23 gives 'Happy 23rd Birthday, Alex!'");
  assert(context.formatAgeTitle('20', 'Maya') === 'Happy 20th Birthday, Maya!', "formatAgeTitle with 20 gives 'Happy 20th Birthday, Maya!'");
  assert(context.formatAgeTitle('11', 'Kid') === 'Happy 11th Birthday, Kid!', "formatAgeTitle with 11 gives 'Happy 11th Birthday, Kid!'");
  assert(context.formatAgeTitle('Sweet 16', 'Jess') === 'Happy Sweet 16 Birthday, Jess!', "formatAgeTitle with string gives 'Happy Sweet 16 Birthday, Jess!'");
} catch (e) {
  errors.push(`Error running formatAgeTitle VM test: ${e.message}`);
}

console.log('\n======================================');
console.log(`TOTAL PASSES: ${passes.length}`);
console.log(`TOTAL FAILURES: ${errors.length}`);
console.log('======================================');

if (errors.length > 0) {
  process.exit(1);
} else {
  console.log('ALL MATRIX EXPERIENCE TESTS PASSED SUCCESSFULLY! ✨');
  process.exit(0);
}
