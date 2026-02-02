const fs = require('fs');
const path = require('path');

const assets = [
  {
    source: path.resolve(__dirname, '../src/init/init.sql'),
    destination: path.resolve(__dirname, '../dist/src/init/init.sql'),
  },
];

for (const { source, destination } of assets) {
  if (!fs.existsSync(source)) {
    console.error(`Static asset not found: ${source}`);
    process.exitCode = 1;
    continue;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log(`Copied ${source} -> ${destination}`);
}

