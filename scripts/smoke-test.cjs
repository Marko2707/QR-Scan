const assert = require('node:assert/strict');
const jsQR = require('jsqr');
const QRCode = require('qrcode');
const sharp = require('sharp');

async function run() {
  const expected = 'https://example.com/qr-scan-smoke-test';
  const encoded = await QRCode.toBuffer(expected, { width: 420, margin: 4, errorCorrectionLevel: 'M' });
  const { data, info } = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height, { inversionAttempts: 'attemptBoth' });
  assert.ok(decoded, 'The generated QR code should be detected.');
  assert.equal(decoded.data, expected, 'The decoded QR value should match the encoded value.');
  console.log('QR encode/decode smoke test passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
