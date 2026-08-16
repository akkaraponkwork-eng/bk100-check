import sharp from 'sharp';
import path from 'path';

async function processImage() {
  const inputPath = process.argv[2];
  const outputPath = path.resolve(__dirname, 'richmenu.jpg');

  try {
    console.log(`Processing image: ${inputPath}`);
    // Extract the central part (removing white borders) and resize to 2500x843
    // The generated image is 16:9 (likely 1024x576 or similar)
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image");
    }

    // Assuming the main content is in the center, we will resize it with cover
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
