const sharp = require('sharp');
const path = require('path');

async function processImage() {
  const inputPath = process.argv[2];
  const outputPath = path.resolve(__dirname, 'richmenu.jpg');

  try {
    console.log(`Processing image: ${inputPath}`);
    const image = sharp(inputPath);
    
    await image
      .resize(2500, 843, {
        fit: 'cover',
        position: 'center'
      })
      .toFile(outputPath);

    console.log(`Successfully generated rich menu image at: ${outputPath}`);
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processImage();
