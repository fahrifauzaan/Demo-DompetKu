const fs = require('fs');
const Jimp = require('jimp');

async function removeBg() {
  console.log("Reading SVG...");
  const svgData = fs.readFileSync('../public/Image/logo/DompetKu.svg', 'utf8');
  console.log("Extracting base64...");
  
  // The SVG has <image xlink:href="data:image/png;base64,...">
  const match = svgData.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
  if (!match) {
    console.log("Base64 image not found in SVG");
    return;
  }
  
  const base64Data = match[1];
  const buffer = Buffer.from(base64Data, 'base64');
  
  console.log("Loading image with Jimp...");
  // Use jimp to load the buffer
  try {
    const image = await Jimp.read(buffer);
    console.log("Processing image...", image.bitmap.width, "x", image.bitmap.height);
    
    const targetColor = { r: 255, g: 255, b: 255 }; // white
    const tolerance = 50;

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      const alpha = this.bitmap.data[idx + 3];

      // Check if pixel is white or close to white
      if (
        Math.abs(red - targetColor.r) <= tolerance &&
        Math.abs(green - targetColor.g) <= tolerance &&
        Math.abs(blue - targetColor.b) <= tolerance
      ) {
        this.bitmap.data[idx + 3] = 0; // set alpha to 0
      }
    });

    console.log("Saving image...");
    await image.writeAsync('../public/Image/logo/DompetKu-transparent.png');
    console.log("Done!");
  } catch (err) {
    console.error("Error processing image with Jimp:", err);
  }
}

removeBg();
