const path = require('node:path');
const sharp = require('sharp');

async function generateIcon() {
  const source = path.join(__dirname, '..', 'build', 'icon.svg');
  const target = path.join(__dirname, '..', 'build', 'icon.png');
  await sharp(source).resize(512, 512).png().toFile(target);
}

generateIcon().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
