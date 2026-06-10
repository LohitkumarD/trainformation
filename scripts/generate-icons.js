#!/usr/bin/env node
/**
 * Generate PWA icons from SVG using sharp or canvas.
 * Run: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Embedded SVG for the train icon
const svgContent = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#2563EB"/>
  <g transform="translate(${size * 0.15}, ${size * 0.2}) scale(${size * 0.007})">
    <!-- Train body -->
    <rect x="0" y="20" width="90" height="50" rx="8" fill="white" opacity="0.95"/>
    <rect x="5" y="25" width="80" height="20" rx="4" fill="#2563EB"/>
    <!-- Windows -->
    <rect x="10" y="28" width="18" height="12" rx="3" fill="white"/>
    <rect x="36" y="28" width="18" height="12" rx="3" fill="white"/>
    <rect x="62" y="28" width="18" height="12" rx="3" fill="white"/>
    <!-- Wheels -->
    <circle cx="20" cy="72" r="10" fill="#1E293B"/>
    <circle cx="20" cy="72" r="5" fill="white"/>
    <circle cx="70" cy="72" r="10" fill="#1E293B"/>
    <circle cx="70" cy="72" r="5" fill="white"/>
    <!-- Track -->
    <rect x="-5" y="80" width="100" height="5" rx="2" fill="white" opacity="0.5"/>
  </g>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Try to use sharp if available, otherwise write SVG placeholders
async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('sharp not available, writing SVG placeholders...');
    // Write SVG files that can be converted manually
    sizes.forEach((size) => {
      const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
      fs.writeFileSync(svgPath, svgContent(size));
      console.log(`  Created: icon-${size}x${size}.svg`);
    });

    // Write apple touch icon
    fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), svgContent(180));
    console.log('  Created: apple-touch-icon.svg');

    console.log('\nNote: For PNG icons, install sharp: npm install sharp');
    console.log('Then run this script again.');
    return;
  }

  for (const size of sizes) {
    const svgBuffer = Buffer.from(svgContent(size));
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer).png().toFile(outputPath);
    console.log(`  Created: icon-${size}x${size}.png`);
  }

  // Apple touch icon (180x180)
  const appleBuffer = Buffer.from(svgContent(180));
  await sharp(appleBuffer).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('  Created: apple-touch-icon.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
