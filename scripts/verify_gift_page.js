import fs from 'fs';

const js = fs.readFileSync('birthday.js', 'utf8');
const html = fs.readFileSync('gift.html', 'utf8');

const regex = /\$\('([^']+)'\)/g;
const ids = new Set();
let match;
while ((match = regex.exec(js)) !== null) {
  ids.add(match[1]);
}

const missingInGift = [];
for (const id of ids) {
  if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
    missingInGift.push(id);
  }
}

console.log('Total unique IDs queried by $(\'...\'):', ids.size);
console.log('Missing IDs in gift.html:', missingInGift);
