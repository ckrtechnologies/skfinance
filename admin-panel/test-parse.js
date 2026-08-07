const fs = require('fs');
const babel = require('@babel/core');
try {
  babel.transformSync(fs.readFileSync('src/app/applications/[id]/page.js', 'utf8'), {
    presets: ['@babel/preset-react'],
    filename: 'page.js'
  });
  console.log('Parsed successfully');
} catch (e) {
  console.error(e.message);
}
