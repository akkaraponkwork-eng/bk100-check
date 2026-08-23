const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processImages() {
  const dir = path.join(__dirname, '../public/images');
  const files = ['meterbill_carousel.jpg'];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const tempPath = path.join(dir, 'temp_' + file);

    console.log(`Converting ${file} to sRGB...`);
    
    await sharp(filePath)
      .toFormat('jpeg', { quality: 85 })
      .toColorspace('srgb')
      .toFile(tempPath);
      
    fs.renameSync(tempPath, filePath);
    const stat = fs.statSync(filePath);
    console.log(`Done. New size: ${(stat.size / 1024).toFixed(2)} KB`);
  }
}

processImages().catch(console.error);
